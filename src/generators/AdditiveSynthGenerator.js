export class AdditiveSynthGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.nodes = {
            oscillators: [],
            gains: [],
            filter: null,
            mixer: null
        };
        this.scheduler = null;
        this.isPlaying = false;
        this.voiceId = 'additive';
        this.activeVoices = new Set();
    }

    start(params, connectToMaster) {
        if (this.isPlaying) return;
        
        const { density, fundamental, harmonics, harmonicDecay, inharmonicity, brightness } = params;
        this.masterConnection = connectToMaster;
        
        if (density === 0) return;
        
        // Create filter
        this.nodes.filter = this.audioContext.createBiquadFilter();
        this.nodes.filter.type = 'lowpass';
        this.nodes.filter.frequency.value = brightness;
        this.nodes.filter.Q.value = 1;
        
        // Create mixer
        this.nodes.mixer = this.audioContext.createGain();
        this.nodes.mixer.gain.value = 0.3;
        
        this.nodes.filter.connect(this.nodes.mixer);
        if (this.masterConnection) {
            this.masterConnection(this.nodes.mixer);
        }
        
        // Schedule additive voices
        this.scheduler = setInterval(() => {
            if (Math.random() < density) {
                this.triggerAdditiveVoice(fundamental, harmonics, harmonicDecay, inharmonicity);
            }
        }, 300);
        
        this.isPlaying = true;
    }

    triggerAdditiveVoice(baseFund, numHarmonics, decay, inharmonicity) {
        const now = this.audioContext.currentTime;
        const duration = 0.5 + Math.random() * 2;
        const voiceId = `${this.voiceId}_voice_${Date.now()}_${Math.random()}`;
        
        // Random fundamental variation
        const fundamental = baseFund * (0.5 + Math.random());
        
        const oscillators = [];
        const gains = [];
        
        // Create harmonics
        for (let i = 0; i < numHarmonics; i++) {
            const harmonic = i + 1;
            
            // Apply inharmonicity (stretched harmonics like in real instruments)
            const stretchFactor = Math.pow(1 + inharmonicity * 0.01, harmonic);
            const freq = fundamental * harmonic * stretchFactor;
            
            // Skip if frequency is too high
            if (freq > 10000) continue;
            
            let osc, gain;
            const nodeId = `${voiceId}_h${harmonic}`;
            
            if (this.poolManager) {
                osc = this.poolManager.pools.oscillator.acquireOscillator(
                    nodeId,
                    { type: 'sine', frequency: freq }
                );
                gain = this.poolManager.pools.gain.acquireGain(nodeId, 0);
            } else {
                osc = this.audioContext.createOscillator();
                gain = this.audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.value = 0;
            }
            
            // Amplitude based on harmonic number with decay
            const amplitude = 0.5 / Math.pow(harmonic, decay);
            
            // Envelope
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(amplitude, now + 0.01);
            gain.gain.setValueAtTime(amplitude, now + duration * 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            // Add slight detuning for richness
            osc.detune.value = (Math.random() - 0.5) * 10 * harmonic;
            
            osc.connect(gain);
            gain.connect(this.nodes.filter);
            
            if (!this.poolManager) {
                osc.start();
            }
            
            oscillators.push(osc);
            gains.push(gain);
        }
        
        // Track active voice
        this.activeVoices.add({ voiceId, oscillators, gains });
        
        // Schedule cleanup
        setTimeout(() => {
            if (this.poolManager) {
                oscillators.forEach((osc, i) => {
                    this.poolManager.pools.oscillator.release(osc);
                });
                gains.forEach((gain, i) => {
                    this.poolManager.pools.gain.release(gain);
                });
            } else {
                oscillators.forEach(osc => {
                    try { osc.stop(); osc.disconnect(); } catch(e) {}
                });
                gains.forEach(gain => {
                    try { gain.disconnect(); } catch(e) {}
                });
            }
            
            // Remove from active tracking
            this.activeVoices.forEach(voice => {
                if (voice.voiceId === voiceId) {
                    this.activeVoices.delete(voice);
                }
            });
        }, duration * 1000 + 100);
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Clean up active voices
        if (this.poolManager) {
            this.activeVoices.forEach(({ oscillators, gains }) => {
                oscillators.forEach(osc => {
                    this.poolManager.pools.oscillator.release(osc);
                });
                gains.forEach(gain => {
                    this.poolManager.pools.gain.release(gain);
                });
            });
        } else {
            this.activeVoices.forEach(({ oscillators, gains }) => {
                oscillators.forEach(osc => {
                    try { osc.stop(); osc.disconnect(); } catch(e) {}
                });
                gains.forEach(gain => {
                    try { gain.disconnect(); } catch(e) {}
                });
            });
        }
        this.activeVoices.clear();
        
        if (this.nodes.filter) {
            this.nodes.filter.disconnect();
            this.nodes.filter = null;
        }
        if (this.nodes.mixer) {
            this.nodes.mixer.disconnect();
            this.nodes.mixer = null;
        }
        
        this.isPlaying = false;
    }

    updateParameter(param, value) {
        switch(param) {
            case 'brightness':
                if (this.nodes.filter) {
                    this.nodes.filter.frequency.value = value;
                }
                break;
        }
    }
}