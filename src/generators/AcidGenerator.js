export class AcidGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.scheduler = null;
        this.isPlaying = false;
        this.masterConnection = null;
        this.step = 0;
    }

    start(params, connectToMaster) {
        if (this.isPlaying) return;
        
        const { level, baseFreq, resonance, decay, speed, tempo } = params;
        this.masterConnection = connectToMaster;
        
        if (level === 0) return;
        
        // Classic acid pattern and note offsets
        const pattern = [1, 0, 0.5, 0, 1, 0, 0.3, 0.8, 0, 0.6, 0, 1, 0, 0.4, 0, 0.7];
        const noteOffsets = [0, 0, 12, 0, 0, 7, 3, 5, 0, 10, 0, 0, 15, 3, 0, 7];
        
        const interval = 60000 / (tempo * 4 * speed);
        
        this.scheduler = setInterval(() => {
            const patternStep = this.step % pattern.length;
            if (pattern[patternStep] > 0) {
                const velocity = pattern[patternStep] * level;
                const noteOffset = noteOffsets[patternStep];
                const freq = baseFreq * Math.pow(2, noteOffset / 12);
                this.triggerAcidNote(freq, velocity, decay, resonance);
            }
            this.step++;
        }, interval);
        
        this.isPlaying = true;
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        this.step = 0;
        this.isPlaying = false;
    }

    triggerAcidNote(freq, velocity, decay, resonance) {
        const now = this.audioContext.currentTime;
        
        // Oscillator
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        
        // Filter with envelope (classic 303 sound)
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = resonance * 30;
        
        // Filter envelope - key to acid sound
        const cutoffMax = Math.min(freq * 8, 15000);
        filter.frequency.setValueAtTime(cutoffMax, now);
        filter.frequency.exponentialRampToValueAtTime(freq, now + decay);
        
        // Amplitude envelope
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.5, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + decay);
        
        // Distortion for acid character
        const distortion = this.audioContext.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i - 128) / 128;
            curve[i] = Math.tanh(x * (1 + resonance * 4));
        }
        distortion.curve = curve;
        distortion.oversample = '2x';
        
        // Connect chain
        osc.connect(filter);
        filter.connect(distortion);
        distortion.connect(gain);
        
        if (this.masterConnection) {
            this.masterConnection(gain);
        }
        
        osc.start(now);
        osc.stop(now + decay + 0.1);
    }

    updateParameter(param, value) {
        // Parameters are handled in the start method
        // Could implement dynamic updates here if needed
    }
}