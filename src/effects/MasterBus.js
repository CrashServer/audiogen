import { ReverbEffect } from './ReverbEffect.js';
import { DelayEffect } from './DelayEffect.js';
import { CompressorLimiter } from './CompressorLimiter.js';
import { EQFilterBank } from './EQFilterBank.js';
import { DistortionSaturation } from './DistortionSaturation.js';
import { ChorusFlanger } from './ChorusFlanger.js';
import { SidechainCompression } from './SidechainCompression.js';

export class MasterBus {
    constructor(audioContext) {
        this.audioContext = audioContext;
        
        // Master nodes
        this.nodes = {
            input: null,
            output: null,
            masterGain: null
        };
        
        // Effects
        this.reverb = new ReverbEffect(audioContext);
        this.delay = new DelayEffect(audioContext);
        this.compressor = new CompressorLimiter(audioContext);
        this.eq = new EQFilterBank(audioContext);
        this.distortion = new DistortionSaturation(audioContext);
        this.chorus = new ChorusFlanger(audioContext);
        this.sidechain = new SidechainCompression(audioContext);
        
        // Effect bypass states
        this.effectBypassed = {
            compressor: false,
            eq: false,
            distortion: false,
            chorus: false,
            sidechain: false
        };
        
        this.isInitialized = false;
    }

    initialize(performanceThrottle = 1) {
        if (this.isInitialized) return;
        
        // Create main nodes
        this.nodes.input = this.audioContext.createGain();
        this.nodes.masterGain = this.audioContext.createGain();
        this.nodes.output = this.nodes.masterGain; // Output is the master gain
        
        // Initialize effects
        this.reverb.initialize(performanceThrottle);
        this.delay.initialize();
        
        // Create effects chain
        // Order: Input -> Distortion -> EQ -> Compressor -> Chorus -> Sidechain -> Reverb/Delay -> Master
        
        // Connect serial effects chain
        this.nodes.input.connect(this.distortion.getInputNode());
        this.distortion.getOutputNode().connect(this.eq.getInputNode());
        this.eq.getOutputNode().connect(this.compressor.getInputNode());
        this.compressor.getOutputNode().connect(this.chorus.getInputNode());
        this.chorus.getOutputNode().connect(this.sidechain.getInputNode());
        
        // Split to parallel reverb and delay
        this.sidechain.getOutputNode().connect(this.reverb.getInputNode());
        this.sidechain.getOutputNode().connect(this.delay.getInputNode());
        
        // Effects output to master gain
        this.reverb.connect(this.nodes.masterGain);
        this.delay.connect(this.nodes.masterGain);
        
        // Set default effect settings
        this.distortion.setMix(0); // Bypass by default
        this.eq.applyPreset('flat');
        this.compressor.setMix(100); // Full wet
        this.chorus.setMix(0); // Bypass by default
        this.sidechain.setLFOMode(false); // Manual mode by default
        
        // Connect to destination
        this.nodes.masterGain.connect(this.audioContext.destination);
        
        // Set default master volume
        this.setMasterVolume(0.7);
        
        this.isInitialized = true;
    }

    setMasterVolume(value) {
        if (this.nodes.masterGain) {
            this.nodes.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    setReverbMix(value) {
        this.reverb.setMix(value);
    }

    setDelayTime(seconds) {
        this.delay.setDelayTime(seconds);
    }

    setDelayFeedback(value) {
        this.delay.setFeedback(value);
    }

    setDelayMix(value) {
        this.delay.setMix(value);
    }

    updatePerformance(throttle) {
        this.reverb.updateImpulse(throttle);
    }

    // Get nodes for direct connection from generators
    getConnectionNodes() {
        return {
            dryGain: this.nodes.input,
            convolver: this.reverb.getConvolverNode(),
            delay: this.delay.getDelayNode(),
            sidechain: this.sidechain.getSidechainNode()
        };
    }

    getInputNode() {
        return this.nodes.input;
    }

    // Compressor controls
    setCompressorThreshold(value) {
        this.compressor.setThreshold(value);
    }
    
    setCompressorRatio(value) {
        this.compressor.setRatio(value);
    }
    
    setCompressorAttack(value) {
        this.compressor.setAttack(value);
    }
    
    setCompressorRelease(value) {
        this.compressor.setRelease(value);
    }
    
    setCompressorMakeup(value) {
        this.compressor.setMakeupGain(value);
    }
    
    // EQ controls
    setEQHighpass(freq) {
        this.eq.setHighpass(freq);
    }
    
    setEQLowShelf(gain) {
        this.eq.setLowShelfGain(gain);
    }
    
    setEQMidGain(gain) {
        this.eq.setMidGain(gain);
    }
    
    setEQHighShelf(gain) {
        this.eq.setHighShelfGain(gain);
    }
    
    setEQPreset(preset) {
        this.eq.applyPreset(preset);
    }
    
    // Distortion controls
    setDistortionType(type) {
        this.distortion.setDistortionType(type);
    }
    
    setDistortionDrive(value) {
        this.distortion.setDrive(value);
    }
    
    setDistortionTone(value) {
        this.distortion.setTone(value);
    }
    
    setDistortionMix(value) {
        this.distortion.setMix(value);
    }
    
    // Chorus controls
    setChorusMode(mode) {
        this.chorus.setMode(mode);
    }
    
    setChorusRate(value) {
        this.chorus.setRate(value);
    }
    
    setChorusDepth(value) {
        this.chorus.setModDepth(value);
    }
    
    setChorusMix(value) {
        this.chorus.setMix(value);
    }
    
    // Sidechain controls
    setSidechainThreshold(value) {
        this.sidechain.setThreshold(value);
    }
    
    setSidechainRatio(value) {
        this.sidechain.setRatio(value);
    }
    
    setSidechainPumpMode(enabled, pattern) {
        this.sidechain.setLFOMode(enabled);
        if (enabled && pattern) {
            this.sidechain.setPumpPattern(pattern);
        }
    }
    
    disconnect() {
        this.reverb.disconnect();
        this.delay.disconnect();
        this.compressor.disconnect();
        this.eq.disconnect();
        this.distortion.disconnect();
        this.chorus.disconnect();
        this.sidechain.disconnect();
        
        Object.values(this.nodes).forEach(node => {
            if (node && node.disconnect) {
                try { node.disconnect(); } catch(e) {}
            }
        });
    }
}