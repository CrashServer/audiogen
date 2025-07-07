export class ADSREnvelope {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.attack = 0.01;
        this.decay = 0.1;
        this.sustain = 0.7;
        this.release = 0.3;
        this.peakLevel = 1.0;
    }
    
    setADSR(attack, decay, sustain, release) {
        this.attack = Math.max(0.001, attack);
        this.decay = Math.max(0.001, decay);
        this.sustain = Math.max(0, Math.min(1, sustain));
        this.release = Math.max(0.001, release);
    }
    
    setPeakLevel(level) {
        this.peakLevel = Math.max(0, Math.min(1, level));
    }
    
    applyTo(param, startTime, releaseTime, baseValue = 0) {
        const now = startTime || this.audioContext.currentTime;
        const peak = baseValue + this.peakLevel;
        const sustainLevel = baseValue + (this.peakLevel * this.sustain);
        
        // Cancel any scheduled changes
        param.cancelScheduledValues(now);
        
        // Attack phase
        param.setValueAtTime(baseValue, now);
        param.linearRampToValueAtTime(peak, now + this.attack);
        
        // Decay phase
        param.exponentialRampToValueAtTime(
            Math.max(0.001, sustainLevel), 
            now + this.attack + this.decay
        );
        
        // Hold at sustain until release
        if (releaseTime !== undefined && releaseTime !== null) {
            // Set sustain hold
            param.setValueAtTime(sustainLevel, releaseTime);
            
            // Release phase
            param.exponentialRampToValueAtTime(
                Math.max(0.001, baseValue), 
                releaseTime + this.release
            );
        }
        
        return now + this.attack + this.decay;
    }
    
    getTotalDuration() {
        return this.attack + this.decay + this.release;
    }
    
    // Apply envelope with custom curve shapes
    applyWithCurve(param, startTime, releaseTime, baseValue = 0, attackCurve = 'linear', releaseCurve = 'exponential') {
        const now = startTime || this.audioContext.currentTime;
        const peak = baseValue + this.peakLevel;
        const sustainLevel = baseValue + (this.peakLevel * this.sustain);
        
        param.cancelScheduledValues(now);
        param.setValueAtTime(baseValue, now);
        
        // Attack phase with curve selection
        if (attackCurve === 'exponential' && baseValue > 0) {
            param.exponentialRampToValueAtTime(peak, now + this.attack);
        } else {
            param.linearRampToValueAtTime(peak, now + this.attack);
        }
        
        // Decay phase (always exponential for natural sound)
        param.exponentialRampToValueAtTime(
            Math.max(0.001, sustainLevel), 
            now + this.attack + this.decay
        );
        
        // Release phase with curve selection
        if (releaseTime !== undefined && releaseTime !== null) {
            param.setValueAtTime(sustainLevel, releaseTime);
            
            if (releaseCurve === 'linear') {
                param.linearRampToValueAtTime(baseValue, releaseTime + this.release);
            } else {
                param.exponentialRampToValueAtTime(
                    Math.max(0.001, baseValue), 
                    releaseTime + this.release
                );
            }
        }
    }
    
    // Create a one-shot envelope (no sustain phase)
    applyOneShot(param, startTime, baseValue = 0) {
        const now = startTime || this.audioContext.currentTime;
        const peak = baseValue + this.peakLevel;
        
        param.cancelScheduledValues(now);
        param.setValueAtTime(baseValue, now);
        param.linearRampToValueAtTime(peak, now + this.attack);
        param.exponentialRampToValueAtTime(
            Math.max(0.001, baseValue), 
            now + this.attack + this.release
        );
        
        return now + this.attack + this.release;
    }
    
    // Clone this envelope
    clone() {
        const newEnvelope = new ADSREnvelope(this.audioContext);
        newEnvelope.attack = this.attack;
        newEnvelope.decay = this.decay;
        newEnvelope.sustain = this.sustain;
        newEnvelope.release = this.release;
        newEnvelope.peakLevel = this.peakLevel;
        return newEnvelope;
    }
    
    // Get parameters as object
    getParameters() {
        return {
            attack: this.attack,
            decay: this.decay,
            sustain: this.sustain,
            release: this.release,
            peakLevel: this.peakLevel
        };
    }
    
    // Set parameters from object
    setParameters(params) {
        if (params.attack !== undefined) this.attack = Math.max(0.001, params.attack);
        if (params.decay !== undefined) this.decay = Math.max(0.001, params.decay);
        if (params.sustain !== undefined) this.sustain = Math.max(0, Math.min(1, params.sustain));
        if (params.release !== undefined) this.release = Math.max(0.001, params.release);
        if (params.peakLevel !== undefined) this.peakLevel = Math.max(0, Math.min(1, params.peakLevel));
    }
}