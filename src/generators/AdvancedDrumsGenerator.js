import { 
    ProbabilityTrigger, 
    MarkovChain, 
    EuclideanRhythm, 
    PolyrhythmGenerator,
    PatternTransforms 
} from '../utils/PatternGenerators.js';

export class AdvancedDrumsGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.scheduler = null;
        this.isPlaying = false;
        
        // Pattern generators
        this.probabilityTriggers = {
            kick: new ProbabilityTrigger(),
            snare: new ProbabilityTrigger(),
            hihat: new ProbabilityTrigger(),
            perc: new ProbabilityTrigger()
        };
        
        this.markovChains = {
            kick: new MarkovChain(2),
            snare: new MarkovChain(2),
            hihat: new MarkovChain(1)
        };
        
        this.polyrhythm = new PolyrhythmGenerator();
        
        // Train Markov chains with some default patterns
        this.trainMarkovChains();
        
        // Current pattern mode
        this.patternMode = 'euclidean'; // 'traditional', 'euclidean', 'markov', 'polyrhythm'
        
        // Euclidean patterns
        this.euclideanPatterns = {};
        
        // Traditional patterns (from original DrumsGenerator)
        this.traditionalPatterns = this.getTraditionalPatterns();
    }
    
    trainMarkovChains() {
        // Train with common patterns
        this.markovChains.kick.train([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]);
        this.markovChains.kick.train([1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0]);
        this.markovChains.kick.train([1,0,1,0,0,0,1,0,1,0,1,0,0,0,1,0]);
        
        this.markovChains.snare.train([0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]);
        this.markovChains.snare.train([0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,0]);
        this.markovChains.snare.train([0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0]);
        
        this.markovChains.hihat.train([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]);
        this.markovChains.hihat.train([1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1]);
        this.markovChains.hihat.train([1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1]);
    }
    
    start(params, masterNodes) {
        if (this.isPlaying) return;
        
        this.masterNodes = masterNodes;
        this.params = params;
        
        // Generate patterns based on mode
        this.generatePatterns();
        
        // Start sequencer
        const interval = 60000 / (params.tempo * 4); // 16th notes
        let step = 0;
        
        this.scheduler = setInterval(() => {
            this.processStep(step);
            step++;
        }, interval);
        
        this.isPlaying = true;
    }
    
    generatePatterns() {
        const { 
            patternMode = 'euclidean',
            euclideanSteps = 16,
            kickPulses = 4,
            snarePulses = 2,
            hihatPulses = 8,
            polyLengths = [3, 4, 5]
        } = this.params;
        
        this.patternMode = patternMode;
        
        switch (patternMode) {
            case 'euclidean':
                this.euclideanPatterns = {
                    kick: EuclideanRhythm.generate(euclideanSteps, kickPulses),
                    snare: EuclideanRhythm.generate(euclideanSteps, snarePulses, 4),
                    hihat: EuclideanRhythm.generate(euclideanSteps, hihatPulses),
                    perc: EuclideanRhythm.generateComplement(euclideanSteps, Math.floor(euclideanSteps / 3))
                };
                break;
                
            case 'polyrhythm':
                this.polyrhythm.reset();
                this.polyrhythm.addTrack('kick', 
                    new Array(polyLengths[0]).fill(0).map((_, i) => i === 0 ? 1 : 0), 1);
                this.polyrhythm.addTrack('snare', 
                    new Array(polyLengths[1]).fill(0).map((_, i) => i === 0 ? 1 : 0), 1);
                this.polyrhythm.addTrack('hihat', 
                    new Array(polyLengths[2]).fill(0).map((_, i) => i % 2 === 0 ? 1 : 0), 1);
                break;
        }
    }
    
    processStep(step) {
        const { 
            density, 
            variation, 
            swing, 
            probability,
            humanize = 0.5,
            patternLength = 16
        } = this.params;
        
        const patternStep = step % patternLength;
        let triggers = {};
        
        // Get triggers based on pattern mode
        switch (this.patternMode) {
            case 'traditional':
                const pattern = this.traditionalPatterns[this.params.pattern || 'techno'];
                triggers = {
                    kick: pattern.kick[patternStep % pattern.kick.length],
                    snare: pattern.snare[patternStep % pattern.snare.length],
                    hihat: pattern.hihat[patternStep % pattern.hihat.length],
                    perc: pattern.perc ? pattern.perc[patternStep % pattern.perc.length] : 0
                };
                break;
                
            case 'euclidean':
                triggers = {
                    kick: this.euclideanPatterns.kick[patternStep],
                    snare: this.euclideanPatterns.snare[patternStep],
                    hihat: this.euclideanPatterns.hihat[patternStep],
                    perc: this.euclideanPatterns.perc[patternStep]
                };
                break;
                
            case 'markov':
                triggers = {
                    kick: this.markovChains.kick.next(),
                    snare: this.markovChains.snare.next(),
                    hihat: this.markovChains.hihat.next(),
                    perc: Math.random() < 0.1 ? 1 : 0
                };
                break;
                
            case 'polyrhythm':
                triggers = this.polyrhythm.step();
                break;
        }
        
        // Apply probability-based triggering
        if (probability) {
            const shouldTriggerKick = triggers.kick && 
                this.probabilityTriggers.kick.shouldTriggerAntiPattern(density * 0.9);
            const shouldTriggerSnare = triggers.snare && 
                this.probabilityTriggers.snare.shouldTriggerAntiPattern(density * 0.8);
            const shouldTriggerHihat = triggers.hihat && 
                this.probabilityTriggers.hihat.shouldTrigger(density * 0.7);
            
            triggers.kick = shouldTriggerKick ? triggers.kick : 0;
            triggers.snare = shouldTriggerSnare ? triggers.snare : 0;
            triggers.hihat = shouldTriggerHihat ? triggers.hihat : 0;
        }
        
        // Apply swing
        const swingAmount = (patternStep % 2) * swing * 0.2;
        const microTiming = (Math.random() - 0.5) * variation * 10 + swingAmount;
        
        // Trigger drums with humanization
        if (triggers.kick) {
            const velocity = triggers.kick * (1 - humanize * 0.3 + Math.random() * humanize * 0.3);
            setTimeout(() => this.playKick(velocity), microTiming);
        }
        
        if (triggers.snare) {
            const velocity = triggers.snare * (1 - humanize * 0.3 + Math.random() * humanize * 0.3);
            setTimeout(() => this.playSnare(velocity), microTiming);
        }
        
        if (triggers.hihat) {
            const velocity = triggers.hihat * (1 - humanize * 0.2 + Math.random() * humanize * 0.2);
            const isOpen = patternStep % 4 === 2 && Math.random() < 0.3;
            setTimeout(() => this.playHihat(velocity, isOpen), microTiming);
        }
        
        if (triggers.perc && triggers.perc > 0) {
            setTimeout(() => this.playPerc(triggers.perc), microTiming);
        }
    }
    
    // Simplified drum sound methods (reuse from original DrumsGenerator)
    playKick(velocity) {
        const time = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.frequency.setValueAtTime(60, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
        
        gain.gain.setValueAtTime(velocity, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        osc.connect(gain);
        this.connectToMaster(gain);
        
        osc.start(time);
        osc.stop(time + 0.5);
    }
    
    playSnare(velocity) {
        const time = this.audioContext.currentTime;
        
        // Noise
        const noiseBuffer = this.audioContext.createBuffer(1, 4096, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 4096; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(velocity * 0.8, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        
        // Tone
        const osc = this.audioContext.createOscillator();
        osc.frequency.value = 200;
        
        const oscGain = this.audioContext.createGain();
        oscGain.gain.setValueAtTime(velocity * 0.5, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        // Connect
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        osc.connect(oscGain);
        
        this.connectToMaster(noiseGain);
        this.connectToMaster(oscGain);
        
        noise.start(time);
        osc.start(time);
        osc.stop(time + 0.1);
    }
    
    playHihat(velocity, isOpen) {
        const time = this.audioContext.currentTime;
        const duration = isOpen ? 0.3 : 0.05;
        
        // Metallic noise
        const buffer = this.audioContext.createBuffer(1, 2048, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < 2048; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.1);
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(velocity * 0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        source.connect(filter);
        filter.connect(gain);
        this.connectToMaster(gain);
        
        source.start(time);
    }
    
    playPerc(velocity) {
        const time = this.audioContext.currentTime;
        const freq = 400 + Math.random() * 800;
        
        const osc = this.audioContext.createOscillator();
        osc.frequency.value = freq;
        osc.type = 'triangle';
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(velocity * 0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        
        osc.connect(gain);
        this.connectToMaster(gain);
        
        osc.start(time);
        osc.stop(time + 0.05);
    }
    
    connectToMaster(node) {
        if (this.masterNodes) {
            node.connect(this.masterNodes.dryGain);
            node.connect(this.masterNodes.convolver);
        }
    }
    
    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Reset pattern generators
        Object.values(this.probabilityTriggers).forEach(trigger => trigger.reset());
        Object.values(this.markovChains).forEach(chain => chain.reset());
        this.polyrhythm.reset();
        
        this.isPlaying = false;
    }
    
    updateParameter(param, value) {
        // Update params and regenerate patterns if needed
        this.params[param] = value;
        
        if (['patternMode', 'euclideanSteps', 'kickPulses', 'snarePulses', 'hihatPulses', 'polyLengths'].includes(param)) {
            this.generatePatterns();
        }
    }
    
    getTraditionalPatterns() {
        return {
            techno: {
                kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
                perc: [0, 0, 0, 0.3, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0.4]
            },
            breakbeat: {
                kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
                snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
                hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                perc: [0, 0, 0.4, 0, 0, 0, 0.3, 0, 0, 0, 0, 0.5, 0, 0, 0, 0]
            }
        };
    }
}