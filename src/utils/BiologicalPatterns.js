export class BiologicalPatterns {
    constructor() {
        // DNA sequence simulation
        this.dnaSequence = this.generateDNASequence(64);
        this.dnaPointer = 0;
        
        // Heartbeat variability
        this.heartbeat = {
            baseRate: 70, // BPM
            variability: 0.1,
            phase: 0,
            coherence: 0.5
        };
        
        // Brainwave simulation
        this.brainwaves = {
            delta: { freq: 2, amplitude: 0.3, phase: 0 },    // Deep sleep
            theta: { freq: 6, amplitude: 0.4, phase: 0 },    // Meditation
            alpha: { freq: 10, amplitude: 0.5, phase: 0 },   // Relaxed
            beta: { freq: 20, amplitude: 0.6, phase: 0 },    // Active thinking
            gamma: { freq: 40, amplitude: 0.2, phase: 0 }    // High-level cognition
        };
        
        // Plant growth patterns (Fibonacci spirals)
        this.fibonacci = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
        this.goldenRatio = 1.618033988749;
        this.spiralAngle = 0;
        
        // Cellular automata
        this.cellularAutomaton = new Array(32).fill(0);
        this.cellularAutomaton[16] = 1; // Start with one active cell
        this.caRule = 30; // Rule 30 produces chaotic patterns
        
        // Ecosystem dynamics
        this.ecosystem = {
            predator: 50,
            prey: 100,
            vegetation: 200,
            time: 0
        };
        
        // Genetic algorithm population
        this.population = this.initializePopulation(16);
        this.generation = 0;
    }

    // DNA sequence to musical patterns
    generateDNASequence(length) {
        const bases = ['A', 'T', 'G', 'C'];
        return Array.from({ length }, () => bases[Math.floor(Math.random() * 4)]);
    }

    getDNAMusic() {
        const currentBase = this.dnaSequence[this.dnaPointer];
        this.dnaPointer = (this.dnaPointer + 1) % this.dnaSequence.length;
        
        // Map DNA bases to musical properties
        const mapping = {
            'A': { frequency: 110, scale: [0, 2, 4, 5, 7, 9, 11], density: 0.8 },  // Major
            'T': { frequency: 146.83, scale: [0, 2, 3, 5, 7, 8, 10], density: 0.6 }, // Minor
            'G': { frequency: 196, scale: [0, 2, 4, 6, 7, 9, 11], density: 0.9 },   // Lydian
            'C': { frequency: 261.63, scale: [0, 1, 3, 5, 6, 8, 10], density: 0.4 } // Locrian
        };
        
        return {
            baseFrequency: mapping[currentBase].frequency,
            scale: mapping[currentBase].scale,
            density: mapping[currentBase].density,
            sequence: this.dnaSequence.slice(this.dnaPointer, this.dnaPointer + 8),
            geneExpression: this.calculateGeneExpression()
        };
    }

    calculateGeneExpression() {
        // Simulate gene expression based on recent DNA sequence
        const recentSequence = this.dnaSequence.slice(Math.max(0, this.dnaPointer - 8), this.dnaPointer);
        const gcContent = recentSequence.filter(base => base === 'G' || base === 'C').length / recentSequence.length;
        return gcContent; // GC content affects gene expression
    }

    // Heartbeat rhythm variability (HRV)
    getHeartbeatMusic(deltaTime) {
        this.heartbeat.phase += deltaTime;
        
        // Heart Rate Variability - natural variation in heartbeat
        const hrv = Math.sin(this.heartbeat.phase * 0.1) * this.heartbeat.variability;
        const currentRate = this.heartbeat.baseRate * (1 + hrv);
        
        // Coherence affects musical harmony
        const coherence = 0.5 + 0.5 * Math.sin(this.heartbeat.phase * 0.05);
        this.heartbeat.coherence = coherence;
        
        return {
            tempo: currentRate,
            kick: Math.sin(this.heartbeat.phase * currentRate / 60 * 2 * Math.PI) > 0.8 ? 1 : 0,
            harmonicCoherence: coherence,
            variability: Math.abs(hrv),
            systolic: Math.sin(this.heartbeat.phase * currentRate / 60 * 2 * Math.PI),
            diastolic: Math.cos(this.heartbeat.phase * currentRate / 60 * 2 * Math.PI * 0.6)
        };
    }

    // Brainwave entrainment
    getBrainwaveMusic(deltaTime) {
        const result = {};
        
        Object.keys(this.brainwaves).forEach(wave => {
            const brainwave = this.brainwaves[wave];
            brainwave.phase += deltaTime * brainwave.freq * 2 * Math.PI;
            
            result[wave] = {
                amplitude: brainwave.amplitude * Math.sin(brainwave.phase),
                frequency: brainwave.freq,
                power: brainwave.amplitude
            };
        });
        
        // Combine brainwaves for musical parameters
        return {
            bassFreq: 50 + result.delta.amplitude * 100,
            midFreq: 200 + result.theta.amplitude * 300,
            highFreq: 1000 + result.alpha.amplitude * 2000,
            energyLevel: result.beta.power,
            creativityLevel: result.gamma.power,
            relaxationLevel: result.alpha.power,
            focusLevel: result.beta.power - result.theta.power,
            meditation: result.theta.power > 0.5 ? 1 : 0
        };
    }

    // Fibonacci spiral growth patterns
    getFibonacciMusic() {
        this.spiralAngle += this.goldenRatio * 0.1;
        
        // Phi-based timing
        const fibIndex = Math.floor(this.spiralAngle) % this.fibonacci.length;
        const currentFib = this.fibonacci[fibIndex];
        const nextFib = this.fibonacci[(fibIndex + 1) % this.fibonacci.length];
        
        // Golden ratio in frequency relationships
        const baseFreq = 220;
        const frequencies = [
            baseFreq,
            baseFreq * this.goldenRatio,
            baseFreq * Math.pow(this.goldenRatio, 2),
            baseFreq * Math.pow(this.goldenRatio, 3)
        ];
        
        return {
            frequencies: frequencies,
            pattern: this.fibonacci.slice(0, 8),
            phiRatio: this.goldenRatio,
            spiralPosition: this.spiralAngle,
            growthRate: currentFib / nextFib,
            harmony: this.generatePhiHarmony(baseFreq),
            timing: this.fibonacci.map(f => f / 89) // Normalize to [0,1]
        };
    }

    generatePhiHarmony(fundamental) {
        // Generate harmonically related frequencies using golden ratio
        return [
            fundamental,
            fundamental * this.goldenRatio,
            fundamental * Math.pow(this.goldenRatio, 2),
            fundamental * (2 - 1/this.goldenRatio), // Conjugate
            fundamental * Math.pow(this.goldenRatio, -1)
        ];
    }

    // Cellular automata patterns
    getCellularAutomatonMusic() {
        // Apply Rule 30 to generate next generation
        const newCells = new Array(this.cellularAutomaton.length);
        
        for (let i = 0; i < this.cellularAutomaton.length; i++) {
            const left = this.cellularAutomaton[(i - 1 + this.cellularAutomaton.length) % this.cellularAutomaton.length];
            const center = this.cellularAutomaton[i];
            const right = this.cellularAutomaton[(i + 1) % this.cellularAutomaton.length];
            
            // Rule 30: 111->0, 110->0, 101->0, 100->1, 011->1, 010->1, 001->1, 000->0
            const pattern = left * 4 + center * 2 + right;
            newCells[i] = (this.caRule >> pattern) & 1;
        }
        
        this.cellularAutomaton = newCells;
        
        // Convert cellular pattern to musical parameters
        const activePercent = this.cellularAutomaton.reduce((sum, cell) => sum + cell, 0) / this.cellularAutomaton.length;
        
        return {
            pattern: [...this.cellularAutomaton],
            density: activePercent,
            complexity: this.calculateComplexity(this.cellularAutomaton),
            triggers: this.cellularAutomaton.map(cell => cell ? 1 : 0),
            evolution: this.cellularAutomaton,
            clusters: this.findClusters(this.cellularAutomaton)
        };
    }

    calculateComplexity(pattern) {
        // Calculate pattern complexity using entropy
        let transitions = 0;
        for (let i = 1; i < pattern.length; i++) {
            if (pattern[i] !== pattern[i-1]) transitions++;
        }
        return transitions / (pattern.length - 1);
    }

    findClusters(pattern) {
        const clusters = [];
        let currentCluster = [];
        
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === 1) {
                currentCluster.push(i);
            } else if (currentCluster.length > 0) {
                clusters.push([...currentCluster]);
                currentCluster = [];
            }
        }
        
        if (currentCluster.length > 0) {
            clusters.push(currentCluster);
        }
        
        return clusters;
    }

    // Ecosystem dynamics (Lotka-Volterra equations)
    getEcosystemMusic(deltaTime) {
        const { predator, prey, vegetation } = this.ecosystem;
        
        // Lotka-Volterra predator-prey model
        const alpha = 0.1;   // Prey birth rate
        const beta = 0.075;  // Predation rate
        const delta = 0.05;  // Predator efficiency
        const gamma = 0.125; // Predator death rate
        
        const dPrey = alpha * prey - beta * prey * predator;
        const dPredator = delta * prey * predator - gamma * predator;
        const dVegetation = 0.2 * vegetation * (1 - vegetation / 300) - 0.1 * prey;
        
        this.ecosystem.prey += dPrey * deltaTime;
        this.ecosystem.predator += dPredator * deltaTime;
        this.ecosystem.vegetation += dVegetation * deltaTime;
        this.ecosystem.time += deltaTime;
        
        // Prevent negative populations
        this.ecosystem.prey = Math.max(1, this.ecosystem.prey);
        this.ecosystem.predator = Math.max(1, this.ecosystem.predator);
        this.ecosystem.vegetation = Math.max(1, this.ecosystem.vegetation);
        
        return {
            preyFreq: 100 + this.ecosystem.prey * 2,
            predatorFreq: 200 + this.ecosystem.predator * 4,
            vegetationDensity: this.ecosystem.vegetation / 300,
            balance: this.ecosystem.prey / (this.ecosystem.predator + 1),
            tension: Math.abs(dPrey) + Math.abs(dPredator),
            stability: 1 / (1 + Math.abs(dPrey) + Math.abs(dPredator)),
            cycle: Math.sin(this.ecosystem.time * 0.1)
        };
    }

    // Genetic algorithm for evolving musical patterns
    initializePopulation(size) {
        return Array.from({ length: size }, () => ({
            genes: Array.from({ length: 16 }, () => Math.random()),
            fitness: 0
        }));
    }

    evolvePopulation() {
        // Calculate fitness (musical fitness could be based on harmony, rhythm, etc.)
        this.population.forEach(individual => {
            individual.fitness = this.calculateMusicalFitness(individual.genes);
        });
        
        // Selection and crossover
        const newPopulation = [];
        for (let i = 0; i < this.population.length; i++) {
            const parent1 = this.selectParent();
            const parent2 = this.selectParent();
            const child = this.crossover(parent1, parent2);
            this.mutate(child);
            newPopulation.push(child);
        }
        
        this.population = newPopulation;
        this.generation++;
        
        return this.getBestIndividual();
    }

    calculateMusicalFitness(genes) {
        // Simple fitness: prefer patterns with good rhythm and harmony
        let fitness = 0;
        
        // Rhythmic fitness
        for (let i = 0; i < genes.length - 1; i++) {
            if (Math.abs(genes[i] - genes[i + 1]) < 0.5) fitness += 1;
        }
        
        // Harmonic fitness (penalize too much randomness)
        const variance = this.calculateVariance(genes);
        fitness += Math.max(0, 1 - variance);
        
        return fitness;
    }

    calculateVariance(arr) {
        const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
        return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    }

    selectParent() {
        // Tournament selection
        const tournamentSize = 3;
        let best = this.population[Math.floor(Math.random() * this.population.length)];
        
        for (let i = 1; i < tournamentSize; i++) {
            const competitor = this.population[Math.floor(Math.random() * this.population.length)];
            if (competitor.fitness > best.fitness) {
                best = competitor;
            }
        }
        
        return best;
    }

    crossover(parent1, parent2) {
        const crossoverPoint = Math.floor(Math.random() * parent1.genes.length);
        const childGenes = [
            ...parent1.genes.slice(0, crossoverPoint),
            ...parent2.genes.slice(crossoverPoint)
        ];
        
        return { genes: childGenes, fitness: 0 };
    }

    mutate(individual) {
        const mutationRate = 0.1;
        individual.genes = individual.genes.map(gene => 
            Math.random() < mutationRate ? Math.random() : gene
        );
    }

    getBestIndividual() {
        return this.population.reduce((best, individual) => 
            individual.fitness > best.fitness ? individual : best
        );
    }

    getGeneticMusic() {
        const best = this.getBestIndividual();
        return {
            pattern: best.genes,
            fitness: best.fitness,
            generation: this.generation,
            diversity: this.calculatePopulationDiversity(),
            evolution: this.population.map(ind => ind.fitness),
            musicalGenes: this.genesToMusic(best.genes)
        };
    }

    calculatePopulationDiversity() {
        let totalDistance = 0;
        let comparisons = 0;
        
        for (let i = 0; i < this.population.length; i++) {
            for (let j = i + 1; j < this.population.length; j++) {
                totalDistance += this.calculateGeneticDistance(
                    this.population[i].genes, 
                    this.population[j].genes
                );
                comparisons++;
            }
        }
        
        return totalDistance / comparisons;
    }

    calculateGeneticDistance(genes1, genes2) {
        return genes1.reduce((sum, gene, i) => sum + Math.abs(gene - genes2[i]), 0);
    }

    genesToMusic(genes) {
        return {
            frequencies: genes.slice(0, 4).map(g => 220 + g * 880),
            rhythms: genes.slice(4, 8).map(g => g > 0.5 ? 1 : 0),
            amplitudes: genes.slice(8, 12),
            effects: genes.slice(12, 16)
        };
    }

    // Reset all biological systems
    reset() {
        this.dnaPointer = 0;
        this.heartbeat.phase = 0;
        Object.values(this.brainwaves).forEach(wave => wave.phase = 0);
        this.spiralAngle = 0;
        this.cellularAutomaton = new Array(32).fill(0);
        this.cellularAutomaton[16] = 1;
        this.ecosystem = { predator: 50, prey: 100, vegetation: 200, time: 0 };
        this.population = this.initializePopulation(16);
        this.generation = 0;
    }
}