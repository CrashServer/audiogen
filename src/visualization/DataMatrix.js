/**
 * Data Matrix Visualization - Ikeda-inspired abstract parameter visualization
 * Shows all parameter movements and audio triggers as geometric shapes and colors
 */
export class DataMatrix {
    constructor(container) {
        console.log('DataMatrix constructor called with container:', container);
        this.container = container;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;
        this.animationFrame = null;
        
        // Grid configuration
        this.gridSize = 32; // 32x32 grid - much larger!
        this.cellSize = 18;
        this.cellSpacing = 1;
        
        // Parameter tracking
        this.parameters = new Map();
        this.triggers = [];
        this.triggerHistory = [];
        
        // Visual state
        this.time = 0;
        this.fadeSpeed = 0.995; // Slower fade for longer trails
        this.globalEnergy = 0;
        
        // LED blinking system
        this.ledBlinkStates = new Map();
        this.dataFlowPaths = [];
        
        // Tentacle system
        this.tentacles = [];
        this.tentacleNodes = new Map();
        this.organicTimer = 0;
        
        // Color palette (minimal, high contrast)
        this.colors = {
            background: '#000000',
            grid: '#0a0a0a',
            gridActive: '#1a1a1a',
            parameters: '#ffffff',
            triggers: '#ff0000',
            fade: '#333333',
            accent: '#00ff00',
            tentacles: '#004400',
            tentacleGlow: '#00ff00',
            connections: '#002200',
            ledOn: '#00ff00',
            ledOff: '#001100',
            dataFlow: '#00ffff'
        };
        
        try {
            this.initializeCanvas();
            this.setupParameterMapping();
            console.log('DataMatrix initialization completed successfully');
        } catch (error) {
            console.error('DataMatrix initialization failed:', error);
            throw error;
        }
    }
    
