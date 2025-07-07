export class CompressorLimiter {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();
        
        // Create compressor node
        this.compressor = this.audioContext.createDynamicsCompressor();
        
        // Default compressor settings
        this.compressor.threshold.value = -24; // dB
        this.compressor.knee.value = 30; // dB
        this.compressor.ratio.value = 12; // 12:1
        this.compressor.attack.value = 0.003; // seconds
        this.compressor.release.value = 0.25; // seconds
        
        // Create limiter (another compressor with extreme settings)
        this.limiter = this.audioContext.createDynamicsCompressor();
        this.limiter.threshold.value = -3; // dB
        this.limiter.knee.value = 0; // dB (hard knee)
        this.limiter.ratio.value = 20; // 20:1 (basically limiting)
        this.limiter.attack.value = 0.001; // seconds (fast)
        this.limiter.release.value = 0.1; // seconds
        
        // Makeup gain
        this.makeupGain = this.audioContext.createGain();
        this.makeupGain.gain.value = 1.0;
        
        // Dry/wet mix
        this.dryGain = this.audioContext.createGain();
        this.wetGain = this.audioContext.createGain();
        this.dryGain.gain.value = 0;
        this.wetGain.gain.value = 1;
        
        // Connect the chain
        this.input.connect(this.dryGain);
        this.input.connect(this.compressor);
        this.compressor.connect(this.limiter);
        this.limiter.connect(this.makeupGain);
        this.makeupGain.connect(this.wetGain);
        
        this.dryGain.connect(this.output);
        this.wetGain.connect(this.output);
        
        // Visual feedback (optional metering)
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.makeupGain.connect(this.analyser);
    }
    
    setThreshold(value) {
        // value: 0-100 mapped to -60 to 0 dB
        const dbValue = -60 + (value / 100) * 60;
        this.compressor.threshold.setValueAtTime(dbValue, this.audioContext.currentTime);
    }
    
    setRatio(value) {
        // value: 0-100 mapped to 1:1 to 20:1
        const ratioValue = 1 + (value / 100) * 19;
        this.compressor.ratio.setValueAtTime(ratioValue, this.audioContext.currentTime);
    }
    
    setAttack(value) {
        // value: 0-100 mapped to 0.001 to 1 seconds
        const attackValue = 0.001 + (value / 100) * 0.999;
        this.compressor.attack.setValueAtTime(attackValue, this.audioContext.currentTime);
    }
    
    setRelease(value) {
        // value: 0-100 mapped to 0.01 to 2 seconds
        const releaseValue = 0.01 + (value / 100) * 1.99;
        this.compressor.release.setValueAtTime(releaseValue, this.audioContext.currentTime);
    }
    
    setKnee(value) {
        // value: 0-100 mapped to 0 to 40 dB
        const kneeValue = (value / 100) * 40;
        this.compressor.knee.setValueAtTime(kneeValue, this.audioContext.currentTime);
    }
    
    setMakeupGain(value) {
        // value: 0-100 mapped to 0 to 2 (0dB to +6dB)
        const gainValue = (value / 100) * 2;
        this.makeupGain.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
    }
    
    setLimiterThreshold(value) {
        // value: 0-100 mapped to -12 to 0 dB
        const dbValue = -12 + (value / 100) * 12;
        this.limiter.threshold.setValueAtTime(dbValue, this.audioContext.currentTime);
    }
    
    setMix(value) {
        // value: 0-100 (0 = all dry, 100 = all wet)
        const wetAmount = value / 100;
        const dryAmount = 1 - wetAmount;
        
        this.dryGain.gain.setValueAtTime(dryAmount, this.audioContext.currentTime);
        this.wetGain.gain.setValueAtTime(wetAmount, this.audioContext.currentTime);
    }
    
    getInputNode() {
        return this.input;
    }
    
    getOutputNode() {
        return this.output;
    }
    
    getReductionAmount() {
        // Returns current gain reduction in dB
        return this.compressor.reduction;
    }
    
    disconnect() {
        this.input.disconnect();
        this.output.disconnect();
        this.compressor.disconnect();
        this.limiter.disconnect();
        this.makeupGain.disconnect();
        this.dryGain.disconnect();
        this.wetGain.disconnect();
        this.analyser.disconnect();
    }
}