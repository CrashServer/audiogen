export class AmbientPadGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.scheduler = null;
        this.isPlaying = false;
        this.masterNodes = null;
        this.chordIndex = 0;
        this.voiceId = 'ambientPad';
        this.activeVoices = new Set();
    }

    start(params, masterNodes) {
        if (this.isPlaying) return;
        
        const { density, attack, release, filterSweep, shimmer } = params;
        this.masterNodes = masterNodes;
        
        if (density === 0) return;
        
        // Chord progressions for ambient atmosphere
        const chords = [
            [0, 4, 7, 11],    // Cmaj7
            [2, 5, 9, 12],    // Dm7
            [4, 7, 11, 14],   // Em7
            [5, 9, 12, 16],   // Fmaj7
            [7, 11, 14, 17],  // G7
            [9, 12, 16, 19],  // Am7
        ];
        
        const interval = 8000 / density; // Longer intervals for pads
        
        this.scheduler = setInterval(() => {
            const chord = chords[this.chordIndex % chords.length];
            this.triggerPadChord(chord, attack, release, filterSweep, shimmer);
            this.chordIndex++;
        }, interval);
        
        this.isPlaying = true;
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Clean up active voices
        if (this.poolManager) {
            this.activeVoices.forEach(({ oscillators, gains, filters, shimmerOscs, shimmerGains }) => {
                oscillators.forEach(osc => {
                    this.poolManager.pools.oscillator.release(osc);
                });
                gains.forEach(gain => {
                    this.poolManager.pools.gain.release(gain);
                });
                filters.forEach(filter => {
                    filter.disconnect();
                });
                shimmerOscs.forEach(osc => {
                    this.poolManager.pools.oscillator.release(osc);
                });
                shimmerGains.forEach(gain => {
                    this.poolManager.pools.gain.release(gain);
                });
            });
        } else {
            this.activeVoices.forEach(({ oscillators, gains, filters, shimmerOscs, shimmerGains }) => {
                oscillators.forEach(osc => {
                    try { osc.stop(); osc.disconnect(); } catch(e) {}
                });
                gains.forEach(gain => {
                    try { gain.disconnect(); } catch(e) {}
                });
                filters.forEach(filter => {
                    try { filter.disconnect(); } catch(e) {}
                });
                shimmerOscs.forEach(osc => {
                    try { osc.stop(); osc.disconnect(); } catch(e) {}
                });
                shimmerGains.forEach(gain => {
                    try { gain.disconnect(); } catch(e) {}
                });
            });
        }
        this.activeVoices.clear();
        
        this.chordIndex = 0;
        this.isPlaying = false;
    }

    triggerPadChord(chord, attack, release, filterSweep, shimmer) {
        const now = this.audioContext.currentTime;
        const baseFreq = 110; // A2
        const voiceGroupId = `${this.voiceId}_chord_${Date.now()}`;
        
        const oscillators = [];
        const gains = [];
        const filters = [];
        const shimmerOscs = [];
        const shimmerGains = [];
        
        chord.forEach((note, i) => {
            const freq = baseFreq * Math.pow(2, note / 12);
            
            // Multiple detuned oscillators per note for richness
            for (let j = 0; j < 3; j++) {
                const voiceId = `${voiceGroupId}_n${i}_v${j}`;
                
                let osc, gain;
                
                if (this.poolManager) {
                    osc = this.poolManager.pools.oscillator.acquireOscillator(
                        voiceId,
                        { 
                            type: 'sawtooth',
                            frequency: freq * (1 + (j - 1) * 0.01) // Slight detune
                        }
                    );
                    gain = this.poolManager.pools.gain.acquireGain(voiceId, 0);
                } else {
                    osc = this.audioContext.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.value = freq * (1 + (j - 1) * 0.01); // Slight detune
                    gain = this.audioContext.createGain();
                    gain.gain.value = 0;
                }
                
                // ADSR envelope
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1 / chord.length, now + attack);
                gain.gain.setValueAtTime(0.1 / chord.length, now + attack + 2);
                gain.gain.exponentialRampToValueAtTime(0.001, now + attack + 2 + release);
                
                // Filter sweep for movement
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(200, now);
                filter.frequency.exponentialRampToValueAtTime(2000 * (1 + filterSweep), now + attack);
                filter.frequency.exponentialRampToValueAtTime(200, now + attack + 2 + release);
                filter.Q.value = 3;
                
                // Connect main chain
                osc.connect(gain);
                gain.connect(filter);
                
                if (this.masterNodes) {
                    filter.connect(this.masterNodes.dryGain);
                    filter.connect(this.masterNodes.convolver);
                }
                
                // Shimmer effect (high frequency content)
                if (shimmer > 0 && Math.random() < shimmer) {
                    const shimmerVoiceId = `${voiceId}_shimmer`;
                    let shimmerOsc, shimmerGain;
                    
                    if (this.poolManager) {
                        shimmerOsc = this.poolManager.pools.oscillator.acquireOscillator(
                            shimmerVoiceId,
                            { 
                                type: 'sine',
                                frequency: freq * 4
                            }
                        );
                        shimmerGain = this.poolManager.pools.gain.acquireGain(
                            shimmerVoiceId, 
                            0.02 * shimmer
                        );
                    } else {
                        shimmerOsc = this.audioContext.createOscillator();
                        shimmerOsc.frequency.value = freq * 4;
                        shimmerOsc.type = 'sine';
                        shimmerGain = this.audioContext.createGain();
                        shimmerGain.gain.value = 0.02 * shimmer;
                    }
                    
                    shimmerOsc.connect(shimmerGain);
                    
                    if (this.masterNodes) {
                        shimmerGain.connect(this.masterNodes.convolver);
                    }
                    
                    if (!this.poolManager) {
                        shimmerOsc.start(now + attack * 0.5);
                        shimmerOsc.stop(now + attack + 2 + release);
                    }
                    
                    shimmerOscs.push(shimmerOsc);
                    shimmerGains.push(shimmerGain);
                }
                
                if (!this.poolManager) {
                    osc.start(now);
                    osc.stop(now + attack + 2 + release);
                }
                
                oscillators.push(osc);
                gains.push(gain);
                filters.push(filter);
            }
        });
        
        // Track active voice group
        const voiceGroup = {
            voiceGroupId,
            oscillators,
            gains,
            filters,
            shimmerOscs,
            shimmerGains
        };
        this.activeVoices.add(voiceGroup);
        
        // Schedule cleanup
        const totalDuration = attack + 2 + release;
        setTimeout(() => {
            if (this.poolManager) {
                oscillators.forEach(osc => {
                    this.poolManager.pools.oscillator.release(osc);
                });
                gains.forEach(gain => {
                    this.poolManager.pools.gain.release(gain);
                });
                shimmerOscs.forEach(osc => {
                    this.poolManager.pools.oscillator.release(osc);
                });
                shimmerGains.forEach(gain => {
                    this.poolManager.pools.gain.release(gain);
                });
            }
            
            filters.forEach(filter => {
                filter.disconnect();
            });
            
            // Remove from active tracking
            this.activeVoices.delete(voiceGroup);
        }, totalDuration * 1000 + 100);
    }

    updateParameter(param, value) {
        // Parameters are handled in the start method
        // Could implement dynamic updates here if needed
    }
}