    initializeCanvas() {
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.backgroundColor = this.colors.background;
        this.canvas.style.zIndex = '9999';
        this.canvas.style.display = 'none';
        this.canvas.style.cursor = 'crosshair';
        
        // Set canvas resolution
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(dpr, dpr);
        
        // Add to container
        this.container.appendChild(this.canvas);
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Handle click to close
        this.canvas.addEventListener('click', () => this.stop());
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.stop();
            }
        });
    }
    
    setupParameterMapping() {
        // Map all parameters to grid positions
        const parameterList = [
            // Master
            'masterVolume', 'reverb', 'delay', 'delayTime',
            
            // Generators
            'droneFreq', 'droneDetune', 'droneVoices', 'droneFilter',
            'glitchIntensity', 'glitchRate', 'bitCrush',
            'drumTempo', 'drumDensity', 'drumVariation', 'drumSwing',
            'bleepDensity', 'bleepRange', 'bleepDuration',
            'burstActivity', 'burstComplexity', 'burstSpeed',
            'fmCarrier', 'fmIndex', 'fmRatio', 'fmLFO',
            'noiseLevel', 'noiseFilter',
            'acidLevel', 'acidFreq', 'acidResonance', 'acidDecay',
            'grainDensity', 'grainSize', 'grainPitch', 'grainPan',
            'spaceMelodyDensity', 'spaceMelodyRange', 'spaceMelodySpeed',
            'padDensity', 'padAttack', 'padRelease', 'padFilterSweep',
            'arpEnable', 'arpSpeed', 'arpOctaves', 'arpGate',
            'chordDensity', 'chordRoot', 'chordTempo', 'chordBrightness',
            'vocalDensity', 'vocalPitch', 'vocalVibrato', 'vocalWhisper',
            'karplusDensity', 'karplusPitch', 'karplusDamping', 'karplusBrightness',
            'additiveDensity', 'additiveFundamental', 'additiveHarmonics',
            'chaosDensity', 'chaosIntensity', 'chaosResonance', 'chaosSpeed',
            'bioDensity', 'bioEvolution', 'bioHarmony', 'bioVariation',
            
            // Effects
            'compressorMix', 'compThreshold', 'compRatio',
            'eqLow', 'eqMid', 'eqHigh',
            'distortionMix', 'distDrive',
            'chorusMix', 'chorusRate',
            'sidechainAmount'
        ];
        
        // Assign grid positions
        parameterList.forEach((param, index) => {
            const x = index % this.gridSize;
            const y = Math.floor(index / this.gridSize);
            
            this.parameters.set(param, {
                x, y,
                value: 0,
                targetValue: 0,
                lastValue: 0,
                activity: 0,
                type: this.getParameterType(param)
            });
        });
    }
    
    getParameterType(param) {
        if (param.includes('Density') || param.includes('Level') || param.includes('Activity')) return 'density';
        if (param.includes('Freq') || param.includes('Pitch')) return 'frequency';
        if (param.includes('Time') || param.includes('Speed') || param.includes('Rate')) return 'temporal';
        if (param.includes('Attack') || param.includes('Decay') || param.includes('Release')) return 'envelope';
        return 'control';
    }
    
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.canvas.style.display = 'block';
        this.time = 0;
        
        // Start monitoring parameters
        this.startParameterMonitoring();
        
        // Start animation loop
        this.animate();
        
        console.log('Data Matrix visualization started - Click or press ESC to close');
    }
    
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.canvas.style.display = 'none';
        
        // Stop animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Stop parameter monitoring
        this.stopParameterMonitoring();
        
        console.log('Data Matrix visualization stopped');
    }
    
    startParameterMonitoring() {
        // Monitor all range inputs for parameter changes
        this.parameterInputs = document.querySelectorAll('input[type="range"]');
        
        this.parameterInputs.forEach(input => {
            if (this.parameters.has(input.id)) {
                const param = this.parameters.get(input.id);
                param.value = parseFloat(input.value);
                param.lastValue = param.value;
                
                // Add event listener for real-time updates
                input.addEventListener('input', (e) => {
                    this.updateParameter(input.id, parseFloat(e.target.value));
                });
            }
        });
        
        // Monitor group enables for triggers
        this.groupToggles = document.querySelectorAll('.group-enable');
        this.groupToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.addTrigger({
                    type: 'group',
                    name: e.target.id,
                    state: e.target.checked,
                    x: Math.random() * this.gridSize,
                    y: Math.random() * this.gridSize
                });
            });
        });
        
        // Monitor button clicks
        const buttons = document.querySelectorAll('.control-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                this.addTrigger({
                    type: 'button',
                    name: button.id,
                    x: Math.random() * this.gridSize,
                    y: Math.random() * this.gridSize
                });
            });
        });
    }
    
    stopParameterMonitoring() {
        // Remove event listeners (simplified - in production should track and remove specific listeners)
        // For now, just clear the arrays
        this.parameterInputs = [];
        this.groupToggles = [];
    }
    
    updateParameter(paramId, value) {
        if (!this.parameters.has(paramId)) return;
        
        const param = this.parameters.get(paramId);
        param.lastValue = param.value;
        param.value = value;
        param.activity = 1.0; // Mark as active
        
        // Add motion trail for even small changes - more reactive
        const change = Math.abs(value - param.lastValue);
        if (change > 0.01) { // Much more sensitive
            this.globalEnergy += change * 0.1; // Build global energy
            this.addTrigger({
                type: 'parameter',
                name: paramId,
                change: change,
                x: param.x,
                y: param.y,
                energy: change
            });
            
            // Create additional ripple effects for larger changes
            if (change > 0.5) {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        this.addTrigger({
                            type: 'ripple',
                            name: paramId + '_ripple',
                            change: change * 0.5,
                            x: param.x + (Math.random() - 0.5) * 2,
                            y: param.y + (Math.random() - 0.5) * 2
                        });
                    }, i * 100);
                }
            }
        }
    }
    
    addTrigger(trigger) {
        trigger.time = this.time;
        trigger.intensity = 1.0;
        this.triggers.push(trigger);
        
        // Keep trigger history for trails
        this.triggerHistory.push({
            ...trigger,
            life: 1.0
        });
        
        // Limit history size
        if (this.triggerHistory.length > 100) {
            this.triggerHistory.shift();
        }
    }
    
    animate() {
        if (!this.isActive) return;
        
        this.time += 0.016; // ~60fps
        
        this.clear();
        this.drawEvolvingGrid();
        this.drawTentacles();
        this.drawParameters();
        this.drawTriggers();
        this.drawTrails();
        this.drawEnergyField();
        
        this.updateState();
        this.updateTentacles();
        this.evolveGrid();
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    clear() {
        // Less aggressive clearing for LED persistence effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGrid() {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const totalSize = this.gridSize * (this.cellSize + this.cellSpacing);
        const startX = centerX - totalSize / 2;
        const startY = centerY - totalSize / 2;
        
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        
        // Draw grid lines
        for (let i = 0; i <= this.gridSize; i++) {
            const x = startX + i * (this.cellSize + this.cellSpacing);
            const y = startY + i * (this.cellSize + this.cellSpacing);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, startY + totalSize);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(startX + totalSize, y);
            this.ctx.stroke();
        }
    }
    
    drawEvolvingGrid() {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const totalSize = this.gridSize * (this.cellSize + this.cellSpacing);
        const startX = centerX - totalSize / 2;
        const startY = centerY - totalSize / 2;
        
        // Draw LED matrix background grid
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const worldX = startX + x * (this.cellSize + this.cellSpacing);
                const worldY = startY + y * (this.cellSize + this.cellSpacing);
                
                // Get or create LED blink state
                const key = `${x},${y}`;
                if (!this.ledBlinkStates.has(key)) {
                    this.ledBlinkStates.set(key, {
                        brightness: 0,
                        targetBrightness: 0,
                        blinkPhase: Math.random() * Math.PI * 2,
                        isData: false,
                        dataIntensity: 0
                    });
                }
                
                const ledState = this.ledBlinkStates.get(key);
                
                // Random data blinking
                if (Math.random() < 0.002 + this.globalEnergy * 0.01) {
                    ledState.targetBrightness = 0.3 + Math.random() * 0.7;
                    ledState.isData = true;
                    ledState.dataIntensity = 1;
                    
                    // Create data flow to neighbors
                    if (Math.random() < 0.3) {
                        this.createDataFlow(x, y);
                    }
                }
                
                // Update LED brightness
                ledState.brightness += (ledState.targetBrightness - ledState.brightness) * 0.3;
                ledState.targetBrightness *= 0.92; // Decay
                ledState.dataIntensity *= 0.95;
                
                // Draw LED cell
                const brightness = ledState.brightness + Math.sin(this.time * 10 + ledState.blinkPhase) * 0.05;
                
                if (brightness > 0.05) {
                    // LED is on
                    const intensity = Math.min(1, brightness);
                    this.ctx.fillStyle = ledState.isData ? 
                        `rgba(0, 255, 255, ${intensity})` : 
                        `rgba(0, 255, 0, ${intensity * 0.3})`;
                    this.ctx.fillRect(worldX, worldY, this.cellSize - 1, this.cellSize - 1);
                    
                    // LED glow effect for bright ones
                    if (brightness > 0.5) {
                        this.ctx.shadowBlur = 10;
                        this.ctx.shadowColor = this.colors.ledOn;
                        this.ctx.fillRect(worldX, worldY, this.cellSize - 1, this.cellSize - 1);
                        this.ctx.shadowBlur = 0;
                    }
                } else {
                    // LED is off - show dim background
                    this.ctx.fillStyle = this.colors.ledOff;
                    this.ctx.fillRect(worldX, worldY, this.cellSize - 1, this.cellSize - 1);
                }
                
                // Reset data flag
                if (ledState.dataIntensity < 0.1) {
                    ledState.isData = false;
                }
            }
        }
    }
    
    createDataFlow(startX, startY) {
        const direction = Math.floor(Math.random() * 4); // 0=right, 1=down, 2=left, 3=up
        const length = 3 + Math.floor(Math.random() * 8);
        const dx = [1, 0, -1, 0][direction];
        const dy = [0, 1, 0, -1][direction];
        
        for (let i = 1; i <= length; i++) {
            const x = startX + dx * i;
            const y = startY + dy * i;
            
            if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
                setTimeout(() => {
                    const key = `${x},${y}`;
                    if (this.ledBlinkStates.has(key)) {
                        const led = this.ledBlinkStates.get(key);
                        led.targetBrightness = 0.8;
                        led.isData = true;
                        led.dataIntensity = 1;
                    }
                }, i * 30);
            }
        }
    }
    
    drawEnergyField() {
        // Global energy visualization
        if (this.globalEnergy > 0.1) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const energyRadius = this.globalEnergy * 200;
            const alpha = Math.min(0.3, this.globalEnergy);
            
            this.ctx.strokeStyle = this.colors.accent + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.lineWidth = 1;
            
            // Draw energy rings
            for (let i = 0; i < 3; i++) {
                const radius = energyRadius * (1 + i * 0.3);
                const phaseOffset = this.time * (1 + i * 0.5);
                
                this.ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += 0.1) {
                    const distortion = Math.sin(a * 6 + phaseOffset) * 10;
                    const x = centerX + Math.cos(a) * (radius + distortion);
                    const y = centerY + Math.sin(a) * (radius + distortion);
                    
                    if (a === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                this.ctx.closePath();
                this.ctx.stroke();
            }
        }
    }
    
    evolveGrid() {
        // Continuously evolve parameters for organic movement
        this.parameters.forEach((param, name) => {
            // Add subtle continuous activity
            const continuousActivity = Math.sin(this.time * 0.5 + param.x + param.y) * 0.02;
            param.activity = Math.max(param.activity, Math.abs(continuousActivity));
            
            // Randomly reorganize grid positions based on activity
            if (Math.random() < 0.001 && param.activity > 0.5) {
                const oldX = param.x;
                const oldY = param.y;
                
                // Find nearby empty or low-activity positions
                const newX = Math.max(0, Math.min(this.gridSize - 1, oldX + Math.floor((Math.random() - 0.5) * 3)));
                const newY = Math.max(0, Math.min(this.gridSize - 1, oldY + Math.floor((Math.random() - 0.5) * 3)));
                
                param.x = newX;
                param.y = newY;
                
                // Create reorganization effect
                this.addTrigger({
                    type: 'reorganize',
                    name: name + '_move',
                    x: oldX,
                    y: oldY
                });
                this.addTrigger({
                    type: 'reorganize',
                    name: name + '_arrive',
                    x: newX,
                    y: newY
                });
            }
        });
        
        // Decay global energy
        this.globalEnergy *= 0.98;
    }
    
    drawParameters() {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const totalSize = this.gridSize * (this.cellSize + this.cellSpacing);
        const startX = centerX - totalSize / 2;
        const startY = centerY - totalSize / 2;
        
        this.parameters.forEach((param, name) => {
            const x = startX + param.x * (this.cellSize + this.cellSpacing);
            const y = startY + param.y * (this.cellSize + this.cellSpacing);
            
            // Map parameter value to visual properties
            const normalizedValue = param.value / 100; // Assuming 0-100 range
            const size = Math.max(2, normalizedValue * this.cellSize);
            const alpha = Math.max(0.1, normalizedValue);
            
            // Color based on parameter type
            let color = this.colors.parameters;
            switch (param.type) {
                case 'density': color = '#ffffff'; break;
                case 'frequency': color = '#ff6666'; break;
                case 'temporal': color = '#66ff66'; break;
                case 'envelope': color = '#6666ff'; break;
                default: color = '#ffff66'; break;
            }
            
            // Activity pulsing
            const activityPulse = param.activity * Math.sin(this.time * 10);
            const finalAlpha = alpha + activityPulse * 0.3;
            
            this.ctx.fillStyle = color + Math.floor(finalAlpha * 255).toString(16).padStart(2, '0');
            
            // Draw different shapes based on parameter type
            this.ctx.save();
            this.ctx.translate(x + this.cellSize/2, y + this.cellSize/2);
            
            switch (param.type) {
                case 'density':
                    this.ctx.fillRect(-size/2, -size/2, size, size);
                    break;
                case 'frequency':
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, size/2, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                case 'temporal':
                    this.ctx.beginPath();
                    this.ctx.moveTo(-size/2, 0);
                    this.ctx.lineTo(size/2, -size/2);
                    this.ctx.lineTo(size/2, size/2);
                    this.ctx.closePath();
                    this.ctx.fill();
                    break;
                case 'envelope':
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -size/2);
                    this.ctx.lineTo(size/2, 0);
                    this.ctx.lineTo(0, size/2);
                    this.ctx.lineTo(-size/2, 0);
                    this.ctx.closePath();
                    this.ctx.fill();
                    break;
                default:
                    this.ctx.fillRect(-size/4, -size/2, size/2, size);
                    break;
            }
            
            this.ctx.restore();
        });
    }
    
    drawTriggers() {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const totalSize = this.gridSize * (this.cellSize + this.cellSpacing);
        const startX = centerX - totalSize / 2;
        const startY = centerY - totalSize / 2;
        
        this.triggers.forEach((trigger, index) => {
            const x = startX + trigger.x * (this.cellSize + this.cellSpacing);
            const y = startY + trigger.y * (this.cellSize + this.cellSpacing);
            
            const age = this.time - trigger.time;
            const life = Math.max(0, 1 - age / 2); // 2 second life
            
            if (life <= 0) {
                this.triggers.splice(index, 1);
                return;
            }
            
            const size = 30 * life;
            const alpha = life;
            
            let color = this.colors.triggers;
            if (trigger.type === 'group') color = this.colors.accent;
            if (trigger.type === 'button') color = '#ffff00';
            
            this.ctx.strokeStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.arc(x + this.cellSize/2, y + this.cellSize/2, size, 0, Math.PI * 2);
            this.ctx.stroke();
        });
    }
    
    drawTrails() {
        this.triggerHistory.forEach((trail, index) => {
            trail.life *= this.fadeSpeed;
            
            if (trail.life < 0.01) {
                this.triggerHistory.splice(index, 1);
                return;
            }
            
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const totalSize = this.gridSize * (this.cellSize + this.cellSpacing);
            const startX = centerX - totalSize / 2;
            const startY = centerY - totalSize / 2;
            
            const x = startX + trail.x * (this.cellSize + this.cellSpacing);
            const y = startY + trail.y * (this.cellSize + this.cellSpacing);
            
            const alpha = trail.life * 0.3;
            
            this.ctx.fillStyle = this.colors.fade + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.fillRect(x + this.cellSize/2 - 1, y + this.cellSize/2 - 1, 2, 2);
        });
    }
    
    updateState() {
        // Fade parameter activity but maintain minimum baseline
        this.parameters.forEach(param => {
            param.activity *= this.fadeSpeed;
            
            // Ensure some parameters always have baseline activity for continuous movement
            const baseActivity = Math.sin(this.time * 0.3 + param.x * 0.5 + param.y * 0.3) * 0.1 + 0.05;
            param.activity = Math.max(param.activity, baseActivity);
        });
    }
    
    handleResize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
    }
    
    toggle() {
        console.log('DataMatrix.toggle() called, isActive:', this.isActive);
        if (this.isActive) {
            console.log('Stopping visualization');
            this.stop();
        } else {
            console.log('Starting visualization');
            this.start();
        }
    }
    
    // TENTACLE SYSTEM METHODS
    
    updateTentacles() {
        this.organicTimer += 0.016;
        
        // Get active parameters with lower threshold for more tentacles
        const activeParams = Array.from(this.parameters.entries())
            .filter(([name, param]) => param.activity > 0.05)
            .sort((a, b) => b[1].activity - a[1].activity);
        
        // Always maintain some baseline tentacle activity
        const minActiveParams = Math.max(activeParams.length, 2);
        let allParams = Array.from(this.parameters.entries());
        
        // If not enough active params, add some with baseline activity
        if (activeParams.length < 2) {
            const shuffled = allParams.sort(() => Math.random() - 0.5);
            for (let i = 0; i < Math.min(2, shuffled.length); i++) {
                shuffled[i][1].activity = Math.max(shuffled[i][1].activity, 0.2);
                if (!activeParams.includes(shuffled[i])) {
                    activeParams.push(shuffled[i]);
                }
            }
        }
        
        // Create tentacle connections more frequently for constant movement
        if (activeParams.length >= 2 && this.organicTimer > 0.05) { // Faster creation
            this.createTentacleConnection(activeParams);
            this.organicTimer = 0;
        }
        
        // Spontaneous tentacle creation for continuous movement
        if (Math.random() < 0.02 && this.tentacles.length < 12) {
            const randomParams = allParams.sort(() => Math.random() - 0.5).slice(0, 2);
            randomParams.forEach(([name, param]) => param.activity = Math.max(param.activity, 0.3));
            this.createTentacleConnection(randomParams);
        }
        
        // Update existing tentacles
        this.tentacles.forEach((tentacle, index) => {
            tentacle.life -= 0.005; // Slow decay
            tentacle.phase += tentacle.speed;
            
            // Update segment positions with organic movement
            tentacle.segments.forEach((segment, i) => {
                const t = i / tentacle.segments.length;
                const wave = Math.sin(tentacle.phase + t * Math.PI * 4) * 0.3;
                const wave2 = Math.cos(tentacle.phase * 1.3 + t * Math.PI * 6) * 0.2;
                
                segment.offset.x = wave * tentacle.amplitude;
                segment.offset.y = wave2 * tentacle.amplitude;
            });
            
            // Remove dead tentacles
            if (tentacle.life <= 0) {
                this.tentacles.splice(index, 1);
            }
        });
        
        // Limit tentacle count for performance
        if (this.tentacles.length > 8) {
            this.tentacles.splice(0, this.tentacles.length - 8);
        }
    }
    
    createTentacleConnection(activeParams) {
        if (activeParams.length < 2) return;
        
        const param1 = activeParams[0][1];
        const param2 = activeParams[Math.floor(Math.random() * Math.min(3, activeParams.length - 1)) + 1][1];
        
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const totalSize = this.gridSize * (this.cellSize + this.cellSpacing);
        const startX = centerX - totalSize / 2;
        const startY = centerY - totalSize / 2;
        
        const x1 = startX + param1.x * (this.cellSize + this.cellSpacing) + this.cellSize/2;
        const y1 = startY + param1.y * (this.cellSize + this.cellSpacing) + this.cellSize/2;
        const x2 = startX + param2.x * (this.cellSize + this.cellSpacing) + this.cellSize/2;
        const y2 = startY + param2.y * (this.cellSize + this.cellSpacing) + this.cellSize/2;
        
        const distance = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
        const segments = Math.max(6, Math.floor(distance / 15));
        
        const tentacle = {
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            segments: [],
            life: 1.0,
            phase: Math.random() * Math.PI * 2,
            speed: 0.05 + Math.random() * 0.05,
            amplitude: 3 + Math.random() * 5,
            activity: (param1.activity + param2.activity) / 2,
            thickness: 1 + Math.random() * 2
        };
        
        // Create segments along the path
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            
            tentacle.segments.push({
                base: { x, y },
                offset: { x: 0, y: 0 },
                thickness: tentacle.thickness * (1 - Math.abs(t - 0.5) * 0.5) // Thicker in middle
            });
        }
        
        this.tentacles.push(tentacle);
    }
    
    drawTentacles() {
        this.tentacles.forEach(tentacle => {
            if (tentacle.segments.length < 2) return;
            
            const alpha = tentacle.life * tentacle.activity;
            if (alpha < 0.05) return;
            
            // Draw tentacle body
            this.ctx.strokeStyle = this.colors.tentacles + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.lineWidth = tentacle.thickness;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.ctx.beginPath();
            
            // Smooth curve through segments
            for (let i = 0; i < tentacle.segments.length; i++) {
                const segment = tentacle.segments[i];
                const x = segment.base.x + segment.offset.x;
                const y = segment.base.y + segment.offset.y;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    // Use quadratic curves for smooth organic look
                    const prevSegment = tentacle.segments[i-1];
                    const prevX = prevSegment.base.x + prevSegment.offset.x;
                    const prevY = prevSegment.base.y + prevSegment.offset.y;
                    
                    const midX = (prevX + x) / 2;
                    const midY = (prevY + y) / 2;
                    
                    this.ctx.quadraticCurveTo(prevX, prevY, midX, midY);
                }
            }
            
            this.ctx.stroke();
            
            // Draw glow effect for high activity tentacles
            if (tentacle.activity > 0.5) {
                this.ctx.strokeStyle = this.colors.tentacleGlow + Math.floor(alpha * tentacle.activity * 128).toString(16).padStart(2, '0');
                this.ctx.lineWidth = tentacle.thickness * 3;
                this.ctx.stroke();
            }
            
            // Draw connection nodes at segment joints
            tentacle.segments.forEach((segment, i) => {
                if (i % 2 === 0) { // Only every other segment for performance
                    const x = segment.base.x + segment.offset.x;
                    const y = segment.base.y + segment.offset.y;
                    const nodeSize = segment.thickness * 0.5;
                    
                    this.ctx.fillStyle = this.colors.connections + Math.floor(alpha * 200).toString(16).padStart(2, '0');
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
        });
    }
}