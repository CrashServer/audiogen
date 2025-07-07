import { createWhiteNoise, createBitCrusherCurve } from '../utils/audioHelpers.js';

export class GlitchGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.nodes = {
            source: null,
            gain: null,
            waveshaper: null
        };
        this.scheduler = null;
        this.isPlaying = false;
    }

    start(params) {
        if (this.isPlaying) return;
        
        const { intensity, rate, bitCrush } = params;
        
        if (intensity === 0) return;
        
        // Create noise source
        this.nodes.source = this.audioContext.createBufferSource();
        this.nodes.gain = this.audioContext.createGain();
        this.nodes.gain.gain.value = intensity * 0.5;
        
        // Create noise buffer
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        this.nodes.source.buffer = buffer;
        this.nodes.source.loop = true;
        
        // Create bit crusher
        this.nodes.waveshaper = this.audioContext.createWaveShaper();
        this.updateBitCrusher(bitCrush);
        
        // Connect nodes
        this.nodes.source.connect(this.nodes.waveshaper);
        this.nodes.waveshaper.connect(this.nodes.gain);
        
        this.nodes.source.start();
        
        // Start glitch scheduler
        this.scheduler = setInterval(() => {
            if (Math.random() < intensity) {
                this.triggerGlitch();
            }
        }, 1000 / rate);
        
        this.isPlaying = true;
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        if (this.nodes.source) {
            try {
                this.nodes.source.stop();
                this.nodes.source.disconnect();
            } catch(e) {}
        }
        
        if (this.nodes.waveshaper) {
            try { this.nodes.waveshaper.disconnect(); } catch(e) {}
        }
        
        if (this.nodes.gain) {
            try { this.nodes.gain.disconnect(); } catch(e) {}
        }
        
        this.nodes.source = null;
        this.nodes.waveshaper = null;
        this.nodes.gain = null;
        this.isPlaying = false;
    }

    triggerGlitch() {
        if (!this.nodes.gain) return;
        
        const gain = this.nodes.gain.gain;
        const now = this.audioContext.currentTime;
        
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(Math.random() * 0.8, now + 0.01);
        gain.linearRampToValueAtTime(0, now + 0.05);
        gain.linearRampToValueAtTime(gain.value, now + 0.1);
    }

    updateBitCrusher(bits) {
        if (!this.nodes.waveshaper) return;
        
        const curve = new Float32Array(256);
        const step = Math.pow(2, 16 - bits);
        
        for (let i = 0; i < 256; i++) {
            const x = (i - 128) / 128;
            curve[i] = Math.round(x * step) / step;
        }
        
        this.nodes.waveshaper.curve = curve;
    }

    updateParameter(param, value) {
        switch(param) {
            case 'bitcrush':
                this.updateBitCrusher(value);
                break;
            case 'intensity':
                if (this.nodes.gain) {
                    this.nodes.gain.gain.value = (value / 100) * 0.5;
                }
                break;
        }
    }

    getOutputNode() {
        return this.nodes.gain;
    }
}