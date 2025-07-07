// Advanced pattern generation utilities

export class ProbabilityTrigger {
    constructor() {
        this.history = [];
        this.maxHistory = 16;
    }
    
    // Probability with memory - less likely to repeat recent patterns
    shouldTrigger(baseProbability, memoryFactor = 0.5) {
        let probability = baseProbability;
        
        // Reduce probability based on recent triggers
        const recentTriggers = this.history.slice(-4).filter(h => h).length;
        probability *= Math.pow(1 - memoryFactor, recentTriggers);
        
        const triggered = Math.random() < probability;
        this.history.push(triggered);
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        return triggered;
    }
    
    // Probability with pattern avoidance
    shouldTriggerAntiPattern(baseProbability, patternLength = 4) {
        if (this.history.length < patternLength * 2) {
            return Math.random() < baseProbability;
        }
        
        // Check if the last pattern would repeat
        const recent = this.history.slice(-patternLength);
        const previous = this.history.slice(-patternLength * 2, -patternLength);
        
        const wouldRepeat = recent.every((val, i) => val === previous[i]);
        
        // Reduce probability if pattern would repeat
        const probability = wouldRepeat ? baseProbability * 0.3 : baseProbability;
        
        const triggered = Math.random() < probability;
        this.history.push(triggered);
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        return triggered;
    }
    
    reset() {
        this.history = [];
    }
}

export class MarkovChain {
    constructor(order = 1) {
        this.order = order;
        this.transitions = new Map();
        this.currentState = [];
    }
    
    // Train the chain with a pattern
    train(pattern) {
        for (let i = 0; i < pattern.length - this.order; i++) {
            const state = pattern.slice(i, i + this.order).join(',');
            const next = pattern[i + this.order];
            
            if (!this.transitions.has(state)) {
                this.transitions.set(state, new Map());
            }
            
            const stateTransitions = this.transitions.get(state);
            stateTransitions.set(next, (stateTransitions.get(next) || 0) + 1);
        }
        
        // Initialize current state
        if (this.currentState.length === 0 && pattern.length >= this.order) {
            this.currentState = pattern.slice(0, this.order);
        }
    }
    
    // Generate next value
    next() {
        const stateKey = this.currentState.join(',');
        const possibleTransitions = this.transitions.get(stateKey);
        
        if (!possibleTransitions || possibleTransitions.size === 0) {
            // Random fallback
            const value = Math.random() > 0.5 ? 1 : 0;
            this.updateState(value);
            return value;
        }
        
        // Weighted random selection
        const total = Array.from(possibleTransitions.values()).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;
        
        for (const [value, count] of possibleTransitions) {
            random -= count;
            if (random <= 0) {
                this.updateState(value);
                return value;
            }
        }
        
        // Fallback
        const value = Array.from(possibleTransitions.keys())[0];
        this.updateState(value);
        return value;
    }
    
    updateState(value) {
        this.currentState.push(value);
        if (this.currentState.length > this.order) {
            this.currentState.shift();
        }
    }
    
    reset() {
        this.currentState = [];
    }
}

export class EuclideanRhythm {
    static generate(steps, pulses, rotation = 0) {
        if (pulses > steps) pulses = steps;
        if (pulses === 0) return new Array(steps).fill(0);
        if (pulses === steps) return new Array(steps).fill(1);
        
        // Bjorklund's algorithm
        let pattern = [];
        let counts = [];
        let remainders = [];
        
        let divisor = steps - pulses;
        remainders.push(pulses);
        
        let level = 0;
        while (remainders[level] > 1) {
            counts.push(Math.floor(divisor / remainders[level]));
            remainders.push(divisor % remainders[level]);
            divisor = remainders[level];
            level++;
        }
        
        counts.push(divisor);
        
        const build = function(level) {
            if (level === -1) {
                pattern.push(0);
            } else if (level === -2) {
                pattern.push(1);
            } else {
                for (let i = 0; i < counts[level]; i++) {
                    build(level - 1);
                }
                if (remainders[level] !== 0) {
                    build(level - 2);
                }
            }
        };
        
        build(level);
        
        // Apply rotation
        if (rotation !== 0) {
            rotation = rotation % steps;
            pattern = pattern.slice(rotation).concat(pattern.slice(0, rotation));
        }
        
        return pattern;
    }
    
