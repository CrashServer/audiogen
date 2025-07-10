export class PerformanceMonitor {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.stats = {
            cpuUsage: 0,
            memoryUsage: 0,
            audioLatency: 0,
            activeVoices: 0,
            droppedFrames: 0
        };
        this.monitoring = false;
        this.interval = null;
        this.callbacks = new Set();
    }

    start() {
        if (this.monitoring) return;
        
        this.monitoring = true;
        this.interval = setInterval(() => {
            this.updateStats();
            this.notifyCallbacks();
        }, 1000);
    }

    stop() {
        this.monitoring = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    updateStats() {
        // CPU usage estimation
        this.stats.cpuUsage = this.estimateCPUUsage();
        
        // Memory usage
        if (performance.memory) {
            this.stats.memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize * 100;
        }
        
        // Audio latency
        this.stats.audioLatency = this.audioContext.baseLatency + this.audioContext.outputLatency;
        
        // Active voices would be tracked by generators
        // This is a placeholder for integration
    }

    estimateCPUUsage() {
        // Simple CPU usage estimation based on timing
        const start = performance.now();
        let iterations = 0;
        const testDuration = 10; // ms
        
        while (performance.now() - start < testDuration) {
            iterations++;
            // Simulate work
            Math.random() * Math.random();
        }
        
        // Normalize to percentage (this is a rough estimate)
        const baseline = 100000; // Expected iterations for 0% load
        const usage = Math.max(0, Math.min(100, 100 - (iterations / baseline * 100)));
        return usage;
    }

    addCallback(callback) {
        this.callbacks.add(callback);
    }

    removeCallback(callback) {
        this.callbacks.delete(callback);
    }

    notifyCallbacks() {
        this.callbacks.forEach(callback => callback(this.stats));
    }

    getStats() {
        return { ...this.stats };
    }

    createUIDisplay() {
        const container = document.createElement('div');
        container.className = 'performance-monitor';
        container.innerHTML = `
            <div class="perf-stat">
                <span>CPU:</span>
                <span id="cpu-usage">0%</span>
            </div>
            <div class="perf-stat">
                <span>Memory:</span>
                <span id="memory-usage">0%</span>
            </div>
            <div class="perf-stat">
                <span>Latency:</span>
                <span id="audio-latency">0ms</span>
            </div>
            <div class="perf-stat">
                <span>Voices:</span>
                <span id="active-voices">0</span>
            </div>
        `;

        this.addCallback((stats) => {
            document.getElementById('cpu-usage').textContent = `${stats.cpuUsage.toFixed(1)}%`;
            document.getElementById('memory-usage').textContent = `${stats.memoryUsage.toFixed(1)}%`;
            document.getElementById('audio-latency').textContent = `${(stats.audioLatency * 1000).toFixed(1)}ms`;
            document.getElementById('active-voices').textContent = stats.activeVoices;
        });

        return container;
    }
}