export class EQFilterBank {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();
        
        // Create filter bands
        this.bands = {
            highpass: this.createBand('highpass', 80, 0.7),
            lowShelf: this.createBand('lowshelf', 320, 0.7),
            lowMid: this.createBand('peaking', 650, 0.7),
            mid: this.createBand('peaking', 1000, 0.7),
            highMid: this.createBand('peaking', 3200, 0.7),
            highShelf: this.createBand('highshelf', 4800, 0.7),
            lowpass: this.createBand('lowpass', 12000, 0.7)
        };
        
        // Chain filters
        let previousNode = this.input;
        Object.values(this.bands).forEach(band => {
            previousNode.connect(band.filter);
            previousNode = band.filter;
        });
        previousNode.connect(this.output);
        
        // Spectrum analyzer for visual feedback
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.output.connect(this.analyser);
    }
    
    createBand(type, frequency, q) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = q;
        filter.gain.value = 0; // Flat by default
        
        return {
            filter,
            type,
            defaultFreq: frequency,
            defaultQ: q
        };
    }
    
    // High-pass filter (removes low frequencies)
    setHighpass(frequency) {
        // frequency: 20-500 Hz
        this.bands.highpass.filter.frequency.setValueAtTime(
            frequency, 
            this.audioContext.currentTime
        );
    }
    
    // Low shelf (boost/cut low frequencies)
    setLowShelfGain(gain) {
        // gain: -12 to +12 dB
        this.bands.lowShelf.filter.gain.setValueAtTime(
            gain, 
            this.audioContext.currentTime
        );
    }
    
    setLowShelfFreq(frequency) {
        this.bands.lowShelf.filter.frequency.setValueAtTime(
            frequency, 
            this.audioContext.currentTime
        );
    }
    
    // Low-mid band
    setLowMidGain(gain) {
        this.bands.lowMid.filter.gain.setValueAtTime(
            gain, 
            this.audioContext.currentTime
        );
    }
    
    setLowMidFreq(frequency) {
        this.bands.lowMid.filter.frequency.setValueAtTime(
            frequency, 
            this.audioContext.currentTime
        );
    }
    
    setLowMidQ(q) {
        this.bands.lowMid.filter.Q.setValueAtTime(
            q, 
            this.audioContext.currentTime
        );
    }
    
    // Mid band
    setMidGain(gain) {
        this.bands.mid.filter.gain.setValueAtTime(
            gain, 
            this.audioContext.currentTime
        );
    }
    
    setMidFreq(frequency) {
        this.bands.mid.filter.frequency.setValueAtTime(
            frequency, 
            this.audioContext.currentTime
        );
    }
    
    setMidQ(q) {
        this.bands.mid.filter.Q.setValueAtTime(
            q, 
            this.audioContext.currentTime
        );
    }
    
    // High-mid band
    setHighMidGain(gain) {
        this.bands.highMid.filter.gain.setValueAtTime(
            gain, 
            this.audioContext.currentTime
        );
    }
    
    setHighMidFreq(frequency) {
        this.bands.highMid.filter.frequency.setValueAtTime(
            frequency, 
            this.audioContext.currentTime
        );
    }
    
    setHighMidQ(q) {
        this.bands.highMid.filter.Q.setValueAtTime(
            q, 
            this.audioContext.currentTime
        );
    }
    
    // High shelf (boost/cut high frequencies)
    setHighShelfGain(gain) {
        this.bands.highShelf.filter.gain.setValueAtTime(
            gain, 
            this.audioContext.currentTime
        );
    }
    
    setHighShelfFreq(frequency) {
        this.bands.highShelf.filter.frequency.setValueAtTime(
            frequency, 
            this.audioContext.currentTime
        );
    }
    
    // Low-pass filter (removes high frequencies)
    setLowpass(frequency) {
        // frequency: 1000-20000 Hz
        this.bands.lowpass.filter.frequency.setValueAtTime(
            frequency, 
            this.audioContext.currentTime
        );
    }
    
    // Preset EQ curves
    applyPreset(preset) {
        switch(preset) {
            case 'flat':
                this.resetAllBands();
                break;
            case 'brighteness':
                this.setLowShelfGain(-2);
                this.setMidGain(1);
                this.setHighMidGain(3);
                this.setHighShelfGain(4);
                break;
            case 'warmth':
                this.setLowShelfGain(3);
                this.setLowMidGain(2);
                this.setMidGain(-1);
                this.setHighShelfGain(-3);
                break;
            case 'presence':
                this.setLowMidGain(-2);
                this.setMidGain(3);
                this.setHighMidGain(4);
                break;
            case 'telephone':
                this.setHighpass(300);
                this.setLowpass(3400);
                this.setMidGain(6);
                break;
            case 'radio':
                this.setHighpass(100);
                this.setLowpass(10000);
                this.setLowShelfGain(-3);
                this.setHighShelfGain(-3);
                this.setMidGain(2);
                break;
        }
    }
    
    resetAllBands() {
        Object.values(this.bands).forEach(band => {
            if (band.type === 'peaking' || band.type === 'lowshelf' || band.type === 'highshelf') {
                band.filter.gain.value = 0;
            }
            band.filter.frequency.value = band.defaultFreq;
            band.filter.Q.value = band.defaultQ;
        });
    }
    
    getFrequencyResponse(frequencies) {
        const magResponse = new Float32Array(frequencies.length);
        const phaseResponse = new Float32Array(frequencies.length);
        
        // Get combined response of all filters
        const tempMag = new Float32Array(frequencies.length);
        const tempPhase = new Float32Array(frequencies.length);
        
        // Initialize with unity gain
        for (let i = 0; i < frequencies.length; i++) {
            magResponse[i] = 1;
            phaseResponse[i] = 0;
        }
        
        // Multiply responses from each filter
        Object.values(this.bands).forEach(band => {
            band.filter.getFrequencyResponse(frequencies, tempMag, tempPhase);
            for (let i = 0; i < frequencies.length; i++) {
                magResponse[i] *= tempMag[i];
                phaseResponse[i] += tempPhase[i];
            }
        });
        
        return { magnitude: magResponse, phase: phaseResponse };
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
        Object.values(this.bands).forEach(band => {
            band.filter.disconnect();
        });
        this.analyser.disconnect();
    }
}