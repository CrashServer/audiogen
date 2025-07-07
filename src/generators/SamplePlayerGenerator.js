export class SamplePlayerGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.scheduler = null;
        this.isPlaying = false;
        this.voiceId = 'sample';
        this.activeVoices = new Set();
        this.sampleBuffers = new Map();
        
        // Create built-in samples
        this.createBuiltInSamples();
    }

    createBuiltInSamples() {
        const sampleRate = this.audioContext.sampleRate;
        
        // 1. Kick drum sample
        const kickLength = sampleRate * 0.5;
        const kickBuffer = this.audioContext.createBuffer(1, kickLength, sampleRate);
        const kickData = kickBuffer.getChannelData(0);
        
        for (let i = 0; i < kickLength; i++) {
            const t = i / sampleRate;
            // Sine wave with pitch envelope
            const pitch = 60 * Math.exp(-35 * t);
            kickData[i] = Math.sin(2 * Math.PI * pitch * t) * Math.exp(-10 * t);
            // Add click
            if (i < 100) {
                kickData[i] += (Math.random() - 0.5) * 0.5 * (1 - i / 100);
            }
        }
        this.sampleBuffers.set('kick', kickBuffer);
        
        // 2. Snare drum sample
        const snareLength = sampleRate * 0.2;
        const snareBuffer = this.audioContext.createBuffer(1, snareLength, sampleRate);
        const snareData = snareBuffer.getChannelData(0);
        
        for (let i = 0; i < snareLength; i++) {
            const t = i / sampleRate;
            // Tone component
            const tone = Math.sin(2 * Math.PI * 200 * t) * 0.5;
            // Noise component
            const noise = (Math.random() * 2 - 1) * 0.5;
            // Mix with envelope
            snareData[i] = (tone + noise) * Math.exp(-20 * t);
        }
        this.sampleBuffers.set('snare', snareBuffer);
        
        // 3. Hi-hat sample
        const hihatLength = sampleRate * 0.1;
        const hihatBuffer = this.audioContext.createBuffer(1, hihatLength, sampleRate);
        const hihatData = hihatBuffer.getChannelData(0);
        
        for (let i = 0; i < hihatLength; i++) {
            const t = i / sampleRate;
            // High-frequency noise
            hihatData[i] = (Math.random() * 2 - 1) * Math.exp(-50 * t);
        }
        this.sampleBuffers.set('hihat', hihatBuffer);
        
        // 4. Chord stab sample
        const stabLength = sampleRate * 0.5;
        const stabBuffer = this.audioContext.createBuffer(1, stabLength, sampleRate);
        const stabData = stabBuffer.getChannelData(0);
        
        for (let i = 0; i < stabLength; i++) {
            const t = i / sampleRate;
            // Major chord
            const root = Math.sin(2 * Math.PI * 261.63 * t);
            const third = Math.sin(2 * Math.PI * 329.63 * t);
            const fifth = Math.sin(2 * Math.PI * 392 * t);
            const seventh = Math.sin(2 * Math.PI * 493.88 * t);
            
            stabData[i] = (root + third * 0.8 + fifth * 0.6 + seventh * 0.4) * 0.25 * Math.exp(-2 * t);
        }
        this.sampleBuffers.set('chord', stabBuffer);
        
        // 5. Bass hit sample
        const bassLength = sampleRate * 1;
        const bassBuffer = this.audioContext.createBuffer(1, bassLength, sampleRate);
        const bassData = bassBuffer.getChannelData(0);
        
        for (let i = 0; i < bassLength; i++) {
            const t = i / sampleRate;
            // Sub bass with harmonics
            const fundamental = Math.sin(2 * Math.PI * 55 * t);
            const harmonic2 = Math.sin(2 * Math.PI * 110 * t) * 0.3;
            const harmonic3 = Math.sin(2 * Math.PI * 165 * t) * 0.1;
            
            bassData[i] = (fundamental + harmonic2 + harmonic3) * Math.exp(-1 * t);
        }
        this.sampleBuffers.set('bass', bassBuffer);
    }

    start(params, connectToMaster) {
        if (this.isPlaying) return;
        
        const { density, sample, pitch, reverse, chop, scatter } = params;
        this.masterConnection = connectToMaster;
        
        if (density === 0) return;
        
        // Schedule sample playback
        const baseInterval = 200;
        this.scheduler = setInterval(() => {
            if (Math.random() < density) {
                // Scatter timing
                const delay = scatter > 0 ? Math.random() * scatter * 100 : 0;
                setTimeout(() => {
                    this.triggerSample(sample, pitch, reverse, chop);
                }, delay);
            }
        }, baseInterval);
        
        this.isPlaying = true;
    }

    triggerSample(sampleName, pitchRatio, reverse, chopAmount) {
        const buffer = this.sampleBuffers.get(sampleName);
        if (!buffer) return;
        
        const now = this.audioContext.currentTime;
        const voiceId = `${this.voiceId}_${Date.now()}_${Math.random()}`;
        
        let source, gain;
        
        // Calculate chop parameters
        const chopLength = chopAmount > 0 ? buffer.duration * (1 - chopAmount) : buffer.duration;
        const startOffset = chopAmount > 0 ? Math.random() * (buffer.duration - chopLength) : 0;
        
        if (this.poolManager) {
            source = this.poolManager.pools.bufferSource.acquireBufferSource(
                voiceId,
                buffer,
                { 
                    playbackRate: reverse ? -pitchRatio : pitchRatio,
                    loop: false
                }
            );
            gain = this.poolManager.pools.gain.acquireGain(voiceId, 0);
        } else {
            source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = reverse ? -pitchRatio : pitchRatio;
            gain = this.audioContext.createGain();
            gain.gain.value = 0;
        }
        
        // Envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 0.001);
        if (chopAmount > 0) {
            gain.gain.setValueAtTime(0.7, now + chopLength - 0.01);
            gain.gain.linearRampToValueAtTime(0, now + chopLength);
        }
        
        // Random panning
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 0.8;
        
        // Connect
        source.connect(gain);
        gain.connect(panner);
        
        if (this.masterConnection) {
            this.masterConnection(panner);
        }
        
        // Track active voice
        this.activeVoices.add({ voiceId, source, gain, panner });
        
        // Start playback
        if (reverse) {
            source.start(now, buffer.duration - startOffset - chopLength, chopLength);
        } else {
            source.start(now, startOffset, chopLength);
        }
        
        // Schedule cleanup
        const cleanupTime = (chopLength / Math.abs(pitchRatio)) * 1000 + 100;
        setTimeout(() => {
            if (this.poolManager) {
                this.poolManager.pools.bufferSource.release(source);
                this.poolManager.pools.gain.release(gain);
            }
            panner.disconnect();
            
            // Remove from active tracking
            this.activeVoices.forEach(voice => {
                if (voice.voiceId === voiceId) {
                    this.activeVoices.delete(voice);
                }
            });
        }, cleanupTime);
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Clean up active voices
        if (this.poolManager) {
            this.activeVoices.forEach(({ source, gain, panner }) => {
                this.poolManager.pools.bufferSource.release(source);
                this.poolManager.pools.gain.release(gain);
                panner.disconnect();
            });
        } else {
            this.activeVoices.forEach(({ source, gain, panner }) => {
                try { 
                    source.stop(); 
                    source.disconnect();
                    gain.disconnect();
                    panner.disconnect();
                } catch(e) {}
            });
        }
        this.activeVoices.clear();
        
        this.isPlaying = false;
    }

    updateParameter(param, value) {
        // Parameters are handled in the start method
    }
}