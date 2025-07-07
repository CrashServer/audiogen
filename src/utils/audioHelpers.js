export function createWhiteNoise(audioContext, duration) {
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    return buffer;
}

export function createPinkNoise(audioContext, duration) {
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
    }
    
    return buffer;
}

export function createBrownNoise(audioContext, duration) {
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0;
    
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
    }
    
    return buffer;
}

export function createCrackleNoise(audioContext, duration, density) {
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        if (Math.random() < density) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        } else {
            data[i] = 0;
        }
    }
    
    return buffer;
}

export function createBitCrusherCurve(bits) {
    const steps = Math.pow(2, bits);
    const curve = new Float32Array(256);
    
    for (let i = 0; i < 256; i++) {
        const x = (i - 128) / 128;
        curve[i] = Math.round(x * steps) / steps;
    }
    
    return curve;
}

export function noteToFrequency(note) {
    // A4 = 440 Hz, MIDI note 69
    return 440 * Math.pow(2, (note - 69) / 12);
}

export function createEnvelope(audioContext, param, attack, decay, sustain, release, startTime, releaseTime) {
    const now = startTime || audioContext.currentTime;
    
    // Attack
    param.setValueAtTime(0, now);
    param.linearRampToValueAtTime(1, now + attack);
    
    // Decay to sustain
    param.linearRampToValueAtTime(sustain, now + attack + decay);
    
    // Release (if provided)
    if (releaseTime !== undefined) {
        param.setValueAtTime(sustain, releaseTime);
        param.linearRampToValueAtTime(0, releaseTime + release);
    }
}

export function createReverbImpulse(audioContext, duration, decay, reverse = false) {
    const length = audioContext.sampleRate * duration;
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            const n = reverse ? length - i : i;
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        }
    }
    
    return impulse;
}

export function createStereoWidener(audioContext) {
    const splitter = audioContext.createChannelSplitter(2);
    const merger = audioContext.createChannelMerger(2);
    const delayL = audioContext.createDelay(0.03);
    const delayR = audioContext.createDelay(0.03);
    
    delayL.delayTime.value = 0.01;
    delayR.delayTime.value = 0.015;
    
    return {
        input: splitter,
        output: merger,
        connect: function(destination) {
            splitter.connect(delayL, 0);
            splitter.connect(delayR, 1);
            delayL.connect(merger, 0, 0);
            delayR.connect(merger, 0, 1);
            merger.connect(destination);
        }
    };
}

export function createSimpleCompressor(audioContext, threshold = -24, ratio = 12) {
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = threshold;
    compressor.knee.value = 30;
    compressor.ratio.value = ratio;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    
    return compressor;
}

export function connectWithGain(audioContext, source, destination, gainValue = 1) {
    const gain = audioContext.createGain();
    gain.gain.value = gainValue;
    source.connect(gain);
    gain.connect(destination);
    return gain;
}