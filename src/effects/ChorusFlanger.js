export class ChorusFlanger {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();
        
        // Create multiple delay lines for richer chorus
        this.delays = [];
        this.lfos = [];
        this.delayGains = [];
        this.numVoices = 3; // Number of chorus voices
        
        // Feedback for flanger effect
        this.feedbackGain = this.audioContext.createGain();
        this.feedbackGain.gain.value = 0;
        
        // High-pass filter to remove low frequency buildup
        this.highpass = this.audioContext.createBiquadFilter();
        this.highpass.type = 'highpass';
        this.highpass.frequency.value = 20;
        
        // Dry/wet mix
        this.dryGain = this.audioContext.createGain();
        this.wetGain = this.audioContext.createGain();
        this.dryGain.gain.value = 0.5;
        this.wetGain.gain.value = 0.5;
        
        // Create delay lines and LFOs
        for (let i = 0; i < this.numVoices; i++) {
            // Delay line
            const delay = this.audioContext.createDelay(0.1); // 100ms max delay
            delay.delayTime.value = 0.01 + (i * 0.003); // Slightly different base delays
            
            // LFO for modulation
            const lfo = this.audioContext.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.5 + (i * 0.1); // Slightly different rates
            
            // LFO gain (modulation depth)
            const lfoGain = this.audioContext.createGain();
            lfoGain.gain.value = 0.002; // 2ms modulation depth
            
            // Voice gain
            const voiceGain = this.audioContext.createGain();
            voiceGain.gain.value = 1 / this.numVoices;
            
            // Connect LFO to delay time
            lfo.connect(lfoGain);
            lfoGain.connect(delay.delayTime);
            
            // Store references
            this.delays.push(delay);
            this.lfos.push({ osc: lfo, gain: lfoGain });
            this.delayGains.push(voiceGain);
            
            // Start LFO
            lfo.start();
        }
        
        // Connect the signal flow
        this.connectNodes();
        
        // Default to chorus mode
        this.mode = 'chorus';
    }
    
    connectNodes() {
        // Input splits to dry and wet paths
        this.input.connect(this.dryGain);
        this.input.connect(this.highpass);
        
        // Connect each delay line
        for (let i = 0; i < this.numVoices; i++) {
            this.highpass.connect(this.delays[i]);
            this.delays[i].connect(this.delayGains[i]);
            this.delayGains[i].connect(this.wetGain);
            
            // Feedback connection (for flanger)
            this.delays[i].connect(this.feedbackGain);
        }
        
        // Feedback loop
        this.feedbackGain.connect(this.highpass);
        
        // Mix dry and wet
        this.dryGain.connect(this.output);
        this.wetGain.connect(this.output);
    }
    
    setMode(mode) {
        this.mode = mode;
        
        switch(mode) {
            case 'chorus':
                this.setDelayRange(15, 30); // 15-30ms delays
                this.setModDepth(30); // Moderate modulation
                this.setRate(30); // Slow modulation
                this.setFeedback(0); // No feedback
                this.setMix(50);
                break;
                
            case 'flanger':
                this.setDelayRange(1, 10); // 1-10ms delays
                this.setModDepth(50); // Deep modulation
                this.setRate(20); // Slow sweep
                this.setFeedback(50); // Moderate feedback
                this.setMix(50);
                break;
                
            case 'doubler':
                this.setDelayRange(20, 40); // 20-40ms delays
                this.setModDepth(10); // Subtle modulation
                this.setRate(10); // Very slow
                this.setFeedback(0);
                this.setMix(50);
                break;
                
            case 'vibrato':
                this.setDelayRange(5, 10); // Short delays
                this.setModDepth(80); // Deep modulation
                this.setRate(60); // Faster modulation
                this.setFeedback(0);
                this.setMix(100); // Wet only
                break;
        }
    }
    
    setDelayRange(minMs, maxMs) {
        const baseDelay = minMs / 1000;
        const range = (maxMs - minMs) / 1000;
        
        for (let i = 0; i < this.numVoices; i++) {
            const offset = (i / this.numVoices) * range;
            this.delays[i].delayTime.setValueAtTime(
                baseDelay + offset,
                this.audioContext.currentTime
            );
        }
    }
    
    setRate(value) {
        // value: 0-100 mapped to 0.1-10 Hz
        const baseRate = 0.1 + (value / 100) * 9.9;
        
        for (let i = 0; i < this.numVoices; i++) {
            // Slightly detune each voice for richness
            const rate = baseRate * (1 + (i * 0.1));
            this.lfos[i].osc.frequency.setValueAtTime(
                rate,
                this.audioContext.currentTime
            );
        }
    }
    
    setModDepth(value) {
        // value: 0-100 mapped to 0-5ms modulation depth
        const depth = (value / 100) * 0.005;
        
        for (let i = 0; i < this.numVoices; i++) {
            this.lfos[i].gain.gain.setValueAtTime(
                depth,
                this.audioContext.currentTime
            );
        }
    }
    
    setFeedback(value) {
        // value: 0-100 mapped to 0-0.9 feedback
        const feedback = (value / 100) * 0.9;
        this.feedbackGain.gain.setValueAtTime(
            feedback,
            this.audioContext.currentTime
        );
    }
    
    setMix(value) {
        // value: 0-100 (0 = all dry, 100 = all wet)
        const wetAmount = value / 100;
        const dryAmount = 1 - wetAmount;
        
        this.dryGain.gain.setValueAtTime(dryAmount, this.audioContext.currentTime);
        this.wetGain.gain.setValueAtTime(wetAmount, this.audioContext.currentTime);
    }
    
    setVoices(num) {
        // Adjust the number of active voices (1-3)
        num = Math.max(1, Math.min(3, num));
        
        for (let i = 0; i < this.numVoices; i++) {
            const gain = i < num ? 1 / num : 0;
            this.delayGains[i].gain.setValueAtTime(
                gain,
                this.audioContext.currentTime
            );
        }
    }
    
    setSpread(value) {
        // value: 0-100 - controls stereo spread of voices
        // This would require StereoPannerNodes for each voice
        // Implementation depends on whether stereo spread is needed
    }
    
    getInputNode() {
        return this.input;
    }
    
    getOutputNode() {
        return this.output;
    }
    
    disconnect() {
        this.input.disconnect();
        this.output.disconnect();
        this.dryGain.disconnect();
        this.wetGain.disconnect();
        this.highpass.disconnect();
        this.feedbackGain.disconnect();
        
        for (let i = 0; i < this.numVoices; i++) {
            this.delays[i].disconnect();
            this.lfos[i].osc.stop();
            this.lfos[i].osc.disconnect();
            this.lfos[i].gain.disconnect();
            this.delayGains[i].disconnect();
        }
    }
}