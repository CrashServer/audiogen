export class VocalSynthGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.nodes = {
            oscillators: [],
            formantFilters: [],
            gains: [],
            mixer: null
        };
        this.scheduler = null;
        this.isPlaying = false;
        this.voiceId = 'vocal';
        
        // Formant frequencies for different vowels
        this.formants = {
            'a': { f1: 700, f2: 1220, f3: 2600 },
            'e': { f1: 400, f2: 2200, f3: 2900 },
            'i': { f1: 300, f2: 2700, f3: 3300 },
            'o': { f1: 450, f2: 800, f3: 2830 },
            'u': { f1: 325, f2: 700, f3: 2530 },
            'ah': { f1: 640, f2: 1190, f3: 2390 },
            'oo': { f1: 300, f2: 870, f3: 2240 }
        };
        
        // Consonant noise patterns
        this.consonants = {
            's': { type: 'highpass', freq: 4000, Q: 5 },
            'sh': { type: 'bandpass', freq: 2500, Q: 3 },
            'f': { type: 'highpass', freq: 1200, Q: 10 },
            'k': { type: 'bandpass', freq: 1500, Q: 20 },
            't': { type: 'highpass', freq: 3000, Q: 15 }
        };
    }

    start(params, connectToMaster) {
        if (this.isPlaying) return;
        
        const { density, vowel, pitch, vibrato, whisper } = params;
        this.masterConnection = connectToMaster;
        
        if (density === 0) return;
        
        // Create mixer
        this.nodes.mixer = this.audioContext.createGain();
        this.nodes.mixer.gain.value = 0.5;
        
        if (this.masterConnection) {
            this.masterConnection(this.nodes.mixer);
        }
        
        // Schedule vocal sounds
        this.scheduler = setInterval(() => {
            if (Math.random() < density) {
                const isVowel = Math.random() > whisper;
                if (isVowel) {
                    this.triggerVowel(vowel, pitch, vibrato);
                } else {
                    this.triggerConsonant();
                }
            }
        }, 200);
        
        this.isPlaying = true;
    }

    triggerVowel(vowelType, basePitch, vibratoAmount) {
        const now = this.audioContext.currentTime;
        const duration = 0.2 + Math.random() * 0.8;
        const nodeId = `${this.voiceId}_vowel_${Date.now()}`;
        
        // Get formant frequencies
        const vowelFormants = this.formants[vowelType] || this.formants.a;
        
        // Create fundamental oscillator
        let fundamental, fundamentalGain;
        
        if (this.poolManager) {
            fundamental = this.poolManager.pools.oscillator.acquireOscillator(
                `${nodeId}_fund`,
                { type: 'sawtooth', frequency: basePitch }
            );
            fundamentalGain = this.poolManager.pools.gain.acquireGain(
                `${nodeId}_fund_gain`,
                0
            );
        } else {
            fundamental = this.audioContext.createOscillator();
            fundamentalGain = this.audioContext.createGain();
            fundamental.type = 'sawtooth';
            fundamental.frequency.value = basePitch;
            fundamentalGain.gain.value = 0;
        }
        
        // Add vibrato
        if (vibratoAmount > 0) {
            const vibratoLFO = this.audioContext.createOscillator();
            const vibratoGain = this.audioContext.createGain();
            vibratoLFO.frequency.value = 4 + Math.random() * 3;
            vibratoGain.gain.value = basePitch * vibratoAmount * 0.02;
            vibratoLFO.connect(vibratoGain);
            vibratoGain.connect(fundamental.frequency);
            vibratoLFO.start();
            
            setTimeout(() => {
                vibratoLFO.stop();
                vibratoLFO.disconnect();
                vibratoGain.disconnect();
            }, duration * 1000);
        }
        
        // Create formant filters
        const formantGains = [];
        Object.values(vowelFormants).forEach((freq, i) => {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = freq;
            filter.Q.value = 10;
            
            const formantGain = this.audioContext.createGain();
            formantGain.gain.value = i === 0 ? 0.5 : (0.3 / (i + 1));
            
            fundamental.connect(filter);
            filter.connect(formantGain);
            formantGain.connect(this.nodes.mixer);
            
            this.nodes.formantFilters.push(filter);
            formantGains.push(formantGain);
        });
        
        // Envelope
        fundamentalGain.gain.setValueAtTime(0, now);
        fundamentalGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
        fundamentalGain.gain.exponentialRampToValueAtTime(0.2, now + duration * 0.7);
        fundamentalGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        fundamental.connect(fundamentalGain);
        
        if (!this.poolManager) {
            fundamental.start();
        }
        
        // Schedule cleanup
        setTimeout(() => {
            if (this.poolManager) {
                this.poolManager.pools.oscillator.release(fundamental);
                this.poolManager.pools.gain.release(fundamentalGain);
            } else {
                try {
                    fundamental.stop();
                    fundamental.disconnect();
                    fundamentalGain.disconnect();
                } catch(e) {}
            }
            
            this.nodes.formantFilters.forEach(filter => {
                filter.disconnect();
            });
            formantGains.forEach(gain => {
                gain.disconnect();
            });
            
            this.nodes.formantFilters = this.nodes.formantFilters.filter(f => 
                !this.nodes.formantFilters.includes(f)
            );
        }, duration * 1000 + 100);
    }

    triggerConsonant() {
        const now = this.audioContext.currentTime;
        const duration = 0.05 + Math.random() * 0.1;
        
        // Create noise source
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        // Random consonant filter
        const consonantTypes = Object.keys(this.consonants);
        const consonant = this.consonants[consonantTypes[Math.floor(Math.random() * consonantTypes.length)]];
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = consonant.type;
        filter.frequency.value = consonant.freq;
        filter.Q.value = consonant.Q;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.nodes.mixer);
        
        noise.start();
        noise.stop(now + duration);
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Clean up nodes
        this.nodes.oscillators.forEach(osc => {
            try { osc.stop(); osc.disconnect(); } catch(e) {}
        });
        this.nodes.formantFilters.forEach(filter => {
            try { filter.disconnect(); } catch(e) {}
        });
        this.nodes.gains.forEach(gain => {
            try { gain.disconnect(); } catch(e) {}
        });
        
        if (this.nodes.mixer) {
            this.nodes.mixer.disconnect();
            this.nodes.mixer = null;
        }
        
        this.nodes.oscillators = [];
        this.nodes.formantFilters = [];
        this.nodes.gains = [];
        
        this.isPlaying = false;
    }

    updateParameter(param, value) {
        switch(param) {
            case 'volume':
                if (this.nodes.mixer) {
                    this.nodes.mixer.gain.value = value;
                }
                break;
        }
    }
}