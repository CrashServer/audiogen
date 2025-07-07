export class KarplusStrongGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.scheduler = null;
        this.isPlaying = false;
        this.voiceId = 'karplus';
        this.activeStrings = new Set();
    }

    start(params, connectToMaster) {
        if (this.isPlaying) return;
        
        const { density, pitch, damping, brightness, pluckHardness } = params;
        this.masterConnection = connectToMaster;
        
        if (density === 0) return;
        
        // Schedule string plucks
        this.scheduler = setInterval(() => {
            if (Math.random() < density) {
                const note = this.getRandomNote(pitch);
                this.pluckString(note, damping, brightness, pluckHardness);
            }
        }, 200);
        
        this.isPlaying = true;
    }

    getRandomNote(basePitch) {
        // Generate notes from a scale
        const scale = [0, 2, 4, 5, 7, 9, 11]; // Major scale
        const octaveRange = 2;
        const scaleNote = scale[Math.floor(Math.random() * scale.length)];
        const octave = Math.floor(Math.random() * octaveRange);
        
        return basePitch * Math.pow(2, (scaleNote + octave * 12) / 12);
    }

    pluckString(frequency, damping, brightness, pluckHardness) {
        const now = this.audioContext.currentTime;
        const stringId = `${this.voiceId}_string_${Date.now()}_${Math.random()}`;
        
        // Calculate delay time from frequency
        const delayTime = 1 / frequency;
        const sampleRate = this.audioContext.sampleRate;
        const delayInSamples = Math.round(delayTime * sampleRate);
        
        // Create noise burst for pluck
        const noiseBuffer = this.audioContext.createBuffer(1, delayInSamples, sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        
        // Fill with filtered noise based on pluck hardness
        for (let i = 0; i < delayInSamples; i++) {
            if (i < delayInSamples * pluckHardness) {
                // Harder pluck = more high frequencies
                noiseData[i] = (Math.random() * 2 - 1);
            } else {
                // Softer pluck = filtered noise
                noiseData[i] = (Math.random() * 2 - 1) * (1 - i / delayInSamples);
            }
        }
        
        // Create the delay line feedback loop
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const delay = this.audioContext.createDelay(1);
        delay.delayTime.value = delayTime;
        
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = brightness;
        
        const feedback = this.audioContext.createGain();
        feedback.gain.value = damping;
        
        const output = this.audioContext.createGain();
        output.gain.value = 0.3;
        
        // Connect the feedback loop
        noise.connect(delay);
        delay.connect(lowpass);
        lowpass.connect(feedback);
        feedback.connect(delay);
        
        // Output
        delay.connect(output);
        
        if (this.masterConnection) {
            this.masterConnection(output);
        }
        
        // Track active string
        this.activeStrings.add({
            stringId,
            nodes: { noise, delay, lowpass, feedback, output }
        });
        
        // Start the pluck
        noise.start();
        
        // Schedule cleanup (strings naturally decay)
        const decayTime = Math.log(0.001) / Math.log(damping) * delayTime;
        setTimeout(() => {
            try {
                noise.stop();
                noise.disconnect();
                delay.disconnect();
                lowpass.disconnect();
                feedback.disconnect();
                output.disconnect();
            } catch(e) {}
            
            // Remove from active tracking
            this.activeStrings.forEach(string => {
                if (string.stringId === stringId) {
                    this.activeStrings.delete(string);
                }
            });
        }, decayTime * 1000 + 1000); // Add extra second for safety
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Clean up active strings
        this.activeStrings.forEach(({ nodes }) => {
            try {
                nodes.noise.stop();
                Object.values(nodes).forEach(node => {
                    node.disconnect();
                });
            } catch(e) {}
        });
        this.activeStrings.clear();
        
        this.isPlaying = false;
    }

    updateParameter(param, value) {
        // Parameters are handled in the start method
        // Could implement dynamic updates here if needed
    }
}