export class AudioVisualizer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.analyser = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.isRunning = false;
    }

    initialize(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn('Canvas element not found:', canvasId);
            return false;
        }

        this.ctx = this.canvas.getContext('2d');
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;

        return true;
    }

    connect(sourceNode) {
        if (this.analyser) {
            sourceNode.connect(this.analyser);
        }
    }

    start() {
        if (!this.analyser || this.isRunning) return;
        
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        // Clear canvas
        this.ctx.fillStyle = 'rgb(10, 10, 10)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw frequency bars
        const barWidth = (this.canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * this.canvas.height * 0.8;

            // Color based on frequency
            const hue = (i / bufferLength) * 360;
            this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }

        // Draw waveform
        this.drawWaveform();
    }

    drawWaveform() {
        const bufferLength = this.analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);

        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'rgb(255, 255, 255)';
        this.ctx.beginPath();

        const sliceWidth = this.canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * this.canvas.height / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }
}