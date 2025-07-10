import { BiologicalPatterns } from '../utils/BiologicalPatterns.js';

export class BiologicalGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.bioPatterns = new BiologicalPatterns();
        
        this.isPlaying = false;
        this.scheduler = null;
        this.lastTime = 0;
        this.connectCallback = null;
        this.activeVoices = new Set();
        
        // Parameters
        this.params = {
            density: 0.8,
            bioType: 'dna',
            evolutionSpeed: 1.0,
            naturalHarmony: 0.7,
            organicVariation: 0.5,
            lifeComplexity: 0.8,
            adaptiveGrowth: true
        };
        
        this.ecosystemState = { phase: 'growth' };
    }

    start(params, connectCallback) {
        if (this.isPlaying) return;
        
        this.params = { ...this.params, ...params };
        this.connectCallback = connectCallback;
        this.isPlaying = true;
        this.lastTime = this.audioContext.currentTime;
        
        this.startBiologicalEvolution();
    }

    startBiologicalEvolution() {
        const updateInterval = 100; // 10 FPS for biological evolution
        
        this.scheduler = setInterval(() => {
            const currentTime = this.audioContext.currentTime;
            const deltaTime = (currentTime - this.lastTime) * this.params.evolutionSpeed;
            this.lastTime = currentTime;
            
            this.updateBiologicalState(deltaTime);
        }, updateInterval);
    }

    updateBiologicalState(deltaTime) {
        switch (this.params.bioType) {
            case 'dna':
                const dnaData = this.bioPatterns.getDNAMusic();
                this.applyDNAMusic(dnaData);
                break;
            case 'heartbeat':
                const heartData = this.bioPatterns.getHeartbeatMusic(deltaTime);
                this.applyHeartbeatMusic(heartData);
                break;
            case 'brainwave':
                const brainData = this.bioPatterns.getBrainwaveMusic(deltaTime);
                this.applyBrainwaveMusic(brainData);
                break;
            case 'fibonacci':
                const fibData = this.bioPatterns.getFibonacciMusic();
                this.applyFibonacciMusic(fibData);
                break;
            case 'cellular':
                const cellData = this.bioPatterns.getCellularAutomatonMusic();
                this.applyCellularMusic(cellData);
                break;
            case 'ecosystem':
                const ecoData = this.bioPatterns.getEcosystemMusic(deltaTime);
                this.applyEcosystemMusic(ecoData);
                break;
            case 'genetic':
                const genData = this.bioPatterns.getGeneticMusic();
                if (Math.random() < 0.1) {
                    this.bioPatterns.evolvePopulation();
                }
                this.applyGeneticMusic(genData);
                break;
        }
    }

    applyDNAMusic(data) {
        if (Math.random() < this.params.density * 0.8) {  // Less dependent on data.density
            const scaleIndex = Math.floor(Math.random() * data.scale.length);
            const note = data.scale[scaleIndex];
            const frequency = data.baseFrequency * Math.pow(2, note / 12);
            
            this.createSimpleVoice(frequency, 1.5, 'sine', this.params.lifeComplexity * 0.6);
        }
        
        if (data.geneExpression > 0.4) {  // Lower threshold
            this.createGeneExpressionEffect(data);
        }
    }

    applyHeartbeatMusic(data) {
        if (data.kick) {
            this.createHeartbeatVoice(data);
        }
        
        if (data.harmonicCoherence > 0.5 && Math.random() < this.params.density * 0.8) {  // Lower threshold, higher probability
            this.createSimpleVoice(
                100 + data.harmonicCoherence * 150, 
                0.8, 
                'triangle',
                this.params.lifeComplexity * 0.5  // More audible
            );
        }
    }

    applyBrainwaveMusic(data) {
        Object.keys(data).forEach(waveType => {
            if (waveType.endsWith('Level')) return;
            
            const wave = data[waveType];
            if (Math.abs(wave.amplitude) > 0.2 && Math.random() < this.params.density * 0.6) {  // Lower threshold, higher probability
                const frequency = 200 + wave.frequency * 10;
                this.createSimpleVoice(
                    frequency, 
                    3.0, 
                    'sine',
                    this.params.lifeComplexity * 0.5  // More audible
                );
            }
        });
    }

    applyFibonacciMusic(data) {
        if (Math.random() < this.params.density * this.params.naturalHarmony) {
            const freqIndex = Math.floor(Math.random() * data.frequencies.length);
            const frequency = data.frequencies[freqIndex];
            
            this.createSimpleVoice(
                frequency, 
                2.0, 
                'triangle',
                this.params.naturalHarmony * this.params.lifeComplexity * 0.3
            );
        }
    }

    applyCellularMusic(data) {
        data.triggers.forEach((trigger, index) => {
            if (trigger && Math.random() < this.params.density * 0.8) {  // Higher probability
                const frequency = 220 * Math.pow(2, index / 12);
                this.createSimpleVoice(
                    frequency, 
                    0.1, 
                    data.complexity > 0.5 ? 'square' : 'triangle',
                    this.params.lifeComplexity * 0.6  // More audible
                );
            }
        });
    }

    applyEcosystemMusic(data) {
        const phase = this.determineEcosystemPhase(data);
        
        if (phase !== this.ecosystemState.phase) {
            this.ecosystemState.phase = phase;
        }
        
        if (Math.random() < this.params.density * 0.8) {  // Less dependent on stability
            this.createEcosystemVoice(data);
        }
    }

    applyGeneticMusic(data) {
        const genes = data.musicalGenes;
        
        genes.rhythms.forEach((rhythm, index) => {
            if (rhythm && Math.random() < this.params.density * 0.7) {  // Higher probability
                const frequency = genes.frequencies[index % genes.frequencies.length];
                const amplitude = genes.amplitudes[index % genes.amplitudes.length];
                
                this.createSimpleVoice(
                    frequency, 
                    0.5 + amplitude, 
                    data.fitness > 5 ? 'sine' : 'sawtooth',
                    this.params.lifeComplexity * 0.5  // More audible
                );
            }
        });
    }

    createSimpleVoice(frequency, duration, type, amplitude) {
        const time = this.audioContext.currentTime;
        const nodeId = `bio_${type}_${Date.now()}_${Math.random()}`;
        
        const osc = this.poolManager.pools.oscillator.acquireOscillator(nodeId, {
            type: type,
            frequency: frequency
        });
        const gain = this.poolManager.pools.gain.acquireGain(nodeId, 0);
        
        if (!osc || !gain) return;
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(amplitude * 0.6, time + 0.1);  // More audible
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        osc.connect(gain);
        
        if (this.connectCallback) {
            this.connectCallback(gain);
        }
        
        this.activeVoices.add({ osc, gain, nodeId });
        
        osc.stop(time + duration);
        
        setTimeout(() => {
            this.poolManager.pools.oscillator.release(osc);
            this.poolManager.pools.gain.release(gain);
            this.activeVoices.delete({ osc, gain, nodeId });
        }, duration * 1000 + 100);
    }

    createGeneExpressionEffect(data) {
        const time = this.audioContext.currentTime;
        const duration = 3.0;
        const nodeId = `bio_gene_${Date.now()}_${Math.random()}`;
        
        const osc = this.poolManager.pools.oscillator.acquireOscillator(nodeId, {
            type: 'triangle',
            frequency: 80 + data.geneExpression * 200
        });
        const gain = this.poolManager.pools.gain.acquireGain(nodeId, 0);
        
        if (!osc || !gain) return;
        
        const amplitude = data.geneExpression * this.params.lifeComplexity * 0.4;  // More audible
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(amplitude, time + 1.0);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        osc.connect(gain);
        
        if (this.connectCallback) {
            this.connectCallback(gain);
        }
        
        this.activeVoices.add({ osc, gain, nodeId });
        
        osc.stop(time + duration);
        
        setTimeout(() => {
            this.poolManager.pools.oscillator.release(osc);
            this.poolManager.pools.gain.release(gain);
            this.activeVoices.delete({ osc, gain, nodeId });
        }, duration * 1000 + 100);
    }

    createHeartbeatVoice(data) {
        const time = this.audioContext.currentTime;
        const duration = 0.4;
        const nodeId = `bio_heart_${Date.now()}_${Math.random()}`;
        
        const osc = this.poolManager.pools.oscillator.acquireOscillator(nodeId, {
            type: 'sine',
            frequency: 40
        });
        const gain = this.poolManager.pools.gain.acquireGain(nodeId, 0);
        
        if (!osc || !gain) return;
        
        const amplitude = 0.9 * this.params.lifeComplexity;  // More audible
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(amplitude, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        osc.connect(gain);
        
        if (this.connectCallback) {
            this.connectCallback(gain);
        }
        
        this.activeVoices.add({ osc, gain, nodeId });
        
        osc.stop(time + duration);
        
        setTimeout(() => {
            this.poolManager.pools.oscillator.release(osc);
            this.poolManager.pools.gain.release(gain);
            this.activeVoices.delete({ osc, gain, nodeId });
        }, duration * 1000 + 100);
    }

    createEcosystemVoice(data) {
        const time = this.audioContext.currentTime;
        const duration = 2.0;
        
        // Create prey sound
        const nodeId1 = `bio_prey_${Date.now()}_${Math.random()}`;
        const osc1 = this.poolManager.pools.oscillator.acquireOscillator(nodeId1, {
            type: 'triangle',
            frequency: data.preyFreq
        });
        const gain1 = this.poolManager.pools.gain.acquireGain(nodeId1, 0);
        
        if (osc1 && gain1) {
            const amplitude1 = data.balance * 0.3 * this.params.lifeComplexity;
            gain1.gain.setValueAtTime(0, time);
            gain1.gain.linearRampToValueAtTime(amplitude1, time + 0.2);
            gain1.gain.exponentialRampToValueAtTime(0.01, time + duration);
            
            osc1.connect(gain1);
            
            if (this.connectCallback) {
                this.connectCallback(gain1);
            }
            
            this.activeVoices.add({ osc: osc1, gain: gain1, nodeId: nodeId1 });
            
            osc1.stop(time + duration);
            
            setTimeout(() => {
                this.poolManager.pools.oscillator.release(osc1);
                this.poolManager.pools.gain.release(gain1);
                this.activeVoices.delete({ osc: osc1, gain: gain1, nodeId: nodeId1 });
            }, duration * 1000 + 100);
        }

        // Create predator sound
        const nodeId2 = `bio_predator_${Date.now()}_${Math.random()}`;
        const osc2 = this.poolManager.pools.oscillator.acquireOscillator(nodeId2, {
            type: 'sawtooth',
            frequency: data.predatorFreq
        });
        const gain2 = this.poolManager.pools.gain.acquireGain(nodeId2, 0);
        
        if (osc2 && gain2) {
            const amplitude2 = (1 - data.balance) * 0.2 * this.params.lifeComplexity;
            gain2.gain.setValueAtTime(0, time);
            gain2.gain.linearRampToValueAtTime(amplitude2, time + 0.2);
            gain2.gain.exponentialRampToValueAtTime(0.01, time + duration);
            
            osc2.connect(gain2);
            
            if (this.connectCallback) {
                this.connectCallback(gain2);
            }
            
            this.activeVoices.add({ osc: osc2, gain: gain2, nodeId: nodeId2 });
            
            osc2.stop(time + duration);
            
            setTimeout(() => {
                this.poolManager.pools.oscillator.release(osc2);
                this.poolManager.pools.gain.release(gain2);
                this.activeVoices.delete({ osc: osc2, gain: gain2, nodeId: nodeId2 });
            }, duration * 1000 + 100);
        }
    }

    determineEcosystemPhase(data) {
        if (data.tension > 0.8) return 'crisis';
        if (data.stability > 0.7) return 'stable';
        if (data.balance < 0.3) return 'decline';
        return 'growth';
    }

    updateParameter(param, value) {
        this.params[param] = value;
        
        if (param === 'bioType') {
            this.bioPatterns.reset();
        }
    }

    stop() {
        this.isPlaying = false;
        
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Clean up active voices
        this.activeVoices.forEach(({ osc, gain }) => {
            if (osc) this.poolManager.pools.oscillator.release(osc);
            if (gain) this.poolManager.pools.gain.release(gain);
        });
        this.activeVoices.clear();
    }

    getOutputNode() {
        return null; // Uses connectCallback
    }
}