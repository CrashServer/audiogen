export class SpaceMelodyGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.scheduler = null;
        this.nodes = {
            delay: null,
            delayGain: null,
            filter: null,
            lastFreq: null
        };
        this.isPlaying = false;
        this.masterNodes = null;
    }

    start(params, masterNodes) {
        if (this.isPlaying) return;
        
        const { density, range, speed, echo, portamento } = params;
        this.masterNodes = masterNodes;
        
        if (density === 0) return;
        
        // Create echo delay
        this.nodes.delay = this.audioContext.createDelay(2);
        this.nodes.delay.delayTime.value = 0.375; // Dotted eighth
        this.nodes.delayGain = this.audioContext.createGain();
        this.nodes.delayGain.gain.value = echo * 0.7;
        
        this.nodes.filter = this.audioContext.createBiquadFilter();
        this.nodes.filter.type = 'highpass';
        this.nodes.filter.frequency.value = 200;
        
        // Setup echo chain
        this.nodes.delay.connect(this.nodes.delayGain);
        this.nodes.delayGain.connect(this.nodes.delay);
        
        // Pentatonic scale for spacey melodies
        const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
        const baseFreq = 220; // A3
        
        const interval = 60000 / (120 * speed * 2);
        
        this.scheduler = setInterval(() => {
            if (Math.random() < density) {
                const noteIndex = Math.floor(Math.random() * scale.length);
                const octave = Math.floor(Math.random() * range);
                const freq = baseFreq * Math.pow(2, (scale[noteIndex] + octave * 12) / 12);
                this.triggerNote(freq, portamento);
            }
        }, interval);
        
        this.isPlaying = true;
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Disconnect nodes
        ['delay', 'delayGain', 'filter'].forEach(nodeName => {
            if (this.nodes[nodeName]) {
                try { this.nodes[nodeName].disconnect(); } catch(e) {}
                this.nodes[nodeName] = null;
            }
        });
        
        this.nodes.lastFreq = null;
        this.isPlaying = false;
    }

    triggerNote(targetFreq, portamento) {
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        // Portamento effect
        if (this.nodes.lastFreq) {
            osc.frequency.setValueAtTime(this.nodes.lastFreq, now);
            osc.frequency.exponentialRampToValueAtTime(targetFreq, now + portamento / 1000);
        } else {
            osc.frequency.value = targetFreq;
        }
        this.nodes.lastFreq = targetFreq;
        
        // Add slight vibrato
        const vibrato = this.audioContext.createOscillator();
        const vibratoGain = this.audioContext.createGain();
        vibrato.frequency.value = 5;
        vibratoGain.gain.value = 3;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        
        // Connect chain
        osc.connect(gain);
        gain.connect(this.nodes.filter);
        
        // Connect to echo and master
        if (this.masterNodes) {
            this.nodes.filter.connect(this.nodes.delay);
            this.nodes.filter.connect(this.masterNodes.dryGain);
            this.nodes.delay.connect(this.masterNodes.dryGain);
        }
        
        osc.start(now);
        vibrato.start(now);
        osc.stop(now + 2);
        vibrato.stop(now + 2);
    }

    updateParameter(param, value) {
        switch(param) {
            case 'echo':
                if (this.nodes.delayGain) {
                    this.nodes.delayGain.gain.value = value * 0.7;
                }
                break;
        }
    }
}