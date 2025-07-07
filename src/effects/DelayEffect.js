export class DelayEffect {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.nodes = {
            delay: null,
            feedback: null,
            wetGain: null,
            dryGain: null,
            filter: null,
            input: null,
            output: null
        };
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;
        
        // Create nodes
        this.nodes.delay = this.audioContext.createDelay(2); // Max 2 seconds
        this.nodes.feedback = this.audioContext.createGain();
        this.nodes.wetGain = this.audioContext.createGain();
        this.nodes.dryGain = this.audioContext.createGain();
        
        // Optional high-cut filter in feedback loop for analog-style delay
        this.nodes.filter = this.audioContext.createBiquadFilter();
        this.nodes.filter.type = 'lowpass';
        this.nodes.filter.frequency.value = 5000;
        
        // Create input/output nodes
        this.nodes.input = this.audioContext.createGain();
        this.nodes.output = this.audioContext.createGain();
        
        // Set default values
        this.setDelayTime(0.375); // Dotted eighth at 120 BPM
        this.setFeedback(0.4);
        this.setMix(0.3);
        
        // Connect delay chain
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.input.connect(this.nodes.delay);
        
        // Feedback loop with filter
        this.nodes.delay.connect(this.nodes.filter);
        this.nodes.filter.connect(this.nodes.feedback);
        this.nodes.feedback.connect(this.nodes.delay);
        
        // Wet signal
        this.nodes.filter.connect(this.nodes.wetGain);
        
        // Mix to output
        this.nodes.dryGain.connect(this.nodes.output);
        this.nodes.wetGain.connect(this.nodes.output);
        
        this.isInitialized = true;
    }

    setDelayTime(seconds) {
        if (this.nodes.delay) {
            // Clamp between 0 and 2 seconds
            const clampedTime = Math.max(0, Math.min(2, seconds));
            this.nodes.delay.delayTime.value = clampedTime;
        }
    }

    setFeedback(amount) {
        if (this.nodes.feedback) {
            // Clamp feedback to prevent runaway (max 0.95)
            const clampedFeedback = Math.max(0, Math.min(0.95, amount));
            this.nodes.feedback.gain.value = clampedFeedback * 0.8; // Scale down for safety
        }
    }

    setMix(mixValue) {
        // mixValue: 0 = fully dry, 1 = fully wet
        const clampedMix = Math.max(0, Math.min(1, mixValue));
        
        if (this.nodes.wetGain) {
            this.nodes.wetGain.gain.value = clampedMix;
        }
        
        if (this.nodes.dryGain) {
            this.nodes.dryGain.gain.value = 1;
        }
    }

    setFilterFrequency(frequency) {
        if (this.nodes.filter) {
            this.nodes.filter.frequency.value = frequency;
        }
    }

    // Sync delay time to tempo
    syncToTempo(bpm, subdivision = '8d') {
        const beatLength = 60 / bpm; // Length of one beat in seconds
        
        let delayTime;
        switch(subdivision) {
            case '4':  delayTime = beatLength; break;         // Quarter note
            case '8':  delayTime = beatLength / 2; break;     // Eighth note
            case '8d': delayTime = beatLength * 0.75; break;  // Dotted eighth
            case '16': delayTime = beatLength / 4; break;     // Sixteenth note
            case '8t': delayTime = beatLength / 3; break;     // Eighth triplet
            default:   delayTime = beatLength * 0.75;         // Default to dotted eighth
        }
        
        this.setDelayTime(delayTime);
    }

    connect(destination) {
        if (this.nodes.output && destination) {
            this.nodes.output.connect(destination);
        }
    }

    disconnect() {
        Object.values(this.nodes).forEach(node => {
            if (node && node.disconnect) {
                try { node.disconnect(); } catch(e) {}
            }
        });
    }

    getInputNode() {
        return this.nodes.input;
    }

    getOutputNode() {
        return this.nodes.output;
    }

    getDelayNode() {
        // For direct connection if needed
        return this.nodes.delay;
    }
}