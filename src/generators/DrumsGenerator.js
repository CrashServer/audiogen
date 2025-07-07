export class DrumsGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.scheduler = null;
        this.drumVoices = 0;
        this.maxDrumVoices = 20;
        this.activeVoices = 0;
        this.maxVoices = 100;
        this.performanceThrottle = 1;
        this.isPlaying = false;
    }

    start(params, masterNodes) {
        if (this.isPlaying) return;
        
        const { pattern, tempo, density, variation, swing, snareRush, ghostNotes, hihatSpeed } = params;
        this.masterNodes = masterNodes;
        
        const interval = 60000 / (tempo * 8); // 32nd notes
        let step = 0;
        
        const patterns = this.getDrumPatterns();
        const currentPattern = patterns[pattern];
        
        this.scheduler = setInterval(() => {
            const patternStep = step % currentPattern.length;
            const swingAmount = (step % 2) * swing * interval * 0.2;
            const microTiming = (Math.random() - 0.5) * variation * 10 + swingAmount;
            
            // Kick
            if (currentPattern.kick[patternStep] && Math.random() < density) {
                const velocity = currentPattern.kick[patternStep] * 1.2;
                setTimeout(() => this.playKick(this.audioContext.currentTime, variation, velocity), microTiming);
            }
            
            // Snare with rush
            if (currentPattern.snare[patternStep] && Math.random() < density * 0.9) {
                const velocity = currentPattern.snare[patternStep] * 1.1;
                setTimeout(() => {
                    this.playSnare(this.audioContext.currentTime, variation, velocity);
                    if (Math.random() < snareRush && patternStep % 4 === 0) {
                        this.triggerSnareRush(variation);
                    }
                }, microTiming);
            }
            
            // Hi-hat
            if (step % (16 / hihatSpeed) === 0 && currentPattern.hihat[patternStep % 16] && Math.random() < density * 0.8) {
                const velocity = currentPattern.hihat[patternStep % 16] * 0.8;
                const isOpen = (patternStep % 4 === 2) && Math.random() < 0.3;
                setTimeout(() => this.playHiHat(this.audioContext.currentTime, variation, velocity, isOpen), microTiming);
            }
            
            // Percussion
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
                        this.playKick(this.audioContext.currentTime, variation * 2, 0.5);
                    } else if (drumType < 0.7) {
                        this.playSnare(this.audioContext.currentTime, variation * 2, 0.4);
                    } else {
                        this.playHiHat(this.audioContext.currentTime, variation * 2, 0.35);
                    }
                }, ghostTime);
            }
            
            step++;
        }, interval);
        
        this.isPlaying = true;
    }

    stop() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        this.isPlaying = false;
    }

    connectToMaster(node) {
        if (this.masterNodes) {
            node.connect(this.masterNodes.dryGain);
            node.connect(this.masterNodes.convolver);
            node.connect(this.masterNodes.delay);
        }
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
        const limitedRushLength = Math.min(rushLength, 8);
        
        for (let i = 0; i < limitedRushLength; i++) {
            setTimeout(() => {
                const velocity = 0.3 * (1 - i / limitedRushLength);
                this.playSnare(this.audioContext.currentTime, variation * 2, velocity);
            }, i * rushSpeed);
        }
    }

    playKick(time, variation, velocity = 1.0) {
        if (this.drumVoices >= this.maxDrumVoices || this.activeVoices > this.maxVoices) return;
        this.drumVoices++;
        this.activeVoices++;
        
        if (this.performanceThrottle < 0.5) {
            velocity *= 0.7;
        }
        
        const drumBus = this.audioContext.createGain();
        drumBus.gain.value = velocity;
        
        // Sub bass
        const sub = this.audioContext.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(55, time);
        sub.frequency.exponentialRampToValueAtTime(25, time + 0.3);
        
        const subGain = this.audioContext.createGain();
        subGain.gain.setValueAtTime(1.0, time);
        subGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        
        // Body
        const body = this.audioContext.createOscillator();
        body.type = 'triangle';
        body.frequency.setValueAtTime(85, time);
        body.frequency.exponentialRampToValueAtTime(45, time + 0.08);
        
        const bodyGain = this.audioContext.createGain();
        bodyGain.gain.setValueAtTime(0.8, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        // Click
        const click = this.audioContext.createOscillator();
        click.type = 'square';
        click.frequency.value = 1500 + Math.random() * 500;
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.5, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.005);
        
        const clickFilter = this.audioContext.createBiquadFilter();
        clickFilter.type = 'highpass';
        clickFilter.frequency.value = 1000;
        
        // Noise transient
        const noiseBuffer = this.audioContext.createBuffer(1, 512, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 512; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/512, 2);
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = 0.3;
        
        // EQ
        const eq = this.audioContext.createBiquadFilter();
        eq.type = 'peaking';
        eq.frequency.value = 80;
        eq.Q.value = 0.7;
        eq.gain.value = 6;
        
        // Connect
        sub.connect(subGain);
        subGain.connect(eq);
        
        body.connect(bodyGain);
        bodyGain.connect(eq);
        
        click.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(eq);
        
        noiseSource.connect(noiseGain);
        noiseGain.connect(eq);
        
        eq.connect(drumBus);
        this.connectToMaster(drumBus);
        
        // Start
        sub.start(time);
        body.start(time);
        click.start(time);
        noiseSource.start(time);
        
        sub.stop(time + 0.3);
        body.stop(time + 0.15);
        click.stop(time + 0.01);
        
        setTimeout(() => {
            this.activeVoices--;
            this.drumVoices--;
        }, 300);
    }

    playSnare(time, variation, velocity = 0.8) {
        if (this.drumVoices >= this.maxDrumVoices || this.activeVoices > this.maxVoices) return;
        this.drumVoices++;
        this.activeVoices++;
        
        if (this.performanceThrottle < 0.7) {
            velocity *= 0.8;
        }
        
        const drumBus = this.audioContext.createGain();
        drumBus.gain.value = velocity;
        
        // Noise
        const noiseLength = 0.15;
        const noiseBuffer = this.audioContext.createBuffer(2, this.audioContext.sampleRate * noiseLength, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = noiseBuffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const white = Math.random() * 2 - 1;
                const envelope = Math.pow(1 - i / data.length, 0.5);
                data[i] = white * envelope;
            }
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        
        // Filters
        const hpf = this.audioContext.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 200 + variation * 100;
        
        const bpf = this.audioContext.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.value = 5000 + Math.random() * 2000;
        bpf.Q.value = 2;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(1.0, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + noiseLength);
        
        // Tonal components
        const fundamentals = [200, 250, 300];
        fundamentals.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq * (1 + variation * 0.1);
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.5 / fundamentals.length, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.03 + index * 0.01);
            
            osc.connect(gain);
            gain.connect(drumBus);
            
            osc.start(time);
            osc.stop(time + 0.1);
        });
        
        // Click
        const click = this.audioContext.createOscillator();
        click.type = 'triangle';
        click.frequency.value = 1000;
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.7, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.002);
        
        // Connect
        noise.connect(hpf);
        hpf.connect(bpf);
        bpf.connect(noiseGain);
        noiseGain.connect(drumBus);
        
        click.connect(clickGain);
        clickGain.connect(drumBus);
        
        this.connectToMaster(drumBus);
        
        // Start
        noise.start(time);
        click.start(time);
        click.stop(time + 0.005);
        
        setTimeout(() => {
            this.activeVoices--;
            this.drumVoices--;
        }, 150);
    }

    playHiHat(time, variation, velocity = 0.5, isOpen = false) {
        if (this.drumVoices >= this.maxDrumVoices || this.activeVoices > this.maxVoices) return;
        this.drumVoices++;
        this.activeVoices++;
        
        if (this.performanceThrottle < 0.5) {
            velocity *= 0.7;
        }
        
        const duration = isOpen ? 0.3 : 0.05;
        const drumBus = this.audioContext.createGain();
        drumBus.gain.value = velocity;
        
        // Metallic noise
        const bands = this.performanceThrottle < 0.5 ? [8000, 12000] : [6000, 8000, 10000, 12000, 14000];
        
        bands.forEach((freq) => {
            const noise = this.audioContext.createBufferSource();
            const noiseLength = Math.min(duration + 0.05, 0.1);
            const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * noiseLength, this.audioContext.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            
            for (let i = 0; i < data.length; i++) {
                const metallic = Math.sin(i * freq / this.audioContext.sampleRate * 2 * Math.PI);
                data[i] = (Math.random() * 2 - 1) * metallic;
            }
            
            noise.buffer = noiseBuffer;
            noise.loop = true;
            
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
        });
        
        // Shimmer
        const shimmer = this.audioContext.createOscillator();
        shimmer.type = 'square';
        shimmer.frequency.value = 15000 + Math.random() * 2000;
        
        const shimmerGain = this.audioContext.createGain();
        shimmerGain.gain.setValueAtTime(0.1, time);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, time + duration * 0.3);
        
        shimmer.connect(shimmerGain);
        shimmerGain.connect(drumBus);
        
        this.connectToMaster(drumBus);
        
        shimmer.start(time);
        shimmer.stop(time + duration);
        
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
        
        // Click
        const click = this.audioContext.createOscillator();
        click.frequency.value = 800 + Math.random() * 200;
        click.type = 'square';
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.4 * velocity, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.01);
        
        // Tone
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
        
        // Noise
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
        
        // Multiple bursts
        const clapCount = this.performanceThrottle < 0.7 ? 2 : 3 + Math.floor(Math.random() * 2);
        const clapSpacing = 0.01;
        
        for (let i = 0; i < clapCount; i++) {
            const clapTime = time + i * clapSpacing;
            
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
        
        // Body
        const body = this.audioContext.createOscillator();
        body.frequency.value = 200;
        
        const bodyGain = this.audioContext.createGain();
        bodyGain.gain.setValueAtTime(0.2 * velocity, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
        
        body.connect(bodyGain);
        bodyGain.connect(drumBus);
        
        this.connectToMaster(drumBus);
        
        body.start(time);
        body.stop(time + 0.05);
        
        setTimeout(() => {
            this.activeVoices--;
            this.drumVoices--;
        }, 100);
    }

    updateParameter(param, value) {
        // Parameters are handled in the start method
    }

    setPerformanceThrottle(value) {
        this.performanceThrottle = value;
    }
}