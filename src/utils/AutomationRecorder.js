export class AutomationRecorder {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.isRecording = false;
        this.isPlaying = false;
        this.recordings = new Map(); // paramId -> array of {time, value}
        this.startTime = 0;
        this.playbackStartTime = 0;
        this.playbackScheduler = null;
        this.loopEnabled = true;
        this.recordedDuration = 0;
    }
    
    startRecording() {
        this.isRecording = true;
        this.recordings.clear();
        this.startTime = this.audioContext.currentTime;
        this.recordedDuration = 0;
    }
    
    stopRecording() {
        this.isRecording = false;
        this.recordedDuration = this.audioContext.currentTime - this.startTime;
        return this.recordings;
    }
    
    recordValue(paramId, value) {
        if (!this.isRecording) return;
        
        if (!this.recordings.has(paramId)) {
            this.recordings.set(paramId, []);
        }
        
        const time = this.audioContext.currentTime - this.startTime;
        this.recordings.get(paramId).push({ time, value });
    }
    
    startPlayback(updateCallback) {
        if (this.recordings.size === 0) return;
        
        this.isPlaying = true;
        this.playbackStartTime = this.audioContext.currentTime;
        
        // Schedule all recorded events
        this.schedulePlayback(updateCallback);
    }
    
    stopPlayback() {
        this.isPlaying = false;
        if (this.playbackScheduler) {
            clearInterval(this.playbackScheduler);
            this.playbackScheduler = null;
        }
    }
    
    schedulePlayback(updateCallback) {
        const checkInterval = 10; // Check every 10ms
        let lastCheckTime = 0;
        
        this.playbackScheduler = setInterval(() => {
            if (!this.isPlaying) {
                clearInterval(this.playbackScheduler);
                return;
            }
            
            const currentPlaybackTime = (this.audioContext.currentTime - this.playbackStartTime) % this.recordedDuration;
            
            // Check each parameter's recordings
            this.recordings.forEach((events, paramId) => {
                events.forEach(event => {
                    // Check if this event should be triggered
                    if (event.time > lastCheckTime && event.time <= currentPlaybackTime) {
                        updateCallback(paramId, event.value);
                    }
                });
            });
            
            lastCheckTime = currentPlaybackTime;
            
            // Handle loop
            if (currentPlaybackTime < lastCheckTime && this.loopEnabled) {
                // We've looped
                lastCheckTime = 0;
                this.playbackStartTime = this.audioContext.currentTime;
            }
        }, checkInterval);
    }
    
    setLoop(enabled) {
        this.loopEnabled = enabled;
    }
    
    clearRecordings() {
        this.recordings.clear();
        this.recordedDuration = 0;
    }
    
    exportRecordings() {
        const data = {
            duration: this.recordedDuration,
            recordings: {}
        };
        
        this.recordings.forEach((events, paramId) => {
            data.recordings[paramId] = events;
        });
        
        return JSON.stringify(data);
    }
    
    importRecordings(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.recordedDuration = data.duration || 0;
            this.recordings.clear();
            
            Object.entries(data.recordings).forEach(([paramId, events]) => {
                this.recordings.set(paramId, events);
            });
            
            return true;
        } catch (err) {
            console.error('Failed to import recordings:', err);
            return false;
        }
    }
    
    // Create smooth automation curves
    createAutomationCurve(paramId, points, duration) {
        // points: array of {time: 0-1, value: number}
        const events = [];
        const resolution = 100; // Events per second
        
        for (let i = 0; i < duration * resolution; i++) {
            const time = i / resolution;
            const normalizedTime = time / duration;
            
            // Find surrounding points
            let prevPoint = { time: 0, value: points[0].value };
            let nextPoint = points[points.length - 1];
            
            for (let j = 0; j < points.length - 1; j++) {
                if (points[j].time <= normalizedTime && points[j + 1].time > normalizedTime) {
                    prevPoint = points[j];
                    nextPoint = points[j + 1];
                    break;
                }
            }
            
            // Linear interpolation
            const t = (normalizedTime - prevPoint.time) / (nextPoint.time - prevPoint.time);
            const value = prevPoint.value + (nextPoint.value - prevPoint.value) * t;
            
            events.push({ time, value });
        }
        
        this.recordings.set(paramId, events);
        this.recordedDuration = duration;
    }
    
    // Create LFO automation
    createLFOAutomation(paramId, min, max, frequency, duration) {
        const events = [];
        const resolution = 100;
        
        for (let i = 0; i < duration * resolution; i++) {
            const time = i / resolution;
            const value = min + (max - min) * (Math.sin(2 * Math.PI * frequency * time) + 1) / 2;
            events.push({ time, value });
        }
        
        this.recordings.set(paramId, events);
        this.recordedDuration = duration;
    }
    
    // Create random automation
    createRandomAutomation(paramId, min, max, changeRate, duration) {
        const events = [];
        let lastValue = min + Math.random() * (max - min);
        
        for (let time = 0; time < duration; time += 1 / changeRate) {
            const value = min + Math.random() * (max - min);
            events.push({ time, value });
            lastValue = value;
        }
        
        this.recordings.set(paramId, events);
        this.recordedDuration = duration;
    }
}