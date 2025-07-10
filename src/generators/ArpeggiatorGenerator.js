export class ArpeggiatorGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.scheduler = null;
        this.isPlaying = false;
        this.masterNodes = null;
        this.noteIndex = 0;
        this.direction = 1;
    }

    start(params, masterNodes) {
        if (this.isPlaying) return;
        
        const { enable, pattern, speed, octaves, gate, tempo } = params;
        this.masterNodes = masterNodes;
        this.currentParams = params; // Store for tempo updates
        
        if (enable === 0) return;
        
        // Base notes for arpeggio (minor pentatonic)
        const baseNotes = [0, 3, 5, 7, 10];
        
        const interval = 60000 / (tempo * speed / 4);
        
        this.scheduler = setInterval(() => {
            if (Math.random() < enable) {
                // Build note array based on octave range
                let notes = [];
                for (let oct = 0; oct < octaves; oct++) {
                    baseNotes.forEach(note => notes.push(note + oct * 12));
                }
                
                let currentNote;
                switch(pattern) {
                    case 'up':
                        currentNote = notes[this.noteIndex % notes.length];
                        this.noteIndex++;
                        break;
                        
                    case 'down':
                        currentNote = notes[notes.length - 1 - (this.noteIndex % notes.length)];
                        this.noteIndex++;
                        break;
                        
                    case 'updown':
                        if (this.noteIndex >= notes.length - 1) this.direction = -1;
                        if (this.noteIndex <= 0) this.direction = 1;
                        currentNote = notes[this.noteIndex];
                        this.noteIndex += this.direction;
                        break;
                        
                    case 'random':
                        currentNote = notes[Math.floor(Math.random() * notes.length)];
                        break;
                }
                
                const freq = 220 * Math.pow(2, currentNote / 12);
                this.triggerNote(freq, interval * gate);
            }
        }, interval);
        
        this.isPlaying = true;
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        this.noteIndex = 0;
        this.direction = 1;
        this.isPlaying = false;
    }

    triggerNote(freq, duration) {
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        
        // Gate envelope
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gain.gain.setValueAtTime(0.2, now + duration / 1000 - 0.01);
        gain.gain.linearRampToValueAtTime(0, now + duration / 1000);
        
        // Filter for character
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq * 4;
        filter.Q.value = 5;
        
        // Connect chain
        osc.connect(gain);
        gain.connect(filter);
        
        if (this.masterNodes) {
            filter.connect(this.masterNodes.dryGain);
            filter.connect(this.masterNodes.delay);
        }
        
        osc.start(now);
        osc.stop(now + duration / 1000);
    }

    updateParameter(param, value) {
        // Parameters are handled in the start method
        // Could implement dynamic updates here if needed
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
}