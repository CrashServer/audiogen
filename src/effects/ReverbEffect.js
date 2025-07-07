import { createReverbImpulse } from '../utils/audioHelpers.js';

export class ReverbEffect {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.nodes = {
            convolver: null,
            wetGain: null,
            dryGain: null,
            input: null,
            output: null
        };
        this.isInitialized = false;
    }

    initialize(performanceThrottle = 1) {
        if (this.isInitialized) return;
        
        // Create nodes
        this.nodes.convolver = this.audioContext.createConvolver();
        this.nodes.wetGain = this.audioContext.createGain();
        this.nodes.dryGain = this.audioContext.createGain();
        
        // Create input/output gain nodes for easy connection
        this.nodes.input = this.audioContext.createGain();
        this.nodes.output = this.audioContext.createGain();
        
        // Generate impulse response
        this.updateImpulse(performanceThrottle);
        
        // Initial mix settings
        this.setMix(0.3); // 30% wet by default
        
        // Connect the reverb chain
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.input.connect(this.nodes.convolver);
        this.nodes.convolver.connect(this.nodes.wetGain);
        this.nodes.dryGain.connect(this.nodes.output);
        this.nodes.wetGain.connect(this.nodes.output);
        
        this.isInitialized = true;
    }

    updateImpulse(performanceThrottle = 1) {
        // Shorter reverb when under performance pressure
        const reverbTime = performanceThrottle < 0.7 ? 1 : 2;
        const impulse = createReverbImpulse(this.audioContext, reverbTime, 2);
        
        if (this.nodes.convolver) {
            this.nodes.convolver.buffer = impulse;
        }
    }

    setMix(mixValue) {
        // mixValue: 0 = fully dry, 1 = fully wet
        const clampedMix = Math.max(0, Math.min(1, mixValue));
        
        if (this.nodes.wetGain) {
            this.nodes.wetGain.gain.value = clampedMix;
        }
        
        if (this.nodes.dryGain) {
            // Reduce dry signal slightly as wet increases for natural mix
            this.nodes.dryGain.gain.value = 1 - clampedMix * 0.5;
        }
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

    getConvolverNode() {
        // For direct connection if needed
        return this.nodes.convolver;
    }
}