    // Generate complementary rhythm
    static generateComplement(steps, pulses, rotation = 0) {
        const main = this.generate(steps, pulses, rotation);
        return main.map(v => 1 - v);
    }
    
    // Generate variations
    static generateVariations(steps, pulses, numVariations = 4) {
        const variations = [];
        for (let i = 0; i < numVariations; i++) {
            variations.push(this.generate(steps, pulses, i));
        }
        return variations;
    }
}

export class PolyrhythmGenerator {
    constructor() {
        this.tracks = new Map();
        this.globalStep = 0;
    }
    
    addTrack(name, pattern, speed = 1) {
        this.tracks.set(name, {
            pattern,
            speed,
            position: 0,
            accumulator: 0
        });
    }
    
    removeTrack(name) {
        this.tracks.delete(name);
    }
    
    step() {
        const triggers = {};
        
        for (const [name, track] of this.tracks) {
            // Advance accumulator by speed
            track.accumulator += track.speed;
            
            // Check if we should advance position
            while (track.accumulator >= 1) {
                track.accumulator -= 1;
                track.position = (track.position + 1) % track.pattern.length;
            }
            
            // Get current value (with interpolation for non-integer positions)
            const currentIndex = Math.floor(track.position);
            triggers[name] = track.pattern[currentIndex];
        }
        
        this.globalStep++;
        return triggers;
    }
    
    reset() {
        this.globalStep = 0;
        for (const track of this.tracks.values()) {
            track.position = 0;
            track.accumulator = 0;
        }
    }
    
    // Generate polyrhythmic pattern
    static generatePolyrhythm(lengths, duration) {
        const patterns = [];
        const lcm = this.lcm(lengths);
        
        for (const length of lengths) {
            const pattern = [];
            for (let i = 0; i < duration; i++) {
                pattern.push((i % length) === 0 ? 1 : 0);
            }
            patterns.push(pattern);
        }
        
        return { patterns, lcm };
    }
    
    static gcd(a, b) {
        return b ? this.gcd(b, a % b) : a;
    }
    
    static lcm(numbers) {
        return numbers.reduce((a, b) => (a * b) / this.gcd(a, b));
    }
}

// Pattern transformation utilities
export class PatternTransforms {
    // Humanize pattern with micro-timing and velocity
    static humanize(pattern, timingVariation = 0.1, velocityVariation = 0.2) {
        return pattern.map(step => {
            if (step === 0) return { trigger: false };
            
            const velocity = typeof step === 'number' ? step : 1;
            return {
                trigger: true,
                timing: (Math.random() - 0.5) * timingVariation,
                velocity: velocity * (1 + (Math.random() - 0.5) * velocityVariation)
            };
        });
    }
    
    // Density control - thin out pattern
    static applyDensity(pattern, density) {
        return pattern.map(step => {
            if (step === 0) return 0;
            return Math.random() < density ? step : 0;
        });
    }
    
    // Flam/rush - add rapid triggers before main hit
    static addFlam(pattern, flamProbability = 0.2, flamCount = 2) {
        const enhanced = [];
        
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] && Math.random() < flamProbability) {
                // Add flam hits
                for (let f = 0; f < flamCount; f++) {
                    enhanced.push({
                        trigger: true,
                        velocity: 0.3 + f * 0.2,
                        timing: -0.05 * (flamCount - f)
                    });
                }
            }
            enhanced.push(pattern[i]);
        }
        
        return enhanced;
    }
    
    // Swing - delay every other hit
    static applySwing(pattern, swingAmount = 0.2) {
        return pattern.map((step, index) => {
            if (step === 0) return 0;
            
            const swing = (index % 2 === 1) ? swingAmount : 0;
            return {
                trigger: step,
                timing: swing
            };
        });
    }
}