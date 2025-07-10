export class ChordGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.nodes = {
            oscillators: [],
            gains: [],
            filter: null,
            mixer: null
        };
        this.scheduler = null;
        this.isPlaying = false;
        this.voiceId = 'chord';
        this.currentChordIndex = 0;
        
        // Chord progressions
        this.progressions = {
            'major': [
                [0, 4, 7, 12],      // I (C major)
                [5, 9, 12, 17],     // IV (F major)
                [7, 11, 14, 19],    // V (G major)
                [0, 4, 7, 12]       // I (C major)
            ],
            'minor': [
                [0, 3, 7, 12],      // i (A minor)
                [5, 8, 12, 17],     // iv (D minor)
                [7, 10, 14, 19],    // v (E minor)
                [0, 3, 7, 12]       // i (A minor)
            ],
            'jazz': [
                [0, 4, 7, 11],      // Cmaj7
                [2, 5, 9, 12],      // Dm7
                [7, 11, 14, 17],    // G7
                [0, 4, 7, 10]       // C7
            ],
            'suspended': [
                [0, 5, 7, 12],      // Csus4
                [2, 7, 9, 14],      // Dsus4
                [7, 12, 14, 19],    // Gsus4
                [0, 5, 7, 12]       // Csus4
            ]
        };
    }

    start(params, connectToMaster) {
        if (this.isPlaying) return;
        
        const { density, progression, voicing, brightness, spread } = params;
        this.masterConnection = connectToMaster;
        this.currentParams = params; // Store for tempo updates
        
        if (density === 0) return;
        
        // Create filter
        this.nodes.filter = this.audioContext.createBiquadFilter();
        this.nodes.filter.type = 'lowpass';
        this.nodes.filter.frequency.value = brightness;
        this.nodes.filter.Q.value = 2;
        
        // Create mixer
        this.nodes.mixer = this.audioContext.createGain();
        this.nodes.mixer.gain.value = 0.3;
        
        // Connect filter to mixer and master
        this.nodes.filter.connect(this.nodes.mixer);
        if (this.masterConnection) {
            this.masterConnection(this.nodes.mixer);
        }
        
        // Start chord progression
        const chordDuration = (60 / parseFloat(document.getElementById('chordTempo')?.value || 60)) * 1000;
        
        this.playChord(params);
        this.scheduler = setInterval(() => {
            this.playChord(params);
        }, chordDuration);
        
        this.isPlaying = true;
    }

    playChord(params) {
        const { progression, voicing, brightness, spread } = params;
        const baseFreq = parseFloat(document.getElementById('chordRoot')?.value || 220);
        
        // Stop previous chord
        this.stopCurrentChord();
        
        // Get current chord from progression
        const prog = this.progressions[progression] || this.progressions.major;
        const chord = prog[this.currentChordIndex % prog.length];
        
        // Apply voicing spread
        const voicingMultipliers = {
            'close': [1, 1, 1, 1],
            'open': [0.5, 1, 1, 2],
            'drop2': [0.5, 1, 2, 1],
            'spread': [0.25, 0.5, 1, 2]
        };
        const voiceMult = voicingMultipliers[voicing] || voicingMultipliers.close;
        
        // Create oscillators for each note in chord
        chord.forEach((semitone, i) => {
            const freq = baseFreq * Math.pow(2, semitone / 12) * voiceMult[i];
            const nodeId = `${this.voiceId}_osc_${i}`;
            
            let osc, gain;
            
            if (this.poolManager) {
                osc = this.poolManager.pools.oscillator.acquireOscillator(
                    nodeId,
                    { type: 'triangle', frequency: freq }
                );
                gain = this.poolManager.pools.gain.acquireGain(nodeId, 0);
            } else {
                osc = this.audioContext.createOscillator();
                gain = this.audioContext.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.value = 0;
            }
            
            // Add slight detuning for richness
            osc.detune.value = (Math.random() - 0.5) * spread;
            
            // Envelope
            const now = this.audioContext.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2 / chord.length, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.15 / chord.length, now + 0.5);
            
            osc.connect(gain);
            gain.connect(this.nodes.filter);
            
            if (!this.poolManager) {
                osc.start();
            }
            
            this.nodes.oscillators.push(osc);
            this.nodes.gains.push(gain);
        });
        
        this.currentChordIndex++;
    }

    stopCurrentChord() {
        if (this.poolManager) {
            this.nodes.oscillators.forEach((osc, i) => {
                this.poolManager.pools.oscillator.release(osc);
            });
            this.nodes.gains.forEach((gain, i) => {
                this.poolManager.pools.gain.release(gain);
            });
        } else {
            this.nodes.oscillators.forEach(osc => {
                try { osc.stop(); osc.disconnect(); } catch(e) {}
            });
            this.nodes.gains.forEach(gain => {
                try { gain.disconnect(); } catch(e) {}
            });
        }
        
        this.nodes.oscillators = [];
        this.nodes.gains = [];
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        this.stopCurrentChord();
        
        if (this.nodes.filter) {
            this.nodes.filter.disconnect();
            this.nodes.filter = null;
        }
        if (this.nodes.mixer) {
            this.nodes.mixer.disconnect();
            this.nodes.mixer = null;
        }
        
        this.currentChordIndex = 0;
        this.isPlaying = false;
    }

    updateParameter(param, value) {
        switch(param) {
            case 'brightness':
                if (this.nodes.filter) {
                    this.nodes.filter.frequency.value = value;
                }
                break;
            case 'volume':
                if (this.nodes.mixer) {
                    this.nodes.mixer.gain.value = value;
                }
                break;
        }
    }
    
    updateTempo(masterTempo) {
        // Store the master tempo for use in restart
        this.masterTempo = masterTempo;
        
        // If currently playing, restart with new tempo
        if (this.isPlaying && this.scheduler) {
            const currentParams = this.currentParams;
            if (currentParams) {
                // Update the tempo in current params
                currentParams.tempo = masterTempo.bpm;
                this.stop();
                this.start(currentParams, this.masterNodes);
            }
        }
    }

    getOutputNode() {
        return this.nodes.mixer;
    }
}