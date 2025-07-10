export class SamplePlayerGenerator {
    constructor(audioContext, poolManager) {
        this.audioContext = audioContext;
        this.poolManager = poolManager;
        this.isPlaying = false;
        this.samples = new Map(); // Map of sample names to AudioBuffers
        this.scheduler = null;
        this.masterNodes = null;
        this.currentParams = null;
        this.voiceId = 'sample';
        this.playbackNodes = []; // Track active playback nodes
        
        // Sample processing
        this.processingChain = {
            filter: null,
            reverb: null,
            delay: null,
            distortion: null,
            mixer: null
        };
        
        // Granular synthesis
        this.grainSchedulers = [];
        this.grainSize = 0.1; // 100ms default
        this.grainOverlap = 0.5;
        
        // Setup file loading
        this.setupFileInput();
    }
    
    setupFileInput() {
        // Create file input for drag-drop
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'audio/*';
        fileInput.style.display = 'none';
        fileInput.id = 'sampleFileInput';
        
        // Add to DOM
        document.body.appendChild(fileInput);
        
        // File change handler
        fileInput.addEventListener('change', (e) => {
            this.loadSampleFiles(e.target.files);
        });
        
        // Setup drag and drop on the sample section
        this.setupDragDrop();
    }
    
    setupDragDrop() {
        // Find or create sample section
        let sampleSection = document.getElementById('sampleSection');
        if (!sampleSection) {
            console.warn('Sample section not found in DOM');
            return;
        }
        
        // Drag and drop handlers
        sampleSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sampleSection.style.borderColor = '#0f0';
        });
        
        sampleSection.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sampleSection.style.borderColor = '#333';
        });
        
        sampleSection.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sampleSection.style.borderColor = '#333';
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('audio/'));
            
            if (files.length > 0) {
                this.loadSampleFiles(files);
            }
        });
    }
    
    async loadSampleFiles(files) {
        const loadPromises = Array.from(files).map(file => this.loadSampleFile(file));
        
        try {
            const results = await Promise.all(loadPromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            console.log(`Loaded ${successful.length} samples successfully`);
            if (failed.length > 0) {
                console.warn(`Failed to load ${failed.length} samples`);
            }
            
            this.updateSampleUI();
        } catch (error) {
            console.error('Error loading samples:', error);
        }
    }
    
    async loadSampleFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const audioBuffer = await this.audioContext.decodeAudioData(e.target.result);
                    const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
                    
                    this.samples.set(name, {
                        buffer: audioBuffer,
                        name: name,
                        duration: audioBuffer.duration,
                        sampleRate: audioBuffer.sampleRate,
                        channels: audioBuffer.numberOfChannels,
                        filename: file.name
                    });
                    
                    resolve({ success: true, name });
                } catch (error) {
                    console.error(`Failed to decode ${file.name}:`, error);
                    resolve({ success: false, name: file.name, error });
                }
            };
            
            reader.onerror = () => {
                resolve({ success: false, name: file.name, error: 'File read error' });
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    updateSampleUI() {
        const display = document.getElementById('sampleMappingDisplay');
        if (!display) return;
        
        if (this.samples.size === 0) {
            display.style.display = 'none';
            return;
        }
        
        display.style.display = 'block';
        let html = '<h3>Loaded Samples</h3><div class="mapping-list">';
        
        this.samples.forEach((sample, name) => {
            html += `
                <div class="mapping-item">
                    <span class="mapping-name">${name}</span>
                    <span>${sample.duration.toFixed(2)}s • ${sample.channels}ch</span>
                </div>
            `;
        });
        
        html += '</div>';
        display.innerHTML = html;
    }
    
    start(params, masterNodes) {
        if (this.isPlaying) return;
        
        this.masterNodes = masterNodes;
        this.currentParams = params;
        
        const { 
            density, 
            pitch, 
            reverse, 
            chop, 
            scatter, 
            granular,
            filterFreq,
            filterRes,
            reverbMix,
            delayMix
        } = params;
        
        if (density === 0 || this.samples.size === 0) return;
        
        // Create processing chain
        this.createProcessingChain(params);
        
        // Start playback scheduler
        this.isPlaying = true;
        this.startScheduler(params);
        
        console.log('Sample player started');
    }
    
    createProcessingChain(params) {
        const { filterFreq, filterRes, reverbMix, delayMix } = params;
        
        // Create filter
        this.processingChain.filter = this.audioContext.createBiquadFilter();
        this.processingChain.filter.type = 'lowpass';
        this.processingChain.filter.frequency.value = filterFreq || 5000;
        this.processingChain.filter.Q.value = filterRes || 1;
        
        // Create mixer
        this.processingChain.mixer = this.audioContext.createGain();
        this.processingChain.mixer.gain.value = 0.7;
        
        // Connect processing chain
        this.processingChain.filter.connect(this.processingChain.mixer);
        
        // Connect to master
        if (this.masterNodes) {
            this.processingChain.mixer.connect(this.masterNodes.dryGain);
            this.processingChain.mixer.connect(this.masterNodes.convolver);
            this.processingChain.mixer.connect(this.masterNodes.delay);
        }
    }
    
    startScheduler(params) {
        const { density, scatter } = params;
        
        // Calculate timing based on density and scatter
        const baseInterval = 1000 / (density * 2); // Base interval in ms
        const scatterAmount = scatter || 0;
        
        this.scheduler = setInterval(() => {
            if (Math.random() < density && this.samples.size > 0) {
                // Add scatter/randomness to timing
                const scatterDelay = (Math.random() - 0.5) * scatterAmount * 100;
                
                setTimeout(() => {
                    this.playSample(params);
                }, Math.max(0, scatterDelay));
            }
        }, baseInterval);
    }
    
    playSample(params) {
        const { pitch, reverse, chop, granular } = params;
        
        // Select random sample
        const sampleNames = Array.from(this.samples.keys());
        const selectedName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
        const sample = this.samples.get(selectedName);
        
        if (!sample) return;
        
        if (granular && granular > 0) {
            this.playGranularSample(sample, params);
        } else {
            this.playDirectSample(sample, params);
        }
    }
    
    playDirectSample(sample, params) {
        const { pitch, reverse, chop } = params;
        
        // Create buffer source
        const source = this.audioContext.createBufferSource();
        source.buffer = sample.buffer;
        
        // Apply pitch
        if (pitch !== undefined && pitch !== 1) {
            source.playbackRate.value = pitch;
        }
        
        // Apply reverse
        if (reverse && reverse > 0 && Math.random() < reverse) {
            // Create reversed buffer
            const reversedBuffer = this.reverseBuffer(sample.buffer);
            source.buffer = reversedBuffer;
        }
        
        // Create gain for individual sample
        const gain = this.audioContext.createGain();
        gain.gain.value = 0.5 + Math.random() * 0.5; // Vary volume
        
        // Connect: source -> gain -> filter -> mixer
        source.connect(gain);
        gain.connect(this.processingChain.filter);
        
        // Calculate playback parameters
        let startTime = 0;
        let duration = sample.duration;
        
        // Apply chopping
        if (chop && chop > 0) {
            const chopAmount = chop;
            const maxChopSize = sample.duration * 0.5; // Max 50% of sample
            const chopSize = Math.random() * maxChopSize * chopAmount;
            
            startTime = Math.random() * (sample.duration - chopSize);
            duration = chopSize;
        }
        
        // Start playback
        const now = this.audioContext.currentTime;
        source.start(now, startTime, duration);
        
        // Track for cleanup
        this.playbackNodes.push(source);
        
        // Auto-cleanup when finished
        source.addEventListener('ended', () => {
            const index = this.playbackNodes.indexOf(source);
            if (index > -1) {
                this.playbackNodes.splice(index, 1);
            }
        });
    }
    
    playGranularSample(sample, params) {
        const { granular, pitch } = params;
        const grainCount = Math.floor(granular * 10) + 1;
        
        for (let i = 0; i < grainCount; i++) {
            setTimeout(() => {
                const source = this.audioContext.createBufferSource();
                source.buffer = sample.buffer;
                
                // Random grain parameters
                const grainStart = Math.random() * (sample.duration - this.grainSize);
                const grainPitch = pitch * (0.8 + Math.random() * 0.4); // ±20% pitch variation
                
                source.playbackRate.value = grainPitch;
                
                // Create grain envelope
                const grainGain = this.audioContext.createGain();
                grainGain.gain.value = 0;
                
                // Envelope (fade in/out)
                const now = this.audioContext.currentTime;
                const fadeDuration = this.grainSize * 0.1;
                
                grainGain.gain.setValueAtTime(0, now);
                grainGain.gain.linearRampToValueAtTime(0.3, now + fadeDuration);
                grainGain.gain.linearRampToValueAtTime(0.3, now + this.grainSize - fadeDuration);
                grainGain.gain.linearRampToValueAtTime(0, now + this.grainSize);
                
                // Connect and play
                source.connect(grainGain);
                grainGain.connect(this.processingChain.filter);
                
                source.start(now, grainStart, this.grainSize);
                
                // Track for cleanup
                this.playbackNodes.push(source);
            }, i * this.grainSize * this.grainOverlap * 1000);
        }
    }
    
    reverseBuffer(buffer) {
        const reversedBuffer = this.audioContext.createBuffer(
            buffer.numberOfChannels,
            buffer.length,
            buffer.sampleRate
        );
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            const reversedData = reversedBuffer.getChannelData(channel);
            
            for (let i = 0; i < channelData.length; i++) {
                reversedData[i] = channelData[channelData.length - 1 - i];
            }
        }
        
        return reversedBuffer;
    }
    
    stop() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        
        // Clear scheduler
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        
        // Stop all active playback nodes
        this.playbackNodes.forEach(node => {
            try {
                node.stop();
            } catch (e) {
                // Already stopped
            }
        });
        this.playbackNodes = [];
        
        // Clear grain schedulers
        this.grainSchedulers.forEach(scheduler => clearTimeout(scheduler));
        this.grainSchedulers = [];
        
        // Disconnect processing chain
        if (this.processingChain.mixer) {
            this.processingChain.mixer.disconnect();
        }
        
        console.log('Sample player stopped');
    }
    
    updateTempo(masterTempo) {
        // Store the master tempo for use in restart
        this.masterTempo = masterTempo;
        
        // If currently playing, restart with new tempo
        if (this.isPlaying && this.scheduler) {
            const currentParams = this.currentParams;
            if (currentParams) {
                // Density can be tempo-synced
                currentParams.tempoSync = masterTempo;
                this.stop();
                this.start(currentParams, this.masterNodes);
            }
        }
    }
    
    updateParameter(param, value) {
        switch(param) {
            case 'filterFreq':
                if (this.processingChain.filter) {
                    this.processingChain.filter.frequency.value = value;
                }
                break;
            case 'filterRes':
                if (this.processingChain.filter) {
                    this.processingChain.filter.Q.value = value;
                }
                break;
            case 'volume':
                if (this.processingChain.mixer) {
                    this.processingChain.mixer.gain.value = value;
                }
                break;
        }
    }
    
    getOutputNode() {
        return this.processingChain.mixer;
    }
    
    getSampleCount() {
        return this.samples.size;
    }
    
    getSampleNames() {
        return Array.from(this.samples.keys());
    }
    
    clearSamples() {
        this.samples.clear();
        this.updateSampleUI();
    }
}