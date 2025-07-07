export class SineBleepsGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.scheduler = null;
        this.isPlaying = false;
        this.masterConnection = null;
        this.activeNodes = new Set();
    }

    start(params, connectToMaster) {
        if (this.isPlaying) return;
        
        const { density, range, duration } = params;
        this.masterConnection = connectToMaster;
        
        if (density === 0) return;
        
        this.scheduler = setInterval(() => {
            if (Math.random() < density) {
                this.triggerBleep(range, duration);
            }
        }, 100); // Check every 100ms
        
        this.isPlaying = true;
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Clean up any remaining active nodes
        if (this.poolManager) {
            this.activeNodes.forEach(({ osc, gain, nodeId }) => {
                this.poolManager.pools.oscillator.release(osc);
                this.poolManager.pools.gain.release(gain);
            });
        }
        this.activeNodes.clear();
        
        this.isPlaying = false;
    }

    triggerBleep(range, duration) {
        const now = this.audioContext.currentTime;
        const freq = 100 + Math.random() * range;
        
        let osc, gain;
        const nodeId = `bleep_${Date.now()}_${Math.random()}`;
        
        if (this.poolManager) {
            // Use pooled nodes
            osc = this.poolManager.pools.oscillator.acquireOscillator(
                nodeId,
                { type: 'sine', frequency: freq }
            );
            gain = this.poolManager.pools.gain.acquireGain(nodeId, 0);
        } else {
            // Fallback to creating nodes directly
            osc = this.audioContext.createOscillator();
            gain = this.audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0;
        }
        
        // Sharp attack and release for Ikeda-style bleeps
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.001);
        gain.gain.setValueAtTime(0.5, now + duration - 0.001);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        
        osc.connect(gain);
        
        if (this.masterConnection) {
            this.masterConnection(gain);
        }
        
        // Track active nodes
        this.activeNodes.add({ osc, gain, nodeId });
        
        if (!this.poolManager) {
            osc.start(now);
            osc.stop(now + duration + 0.001);
        } else {
            // For pooled oscillators, schedule release
            setTimeout(() => {
                // Release back to pool
                this.poolManager.pools.oscillator.release(osc);
                this.poolManager.pools.gain.release(gain);
                
                // Remove from active tracking
                this.activeNodes.forEach(node => {
                    if (node.nodeId === nodeId) {
                        this.activeNodes.delete(node);
                    }
                });
            }, (duration + 0.1) * 1000); // Add small buffer
        }
    }

    updateParameter(param, value) {
        // Parameters are handled in the start method
        // Could implement dynamic updates here if needed
    }
}