import { ChaosEngine } from '../utils/ChaosEngine.js';

export class ChaosGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.chaosEngine = new ChaosEngine();
        
        this.isPlaying = false;
        this.scheduler = null;
        this.masterConnection = null;
        this.activeNodes = new Set();
        
        // Parameters
        this.params = {
            density: 0.7,
            chaosType: 'lorenz',
            chaosIntensity: 0.8,
            musicalScale: 'pentatonic',
            harmonicResonance: 0.6,
            chaosSpeed: 1.0,
            filterChaos: true,
            morphingEnabled: true
        };
        
        // Musical scales
        this.scales = {
            pentatonic: [0, 2, 4, 7, 9],
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        };
        
        this.baseFrequency = 220;
    }

    start(params, connectCallback) {
        if (this.isPlaying) return;
        
        this.params = { ...this.params, ...params };
        this.masterConnection = connectCallback;
        this.isPlaying = true;
        
        this.startChaosEvolution();
    }

    startChaosEvolution() {
        const updateInterval = Math.max(50, 1000 / (60 * this.params.chaosSpeed));
        
        this.scheduler = setInterval(() => {
            this.updateChaosState();
        }, updateInterval);
    }

    updateChaosState() {
        switch (this.params.chaosType) {
            case 'lorenz':
                const lorenzData = this.chaosEngine.getLorenzMusic();
                this.applyLorenzChaos(lorenzData);
                break;
            case 'rossler':
                const rosslerData = this.chaosEngine.getRosslerMusic();
                this.applyRosslerChaos(rosslerData);
                break;
            case 'chua':
                const chuaData = this.chaosEngine.getChuaMusic();
                this.applyChuaChaos(chuaData);
                break;
            case 'henon':
                const henonData = this.chaosEngine.getHenonMusic();
                this.applyHenonChaos(henonData);
                break;
            case 'logistic':
                const logisticData = this.chaosEngine.getLogisticMusic();
                this.applyLogisticChaos(logisticData);
                break;
        }
    }

    applyLorenzChaos(data) {
        // Make it more likely to trigger
        if (Math.random() < this.params.density * 0.8) {  // Less dependent on amplitude
            const frequency = this.quantizeToScale(data.frequency);
            this.createChaosVoice(frequency, data, 'lorenz');
        }
    }

    applyRosslerChaos(data) {
        if (data.rhythmTrigger && Math.random() < this.params.density) {
            const frequency = this.quantizeToScale(this.baseFrequency * (1 + data.accent));
            this.createChaosVoice(frequency, data, 'rossler');
        }
    }

    applyChuaChaos(data) {
        if (data.glitchTrigger && Math.random() < this.params.density) {
            const frequency = this.quantizeToScale(this.baseFrequency);
            this.createChaosVoice(frequency, data, 'chua');
        }
    }

    applyHenonChaos(data) {
        if (data.gate && Math.random() < this.params.density) {
            const scale = this.scales[this.params.musicalScale];
            const noteIndex = data.chord % scale.length;
            const frequency = this.baseFrequency * Math.pow(2, scale[noteIndex] / 12);
            this.createChaosVoice(frequency, data, 'henon');
        }
    }

    applyLogisticChaos(data) {
        if (Math.random() < data.density * this.params.density) {
            const frequency = this.quantizeToScale(
                this.baseFrequency * (1 + data.complexity * 2)
            );
            this.createChaosVoice(frequency, data, 'logistic');
        }
    }

    createChaosVoice(frequency, data, chaosType) {
        const time = this.audioContext.currentTime;
        const nodeId = `chaos_${chaosType}_${Date.now()}_${Math.random()}`;
        
        let duration, amplitude, oscType;
        
        // Configure based on chaos type
        switch (chaosType) {
            case 'lorenz':
                duration = 2.0;
                amplitude = this.params.chaosIntensity * 0.6;  // More audible
                oscType = 'sawtooth';
                break;
            case 'rossler':
                duration = 0.3;
                amplitude = this.params.chaosIntensity * 0.8;  // More audible
                oscType = 'square';
                break;
            case 'chua':
                duration = 0.2;
                amplitude = this.params.chaosIntensity * 0.7;  // More audible
                oscType = 'sawtooth';
                break;
            case 'henon':
                duration = 1.0;
                amplitude = this.params.chaosIntensity * 0.6;  // More audible
                oscType = 'sine';
                break;
            case 'logistic':
                duration = 0.5 + (data.complexity || 0.5);
                amplitude = this.params.chaosIntensity * 0.6;  // More audible
                oscType = 'triangle';
                break;
            default:
                duration = 1.0;
                amplitude = 0.6;  // More audible
                oscType = 'sine';
        }
        
        const osc = this.poolManager.pools.oscillator.acquireOscillator(nodeId, {
            type: oscType,
            frequency: frequency
        });
        const gain = this.poolManager.pools.gain.acquireGain(nodeId, 0);
        
        if (!osc || !gain) return;
        
        // Apply special effects for certain chaos types
        if (chaosType === 'rossler') {
            osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, time + 0.1);
        }
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(amplitude, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        osc.connect(gain);
        
        if (this.masterConnection) {
            this.masterConnection(gain);
        }
        
        this.activeNodes.add({ osc, gain, nodeId });
        
        osc.stop(time + duration);
        
        setTimeout(() => {
            this.poolManager.pools.oscillator.release(osc);
            this.poolManager.pools.gain.release(gain);
            this.activeNodes.delete({ osc, gain, nodeId });
        }, duration * 1000 + 100);
    }

    quantizeToScale(frequency) {
        if (!this.params.filterChaos) return frequency;
        
        const scale = this.scales[this.params.musicalScale];
        const octave = Math.floor(Math.log2(frequency / this.baseFrequency));
        const pitchClass = (Math.log2(frequency / this.baseFrequency) - octave) * 12;
        
        let closestDegree = scale[0];
        let minDistance = Math.abs(pitchClass - scale[0]);
        
        for (const degree of scale) {
            const distance = Math.abs(pitchClass - degree);
            if (distance < minDistance) {
                minDistance = distance;
                closestDegree = degree;
            }
        }
        
        return this.baseFrequency * Math.pow(2, (octave + closestDegree / 12));
    }

    updateParameter(param, value) {
        this.params[param] = value;
        
        if (param === 'chaosIntensity') {
            this.chaosEngine.perturb(value * 0.1);
        }
    }

    stop() {
        this.isPlaying = false;
        
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Clean up active nodes
        this.activeNodes.forEach(({ osc, gain }) => {
            if (osc) this.poolManager.pools.oscillator.release(osc);
            if (gain) this.poolManager.pools.gain.release(gain);
        });
        this.activeNodes.clear();
    }

    getOutputNode() {
        return null; // Uses connectCallback
    }
}