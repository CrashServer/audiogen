class GenerativeSoundscape {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.nodes = {
            master: {},
            drone: {},
            glitch: {},
            drums: {},
            bleeps: {},
            burst: {},
            fm: {},
            noise: {},
            acid: {},
            granular: {},
            spaceMelody: {},
            ambientPad: {},
            arpeggiator: {}
        };
        this.schedulers = {};
        this.animatedParams = new Map();
        this.lfoControllers = new Map();
        this.activeVoices = 0;
        this.maxVoices = 30; // Reduced voice limit for better performance
        this.drumVoices = 0;
        this.maxDrumVoices = 8; // Separate limit for drums
        
        // Buffer cache for performance
        this.bufferCache = new Map();
        this.noiseBuffers = new Map();
        
        // Performance monitoring
        this.lastPerformanceCheck = 0;
        this.performanceThrottle = 1; // Multiplier for reducing activity
        
        // Group enable states
        this.groupEnabled = {
            drone: true,
            glitch: true,
            drums: true,
            bleeps: true,
            burst: true,
            fm: true,
            acid: true,
            granular: true,
            noise: true,
            spaceMelody: true,
            ambientPad: true,
            arpeggiator: true
        };
        
        this.morphing = false;
        this.morphTargets = new Map();
        this.morphStartValues = new Map();
        this.morphStartTime = 0;
        this.morphDuration = 5000; // 5 seconds default
        
        // Recording
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.recordingStream = null;
        this.recordingStartTime = 0;
        this.maxRecordingTime = 300000; // 5 minutes max
        
        this.initializeControls();
    }

    initializeControls() {
        document.getElementById('playButton').addEventListener('click', () => this.start());
        document.getElementById('stopButton').addEventListener('click', () => this.stop());
        document.getElementById('randomizeButton').addEventListener('click', () => this.randomize());
        document.getElementById('morphButton').addEventListener('click', () => this.startMorph());
        document.getElementById('recordButton').addEventListener('click', () => this.toggleRecording());
        
        // Add event listeners for all sliders
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const value = e.target.value;
                const display = e.target.nextElementSibling;
                display.textContent = slider.step && slider.step < 1 ? 
                    parseFloat(value).toFixed(1) : value;
                
                if (this.isPlaying) {
                    this.updateParameter(e.target.id, parseFloat(value));
                }
            });
        });
        
        // LFO buttons
        document.querySelectorAll('.lfo-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const param = e.target.dataset.param;
                this.toggleLFO(param, e.target);
            });
        });
        
        // Noise type selector
        const noiseSelect = document.getElementById('noiseType');
        if (noiseSelect) {
            noiseSelect.addEventListener('change', (e) => {
                if (this.isPlaying) {
                    this.updateNoiseType(e.target.value);
                }
            });
        }
        
        // Drum pattern selector
        const drumPattern = document.getElementById('drumPattern');
        if (drumPattern) {
            drumPattern.addEventListener('change', (e) => {
                if (this.isPlaying) {
                    this.updateDrums();
                }
            });
        }
        
        // Group enable toggles
        document.querySelectorAll('.group-enable').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const groupName = e.target.id.replace('Enable', '');
                this.groupEnabled[groupName] = e.target.checked;
                
                // If playing, immediately stop/start the group
                if (this.isPlaying) {
                    this.updateGroupState(groupName, e.target.checked);
                }
            });
        });
        
        // Arpeggiator pattern selector
        const arpPattern = document.getElementById('arpPattern');
        if (arpPattern) {
            arpPattern.addEventListener('change', (e) => {
                if (this.isPlaying) {
                    this.updateArpeggiator();
                }
            });
        }
    }

    async start() {
        if (!this.audioContext) {
            // Use lower latency hint for better performance
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: 'playback',
                sampleRate: 44100
            });
        }
        
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        this.isPlaying = true;
        document.getElementById('playButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
        
        // Reset performance
        this.performanceThrottle = 1;
        this.activeVoices = 0;
        this.drumVoices = 0;
        
        this.setupAudioGraph();
        this.startGenerators();
        this.startAnimations();
    }

    stop() {
        this.isPlaying = false;
        document.getElementById('playButton').disabled = false;
        document.getElementById('stopButton').disabled = true;
        
        // Stop all schedulers
        Object.values(this.schedulers).forEach(scheduler => {
            if (scheduler) clearInterval(scheduler);
        });
        this.schedulers = {};
        
        // Reset performance monitoring
        this.activeVoices = 0;
        this.drumVoices = 0;
        this.performanceThrottle = 1;
        
        // Stop animations
        this.animatedParams.forEach((animation, param) => {
            cancelAnimationFrame(animation.frameId);
        });
        this.animatedParams.clear();
        
        // Disconnect all nodes
        this.disconnectAll();
    }
    
    updateGroupState(groupName, enabled) {
        if (!this.isPlaying) return;
        
        // Stop the group's audio
        this.stopGroup(groupName);
        
        // If enabling, restart the group
        if (enabled) {
            switch(groupName) {
                case 'drone': this.startDrone(); break;
                case 'glitch': this.startGlitch(); break;
                case 'drums': this.startDrums(); break;
                case 'bleeps': this.startBleeps(); break;
                case 'burst': this.startDataBurst(); break;
                case 'fm': this.startFM(); break;
                case 'noise': this.startNoise(); break;
                case 'acid': this.startAcid(); break;
                case 'granular': this.startGranular(); break;
                case 'spaceMelody': this.startSpaceMelody(); break;
                case 'ambientPad': this.startAmbientPad(); break;
                case 'arpeggiator': this.startArpeggiator(); break;
            }
        }
    }
    
    stopGroup(groupName) {
        const group = this.nodes[groupName];
        if (!group) return;
        
        // Stop schedulers for this group
        if (this.schedulers[groupName]) {
            clearInterval(this.schedulers[groupName]);
            delete this.schedulers[groupName];
        }
        
        // Stop and disconnect all audio nodes in the group
        Object.values(group).forEach(node => {
            if (node) {
                if (Array.isArray(node)) {
                    node.forEach(n => {
                        try {
                            if (n.stop) n.stop();
                            if (n.disconnect) n.disconnect();
                        } catch(e) {}
                    });
                } else {
                    try {
                        if (node.stop) node.stop();
                        if (node.disconnect) node.disconnect();
                    } catch(e) {}
                }
            }
        });
        
        // Clear the group's nodes
        this.nodes[groupName] = {};
    }

    setupAudioGraph() {
        // Master section
        this.nodes.master.gain = this.audioContext.createGain();
        this.nodes.master.gain.gain.value = parseFloat(document.getElementById('masterVolume').value) / 100;
        
        // Reverb
        this.nodes.master.convolver = this.audioContext.createConvolver();
        this.nodes.master.reverbGain = this.audioContext.createGain();
        this.nodes.master.dryGain = this.audioContext.createGain();
        
        // Delay
        this.nodes.master.delay = this.audioContext.createDelay(2);
        this.nodes.master.delayGain = this.audioContext.createGain();
        this.nodes.master.delayFeedback = this.audioContext.createGain();
        
        this.createReverbImpulse();
        this.setupMasterChain();
        this.updateReverbMix();
        this.updateDelaySettings();
    }

    setupMasterChain() {
        // Dry signal
        this.nodes.master.dryGain.connect(this.nodes.master.gain);
        
        // Reverb chain
        this.nodes.master.convolver.connect(this.nodes.master.reverbGain);
        this.nodes.master.reverbGain.connect(this.nodes.master.gain);
        
        // Delay chain
        this.nodes.master.delay.connect(this.nodes.master.delayGain);
        this.nodes.master.delayGain.connect(this.nodes.master.gain);
        this.nodes.master.delay.connect(this.nodes.master.delayFeedback);
        this.nodes.master.delayFeedback.connect(this.nodes.master.delay);
        
        // Master output
        this.nodes.master.gain.connect(this.audioContext.destination);
    }

    createReverbImpulse() {
        // Shorter reverb when under pressure
        const reverbTime = this.performanceThrottle < 0.7 ? 1 : 2;
        const length = this.audioContext.sampleRate * reverbTime;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        this.nodes.master.convolver.buffer = impulse;
    }

    startGenerators() {
        if (this.groupEnabled.drone) this.startDrone();
        if (this.groupEnabled.glitch) this.startGlitch();
        if (this.groupEnabled.drums) this.startDrums();
        if (this.groupEnabled.bleeps) this.startBleeps();
        if (this.groupEnabled.burst) this.startDataBurst();
        if (this.groupEnabled.fm) this.startFM();
        if (this.groupEnabled.noise) this.startNoise();
        if (this.groupEnabled.acid) this.startAcid();
        if (this.groupEnabled.granular) this.startGranular();
        if (this.groupEnabled.spaceMelody) this.startSpaceMelody();
        if (this.groupEnabled.ambientPad) this.startAmbientPad();
        if (this.groupEnabled.arpeggiator) this.startArpeggiator();
    }

    startAnimations() {
        this.animatedParams.forEach((animation, param) => {
            this.animateParameter(param, animation);
        });
    }

    // DRONE GENERATOR
    startDrone() {
        if (!this.isPlaying) return;
        
        const freq = parseFloat(document.getElementById('droneFreq').value);
        const detune = parseFloat(document.getElementById('droneDetune').value);
        const voices = parseInt(document.getElementById('droneVoices').value);
        const filterFreq = parseFloat(document.getElementById('droneFilter').value);
        
        // Clean up existing nodes
        if (this.nodes.drone.oscillators) {
            this.nodes.drone.oscillators.forEach(osc => {
                try { osc.stop(); } catch(e) {}
            });
        }
        
        this.nodes.drone.oscillators = [];
        this.nodes.drone.gains = [];
        this.nodes.drone.lfos = [];
        
        this.nodes.drone.filter = this.audioContext.createBiquadFilter();
        this.nodes.drone.filter.type = 'lowpass';
        this.nodes.drone.filter.frequency.value = filterFreq;
        this.nodes.drone.filter.Q.value = 5;
        
        this.nodes.drone.mixer = this.audioContext.createGain();
        this.nodes.drone.mixer.gain.value = 0.3;
        
        for (let i = 0; i < voices; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.value = freq * (1 + (Math.random() - 0.5) * detune / 100);
            gain.gain.value = 1 / voices;
            
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.value = 0.1 + Math.random() * 0.2;
            lfoGain.gain.value = 5;
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
            
            osc.connect(gain);
            gain.connect(this.nodes.drone.filter);
            osc.start();
            
            this.nodes.drone.oscillators.push(osc);
            this.nodes.drone.gains.push(gain);
            this.nodes.drone.lfos.push(lfo);
        }
        
        this.nodes.drone.filter.connect(this.nodes.drone.mixer);
        this.connectToMaster(this.nodes.drone.mixer);
    }

    // GLITCH GENERATOR
    startGlitch() {
        const intensity = parseFloat(document.getElementById('glitchIntensity').value) / 100;
        const rate = parseFloat(document.getElementById('glitchRate').value);
        
        if (intensity === 0 || !this.isPlaying) return;
        
        this.nodes.glitch.source = this.audioContext.createBufferSource();
        this.nodes.glitch.gain = this.audioContext.createGain();
        this.nodes.glitch.gain.gain.value = intensity * 0.5;
        
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        this.nodes.glitch.source.buffer = buffer;
        this.nodes.glitch.source.loop = true;
        
        this.nodes.glitch.waveshaper = this.audioContext.createWaveShaper();
        const bits = parseInt(document.getElementById('bitCrush').value);
        this.updateBitCrusher(bits);
        
        this.nodes.glitch.source.connect(this.nodes.glitch.waveshaper);
        this.nodes.glitch.waveshaper.connect(this.nodes.glitch.gain);
        this.connectToMaster(this.nodes.glitch.gain);
        
        this.nodes.glitch.source.start();
        
        this.schedulers.glitch = setInterval(() => {
            if (this.groupEnabled.glitch && Math.random() < intensity) {
                this.triggerGlitch();
            }
        }, 1000 / rate);
    }

    triggerGlitch() {
        const gain = this.nodes.glitch.gain.gain;
        const now = this.audioContext.currentTime;
        
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(Math.random() * 0.8, now + 0.01);
        gain.linearRampToValueAtTime(0, now + 0.05);
        gain.linearRampToValueAtTime(gain.value, now + 0.1);
    }

    // ENHANCED DRUM GENERATOR
    startDrums() {
        if (!this.isPlaying) return;
        
        const pattern = document.getElementById('drumPattern').value;
        const tempo = parseInt(document.getElementById('drumTempo').value);
        const density = parseFloat(document.getElementById('drumDensity').value) / 100;
        const variation = parseFloat(document.getElementById('drumVariation').value) / 100;
        const swing = parseFloat(document.getElementById('drumSwing').value) / 100;
        const snareRush = parseFloat(document.getElementById('snareRush').value) / 100;
        const ghostNotes = parseFloat(document.getElementById('ghostNotes').value) / 100;
        const hihatSpeed = parseInt(document.getElementById('hihatSpeed').value);
        
        const interval = 60000 / (tempo * 8); // Reduced to 32nd notes for better performance
        let step = 0;
        
        // Get pattern data
        const patterns = this.getDrumPatterns();
        const currentPattern = patterns[pattern];
        
        this.schedulers.drums = setInterval(() => {
            if (!this.groupEnabled.drums) return;
            const patternStep = step % currentPattern.length;
            const swingAmount = (step % 2) * swing * interval * 0.2;
            const microTiming = (Math.random() - 0.5) * variation * 10 + swingAmount;
            
            // Kick
            if (currentPattern.kick[patternStep] && Math.random() < density) {
                const velocity = currentPattern.kick[patternStep] * 0.7;
                setTimeout(() => this.playKick(this.audioContext.currentTime, variation, velocity), microTiming);
            }
            
            // Snare with rush
            if (currentPattern.snare[patternStep] && Math.random() < density * 0.9) {
                const velocity = currentPattern.snare[patternStep] * 0.5;
                setTimeout(() => {
                    this.playSnare(this.audioContext.currentTime, variation, velocity);
                    // Snare rush
                    if (Math.random() < snareRush && patternStep % 4 === 0) {
                        this.triggerSnareRush(variation);
                    }
                }, microTiming);
            }
            
            // Hi-hat with variable speed
            if (step % (16 / hihatSpeed) === 0 && currentPattern.hihat[patternStep % 16] && Math.random() < density * 0.8) {
                const velocity = currentPattern.hihat[patternStep % 16] * 0.3;
                // Open hi-hat on off-beats sometimes
                const isOpen = (patternStep % 4 === 2) && Math.random() < 0.3;
                setTimeout(() => this.playHiHat(this.audioContext.currentTime, variation, velocity, isOpen), microTiming);
            }
            
            // Additional percussion elements
            if (currentPattern.perc && currentPattern.perc[patternStep] && Math.random() < density * 0.7) {
                const percType = Math.random();
                if (percType < 0.5) {
                    setTimeout(() => this.playRimshot(this.audioContext.currentTime, variation), microTiming);
                } else {
                    setTimeout(() => this.playClap(this.audioContext.currentTime, variation), microTiming);
                }
            }
            
            // Ghost notes
            if (Math.random() < ghostNotes) {
                const ghostTime = microTiming + Math.random() * interval;
                setTimeout(() => {
                    const drumType = Math.random();
                    if (drumType < 0.4) {
                        this.playKick(this.audioContext.currentTime, variation * 2, 0.2);
                    } else if (drumType < 0.7) {
                        this.playSnare(this.audioContext.currentTime, variation * 2, 0.15);
                    } else {
                        this.playHiHat(this.audioContext.currentTime, variation * 2, 0.1);
                    }
                }, ghostTime);
            }
            
            step++;
        }, interval);
    }
    
    getDrumPatterns() {
        return {
            techno: {
                length: 16,
                kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
                perc: [0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0, 0.4, 0]
            },
            breakbeat: {
                length: 32,
                kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0,
                       1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
                snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0,
                        0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
                hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                perc: [0, 0, 0.3, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0.4, 0, 0, 0,
                       0, 0.3, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0]
            },
            jungle: {
                length: 32,
                kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0,
                       1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
                snare: [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0,
                        0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
                hihat: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0],
                perc: [0, 0.5, 0, 0, 0.3, 0, 0, 0, 0, 0, 0.4, 0, 0, 0.6, 0, 0,
                       0.3, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0.4, 0, 0, 0, 0]
            },
            idm: {
                length: 32,
                kick: [1, 0, 0, 0.5, 0, 0, 1, 0, 0, 0.3, 0, 0, 0.7, 0, 0, 0,
                       0.8, 0, 0, 0, 0.4, 0, 0, 0, 1, 0, 0.2, 0, 0, 0, 0.6, 0],
                snare: [0, 0, 0, 0, 0.8, 0, 0, 0.3, 0, 0, 0.5, 0, 1, 0, 0, 0.2,
                        0, 0, 0.6, 0, 0.9, 0, 0, 0, 0.4, 0, 0, 0.7, 0, 0, 1, 0],
                hihat: [0.5, 0.3, 0.8, 0.2, 0.6, 0.4, 0.9, 0.1, 0.7, 0.3, 0.5, 0.8, 0.4, 0.6, 0.2, 0.9],
                perc: [0.7, 0, 0, 0.4, 0, 0.6, 0, 0, 0.5, 0, 0, 0.3, 0, 0, 0.8, 0,
                       0, 0.4, 0, 0, 0.7, 0, 0.3, 0, 0, 0.5, 0, 0, 0.6, 0, 0, 0.4]
            },
            gabber: {
                length: 16,
                kick: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                snare: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
                hihat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
                perc: [0, 0, 0, 0.8, 0, 0, 0, 0.6, 0, 0, 0, 0.7, 0, 0, 0, 0.5]
            },
            trap: {
                length: 32,
                kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0,
                       0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0.6, 0],
                snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
                hihat: [1, 0.3, 0.5, 0.3, 1, 0.3, 0.5, 0.3, 1, 0.3, 0.5, 0.3, 1, 0.3, 0.5, 0.3],
                perc: [0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0,
                       0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8]
            }
        };
    }
    
    triggerSnareRush(variation) {
        const rushLength = 4 + Math.floor(Math.random() * 12);
        const rushSpeed = 20 + Math.random() * 40;
        
        // Limit rush length to prevent CPU overload
        const limitedRushLength = Math.min(rushLength, 8);
        for (let i = 0; i < limitedRushLength; i++) {
            setTimeout(() => {
                const velocity = 0.3 * (1 - i / limitedRushLength);
                this.playSnare(this.audioContext.currentTime, variation * 2, velocity);
            }, i * rushSpeed);
        }
    }

    playKick(time, variation, velocity = 0.7) {
        if (this.drumVoices >= this.maxDrumVoices || this.activeVoices > this.maxVoices) return;
        this.drumVoices++;
        this.activeVoices++;
        
        // Simplified version for performance
        if (this.performanceThrottle < 0.5) {
            velocity *= 0.7;
        }
        
        // Create drum bus
        const drumBus = this.audioContext.createGain();
        drumBus.gain.value = velocity;
        
        // Sub bass layer (sine)
        const sub = this.audioContext.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(55, time);
        sub.frequency.exponentialRampToValueAtTime(25, time + 0.3);
        
        const subGain = this.audioContext.createGain();
        subGain.gain.setValueAtTime(0.7, time);
        subGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        
        // Body layer (triangle)
        const body = this.audioContext.createOscillator();
        body.type = 'triangle';
        body.frequency.setValueAtTime(85, time);
        body.frequency.exponentialRampToValueAtTime(45, time + 0.08);
        
        const bodyGain = this.audioContext.createGain();
        bodyGain.gain.setValueAtTime(0.5, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        // Click/attack layer
        const click = this.audioContext.createOscillator();
        click.type = 'square';
        click.frequency.value = 1500 + Math.random() * 500;
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.3, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.005);
        
        const clickFilter = this.audioContext.createBiquadFilter();
        clickFilter.type = 'highpass';
        clickFilter.frequency.value = 1000;
        clickFilter.Q.value = 1;
        
        // Noise transient
        const noiseBuffer = this.audioContext.createBuffer(1, 512, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 512; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/512, 2);
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = 0.2;
        
        // EQ and compression
        const eq = this.audioContext.createBiquadFilter();
        eq.type = 'peaking';
        eq.frequency.value = 80;
        eq.Q.value = 0.7;
        eq.gain.value = 6;
        
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.knee.value = 4;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.001;
        compressor.release.value = 0.1;
        
        // Saturation
        const saturation = this.audioContext.createWaveShaper();
        const satCurve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i - 128) / 128;
            satCurve[i] = Math.tanh(x * 2) * 0.8;
        }
        saturation.curve = satCurve;
        saturation.oversample = '2x';
        
        // Connect everything
        sub.connect(subGain);
        subGain.connect(eq);
        
        body.connect(bodyGain);
        bodyGain.connect(eq);
        
        click.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(eq);
        
        noiseSource.connect(noiseGain);
        noiseGain.connect(eq);
        
        eq.connect(compressor);
        compressor.connect(saturation);
        saturation.connect(drumBus);
        
        this.connectToMaster(drumBus);
        
        // Start everything
        sub.start(time);
        body.start(time);
        click.start(time);
        noiseSource.start(time);
        
        sub.stop(time + 0.3);
        body.stop(time + 0.15);
        click.stop(time + 0.01);
        
        // Decrement voice count when done
        setTimeout(() => {
            this.activeVoices--;
            this.drumVoices--;
        }, 300);
    }

    playSnare(time, variation, velocity = 0.5) {
        if (this.drumVoices >= this.maxDrumVoices || this.activeVoices > this.maxVoices) return;
        this.drumVoices++;
        this.activeVoices++;
        
        // Performance reduction
        if (this.performanceThrottle < 0.7) {
            // Skip room simulation when under pressure
            velocity *= 0.8;
        }
        
        // Create drum bus
        const drumBus = this.audioContext.createGain();
        drumBus.gain.value = velocity;
        
        // Noise layers with different characteristics
        const noiseLength = 0.15;
        const noiseBuffer = this.audioContext.createBuffer(2, this.audioContext.sampleRate * noiseLength, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = noiseBuffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                // Mix white and pink noise
                const white = Math.random() * 2 - 1;
                const envelope = Math.pow(1 - i / data.length, 0.5);
                data[i] = white * envelope;
            }
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        
        // Multiple filter stages for shaping
        const hpf = this.audioContext.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 200 + variation * 100;
        hpf.Q.value = 0.7;
        
        const bpf = this.audioContext.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.value = 5000 + Math.random() * 2000;
        bpf.Q.value = 2;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.7, time);
        noiseGain.gain.setValueAtTime(0.7, time + 0.001);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + noiseLength);
        
        // Tonal components (multiple sine oscillators)
        const fundamentals = [200, 250, 300];
        const toneGains = [];
        const tones = [];
        
        fundamentals.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq * (1 + variation * 0.1);
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.3 / fundamentals.length, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.03 + index * 0.01);
            
            osc.connect(gain);
            gain.connect(drumBus);
            
            osc.start(time);
            osc.stop(time + 0.1);
            
            tones.push(osc);
            toneGains.push(gain);
        });
        
        // Transient click
        const click = this.audioContext.createOscillator();
        click.type = 'triangle';
        click.frequency.value = 1000;
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.5, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.002);
        
        // Room simulation
        const room = this.audioContext.createConvolver();
        const roomSize = 0.01; // Very short reverb
        const roomBuffer = this.audioContext.createBuffer(2, this.audioContext.sampleRate * roomSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = roomBuffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
            }
        }
        room.buffer = roomBuffer;
        
        const roomGain = this.audioContext.createGain();
        roomGain.gain.value = 0.2;
        
        // Compression
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -15;
        compressor.knee.value = 6;
        compressor.ratio.value = 6;
        compressor.attack.value = 0.0003;
        compressor.release.value = 0.05;
        
        // Connect everything
        noise.connect(hpf);
        hpf.connect(bpf);
        bpf.connect(noiseGain);
        noiseGain.connect(compressor);
        
        click.connect(clickGain);
        clickGain.connect(compressor);
        
        compressor.connect(drumBus);
        compressor.connect(room);
        room.connect(roomGain);
        roomGain.connect(drumBus);
        
        this.connectToMaster(drumBus);
        
        // Start everything
        noise.start(time);
        click.start(time);
        click.stop(time + 0.005);
        
        // Decrement voice count when done
        setTimeout(() => {
            this.activeVoices--;
            this.drumVoices--;
        }, 150);
    }

    playHiHat(time, variation, velocity = 0.3, isOpen = false) {
        if (this.drumVoices >= this.maxDrumVoices || this.activeVoices > this.maxVoices) return;
        this.drumVoices++;
        this.activeVoices++;
        
        // Simplify when under pressure
        if (this.performanceThrottle < 0.5) {
            // Use fewer bands for metallic character
            const bands = [8000, 12000];
            velocity *= 0.7;
        }
        
        const duration = isOpen ? 0.3 : 0.05;
        const drumBus = this.audioContext.createGain();
        drumBus.gain.value = velocity;
        
        // Create metallic noise using multiple narrow bands
        const bands = [6000, 8000, 10000, 12000, 14000];
        const bandGains = [];
        
        bands.forEach((freq, index) => {
            const noise = this.audioContext.createBufferSource();
            const noiseLength = Math.min(duration + 0.05, 0.1);
            const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * noiseLength, this.audioContext.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            
            // Create metallic character
            for (let i = 0; i < data.length; i++) {
                const metallic = Math.sin(i * freq / this.audioContext.sampleRate * 2 * Math.PI);
                data[i] = (Math.random() * 2 - 1) * metallic;
            }
            
            noise.buffer = noiseBuffer;
            noise.loop = true;
            
            // Narrow band filter
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = freq * (1 + (Math.random() - 0.5) * variation * 0.1);
            filter.Q.value = 30;
            
            const gain = this.audioContext.createGain();
            const envelope = isOpen ? 
                [0.8 / bands.length, duration * 0.8, 0.01, duration] :
                [1 / bands.length, 0.001, 0.01, duration];
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(envelope[0], time + envelope[1]);
            gain.gain.exponentialRampToValueAtTime(envelope[2], time + envelope[3]);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(drumBus);
            
            noise.start(time);
            noise.stop(time + duration + 0.05);
            
            bandGains.push(gain);
        });
        
        // Add some high frequency shimmer
        const shimmer = this.audioContext.createOscillator();
        shimmer.type = 'square';
        shimmer.frequency.value = 15000 + Math.random() * 2000;
        
        const shimmerGain = this.audioContext.createGain();
        shimmerGain.gain.setValueAtTime(0.1, time);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, time + duration * 0.3);
        
        const shimmerFilter = this.audioContext.createBiquadFilter();
        shimmerFilter.type = 'highpass';
        shimmerFilter.frequency.value = 12000;
        shimmerFilter.Q.value = 0.7;
        
        // Stereo width
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 0.3;
        
        // Final EQ
        const eq = this.audioContext.createBiquadFilter();
        eq.type = 'highshelf';
        eq.frequency.value = 8000;
        eq.gain.value = 3;
        
        shimmer.connect(shimmerFilter);
        shimmerFilter.connect(shimmerGain);
        shimmerGain.connect(drumBus);
        
        drumBus.connect(eq);
        eq.connect(panner);
        panner.connect(this.nodes.master.dryGain);
        panner.connect(this.nodes.master.convolver);
        panner.connect(this.nodes.master.delay);
        
        shimmer.start(time);
        shimmer.stop(time + duration);
        
        // Decrement voice count when done
        setTimeout(() => {
            this.activeVoices--;
            this.drumVoices--;
        }, duration * 1000 + 50);
    }
    
    playRimshot(time, variation) {
        if (this.drumVoices >= this.maxDrumVoices || this.activeVoices > this.maxVoices) return;
        this.drumVoices++;
        this.activeVoices++;
        
        const velocity = 0.6;
        
        // Metallic click
        const click = this.audioContext.createOscillator();
        click.frequency.value = 800 + Math.random() * 200;
        click.type = 'square';
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.4 * velocity, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.01);
        
        // Resonant tone
        const tone = this.audioContext.createOscillator();
        tone.frequency.value = 400;
        tone.type = 'sine';
        
        const toneGain = this.audioContext.createGain();
        toneGain.gain.setValueAtTime(0.3 * velocity, time);
        toneGain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 10;
        
        // Short noise burst
        const noiseBuffer = this.audioContext.createBuffer(1, 1024, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 1024; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/1024, 2);
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = 0.3 * velocity;
        
        const drumBus = this.audioContext.createGain();
        
        // Connect
        click.connect(clickGain);
        clickGain.connect(drumBus);
        
        tone.connect(filter);
        filter.connect(toneGain);
        toneGain.connect(drumBus);
        
        noise.connect(noiseGain);
        noiseGain.connect(drumBus);
        
        this.connectToMaster(drumBus);
        
        // Start
        click.start(time);
        tone.start(time);
        noise.start(time);
        
        click.stop(time + 0.01);
        tone.stop(time + 0.05);
        
        setTimeout(() => {
            this.activeVoices--;
            this.drumVoices--;
        }, 50);
    }
    
    playClap(time, variation) {
        if (this.drumVoices >= this.maxDrumVoices || this.activeVoices > this.maxVoices) return;
        this.drumVoices++;
        this.activeVoices++;
        
        const velocity = 0.5;
        const drumBus = this.audioContext.createGain();
        
        // Multiple short bursts to simulate clap
        const clapCount = this.performanceThrottle < 0.7 ? 2 : 3 + Math.floor(Math.random() * 2);
        const clapSpacing = 0.01;
        
        for (let i = 0; i < clapCount; i++) {
            const clapTime = time + i * clapSpacing;
            
            // Filtered noise
            const noiseBuffer = this.audioContext.createBuffer(1, 512, this.audioContext.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let j = 0; j < 512; j++) {
                noiseData[j] = Math.random() * 2 - 1;
            }
            
            const noise = this.audioContext.createBufferSource();
            noise.buffer = noiseBuffer;
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1500 + Math.random() * 1000;
            filter.Q.value = 5;
            
            const gain = this.audioContext.createGain();
            const amplitude = velocity * (i === clapCount - 1 ? 1 : 0.3 + Math.random() * 0.3);
            gain.gain.setValueAtTime(amplitude, clapTime);
            gain.gain.exponentialRampToValueAtTime(0.01, clapTime + 0.02);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(drumBus);
            
            noise.start(clapTime);
        }
        
        // Add body
        const body = this.audioContext.createOscillator();
        body.frequency.value = 200;
        
        const bodyGain = this.audioContext.createGain();
        bodyGain.gain.setValueAtTime(0.2 * velocity, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
        
        body.connect(bodyGain);
        bodyGain.connect(drumBus);
        
        // Compression
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 10;
        compressor.ratio.value = 8;
        compressor.attack.value = 0.001;
        compressor.release.value = 0.02;
        
        drumBus.connect(compressor);
        compressor.connect(this.nodes.master.dryGain);
        compressor.connect(this.nodes.master.convolver);
        
        body.start(time);
        body.stop(time + 0.05);
        
        setTimeout(() => {
            this.activeVoices--;
            this.drumVoices--;
        }, 100);
    }

    // SINE BLEEP GENERATOR (Ikeda-style)
    startBleeps() {
        if (!this.isPlaying) return;
        
        const density = parseFloat(document.getElementById('bleepDensity').value) / 100;
        const range = parseFloat(document.getElementById('bleepRange').value);
        const duration = parseFloat(document.getElementById('bleepDuration').value);
        
        if (density === 0) return;
        
        this.schedulers.bleeps = setInterval(() => {
            if (this.groupEnabled.bleeps && Math.random() < density) {
                this.triggerBleep(range, duration);
            }
        }, 100); // Check every 100ms
    }

    triggerBleep(range, duration) {
        const now = this.audioContext.currentTime;
        const freq = 100 + Math.random() * range;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.001);
        gain.gain.setValueAtTime(0.5, now + duration - 0.001);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        
        osc.connect(gain);
        this.connectToMaster(gain);
        
        osc.start(now);
        osc.stop(now + duration + 0.001);
    }

    // DATA BURST GENERATOR
    startDataBurst() {
        if (!this.isPlaying) return;
        
        const activity = parseFloat(document.getElementById('burstActivity').value) / 100;
        const complexity = parseInt(document.getElementById('burstComplexity').value);
        const speed = parseFloat(document.getElementById('burstSpeed').value);
        
        if (activity === 0) return;
        
        this.schedulers.burst = setInterval(() => {
            if (this.groupEnabled.burst && Math.random() < activity) {
                this.triggerDataBurst(complexity, speed);
            }
        }, 200 / speed);
    }

    triggerDataBurst(complexity, speed) {
        const now = this.audioContext.currentTime;
        const burstLength = 0.05 + Math.random() * 0.2;
        
        for (let i = 0; i < complexity; i++) {
            const freq = 200 + Math.random() * 8000;
            const startTime = now + (i * burstLength / complexity);
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = Math.random() < 0.5 ? 'square' : 'sawtooth';
            osc.frequency.value = freq;
            
            filter.type = 'bandpass';
            filter.frequency.value = freq;
            filter.Q.value = 10 + Math.random() * 20;
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3 / complexity, startTime + 0.001);
            gain.gain.linearRampToValueAtTime(0, startTime + burstLength / complexity);
            
            osc.connect(filter);
            filter.connect(gain);
            this.connectToMaster(gain);
            
            osc.start(startTime);
            osc.stop(startTime + burstLength / complexity + 0.001);
        }
    }

    // FM SYNTHESIS GENERATOR
    startFM() {
        const carrierFreq = parseFloat(document.getElementById('fmCarrier').value);
        const modIndex = parseFloat(document.getElementById('fmIndex').value) / 100;
        const ratio = parseFloat(document.getElementById('fmRatio').value);
        const lfoSpeed = parseFloat(document.getElementById('fmLFO').value);
        
        if (modIndex === 0 || !this.isPlaying) return;
        
        // Carrier
        this.nodes.fm.carrier = this.audioContext.createOscillator();
        this.nodes.fm.carrier.type = 'sine';
        this.nodes.fm.carrier.frequency.value = carrierFreq;
        
        // Modulator
        this.nodes.fm.modulator = this.audioContext.createOscillator();
        this.nodes.fm.modulator.type = 'sine';
        this.nodes.fm.modulator.frequency.value = carrierFreq * ratio;
        
        // Modulation gain
        this.nodes.fm.modGain = this.audioContext.createGain();
        this.nodes.fm.modGain.gain.value = modIndex * 1000;
        
        // Output gain
        this.nodes.fm.gain = this.audioContext.createGain();
        this.nodes.fm.gain.gain.value = 0.2;
        
        // Connect FM
        this.nodes.fm.modulator.connect(this.nodes.fm.modGain);
        this.nodes.fm.modGain.connect(this.nodes.fm.carrier.frequency);
        this.nodes.fm.carrier.connect(this.nodes.fm.gain);
        this.connectToMaster(this.nodes.fm.gain);
        
        // LFO for FM depth
        if (lfoSpeed > 0) {
            this.nodes.fm.lfo = this.audioContext.createOscillator();
            this.nodes.fm.lfoGain = this.audioContext.createGain();
            this.nodes.fm.lfo.frequency.value = lfoSpeed;
            this.nodes.fm.lfoGain.gain.value = modIndex * 500;
            
            this.nodes.fm.lfo.connect(this.nodes.fm.lfoGain);
            this.nodes.fm.lfoGain.connect(this.nodes.fm.modGain.gain);
            this.nodes.fm.lfo.start();
        }
        
        this.nodes.fm.carrier.start();
        this.nodes.fm.modulator.start();
    }

    // NOISE TEXTURE GENERATOR
    startNoise() {
        const type = document.getElementById('noiseType').value;
        const level = parseFloat(document.getElementById('noiseLevel').value) / 100;
        const filterFreq = parseFloat(document.getElementById('noiseFilter').value);
        
        if (level === 0 || !this.isPlaying) return;
        
        this.nodes.noise.source = this.audioContext.createBufferSource();
        this.nodes.noise.gain = this.audioContext.createGain();
        this.nodes.noise.filter = this.audioContext.createBiquadFilter();
        
        // Create noise buffer
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        this.generateNoiseData(data, type);
        
        this.nodes.noise.source.buffer = buffer;
        this.nodes.noise.source.loop = true;
        
        this.nodes.noise.filter.type = 'lowpass';
        this.nodes.noise.filter.frequency.value = filterFreq;
        this.nodes.noise.gain.gain.value = level * 0.3;
        
        this.nodes.noise.source.connect(this.nodes.noise.filter);
        this.nodes.noise.filter.connect(this.nodes.noise.gain);
        this.connectToMaster(this.nodes.noise.gain);
        
        this.nodes.noise.source.start();
    }

    generateNoiseData(data, type) {
        switch(type) {
            case 'white':
                for (let i = 0; i < data.length; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                break;
            case 'pink':
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                for (let i = 0; i < data.length; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                    b6 = white * 0.115926;
                }
                break;
            case 'brown':
                let lastOut = 0;
                for (let i = 0; i < data.length; i++) {
                    const white = Math.random() * 2 - 1;
                    data[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = data[i];
                }
                break;
            case 'crackle':
                for (let i = 0; i < data.length; i++) {
                    data[i] = Math.random() < 0.01 ? (Math.random() * 2 - 1) : 0;
                }
                break;
        }
    }

    // ACID/303 SYNTHESIS
    startAcid() {
        const enable = parseFloat(document.getElementById('acidLevel').value) / 100;
        const baseFreq = parseFloat(document.getElementById('acidFreq').value);
        const resonance = parseFloat(document.getElementById('acidResonance').value) / 100;
        const decay = parseFloat(document.getElementById('acidDecay').value);
        const speed = parseFloat(document.getElementById('acidSpeed').value);
        
        if (enable === 0 || !this.isPlaying) return;
        
        // Acid pattern generator
        const pattern = [1, 0, 0.5, 0, 1, 0, 0.3, 0.8, 0, 0.6, 0, 1, 0, 0.4, 0, 0.7];
        const noteOffsets = [0, 0, 12, 0, 0, 7, 3, 5, 0, 10, 0, 0, 15, 3, 0, 7];
        let step = 0;
        
        const tempo = parseInt(document.getElementById('drumTempo').value);
        const interval = 60000 / (tempo * 4 * speed);
        
        this.schedulers.acid = setInterval(() => {
            if (!this.groupEnabled.acid) return;
            const patternStep = step % pattern.length;
            if (pattern[patternStep] > 0) {
                const velocity = pattern[patternStep] * enable;
                const noteOffset = noteOffsets[patternStep];
                this.triggerAcidNote(baseFreq * Math.pow(2, noteOffset / 12), velocity, decay, resonance);
            }
            step++;
        }, interval);
    }
    
    triggerAcidNote(freq, velocity, decay, resonance) {
        const now = this.audioContext.currentTime;
        
        // Oscillator
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        
        // Filter with envelope
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = resonance * 30;
        
        // Filter envelope
        const cutoffMax = Math.min(freq * 8, 15000);
        filter.frequency.setValueAtTime(cutoffMax, now);
        filter.frequency.exponentialRampToValueAtTime(freq, now + decay);
        
        // Amplitude envelope
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.5, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + decay);
        
        // Distortion for acid character
        const distortion = this.audioContext.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i - 128) / 128;
            curve[i] = Math.tanh(x * (1 + resonance * 4));
        }
        distortion.curve = curve;
        
        // Connect chain
        osc.connect(filter);
        filter.connect(distortion);
        distortion.connect(gain);
        this.connectToMaster(gain);
        
        osc.start(now);
        osc.stop(now + decay + 0.1);
    }
    
    // GRANULAR SYNTHESIS
    startGranular() {
        const density = parseFloat(document.getElementById('grainDensity').value) / 100;
        const grainSize = parseFloat(document.getElementById('grainSize').value);
        const pitchSpread = parseFloat(document.getElementById('grainPitch').value) / 100;
        const panSpread = parseFloat(document.getElementById('grainPan').value) / 100;
        
        if (density === 0 || !this.isPlaying) return;
        
        // Create source buffer with various waveforms
        const bufferSize = this.audioContext.sampleRate * 2;
        this.nodes.granular.buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = this.nodes.granular.buffer.getChannelData(0);
        
        // Fill with complex waveform
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            data[i] = Math.sin(2 * Math.PI * 100 * t) * 0.3 +
                     Math.sin(2 * Math.PI * 237 * t) * 0.2 +
                     Math.sin(2 * Math.PI * 523 * t) * 0.1 +
                     (Math.random() * 2 - 1) * 0.1;
        }
        
        // Grain scheduler with adaptive interval
        const granularInterval = this.performanceThrottle < 0.7 ? 100 : 50;
        this.schedulers.granular = setInterval(() => {
            if (this.groupEnabled.granular && Math.random() < density * this.performanceThrottle) {
                this.triggerGrain(grainSize, pitchSpread, panSpread);
            }
        }, granularInterval);
    }
    
    triggerGrain(size, pitchSpread, panSpread) {
        const now = this.audioContext.currentTime;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.nodes.granular.buffer;
        
        // Random playback position
        const startPos = Math.random() * (source.buffer.duration - size / 1000);
        
        // Random pitch
        const pitchRatio = Math.pow(2, (Math.random() - 0.5) * pitchSpread * 2);
        source.playbackRate.value = pitchRatio;
        
        // Grain envelope
        const gain = this.audioContext.createGain();
        const grainDuration = size / 1000;
        
        // Simple envelope (less CPU intensive)
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + grainDuration * 0.1);
        gain.gain.setValueAtTime(0.3, now + grainDuration * 0.9);
        gain.gain.linearRampToValueAtTime(0, now + grainDuration)
        
        // Panning
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 2 * panSpread;
        
        // Connect
        source.connect(gain);
        gain.connect(panner);
        panner.connect(this.nodes.master.dryGain);
        panner.connect(this.nodes.master.convolver);
        panner.connect(this.nodes.master.delay);
        
        source.start(now, startPos, grainDuration);
    }
    
    // SPACE MELODY GENERATOR
    startSpaceMelody() {
        const density = parseFloat(document.getElementById('spaceMelodyDensity').value) / 100;
        const range = parseInt(document.getElementById('spaceMelodyRange').value);
        const speed = parseFloat(document.getElementById('spaceMelodySpeed').value);
        const echo = parseFloat(document.getElementById('spaceMelodyEcho').value) / 100;
        const portamento = parseFloat(document.getElementById('spaceMelodyPortamento').value);
        
        if (density === 0 || !this.isPlaying) return;
        
        // Create echo delay
        this.nodes.spaceMelody.delay = this.audioContext.createDelay(2);
        this.nodes.spaceMelody.delay.delayTime.value = 0.375; // Dotted eighth
        this.nodes.spaceMelody.delayGain = this.audioContext.createGain();
        this.nodes.spaceMelody.delayGain.gain.value = echo * 0.7;
        
        this.nodes.spaceMelody.filter = this.audioContext.createBiquadFilter();
        this.nodes.spaceMelody.filter.type = 'highpass';
        this.nodes.spaceMelody.filter.frequency.value = 200;
        
        // Setup echo chain
        this.nodes.spaceMelody.delay.connect(this.nodes.spaceMelody.delayGain);
        this.nodes.spaceMelody.delayGain.connect(this.nodes.spaceMelody.delay);
        
        // Pentatonic scale for spacey melodies
        const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
        const baseFreq = 220; // A3
        
        const interval = 60000 / (120 * speed * 2);
        this.schedulers.spaceMelody = setInterval(() => {
            if (this.groupEnabled.spaceMelody && Math.random() < density) {
                const noteIndex = Math.floor(Math.random() * scale.length);
                const octave = Math.floor(Math.random() * range);
                const freq = baseFreq * Math.pow(2, (scale[noteIndex] + octave * 12) / 12);
                this.triggerSpaceMelodyNote(freq, portamento);
            }
        }, interval);
    }
    
    triggerSpaceMelodyNote(targetFreq, portamento) {
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        // Portamento effect
        if (this.nodes.spaceMelody.lastFreq) {
            osc.frequency.setValueAtTime(this.nodes.spaceMelody.lastFreq, now);
            osc.frequency.exponentialRampToValueAtTime(targetFreq, now + portamento / 1000);
        } else {
            osc.frequency.value = targetFreq;
        }
        this.nodes.spaceMelody.lastFreq = targetFreq;
        
        // Add slight vibrato
        const vibrato = this.audioContext.createOscillator();
        const vibratoGain = this.audioContext.createGain();
        vibrato.frequency.value = 5;
        vibratoGain.gain.value = 3;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        
        osc.connect(gain);
        gain.connect(this.nodes.spaceMelody.filter);
        this.nodes.spaceMelody.filter.connect(this.nodes.spaceMelody.delay);
        this.nodes.spaceMelody.filter.connect(this.nodes.master.dryGain);
        this.nodes.spaceMelody.delay.connect(this.nodes.master.dryGain);
        
        osc.start(now);
        vibrato.start(now);
        osc.stop(now + 2);
        vibrato.stop(now + 2);
    }
    
    // AMBIENT PAD GENERATOR  
    startAmbientPad() {
        const density = parseFloat(document.getElementById('padDensity').value) / 100;
        const attack = parseFloat(document.getElementById('padAttack').value);
        const release = parseFloat(document.getElementById('padRelease').value);
        const filterSweep = parseFloat(document.getElementById('padFilterSweep').value) / 100;
        const shimmer = parseFloat(document.getElementById('padShimmer').value) / 100;
        
        if (density === 0 || !this.isPlaying) return;
        
        // Chord progressions
        const chords = [
            [0, 4, 7, 11],    // Cmaj7
            [2, 5, 9, 12],    // Dm7
            [4, 7, 11, 14],   // Em7
            [5, 9, 12, 16],   // Fmaj7
            [7, 11, 14, 17],  // G7
            [9, 12, 16, 19],  // Am7
        ];
        
        const interval = 8000 / density; // Longer intervals for pads
        let chordIndex = 0;
        
        this.schedulers.ambientPad = setInterval(() => {
            if (this.groupEnabled.ambientPad) {
                const chord = chords[chordIndex % chords.length];
                this.triggerPadChord(chord, attack, release, filterSweep, shimmer);
                chordIndex++;
            }
        }, interval);
    }
    
    triggerPadChord(chord, attack, release, filterSweep, shimmer) {
        const now = this.audioContext.currentTime;
        const baseFreq = 110; // A2
        
        chord.forEach((note, i) => {
            const freq = baseFreq * Math.pow(2, note / 12);
            
            // Multiple detuned oscillators per note
            for (let j = 0; j < 3; j++) {
                const osc = this.audioContext.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = freq * (1 + (j - 1) * 0.01); // Slight detune
                
                const gain = this.audioContext.createGain();
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1 / chord.length, now + attack);
                gain.gain.setValueAtTime(0.1 / chord.length, now + attack + 2);
                gain.gain.exponentialRampToValueAtTime(0.001, now + attack + 2 + release);
                
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(200, now);
                filter.frequency.exponentialRampToValueAtTime(2000 * (1 + filterSweep), now + attack);
                filter.frequency.exponentialRampToValueAtTime(200, now + attack + 2 + release);
                filter.Q.value = 3;
                
                // Shimmer effect (high frequency content)
                if (shimmer > 0 && Math.random() < shimmer) {
                    const shimmerOsc = this.audioContext.createOscillator();
                    shimmerOsc.frequency.value = freq * 4;
                    shimmerOsc.type = 'sine';
                    const shimmerGain = this.audioContext.createGain();
                    shimmerGain.gain.value = 0.02 * shimmer;
                    shimmerOsc.connect(shimmerGain);
                    shimmerGain.connect(this.nodes.master.convolver);
                    shimmerOsc.start(now + attack * 0.5);
                    shimmerOsc.stop(now + attack + 2 + release);
                }
                
                osc.connect(gain);
                gain.connect(filter);
                filter.connect(this.nodes.master.dryGain);
                filter.connect(this.nodes.master.convolver);
                
                osc.start(now);
                osc.stop(now + attack + 2 + release);
            }
        });
    }
    
    // ARPEGGIATOR GENERATOR
    startArpeggiator() {
        const enable = parseFloat(document.getElementById('arpEnable').value) / 100;
        const pattern = document.getElementById('arpPattern').value;
        const speed = parseInt(document.getElementById('arpSpeed').value);
        const octaves = parseInt(document.getElementById('arpOctaves').value);
        const gate = parseFloat(document.getElementById('arpGate').value) / 100;
        
        if (enable === 0 || !this.isPlaying) return;
        
        // Base notes for arpeggio (minor pentatonic)
        const baseNotes = [0, 3, 5, 7, 10];
        let noteIndex = 0;
        let direction = 1;
        
        const tempo = parseFloat(document.getElementById('drumTempo')?.value || 120);
        const interval = 60000 / (tempo * speed / 4);
        
        this.schedulers.arpeggiator = setInterval(() => {
            if (this.groupEnabled.arpeggiator && Math.random() < enable) {
                // Calculate note based on pattern
                let notes = [];
                for (let oct = 0; oct < octaves; oct++) {
                    baseNotes.forEach(note => notes.push(note + oct * 12));
                }
                
                let currentNote;
                switch(pattern) {
                    case 'up':
                        currentNote = notes[noteIndex % notes.length];
                        noteIndex++;
                        break;
                    case 'down':
                        currentNote = notes[notes.length - 1 - (noteIndex % notes.length)];
                        noteIndex++;
                        break;
                    case 'updown':
                        if (noteIndex >= notes.length - 1) direction = -1;
                        if (noteIndex <= 0) direction = 1;
                        currentNote = notes[noteIndex];
                        noteIndex += direction;
                        break;
                    case 'random':
                        currentNote = notes[Math.floor(Math.random() * notes.length)];
                        break;
                }
                
                const freq = 220 * Math.pow(2, currentNote / 12);
                this.triggerArpNote(freq, interval * gate);
            }
        }, interval);
    }
    
    triggerArpNote(freq, duration) {
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gain.gain.setValueAtTime(0.2, now + duration / 1000 - 0.01);
        gain.gain.linearRampToValueAtTime(0, now + duration / 1000);
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq * 4;
        filter.Q.value = 5;
        
        osc.connect(gain);
        gain.connect(filter);
        filter.connect(this.nodes.master.dryGain);
        filter.connect(this.nodes.master.delay);
        
        osc.start(now);
        osc.stop(now + duration / 1000);
    }

    // PARAMETER UPDATES
    updateParameter(id, value) {
        switch(id) {
            case 'masterVolume':
                if (this.nodes.master.gain) {
                    this.nodes.master.gain.gain.value = value / 100;
                }
                break;
            case 'reverb':
            case 'delay':
            case 'delayTime':
                this.updateReverbMix();
                this.updateDelaySettings();
                break;
            case 'droneFreq':
            case 'droneDetune':
            case 'droneVoices':
            case 'droneFilter':
            case 'droneLFO':
                this.updateDrone();
                break;
            case 'glitchIntensity':
            case 'glitchRate':
                this.updateGlitch();
                break;
            case 'bitCrush':
                this.updateBitCrusher(value);
                break;
            case 'drumTempo':
            case 'drumDensity':
            case 'drumVariation':
                this.updateDrums();
                break;
            case 'bleepDensity':
            case 'bleepRange':
            case 'bleepDuration':
                this.updateBleeps();
                break;
            case 'burstActivity':
            case 'burstComplexity':
            case 'burstSpeed':
                this.updateDataBurst();
                break;
            case 'fmCarrier':
            case 'fmIndex':
            case 'fmRatio':
            case 'fmLFO':
                this.updateFM();
                break;
            case 'noiseLevel':
            case 'noiseFilter':
                this.updateNoise();
                break;
            case 'acidLevel':
            case 'acidFreq':
            case 'acidResonance':
            case 'acidDecay':
            case 'acidSpeed':
                this.updateAcid();
                break;
            case 'grainDensity':
            case 'grainSize':
            case 'grainPitch':
            case 'grainPan':
                this.updateGranular();
                break;
            case 'drumPattern':
                this.updateDrums();
                break;
            // Space Melody
            case 'spaceMelodyDensity':
            case 'spaceMelodyRange':
            case 'spaceMelodySpeed':
            case 'spaceMelodyEcho':
            case 'spaceMelodyPortamento':
                this.updateSpaceMelody();
                break;
            // Ambient Pad
            case 'padDensity':
            case 'padAttack':
            case 'padRelease':
            case 'padFilterSweep':
            case 'padShimmer':
                this.updateAmbientPad();
                break;
            // Arpeggiator
            case 'arpEnable':
            case 'arpSpeed':
            case 'arpOctaves':
            case 'arpGate':
                this.updateArpeggiator();
                break;
        }
    }

    updateReverbMix() {
        const reverbAmount = parseFloat(document.getElementById('reverb').value) / 100;
        if (this.nodes.master.reverbGain) {
            this.nodes.master.reverbGain.gain.value = reverbAmount;
            this.nodes.master.dryGain.gain.value = 1 - reverbAmount * 0.5;
        }
    }

    updateDelaySettings() {
        const delayAmount = parseFloat(document.getElementById('delay').value) / 100;
        const delayTime = parseFloat(document.getElementById('delayTime').value);
        
        if (this.nodes.master.delay) {
            this.nodes.master.delay.delayTime.value = delayTime;
            this.nodes.master.delayGain.gain.value = delayAmount * 0.5;
            this.nodes.master.delayFeedback.gain.value = delayAmount * 0.4;
        }
    }

    updateDrone() {
        if (this.nodes.drone.oscillators) {
            this.nodes.drone.oscillators.forEach(osc => {
                try { osc.stop(); } catch(e) {}
            });
            this.nodes.drone.oscillators = [];
        }
        if (this.nodes.drone.lfos) {
            this.nodes.drone.lfos.forEach(lfo => {
                try { lfo.stop(); } catch(e) {}
            });
            this.nodes.drone.lfos = [];
        }
        this.startDrone();
    }

    updateGlitch() {
        if (this.schedulers.glitch) {
            clearInterval(this.schedulers.glitch);
            this.schedulers.glitch = null;
        }
        if (this.nodes.glitch.source) {
            try { this.nodes.glitch.source.stop(); } catch(e) {}
            this.nodes.glitch.source = null;
        }
        this.startGlitch();
    }

    updateBitCrusher(bits) {
        if (!this.nodes.glitch.waveshaper) return;
        
        const curve = new Float32Array(256);
        const step = Math.pow(2, 16 - bits);
        
        for (let i = 0; i < 256; i++) {
            const x = (i - 128) / 128;
            curve[i] = Math.round(x * step) / step;
        }
        
        this.nodes.glitch.waveshaper.curve = curve;
    }

    updateDrums() {
        if (this.schedulers.drums) {
            clearInterval(this.schedulers.drums);
        }
        this.startDrums();
    }

    updateBleeps() {
        if (this.schedulers.bleeps) {
            clearInterval(this.schedulers.bleeps);
        }
        this.startBleeps();
    }

    updateDataBurst() {
        if (this.schedulers.burst) {
            clearInterval(this.schedulers.burst);
        }
        this.startDataBurst();
    }

    updateFM() {
        if (this.nodes.fm.carrier) {
            try { this.nodes.fm.carrier.stop(); } catch(e) {}
            try { this.nodes.fm.modulator.stop(); } catch(e) {}
            if (this.nodes.fm.lfo) {
                try { this.nodes.fm.lfo.stop(); } catch(e) {}
            }
            this.nodes.fm.carrier = null;
            this.nodes.fm.modulator = null;
            this.nodes.fm.lfo = null;
        }
        this.startFM();
    }

    updateNoise() {
        const level = parseFloat(document.getElementById('noiseLevel').value) / 100;
        const filterFreq = parseFloat(document.getElementById('noiseFilter').value);
        
        if (this.nodes.noise.gain) {
            this.nodes.noise.gain.gain.value = level * 0.3;
        }
        if (this.nodes.noise.filter) {
            this.nodes.noise.filter.frequency.value = filterFreq;
        }
    }

    updateNoiseType(type) {
        if (this.nodes.noise.source) {
            try { this.nodes.noise.source.stop(); } catch(e) {}
            this.nodes.noise.source = null;
        }
        this.startNoise();
    }
    
    updateAcid() {
        if (this.schedulers.acid) {
            clearInterval(this.schedulers.acid);
            this.schedulers.acid = null;
        }
        this.startAcid();
    }
    
    updateGranular() {
        if (this.schedulers.granular) {
            clearInterval(this.schedulers.granular);
            this.schedulers.granular = null;
        }
        this.startGranular();
    }
    
    updateSpaceMelody() {
        if (this.schedulers.spaceMelody) {
            clearInterval(this.schedulers.spaceMelody);
            this.schedulers.spaceMelody = null;
        }
        if (this.nodes.spaceMelody.delay) {
            try { this.nodes.spaceMelody.delay.disconnect(); } catch(e) {}
        }
        if (this.nodes.spaceMelody.delayGain) {
            try { this.nodes.spaceMelody.delayGain.disconnect(); } catch(e) {}
        }
        this.startSpaceMelody();
    }
    
    updateAmbientPad() {
        if (this.schedulers.ambientPad) {
            clearInterval(this.schedulers.ambientPad);
            this.schedulers.ambientPad = null;
        }
        this.startAmbientPad();
    }
    
    updateArpeggiator() {
        if (this.schedulers.arpeggiator) {
            clearInterval(this.schedulers.arpeggiator);
            this.schedulers.arpeggiator = null;
        }
        this.startArpeggiator();
    }

    // RANDOMIZE FUNCTION
    randomize() {
        const params = [
            // Master (excluding volume)
            { id: 'reverb', min: 0, max: 100 },
            { id: 'delay', min: 0, max: 100 },
            { id: 'delayTime', min: 0.1, max: 1 },
            // Drone
            { id: 'droneFreq', min: 50, max: 500 },
            { id: 'droneDetune', min: 0, max: 50 },
            { id: 'droneVoices', min: 1, max: 8 },
            { id: 'droneFilter', min: 100, max: 5000 },
            { id: 'droneLFO', min: 0, max: 10 },
            // Glitch
            { id: 'glitchIntensity', min: 0, max: 50 },
            { id: 'glitchRate', min: 0.1, max: 20 },
            { id: 'bitCrush', min: 1, max: 16 },
            // Drums
            { id: 'drumTempo', min: 60, max: 180 },
            { id: 'drumDensity', min: 0, max: 100 },
            { id: 'drumVariation', min: 0, max: 100 },
            { id: 'drumSwing', min: 0, max: 100 },
            { id: 'snareRush', min: 0, max: 100 },
            { id: 'ghostNotes', min: 0, max: 100 },
            { id: 'hihatSpeed', min: 1, max: 8 },
            // Bleeps
            { id: 'bleepDensity', min: 0, max: 30 },
            { id: 'bleepRange', min: 100, max: 10000 },
            { id: 'bleepDuration', min: 0.01, max: 0.5 },
            // Data Burst
            { id: 'burstActivity', min: 0, max: 50 },
            { id: 'burstComplexity', min: 1, max: 10 },
            { id: 'burstSpeed', min: 0.1, max: 10 },
            // FM
            { id: 'fmCarrier', min: 50, max: 1000 },
            { id: 'fmIndex', min: 0, max: 50 },
            { id: 'fmRatio', min: 0.1, max: 10 },
            { id: 'fmLFO', min: 0, max: 20 },
            // Noise
            { id: 'noiseLevel', min: 0, max: 30 },
            { id: 'noiseFilter', min: 100, max: 10000 },
            // Acid
            { id: 'acidLevel', min: 0, max: 100 },
            { id: 'acidFreq', min: 50, max: 500 },
            { id: 'acidResonance', min: 0, max: 100 },
            { id: 'acidDecay', min: 0.1, max: 2 },
            { id: 'acidSpeed', min: 0.5, max: 4 },
            // Granular
            { id: 'grainDensity', min: 0, max: 50 },
            { id: 'grainSize', min: 10, max: 500 },
            { id: 'grainPitch', min: 0, max: 100 },
            { id: 'grainPan', min: 0, max: 100 },
            // Space Melody
            { id: 'spaceMelodyDensity', min: 0, max: 50 },
            { id: 'spaceMelodyRange', min: 1, max: 4 },
            { id: 'spaceMelodySpeed', min: 0.1, max: 4 },
            { id: 'spaceMelodyEcho', min: 0, max: 100 },
            { id: 'spaceMelodyPortamento', min: 0, max: 500 },
            // Ambient Pad
            { id: 'padDensity', min: 0, max: 50 },
            { id: 'padAttack', min: 0.5, max: 10 },
            { id: 'padRelease', min: 0.5, max: 10 },
            { id: 'padFilterSweep', min: 0, max: 100 },
            { id: 'padShimmer', min: 0, max: 100 },
            // Arpeggiator
            { id: 'arpEnable', min: 0, max: 50 },
            { id: 'arpSpeed', min: 1, max: 16 },
            { id: 'arpOctaves', min: 1, max: 4 },
            { id: 'arpGate', min: 10, max: 90 }
        ];
        
        // Use weighted randomization for better musical results
        params.forEach(param => {
            const slider = document.getElementById(param.id);
            if (slider) {
                let value;
                // Bias towards lower values for intensity/density parameters
                if (param.id.includes('Density') || param.id.includes('Intensity') || 
                    param.id.includes('Level') || param.id.includes('Enable') || 
                    param.id.includes('Activity') || param.id.includes('Rush') || 
                    param.id.includes('Ghost')) {
                    // Use exponential distribution favoring lower values
                    value = param.min + (1 - Math.pow(Math.random(), 3)) * (param.max - param.min);
                } else {
                    // Normal random distribution
                    value = Math.random() * (param.max - param.min) + param.min;
                }
                slider.value = value;
                slider.dispatchEvent(new Event('input'));
            }
        });
        
        // Randomly select drum pattern
        const drumPatterns = ['techno', 'breakbeat', 'jungle', 'idm', 'gabber', 'trap'];
        const drumPattern = document.getElementById('drumPattern');
        if (drumPattern) {
            drumPattern.value = drumPatterns[Math.floor(Math.random() * drumPatterns.length)];
            drumPattern.dispatchEvent(new Event('change'));
        }
        
        // Randomly select noise type
        const noiseTypes = ['white', 'pink', 'brown', 'crackle'];
        const noiseSelect = document.getElementById('noiseType');
        if (noiseSelect) {
            noiseSelect.value = noiseTypes[Math.floor(Math.random() * noiseTypes.length)];
            noiseSelect.dispatchEvent(new Event('change'));
        }
        
        // Randomly select arpeggiator pattern
        const arpPatterns = ['up', 'down', 'updown', 'random'];
        const arpPatternSelect = document.getElementById('arpPattern');
        if (arpPatternSelect) {
            arpPatternSelect.value = arpPatterns[Math.floor(Math.random() * arpPatterns.length)];
            arpPatternSelect.dispatchEvent(new Event('change'));
        }
        
        // Randomly activate some LFOs (20% chance for each to reduce CPU load)
        document.querySelectorAll('.lfo-button').forEach(button => {
            if (Math.random() < 0.2 && !button.classList.contains('active')) {
                button.click();
            } else if (Math.random() < 0.8 && button.classList.contains('active')) {
                button.click();
            }
        });
        
        // Randomly enable/disable groups (70% chance to be enabled for performance)
        document.querySelectorAll('.group-enable').forEach(toggle => {
            const shouldEnable = Math.random() < 0.7;
            if (toggle.checked !== shouldEnable) {
                toggle.checked = shouldEnable;
                toggle.dispatchEvent(new Event('change'));
            }
        });
    }

    // LFO/ANIMATION SYSTEM
    toggleLFO(paramId, button) {
        if (this.animatedParams.has(paramId)) {
            // Stop animation
            const animation = this.animatedParams.get(paramId);
            cancelAnimationFrame(animation.frameId);
            this.animatedParams.delete(paramId);
            button.classList.remove('active');
            
            const slider = document.getElementById(paramId);
            if (slider) {
                slider.classList.remove('animated');
            }
        } else {
            // Start animation
            button.classList.add('active');
            const slider = document.getElementById(paramId);
            if (slider) {
                slider.classList.add('animated');
                // Get LFO speed from drone LFO control (or use default)
                const lfoSpeed = parseFloat(document.getElementById('droneLFO').value) || 0.5;
                const animation = {
                    min: parseFloat(slider.min),
                    max: parseFloat(slider.max),
                    speed: lfoSpeed,
                    phase: 0
                };
                this.animatedParams.set(paramId, animation);
                this.animateParameter(paramId, animation);
            }
        }
    }

    animateParameter(paramId, animation) {
        if (!this.animatedParams.has(paramId)) return;
        
        const slider = document.getElementById(paramId);
        if (!slider) return;
        
        animation.phase += animation.speed * 0.01;
        const value = animation.min + (Math.sin(animation.phase) + 1) / 2 * (animation.max - animation.min);
        
        slider.value = value;
        slider.dispatchEvent(new Event('input'));
        
        animation.frameId = requestAnimationFrame(() => this.animateParameter(paramId, animation));
    }

    // UTILITY FUNCTIONS
    connectToMaster(node) {
        node.connect(this.nodes.master.dryGain);
        node.connect(this.nodes.master.convolver);
        node.connect(this.nodes.master.delay);
    }

    disconnectAll() {
        Object.values(this.nodes).forEach(section => {
            Object.values(section).forEach(node => {
                if (node && typeof node.disconnect === 'function') {
                    node.disconnect();
                }
                if (node && typeof node.stop === 'function') {
                    try { node.stop(); } catch(e) {}
                }
            });
        });
        
        this.nodes = {
            master: {},
            drone: {},
            glitch: {},
            drums: {},
            bleeps: {},
            burst: {},
            fm: {},
            noise: {},
            acid: {},
            granular: {},
            spaceMelody: {},
            ambientPad: {},
            arpeggiator: {}
        };
    }
    
    // MORPH SYSTEM
    startMorph() {
        if (this.morphing) {
            // Cancel current morph
            this.morphing = false;
            return;
        }
        
        // Save current values
        this.morphStartValues.clear();
        const allControls = [...document.querySelectorAll('input[type="range"]')].filter(input => 
            input.id !== 'masterVolume' // Exclude master volume from morphing
        );
        
        allControls.forEach(control => {
            this.morphStartValues.set(control.id, parseFloat(control.value));
        });
        
        // Generate random target values
        this.generateMorphTargets();
        
        // Get morph duration from slider
        this.morphDuration = parseFloat(document.getElementById('morphTime').value) * 1000;
        
        // Start morphing
        this.morphing = true;
        this.morphStartTime = Date.now();
        document.getElementById('morphButton').textContent = '⏸ Stop Morph';
        
        this.animateMorph();
    }
    
    generateMorphTargets() {
        this.morphTargets.clear();
        
        const params = [
            // Master params (always enabled)
            { id: 'reverb', min: 0, max: 100, group: 'master' },
            { id: 'delay', min: 0, max: 100, group: 'master' },
            { id: 'delayTime', min: 0.1, max: 1, group: 'master' },
            // Drone
            { id: 'droneFreq', min: 50, max: 500, group: 'drone' },
            { id: 'droneDetune', min: 0, max: 50, group: 'drone' },
            { id: 'droneVoices', min: 1, max: 4, group: 'drone' },
            { id: 'droneFilter', min: 100, max: 5000, group: 'drone' },
            { id: 'droneLFO', min: 0, max: 10, group: 'drone' },
            // Glitch
            { id: 'glitchIntensity', min: 0, max: 50, group: 'glitch' },
            { id: 'glitchRate', min: 0.1, max: 20, group: 'glitch' },
            { id: 'bitCrush', min: 1, max: 16, group: 'glitch' },
            // Drums
            { id: 'drumTempo', min: 60, max: 180, group: 'drums' },
            { id: 'drumDensity', min: 0, max: 100, group: 'drums' },
            { id: 'drumVariation', min: 0, max: 100, group: 'drums' },
            { id: 'drumSwing', min: 0, max: 100, group: 'drums' },
            { id: 'snareRush', min: 0, max: 50, group: 'drums' },
            { id: 'ghostNotes', min: 0, max: 50, group: 'drums' },
            { id: 'hihatSpeed', min: 1, max: 8, group: 'drums' },
            // Bleeps
            { id: 'bleepDensity', min: 0, max: 30, group: 'bleeps' },
            { id: 'bleepRange', min: 100, max: 10000, group: 'bleeps' },
            { id: 'bleepDuration', min: 0.01, max: 0.5, group: 'bleeps' },
            // Burst
            { id: 'burstActivity', min: 0, max: 50, group: 'burst' },
            { id: 'burstComplexity', min: 1, max: 10, group: 'burst' },
            { id: 'burstSpeed', min: 0.1, max: 10, group: 'burst' },
            // FM
            { id: 'fmCarrier', min: 50, max: 1000, group: 'fm' },
            { id: 'fmIndex', min: 0, max: 50, group: 'fm' },
            { id: 'fmRatio', min: 0.1, max: 10, group: 'fm' },
            { id: 'fmLFO', min: 0, max: 20, group: 'fm' },
            // Noise
            { id: 'noiseLevel', min: 0, max: 30, group: 'noise' },
            { id: 'noiseFilter', min: 100, max: 10000, group: 'noise' },
            // Acid
            { id: 'acidLevel', min: 0, max: 100, group: 'acid' },
            { id: 'acidFreq', min: 50, max: 500, group: 'acid' },
            { id: 'acidResonance', min: 0, max: 100, group: 'acid' },
            { id: 'acidDecay', min: 0.1, max: 2, group: 'acid' },
            { id: 'acidSpeed', min: 0.5, max: 4, group: 'acid' },
            // Granular
            { id: 'grainDensity', min: 0, max: 50, group: 'granular' },
            { id: 'grainSize', min: 10, max: 500, group: 'granular' },
            { id: 'grainPitch', min: 0, max: 100, group: 'granular' },
            { id: 'grainPan', min: 0, max: 100, group: 'granular' },
            // Space Melody
            { id: 'spaceMelodyDensity', min: 0, max: 50, group: 'spaceMelody' },
            { id: 'spaceMelodyRange', min: 1, max: 4, group: 'spaceMelody' },
            { id: 'spaceMelodySpeed', min: 0.1, max: 4, group: 'spaceMelody' },
            { id: 'spaceMelodyEcho', min: 0, max: 100, group: 'spaceMelody' },
            { id: 'spaceMelodyPortamento', min: 0, max: 500, group: 'spaceMelody' },
            // Ambient Pad
            { id: 'padDensity', min: 0, max: 50, group: 'ambientPad' },
            { id: 'padAttack', min: 0.5, max: 10, group: 'ambientPad' },
            { id: 'padRelease', min: 0.5, max: 10, group: 'ambientPad' },
            { id: 'padFilterSweep', min: 0, max: 100, group: 'ambientPad' },
            { id: 'padShimmer', min: 0, max: 100, group: 'ambientPad' },
            // Arpeggiator
            { id: 'arpEnable', min: 0, max: 50, group: 'arpeggiator' },
            { id: 'arpSpeed', min: 1, max: 16, group: 'arpeggiator' },
            { id: 'arpOctaves', min: 1, max: 4, group: 'arpeggiator' },
            { id: 'arpGate', min: 10, max: 90, group: 'arpeggiator' }
        ];
        
        params.forEach(param => {
            // Skip if group is disabled (master is always enabled)
            if (param.group !== 'master' && !this.groupEnabled[param.group]) {
                return;
            }
            
            let value;
            // Use same biasing as randomize
            if (param.id.includes('Density') || param.id.includes('Intensity') || 
                param.id.includes('Level') || param.id.includes('Enable') || 
                param.id.includes('Activity') || param.id.includes('Rush') || 
                param.id.includes('Ghost')) {
                value = param.min + (1 - Math.pow(Math.random(), 3)) * (param.max - param.min);
            } else {
                value = Math.random() * (param.max - param.min) + param.min;
            }
            this.morphTargets.set(param.id, value);
        });
        
        // Random drum pattern (only if drums enabled)
        if (this.groupEnabled.drums) {
            const drumPatterns = ['techno', 'breakbeat', 'jungle', 'idm', 'gabber', 'trap'];
            this.morphTargets.set('drumPattern', drumPatterns[Math.floor(Math.random() * drumPatterns.length)]);
        }
        
        // Random noise type (only if noise enabled)
        if (this.groupEnabled.noise) {
            const noiseTypes = ['white', 'pink', 'brown', 'crackle'];
            this.morphTargets.set('noiseType', noiseTypes[Math.floor(Math.random() * noiseTypes.length)]);
        }
        
        // Random arpeggiator pattern (only if arpeggiator enabled)
        if (this.groupEnabled.arpeggiator) {
            const arpPatterns = ['up', 'down', 'updown', 'random'];
            this.morphTargets.set('arpPattern', arpPatterns[Math.floor(Math.random() * arpPatterns.length)]);
        }
    }
    
    animateMorph() {
        if (!this.morphing) {
            document.getElementById('morphButton').textContent = '〰️ Morph';
            return;
        }
        
        const elapsed = Date.now() - this.morphStartTime;
        const progress = Math.min(elapsed / this.morphDuration, 1);
        
        // Smooth easing function
        const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
        
        // Update all morphing parameters
        this.morphStartValues.forEach((startValue, paramId) => {
            const targetValue = this.morphTargets.get(paramId);
            if (targetValue !== undefined && typeof targetValue === 'number') {
                const slider = document.getElementById(paramId);
                if (slider) {
                    const currentValue = startValue + (targetValue - startValue) * easeProgress;
                    slider.value = currentValue;
                    slider.dispatchEvent(new Event('input'));
                }
            }
        });
        
        // Handle discrete changes at the end
        if (progress >= 1) {
            // Change drum pattern
            const drumPattern = document.getElementById('drumPattern');
            if (drumPattern && this.morphTargets.has('drumPattern')) {
                drumPattern.value = this.morphTargets.get('drumPattern');
                drumPattern.dispatchEvent(new Event('change'));
            }
            
            // Change noise type
            const noiseType = document.getElementById('noiseType');
            if (noiseType && this.morphTargets.has('noiseType')) {
                noiseType.value = this.morphTargets.get('noiseType');
                noiseType.dispatchEvent(new Event('change'));
            }
            
            // Change arpeggiator pattern
            const arpPattern = document.getElementById('arpPattern');
            if (arpPattern && this.morphTargets.has('arpPattern')) {
                arpPattern.value = this.morphTargets.get('arpPattern');
                arpPattern.dispatchEvent(new Event('change'));
            }
            
            this.morphing = false;
            document.getElementById('morphButton').textContent = '〰️ Morph';
        } else {
            requestAnimationFrame(() => this.animateMorph());
        }
    }
    
    // RECORDING SYSTEM
    toggleRecording() {
        if (!this.isPlaying) {
            alert('Please start playback before recording');
            return;
        }
        
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }
    
    startRecording() {
        // Create stream destination only when needed
        if (!this.nodes.master.streamDestination) {
            this.nodes.master.streamDestination = this.audioContext.createMediaStreamDestination();
            this.nodes.master.gain.connect(this.nodes.master.streamDestination);
        }
        
        this.recordedChunks = [];
        
        // Create MediaRecorder
        const stream = this.nodes.master.streamDestination.stream;
        const options = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000 // 128kbps for good quality/size balance
        };
        
        try {
            this.mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            // Fallback to default
            try {
                this.mediaRecorder = new MediaRecorder(stream);
            } catch (err) {
                alert('Recording is not supported in this browser');
                return;
            }
        }
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            this.downloadRecording();
            // Clear chunks after download to free memory
            this.recordedChunks = [];
        };
        
        this.mediaRecorder.onerror = (event) => {
            console.error('Recording error:', event);
            this.stopRecording();
            alert('Recording error occurred. Please try again.');
        };
        
        // Start recording with timeslice to avoid memory issues
        // Request data every second instead of waiting until the end
        this.mediaRecorder.start(1000);
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        
        // Update UI
        const recordButton = document.getElementById('recordButton');
        recordButton.classList.add('recording');
        recordButton.textContent = '⏹ Stop Recording';
        
        // Start timer display
        this.updateRecordingTimer();
        
        // Auto-stop after max time
        this.recordingTimeout = setTimeout(() => {
            if (this.isRecording) {
                alert('Maximum recording time (5 minutes) reached');
                this.stopRecording();
            }
        }, this.maxRecordingTime);
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        this.isRecording = false;
        
        // Clear timeout
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
        }
        
        // Update UI
        const recordButton = document.getElementById('recordButton');
        recordButton.classList.remove('recording');
        recordButton.textContent = '⏺ Record';
    }
    
    updateRecordingTimer() {
        if (!this.isRecording) return;
        
        const elapsed = Date.now() - this.recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        
        const timeString = `${minutes}:${displaySeconds.toString().padStart(2, '0')}`;
        const recordButton = document.getElementById('recordButton');
        recordButton.textContent = `⏹ Stop (${timeString})`;
        
        // Continue updating
        requestAnimationFrame(() => this.updateRecordingTimer());
    }
    
    downloadRecording() {
        if (this.recordedChunks.length === 0) return;
        
        const blob = new Blob(this.recordedChunks, {
            type: 'audio/webm'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Generate filename with timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        a.download = `soundscape-${timestamp}.webm`;
        
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
}

// Initialize the app
const soundscape = new GenerativeSoundscape();