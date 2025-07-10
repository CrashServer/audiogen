export class ChaosEngine {
    constructor() {
        // Lorenz Attractor state
        this.lorenz = { x: 1, y: 1, z: 1 };
        this.lorenzParams = { sigma: 10, rho: 28, beta: 8/3, dt: 0.01 };
        
        // Rossler Attractor state  
        this.rossler = { x: 1, y: 1, z: 1 };
        this.rosslerParams = { a: 0.2, b: 0.2, c: 5.7, dt: 0.01 };
        
        // Chua's Circuit state
        this.chua = { x: 1, y: 1, z: 1 };
        this.chuaParams = { alpha: 15.6, beta: 28, m0: -1.143, m1: -0.714, dt: 0.01 };
        
        // Henon Map state
        this.henon = { x: 0, y: 0 };
        this.henonParams = { a: 1.4, b: 0.3 };
        
        // Logistic Map state
        this.logistic = { x: 0.5 };
        this.logisticParams = { r: 3.8 };
        
        // Musical scaling parameters
        this.scalers = {
            frequency: { min: 50, max: 2000 },
            amplitude: { min: 0, max: 1 },
            filter: { min: 100, max: 8000 },
            time: { min: 0.01, max: 2.0 }
        };
    }

    // Lorenz Attractor - classic chaos for smooth, flowing movements
    stepLorenz() {
        const { x, y, z } = this.lorenz;
        const { sigma, rho, beta, dt } = this.lorenzParams;
        
        const dx = sigma * (y - x);
        const dy = x * (rho - z) - y;
        const dz = x * y - beta * z;
        
        this.lorenz.x += dx * dt;
        this.lorenz.y += dy * dt;
        this.lorenz.z += dz * dt;
        
        return { x: this.lorenz.x, y: this.lorenz.y, z: this.lorenz.z };
    }

    // Rossler Attractor - more periodic, good for rhythmic patterns
    stepRossler() {
        const { x, y, z } = this.rossler;
        const { a, b, c, dt } = this.rosslerParams;
        
        const dx = -y - z;
        const dy = x + a * y;
        const dz = b + z * (x - c);
        
        this.rossler.x += dx * dt;
        this.rossler.y += dy * dt;
        this.rossler.z += dz * dt;
        
        return { x: this.rossler.x, y: this.rossler.y, z: this.rossler.z };
    }

    // Chua's Circuit - electronic chaos, great for glitchy sounds
    stepChua() {
        const { x, y, z } = this.chua;
        const { alpha, beta, m0, m1, dt } = this.chuaParams;
        
        const f = m1 * x + 0.5 * (m0 - m1) * (Math.abs(x + 1) - Math.abs(x - 1));
        
        const dx = alpha * (y - x - f);
        const dy = x - y + z;
        const dz = -beta * y;
        
        this.chua.x += dx * dt;
        this.chua.y += dy * dt;
        this.chua.z += dz * dt;
        
        return { x: this.chua.x, y: this.chua.y, z: this.chua.z };
    }

    // Henon Map - 2D discrete chaos
    stepHenon() {
        const { x, y } = this.henon;
        const { a, b } = this.henonParams;
        
        this.henon.x = 1 - a * x * x + y;
        this.henon.y = b * x;
        
        return { x: this.henon.x, y: this.henon.y };
    }

    // Logistic Map - simple but powerful 1D chaos
    stepLogistic() {
        const { x } = this.logistic;
        const { r } = this.logisticParams;
        
        this.logistic.x = r * x * (1 - x);
        
        return { x: this.logistic.x };
    }

    // Scale chaos values to musical parameters
    scaleToRange(value, min, max) {
        // Normalize value from roughly [-20, 20] to [0, 1]
        const normalized = Math.max(0, Math.min(1, (value + 20) / 40));
        return min + normalized * (max - min);
    }

    // Get musical parameters from different attractors
    getLorenzMusic() {
        const state = this.stepLorenz();
        return {
            frequency: this.scaleToRange(state.x, this.scalers.frequency.min, this.scalers.frequency.max),
            amplitude: this.scaleToRange(state.y, 0, 1),
            filter: this.scaleToRange(state.z, this.scalers.filter.min, this.scalers.filter.max),
            pan: Math.tanh(state.x / 10), // -1 to 1
            detune: state.y * 10, // cents
            resonance: this.scaleToRange(state.z, 0, 30)
        };
    }

    getRosslerMusic() {
        const state = this.stepRossler();
        return {
            rhythmTrigger: Math.abs(state.x) > 5 ? 1 : 0,
            tempo: this.scaleToRange(state.y, 60, 180),
            swing: this.scaleToRange(state.z, 0, 100),
            accent: this.scaleToRange(Math.abs(state.x), 0, 1),
            subdivision: Math.floor(this.scaleToRange(state.y, 1, 8))
        };
    }

    getChuaMusic() {
        const state = this.stepChua();
        return {
            glitchTrigger: Math.abs(state.x) > 2 ? 1 : 0,
            bitcrush: this.scaleToRange(Math.abs(state.y), 1, 16),
            distortion: this.scaleToRange(Math.abs(state.z), 0, 100),
            stutter: Math.abs(state.x) > 3 ? 1 : 0,
            reverse: Math.abs(state.y) > 2 ? 1 : 0
        };
    }

    getHenonMusic() {
        const state = this.stepHenon();
        return {
            pitch: this.scaleToRange(state.x, 50, 800),
            velocity: this.scaleToRange(Math.abs(state.y), 0, 1),
            gate: Math.abs(state.x) > 0.5 ? 1 : 0,
            chord: Math.floor(this.scaleToRange(state.y, 0, 7)) // Scale degrees
        };
    }

    getLogisticMusic() {
        const state = this.stepLogistic();
        return {
            density: state.x,
            variation: 1 - state.x, // Inverse relationship
            probability: state.x,
            complexity: state.x > 0.5 ? state.x * 2 - 1 : 0
        };
    }

    // Control chaos parameters for morphing
    setLorenzParams(sigma, rho, beta) {
        this.lorenzParams.sigma = sigma;
        this.lorenzParams.rho = rho;
        this.lorenzParams.beta = beta;
    }

    setRosslerParams(a, b, c) {
        this.rosslerParams.a = a;
        this.rosslerParams.b = b;
        this.rosslerParams.c = c;
    }

    setChuaParams(alpha, beta, m0, m1) {
        this.chuaParams.alpha = alpha;
        this.chuaParams.beta = beta;
        this.chuaParams.m0 = m0;
        this.chuaParams.m1 = m1;
    }

    setHenonParams(a, b) {
        this.henonParams.a = a;
        this.henonParams.b = b;
    }

    setLogisticParams(r) {
        this.logisticParams.r = r;
    }

    // Reset all chaos systems to initial conditions
    reset() {
        this.lorenz = { x: 1, y: 1, z: 1 };
        this.rossler = { x: 1, y: 1, z: 1 };
        this.chua = { x: 1, y: 1, z: 1 };
        this.henon = { x: 0, y: 0 };
        this.logistic = { x: 0.5 };
    }

    // Perturb systems slightly for variation
    perturb(amount = 0.01) {
        this.lorenz.x += (Math.random() - 0.5) * amount;
        this.lorenz.y += (Math.random() - 0.5) * amount;
        this.lorenz.z += (Math.random() - 0.5) * amount;
        
        this.rossler.x += (Math.random() - 0.5) * amount;
        this.rossler.y += (Math.random() - 0.5) * amount;
        this.rossler.z += (Math.random() - 0.5) * amount;
    }
}