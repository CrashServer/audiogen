export class DroneGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.nodes = {
            oscillators: [],
            gains: [],
            lfos: [],
            filter: null,
            mixer: null
        };
        this.isPlaying = false;
        this.voiceId = 'drone';
    }

    start(params) {
        if (this.isPlaying) return;
        
        const { frequency, detune, voices, filterFreq } = params;
        
        // Clean up existing nodes
        this.stop();
        
        // Create filter
        this.nodes.filter = this.audioContext.createBiquadFilter();
        this.nodes.filter.type = 'lowpass';
        this.nodes.filter.frequency.value = filterFreq;
        this.nodes.filter.Q.value = 5;
        
        // Create mixer
        this.nodes.mixer = this.audioContext.createGain();
        this.nodes.mixer.gain.value = 0.3;
        
        // Create voices using pool if available
        for (let i = 0; i < voices; i++) {
            let osc, gain, lfo, lfoGain;
            
            if (this.poolManager) {
                // Use pooled nodes
                osc = this.poolManager.pools.oscillator.acquireOscillator(
                    `${this.voiceId}_osc_${i}`,
                    { 
                        type: 'sawtooth',
                        frequency: frequency * (1 + (Math.random() - 0.5) * detune / 100)
                    }
                );
                gain = this.poolManager.pools.gain.acquireGain(
                    `${this.voiceId}_gain_${i}`,
                    1 / voices
                );
                lfo = this.poolManager.pools.oscillator.acquireOscillator(
                    `${this.voiceId}_lfo_${i}`,
                    {
                        type: 'sine',
                        frequency: 0.1 + Math.random() * 0.2
                    }
                );
                lfoGain = this.poolManager.pools.gain.acquireGain(
                    `${this.voiceId}_lfoGain_${i}`,
                    5
                );
            } else {
                // Fallback to creating nodes directly
                osc = this.audioContext.createOscillator();
                gain = this.audioContext.createGain();
                lfo = this.audioContext.createOscillator();
                lfoGain = this.audioContext.createGain();
                
                osc.type = 'sawtooth';
                osc.frequency.value = frequency * (1 + (Math.random() - 0.5) * detune / 100);
                gain.gain.value = 1 / voices;
                lfo.frequency.value = 0.1 + Math.random() * 0.2;
                lfoGain.gain.value = 5;
            }
            
            // Connect nodes
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            osc.connect(gain);
            gain.connect(this.nodes.filter);
            
            // Start oscillators if not from pool (pooled ones are pre-started)
            if (!this.poolManager) {
                lfo.start();
                osc.start();
            }
            
            this.nodes.oscillators.push(osc);
            this.nodes.gains.push(gain);
            this.nodes.lfos.push({ lfo, lfoGain });
        }
        
        this.nodes.filter.connect(this.nodes.mixer);
        this.isPlaying = true;
    }

    stop() {
        if (this.poolManager) {
            // Release pooled nodes
            this.nodes.oscillators.forEach((osc, i) => {
                this.poolManager.pools.oscillator.release(osc);
            });
            
            this.nodes.gains.forEach((gain, i) => {
                this.poolManager.pools.gain.release(gain);
            });
            
            this.nodes.lfos.forEach(({ lfo, lfoGain }, i) => {
                this.poolManager.pools.oscillator.release(lfo);
                this.poolManager.pools.gain.release(lfoGain);
            });
        } else {
            // Traditional cleanup
            this.nodes.oscillators.forEach(osc => {
                try { 
                    osc.stop(); 
                    osc.disconnect();
                } catch(e) {}
            });
            
            this.nodes.lfos.forEach(({ lfo }) => {
                try { 
                    lfo.stop(); 
                    lfo.disconnect();
                } catch(e) {}
            });
            
            this.nodes.gains.forEach(gain => {
                if (gain) {
                    try { gain.disconnect(); } catch(e) {}
                }
            });
        }
        
        // Disconnect non-pooled nodes
        if (this.nodes.filter) {
            try { this.nodes.filter.disconnect(); } catch(e) {}
        }
        if (this.nodes.mixer) {
            try { this.nodes.mixer.disconnect(); } catch(e) {}
        }
        
        // Clear arrays
        this.nodes.oscillators = [];
        this.nodes.gains = [];
        this.nodes.lfos = [];
        this.nodes.filter = null;
        this.nodes.mixer = null;
        
        this.isPlaying = false;
    }

    updateParameter(param, value) {
        switch(param) {
            case 'frequency':
                this.nodes.oscillators.forEach((osc, i) => {
                    const detune = parseFloat(document.getElementById('droneDetune').value);
                    osc.frequency.value = value * (1 + (Math.random() - 0.5) * detune / 100);
                });
                break;
            case 'filterFreq':
                if (this.nodes.filter) {
                    this.nodes.filter.frequency.value = value;
                }
                break;
            case 'volume':
                if (this.nodes.mixer) {
                    this.nodes.mixer.gain.value = value;
                }
                break;
        }
    }

    getOutputNode() {
        return this.nodes.mixer;
    }
    
    updateTempo(masterTempo) {
        // Update any tempo-based parameters
        // For drone, we can adjust LFO rates to be tempo-synced
        if (this.nodes.lfos && this.nodes.lfos.length > 0) {
            this.nodes.lfos.forEach(lfo => {
                if (lfo && lfo.frequency) {
                    // Sync LFO to quarter note tempo
                    lfo.frequency.value = masterTempo.beatsPerSecond * 0.25;
                }
            });
        }
    }
}