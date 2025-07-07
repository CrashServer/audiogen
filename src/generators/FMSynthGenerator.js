export class FMSynthGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.nodes = {
            carrier: null,
            modulator: null,
            modGain: null,
            gain: null,
            lfo: null,
            lfoGain: null
        };
        this.isPlaying = false;
    }

    start(params) {
        if (this.isPlaying) return;
        
        const { carrierFreq, modIndex, ratio, lfoSpeed } = params;
        
        if (modIndex === 0) return;
        
        // Carrier oscillator
        this.nodes.carrier = this.audioContext.createOscillator();
        this.nodes.carrier.type = 'sine';
        this.nodes.carrier.frequency.value = carrierFreq;
        
        // Modulator oscillator
        this.nodes.modulator = this.audioContext.createOscillator();
        this.nodes.modulator.type = 'sine';
        this.nodes.modulator.frequency.value = carrierFreq * ratio;
        
        // Modulation gain (controls FM depth)
        this.nodes.modGain = this.audioContext.createGain();
        this.nodes.modGain.gain.value = modIndex * 1000;
        
        // Output gain
        this.nodes.gain = this.audioContext.createGain();
        this.nodes.gain.gain.value = 0.2;
        
        // Connect FM synthesis chain
        this.nodes.modulator.connect(this.nodes.modGain);
        this.nodes.modGain.connect(this.nodes.carrier.frequency);
        this.nodes.carrier.connect(this.nodes.gain);
        
        // Optional LFO for FM depth modulation
        if (lfoSpeed > 0) {
            this.nodes.lfo = this.audioContext.createOscillator();
            this.nodes.lfoGain = this.audioContext.createGain();
            this.nodes.lfo.frequency.value = lfoSpeed;
            this.nodes.lfoGain.gain.value = modIndex * 500;
            
            this.nodes.lfo.connect(this.nodes.lfoGain);
            this.nodes.lfoGain.connect(this.nodes.modGain.gain);
            this.nodes.lfo.start();
        }
        
        // Start oscillators
        this.nodes.carrier.start();
        this.nodes.modulator.start();
        
        this.isPlaying = true;
    }

    stop() {
        // Stop all oscillators
        ['carrier', 'modulator', 'lfo'].forEach(oscName => {
            if (this.nodes[oscName]) {
                try {
                    this.nodes[oscName].stop();
                    this.nodes[oscName].disconnect();
                } catch(e) {}
            }
        });
        
        // Disconnect all nodes
        ['modGain', 'gain', 'lfoGain'].forEach(nodeName => {
            if (this.nodes[nodeName]) {
                try { this.nodes[nodeName].disconnect(); } catch(e) {}
            }
        });
        
        // Clear references
        Object.keys(this.nodes).forEach(key => {
            this.nodes[key] = null;
        });
        
        this.isPlaying = false;
    }

    updateParameter(param, value) {
        switch(param) {
            case 'carrier':
                if (this.nodes.carrier) {
                    this.nodes.carrier.frequency.value = value;
                    // Update modulator frequency to maintain ratio
                    if (this.nodes.modulator) {
                        const ratio = parseFloat(document.getElementById('fmRatio').value);
                        this.nodes.modulator.frequency.value = value * ratio;
                    }
                }
                break;
            case 'index':
                if (this.nodes.modGain) {
                    this.nodes.modGain.gain.value = (value / 100) * 1000;
                }
                if (this.nodes.lfoGain) {
                    this.nodes.lfoGain.gain.value = (value / 100) * 500;
                }
                break;
            case 'ratio':
                if (this.nodes.modulator && this.nodes.carrier) {
                    this.nodes.modulator.frequency.value = this.nodes.carrier.frequency.value * value;
                }
                break;
            case 'lfo':
                if (this.nodes.lfo) {
                    this.nodes.lfo.frequency.value = value;
                }
                break;
        }
    }

    getOutputNode() {
        return this.nodes.gain;
    }
}