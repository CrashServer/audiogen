import { createWhiteNoise, createPinkNoise, createBrownNoise, createCrackleNoise } from '../utils/audioHelpers.js';

export class NoiseGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.nodes = {
            source: null,
            gain: null,
            filter: null
        };
        this.isPlaying = false;
    }

    start(params) {
        if (this.isPlaying) return;
        
        const { type, level, filterFreq } = params;
        
        if (level === 0) return;
        
        // Create nodes
        this.nodes.source = this.audioContext.createBufferSource();
        this.nodes.gain = this.audioContext.createGain();
        this.nodes.filter = this.audioContext.createBiquadFilter();
        
        // Create noise buffer
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        this.generateNoiseData(data, type);
        
        this.nodes.source.buffer = buffer;
        this.nodes.source.loop = true;
        
        // Configure filter
        this.nodes.filter.type = 'lowpass';
        this.nodes.filter.frequency.value = filterFreq;
        
        // Set gain
        this.nodes.gain.gain.value = level * 0.3;
        
        // Connect chain
        this.nodes.source.connect(this.nodes.filter);
        this.nodes.filter.connect(this.nodes.gain);
        
        this.nodes.source.start();
        this.isPlaying = true;
    }

    stop() {
        if (this.nodes.source) {
            try {
                this.nodes.source.stop();
                this.nodes.source.disconnect();
            } catch(e) {}
        }
        
        if (this.nodes.filter) {
            try { this.nodes.filter.disconnect(); } catch(e) {}
        }
        
        if (this.nodes.gain) {
            try { this.nodes.gain.disconnect(); } catch(e) {}
        }
        
        this.nodes.source = null;
        this.nodes.filter = null;
        this.nodes.gain = null;
        this.isPlaying = false;
    }

    generateNoiseData(data, type) {
        switch(type) {
            case 'white':
                for (let i = 0; i < data.length; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                break;
                
            case 'pink':
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                for (let i = 0; i < data.length; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                    b6 = white * 0.115926;
                }
                break;
                
            case 'brown':
                let lastOut = 0;
                for (let i = 0; i < data.length; i++) {
                    const white = Math.random() * 2 - 1;
                    data[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = data[i];
                    data[i] *= 3.5; // Boost brown noise
                }
                break;
                
            case 'crackle':
                for (let i = 0; i < data.length; i++) {
                    data[i] = Math.random() < 0.01 ? (Math.random() * 2 - 1) * 0.5 : 0;
                }
                break;
        }
    }

    updateParameter(param, value) {
        switch(param) {
            case 'level':
                if (this.nodes.gain) {
                    this.nodes.gain.gain.value = value * 0.3;
                }
                break;
            case 'filter':
                if (this.nodes.filter) {
                    this.nodes.filter.frequency.value = value;
                }
                break;
        }
    }

    getOutputNode() {
        return this.nodes.gain;
    }
}