export class DistortionSaturation {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();
        
        // Pre-gain for driving the distortion
        this.preGain = this.audioContext.createGain();
        this.preGain.gain.value = 1;
        
        // Waveshaper for distortion
        this.waveshaper = this.audioContext.createWaveShaper();
        this.waveshaper.oversample = '4x'; // Better quality
        
        // Post-gain for output level
        this.postGain = this.audioContext.createGain();
        this.postGain.gain.value = 0.5;
        
        // Tone control (low-pass filter)
        this.toneFilter = this.audioContext.createBiquadFilter();
        this.toneFilter.type = 'lowpass';
        this.toneFilter.frequency.value = 3000;
        this.toneFilter.Q.value = 0.7;
        
        // Pre-filter for shaping before distortion
        this.preFilter = this.audioContext.createBiquadFilter();
        this.preFilter.type = 'highpass';
        this.preFilter.frequency.value = 20;
        
        // Dry/wet mix
        this.dryGain = this.audioContext.createGain();
        this.wetGain = this.audioContext.createGain();
        this.dryGain.gain.value = 0;
        this.wetGain.gain.value = 1;
        
        // Connect the chain
        this.input.connect(this.dryGain);
        this.input.connect(this.preFilter);
        this.preFilter.connect(this.preGain);
        this.preGain.connect(this.waveshaper);
        this.waveshaper.connect(this.toneFilter);
        this.toneFilter.connect(this.postGain);
        this.postGain.connect(this.wetGain);
        
        this.dryGain.connect(this.output);
        this.wetGain.connect(this.output);
        
        // Set default curve
        this.setDistortionType('soft');
    }
    
    // Different distortion curves
    createDistortionCurve(amount, type = 'soft') {
        const samples = 44100;
        const curve = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
            const x = (i * 2 / samples) - 1;
            
            switch(type) {
                case 'soft':
                    // Soft clipping (tube-like)
                    curve[i] = Math.tanh(x * amount);
                    break;
                    
                case 'hard':
                    // Hard clipping
                    const threshold = 1 / amount;
                    if (x > threshold) curve[i] = 1;
                    else if (x < -threshold) curve[i] = -1;
                    else curve[i] = x * amount;
                    break;
                    
                case 'fuzz':
                    // Fuzz-style distortion
                    const fuzzAmount = amount * 10;
                    curve[i] = Math.sign(x) * Math.min(Math.abs(x * fuzzAmount), 1);
                    // Add some harmonics
                    curve[i] = Math.sin(curve[i] * Math.PI * 0.5);
                    break;
                    
                case 'bitcrush':
                    // Bit reduction effect
                    const bits = Math.max(1, 16 - amount * 2);
                    const step = 2 / Math.pow(2, bits);
                    curve[i] = Math.round(x / step) * step;
                    break;
                    
                case 'fold':
                    // Wave folding
                    let folded = x * amount;
                    while (Math.abs(folded) > 1) {
                        folded = Math.sign(folded) * (2 - Math.abs(folded));
                    }
                    curve[i] = folded;
                    break;
                    
                case 'asymmetric':
                    // Asymmetric distortion (even harmonics)
                    if (x > 0) {
                        curve[i] = Math.tanh(x * amount * 0.7);
                    } else {
                        curve[i] = Math.tanh(x * amount * 1.3);
                    }
                    break;
                    
                case 'warm':
                    // Warm saturation
                    const warmth = amount * 0.7;
                    curve[i] = x * (1 - Math.abs(x) * warmth * 0.25);
                    curve[i] = Math.tanh(curve[i] * 1.5);
                    break;
            }
        }
        
        return curve;
    }
    
    setDistortionType(type) {
        this.distortionType = type;
        this.updateCurve();
    }
    
    setDrive(value) {
        // value: 0-100 mapped to 1-100 drive amount
        this.driveAmount = 1 + (value / 100) * 99;
        this.updateCurve();
        
        // Also adjust pre-gain for more dramatic effect
        const gainValue = 1 + (value / 100) * 4; // 1-5x gain
        this.preGain.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
    }
    
    updateCurve() {
        if (this.driveAmount && this.distortionType) {
            this.waveshaper.curve = this.createDistortionCurve(
                this.driveAmount, 
                this.distortionType
            );
        }
    }
    
    setTone(value) {
        // value: 0-100 mapped to 200-10000 Hz
        const freq = 200 + (value / 100) * 9800;
        this.toneFilter.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    }
    
    setOutput(value) {
        // value: 0-100 mapped to 0-1 gain
        const gain = (value / 100);
        this.postGain.gain.setValueAtTime(gain, this.audioContext.currentTime);
    }
    
    setMix(value) {
        // value: 0-100 (0 = all dry, 100 = all wet)
        const wetAmount = value / 100;
        const dryAmount = 1 - wetAmount;
        
        this.dryGain.gain.setValueAtTime(dryAmount, this.audioContext.currentTime);
        this.wetGain.gain.setValueAtTime(wetAmount, this.audioContext.currentTime);
    }
    
    setPreFilterFreq(value) {
        // Remove low frequencies before distortion
        this.preFilter.frequency.setValueAtTime(value, this.audioContext.currentTime);
    }
    
    // Preset distortion settings
    applyPreset(preset) {
        switch(preset) {
            case 'clean':
                this.setDistortionType('warm');
                this.setDrive(5);
                this.setTone(80);
                this.setOutput(90);
                this.setMix(50);
                break;
                
            case 'crunch':
                this.setDistortionType('soft');
                this.setDrive(40);
                this.setTone(60);
                this.setOutput(70);
                this.setMix(80);
                break;
                
            case 'lead':
                this.setDistortionType('asymmetric');
                this.setDrive(70);
                this.setTone(70);
                this.setOutput(60);
                this.setMix(90);
                break;
                
            case 'fuzz':
                this.setDistortionType('fuzz');
                this.setDrive(80);
                this.setTone(40);
                this.setOutput(50);
                this.setMix(100);
                break;
                
            case 'destroyed':
                this.setDistortionType('hard');
                this.setDrive(95);
                this.setTone(30);
                this.setOutput(40);
                this.setMix(100);
                break;
        }
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
        this.preGain.disconnect();
        this.waveshaper.disconnect();
        this.postGain.disconnect();
        this.toneFilter.disconnect();
        this.preFilter.disconnect();
        this.dryGain.disconnect();
        this.wetGain.disconnect();
    }
}