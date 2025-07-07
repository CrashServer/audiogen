export class GranularGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.scheduler = null;
        this.sourceBuffer = null;
        this.isPlaying = false;
        this.performanceThrottle = 1;
        this.activeGrains = new Set();
        this.voiceId = 'granular';
    }

    start(params, masterNodes) {
        if (this.isPlaying) return;
        
        const { density, grainSize, pitchSpread, panSpread } = params;
        this.masterNodes = masterNodes;
        
        if (density === 0) return;
        
        // Create source buffer with complex waveform
        const bufferSize = this.audioContext.sampleRate * 2;
        this.sourceBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = this.sourceBuffer.getChannelData(0);
        
        // Fill with complex harmonic content
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            data[i] = Math.sin(2 * Math.PI * 100 * t) * 0.3 +
                     Math.sin(2 * Math.PI * 237 * t) * 0.2 +
                     Math.sin(2 * Math.PI * 523 * t) * 0.1 +
                     (Math.random() * 2 - 1) * 0.1;
        }
        
        // Adaptive grain scheduler for performance
        const granularInterval = this.performanceThrottle < 0.7 ? 100 : 50;
        
        this.scheduler = setInterval(() => {
            if (Math.random() < density * this.performanceThrottle) {
                this.triggerGrain(grainSize, pitchSpread, panSpread);
            }
        }, granularInterval);
        
        this.isPlaying = true;
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Clean up any remaining active grains
        if (this.poolManager) {
            this.activeGrains.forEach(({ source, gain, panner }) => {
                this.poolManager.pools.bufferSource.release(source);
                this.poolManager.pools.gain.release(gain);
                panner.disconnect();
            });
        }
        this.activeGrains.clear();
        
        this.sourceBuffer = null;
        this.isPlaying = false;
    }

    triggerGrain(size, pitchSpread, panSpread) {
        const now = this.audioContext.currentTime;
        const grainId = `${this.voiceId}_grain_${Date.now()}_${Math.random()}`;
        
        let source, gain, panner;
        
        // Random playback position
        const startPos = Math.random() * (this.sourceBuffer.duration - size / 1000);
        const pitchRatio = Math.pow(2, (Math.random() - 0.5) * pitchSpread * 2);
        const grainDuration = size / 1000;
        
        if (this.poolManager) {
            // Use pooled nodes
            source = this.poolManager.pools.bufferSource.acquireBufferSource(
                grainId,
                this.sourceBuffer,
                { playbackRate: pitchRatio }
            );
            gain = this.poolManager.pools.gain.acquireGain(grainId, 0);
            
            // Note: StereoPanner can't be pooled easily, create new
            panner = this.audioContext.createStereoPanner();
        } else {
            // Fallback to creating nodes directly
            source = this.audioContext.createBufferSource();
            source.buffer = this.sourceBuffer;
            source.playbackRate.value = pitchRatio;
            gain = this.audioContext.createGain();
            panner = this.audioContext.createStereoPanner();
        }
        
        // Simple envelope for efficiency
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + grainDuration * 0.1);
        gain.gain.setValueAtTime(0.3, now + grainDuration * 0.9);
        gain.gain.linearRampToValueAtTime(0, now + grainDuration);
        
        // Panning
        panner.pan.value = (Math.random() - 0.5) * 2 * panSpread;
        
        // Connect chain
        source.connect(gain);
        gain.connect(panner);
        
        // Connect to master
        if (this.masterNodes) {
            panner.connect(this.masterNodes.dryGain);
            panner.connect(this.masterNodes.convolver);
            panner.connect(this.masterNodes.delay);
        }
        
        // Track active grain
        this.activeGrains.add({ source, gain, panner, grainId });
        
        source.start(now, startPos, grainDuration);
        
        // Schedule cleanup
        setTimeout(() => {
            if (this.poolManager) {
                this.poolManager.pools.bufferSource.release(source);
                this.poolManager.pools.gain.release(gain);
            }
            panner.disconnect();
            
            // Remove from active tracking
            this.activeGrains.forEach(grain => {
                if (grain.grainId === grainId) {
                    this.activeGrains.delete(grain);
                }
            });
        }, grainDuration * 1000 + 100);
    }

    updateParameter(param, value) {
        // Parameters are handled in the start method
        // Could implement dynamic updates here if needed
    }

    setPerformanceThrottle(value) {
        this.performanceThrottle = value;
    }
}