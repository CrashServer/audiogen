export class SidechainCompression {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.input = this.audioContext.createGain();
        this.sidechain = this.audioContext.createGain(); // Sidechain input
        this.output = this.audioContext.createGain();
        
        // Duck gain (controlled by sidechain)
        this.duckGain = this.audioContext.createGain();
        this.duckGain.gain.value = 1;
        
        // Envelope follower for sidechain signal
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.3;
        
        // Parameters
        this.threshold = 0.5;
        this.ratio = 4;
        this.attack = 0.005;
        this.release = 0.1;
        this.knee = 0.1;
        
        // Sidechain filter (to focus on specific frequencies)
        this.sidechainFilter = this.audioContext.createBiquadFilter();
        this.sidechainFilter.type = 'lowpass';
        this.sidechainFilter.frequency.value = 200; // Focus on kick frequencies
        this.sidechainFilter.Q.value = 1;
        
        // Connect nodes
        this.input.connect(this.duckGain);
        this.duckGain.connect(this.output);
        
        this.sidechain.connect(this.sidechainFilter);
        this.sidechainFilter.connect(this.analyser);
        
        // Start the ducking process
        this.startDucking();
        
        // LFO mode for rhythmic pumping without sidechain
        this.lfoMode = false;
        this.lfo = null;
        this.lfoGain = null;
    }
    
    startDucking() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        
        const processFrame = () => {
            if (!this.lfoMode) {
                // Get time domain data from sidechain
                this.analyser.getFloatTimeDomainData(dataArray);
                
                // Calculate RMS
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sum / bufferLength);
                
                // Apply compression curve
                const targetGain = this.calculateGain(rms);
                
                // Smooth the gain changes
                const currentGain = this.duckGain.gain.value;
                const now = this.audioContext.currentTime;
                
                if (targetGain < currentGain) {
                    // Attack (duck down)
                    this.duckGain.gain.cancelScheduledValues(now);
                    this.duckGain.gain.setValueAtTime(currentGain, now);
                    this.duckGain.gain.linearRampToValueAtTime(targetGain, now + this.attack);
                } else {
                    // Release (recover)
                    this.duckGain.gain.cancelScheduledValues(now);
                    this.duckGain.gain.setValueAtTime(currentGain, now);
                    this.duckGain.gain.linearRampToValueAtTime(targetGain, now + this.release);
                }
            }
            
            this.animationFrame = requestAnimationFrame(processFrame);
        };
        
        processFrame();
    }
    
    calculateGain(inputLevel) {
        // Convert to dB
        const inputDb = 20 * Math.log10(Math.max(0.00001, inputLevel));
        const thresholdDb = 20 * Math.log10(this.threshold);
        
        // Calculate gain reduction
        let reductionDb = 0;
        
        if (inputDb > thresholdDb) {
            // Above threshold
            const excess = inputDb - thresholdDb;
            
            // Apply knee
            if (this.knee > 0 && excess < this.knee) {
                // Soft knee
                const kneeRatio = excess / this.knee;
                const softRatio = 1 + (this.ratio - 1) * kneeRatio * kneeRatio;
                reductionDb = excess * (1 - 1/softRatio);
            } else {
                // Hard knee
                reductionDb = excess * (1 - 1/this.ratio);
            }
        }
        
        // Convert back to linear
        return Math.pow(10, -reductionDb / 20);
    }
    
    setThreshold(value) {
        // value: 0-100 mapped to 0.01-1 linear
        this.threshold = 0.01 + (value / 100) * 0.99;
    }
    
    setRatio(value) {
        // value: 0-100 mapped to 1:1 to 20:1
        this.ratio = 1 + (value / 100) * 19;
    }
    
    setAttack(value) {
        // value: 0-100 mapped to 0.001 to 0.05 seconds
        this.attack = 0.001 + (value / 100) * 0.049;
    }
    
    setRelease(value) {
        // value: 0-100 mapped to 0.01 to 0.5 seconds
        this.release = 0.01 + (value / 100) * 0.49;
    }
    
    setKnee(value) {
        // value: 0-100 mapped to 0 to 1 (in dB terms)
        this.knee = (value / 100);
    }
    
    setSidechainFilter(frequency) {
        // Focus the sidechain on specific frequencies
        this.sidechainFilter.frequency.setValueAtTime(
            frequency,
            this.audioContext.currentTime
        );
    }
    
    // LFO mode for rhythmic pumping without external sidechain
    setLFOMode(enabled, rate = 2) {
        this.lfoMode = enabled;
        
        if (enabled) {
            if (!this.lfo) {
                // Create LFO
                this.lfo = this.audioContext.createOscillator();
                this.lfo.type = 'sine';
                this.lfo.frequency.value = rate;
                
                // Create gain for LFO depth
                this.lfoGain = this.audioContext.createGain();
                this.lfoGain.gain.value = 0.5;
                
                // Offset to keep gain positive
                const offset = this.audioContext.createConstantSource();
                offset.offset.value = 0.5;
                
                // Connect LFO
                this.lfo.connect(this.lfoGain);
                offset.connect(this.duckGain.gain);
                this.lfoGain.connect(this.duckGain.gain);
                
                this.lfo.start();
                offset.start();
                
                this.lfoOffset = offset;
            }
        } else {
            if (this.lfo) {
                this.lfo.stop();
                this.lfo.disconnect();
                this.lfoGain.disconnect();
                this.lfoOffset.stop();
                this.lfoOffset.disconnect();
                
                this.lfo = null;
                this.lfoGain = null;
                this.lfoOffset = null;
                
                // Reset gain
                this.duckGain.gain.cancelScheduledValues(this.audioContext.currentTime);
                this.duckGain.gain.setValueAtTime(1, this.audioContext.currentTime);
            }
        }
    }
    
    setLFORate(rate) {
        // rate in Hz
        if (this.lfo) {
            this.lfo.frequency.setValueAtTime(rate, this.audioContext.currentTime);
        }
    }
    
    setLFODepth(depth) {
        // depth: 0-100
        if (this.lfoGain) {
            const depthValue = (depth / 100) * 0.5; // Max 0.5 for stability
            this.lfoGain.gain.setValueAtTime(depthValue, this.audioContext.currentTime);
        }
    }
    
    // Pattern-based pumping
    setPumpPattern(pattern) {
        // pattern: 'quarter', 'eighth', 'sixteenth', 'triplet'
        const bpm = 120; // Could be synced to global tempo
        const rates = {
            'quarter': bpm / 60,
            'eighth': (bpm / 60) * 2,
            'sixteenth': (bpm / 60) * 4,
            'triplet': (bpm / 60) * 3
        };
        
        if (rates[pattern]) {
            this.setLFORate(rates[pattern]);
        }
    }
    
    getInputNode() {
        return this.input;
    }
    
    getSidechainNode() {
        return this.sidechain;
    }
    
    getOutputNode() {
        return this.output;
    }
    
    getCurrentReduction() {
        // Returns current gain reduction in dB
        const linearGain = this.duckGain.gain.value;
        return -20 * Math.log10(Math.max(0.00001, linearGain));
    }
    
    disconnect() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.input.disconnect();
        this.output.disconnect();
        this.sidechain.disconnect();
        this.duckGain.disconnect();
        this.analyser.disconnect();
        this.sidechainFilter.disconnect();
        
        if (this.lfo) {
            this.lfo.stop();
            this.lfo.disconnect();
            this.lfoGain.disconnect();
            this.lfoOffset.stop();
            this.lfoOffset.disconnect();
        }
    }
}