export class DataBurstGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.scheduler = null;
        this.isPlaying = false;
        this.masterConnection = null;
    }

    start(params, connectToMaster) {
        if (this.isPlaying) return;
        
        const { activity, complexity, speed } = params;
        this.masterConnection = connectToMaster;
        
        if (activity === 0) return;
        
        this.scheduler = setInterval(() => {
            if (Math.random() < activity) {
                this.triggerDataBurst(complexity, speed);
            }
        }, 200 / speed);
        
        this.isPlaying = true;
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        this.isPlaying = false;
    }

    triggerDataBurst(complexity, speed) {
        const now = this.audioContext.currentTime;
        const burstLength = 0.05 + Math.random() * 0.2;
        
        for (let i = 0; i < complexity; i++) {
            const freq = 200 + Math.random() * 8000;
            const startTime = now + (i * burstLength / complexity);
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            // Randomly choose between square and sawtooth for digital sound
            osc.type = Math.random() < 0.5 ? 'square' : 'sawtooth';
            osc.frequency.value = freq;
            
            // Bandpass filter for more focused sound
            filter.type = 'bandpass';
            filter.frequency.value = freq;
            filter.Q.value = 10 + Math.random() * 20;
            
            // Quick envelope
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3 / complexity, startTime + 0.001);
            gain.gain.linearRampToValueAtTime(0, startTime + burstLength / complexity);
            
            // Connect chain
            osc.connect(filter);
            filter.connect(gain);
            
            if (this.masterConnection) {
                this.masterConnection(gain);
            }
            
            osc.start(startTime);
            osc.stop(startTime + burstLength / complexity + 0.001);
        }
    }

    updateParameter(param, value) {
        // Parameters are handled in the start method
    }
}