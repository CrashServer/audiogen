/**
 * VoicePool - Manages reusable audio nodes to reduce garbage collection
 */
export class VoicePool {
    constructor(audioContext, createNodeFn, maxSize = 100) {
        this.audioContext = audioContext;
        this.createNodeFn = createNodeFn;
        this.maxSize = maxSize;
        this.available = [];
        this.active = new Map(); // Map of node to metadata
        this.totalCreated = 0;
    }
    
    /**
     * Acquire a node from the pool
     * @param {string} id - Unique identifier for tracking
     * @returns {AudioNode} - The acquired node
     */
    acquire(id) {
        let node = this.available.pop();
        
        if (!node) {
            // Create new node if pool is empty
            node = this.createNodeFn(this.audioContext);
            this.totalCreated++;
        }
        
        // Track active node
        this.active.set(node, {
            id,
            acquiredAt: Date.now()
        });
        
        return node;
    }
    
    /**
     * Release a node back to the pool
     * @param {AudioNode} node - The node to release
     */
    release(node) {
        if (!this.active.has(node)) {
            console.warn('Attempting to release untracked node');
            return;
        }
        
        // Clean up the node
        try {
            node.disconnect();
            
            // Reset node parameters if it has them
            if (node.frequency) node.frequency.cancelScheduledValues(0);
            if (node.gain) node.gain.cancelScheduledValues(0);
            if (node.detune) node.detune.cancelScheduledValues(0);
            
            // Stop if it's a source node
            if (node.stop && typeof node.stop === 'function') {
                try {
                    node.stop();
                } catch (e) {
                    // Already stopped, ignore
                }
            }
        } catch (e) {
            console.warn('Error cleaning up node:', e);
        }
        
        // Remove from active tracking
        this.active.delete(node);
        
        // Return to pool if under max size
        if (this.available.length < this.maxSize) {
            this.available.push(node);
        }
    }
    
    /**
     * Release all nodes with a specific ID
     * @param {string} id - The ID to match
     */
    releaseById(id) {
        const nodesToRelease = [];
        
        this.active.forEach((metadata, node) => {
            if (metadata.id === id) {
                nodesToRelease.push(node);
            }
        });
        
        nodesToRelease.forEach(node => this.release(node));
    }
    
    /**
     * Clean up old nodes that have been active too long
     * @param {number} maxAge - Maximum age in milliseconds
     */
    cleanupOld(maxAge = 30000) {
        const now = Date.now();
        const nodesToRelease = [];
        
        this.active.forEach((metadata, node) => {
            if (now - metadata.acquiredAt > maxAge) {
                nodesToRelease.push(node);
            }
        });
        
        nodesToRelease.forEach(node => this.release(node));
    }
    
    /**
     * Get pool statistics
     */
    getStats() {
        return {
            available: this.available.length,
            active: this.active.size,
            totalCreated: this.totalCreated,
            poolEfficiency: this.totalCreated > 0 
                ? ((this.totalCreated - this.active.size) / this.totalCreated * 100).toFixed(1) + '%'
                : '0%'
        };
    }
    
    /**
     * Clear the entire pool
     */
    clear() {
        // Release all active nodes
        const activeNodes = Array.from(this.active.keys());
        activeNodes.forEach(node => this.release(node));
        
        // Clear available pool
        this.available = [];
    }
}

/**
 * OscillatorPool - Specialized pool for oscillators
 */
export class OscillatorPool extends VoicePool {
    constructor(audioContext, maxSize = 50) {
        super(audioContext, (ctx) => ctx.createOscillator(), maxSize);
    }
    
    /**
     * Acquire an oscillator with initial setup
     * @param {string} id - Unique identifier
     * @param {Object} options - Oscillator options (type, frequency, detune)
     * @returns {OscillatorNode} - Configured oscillator
     */
    acquireOscillator(id, options = {}) {
        const osc = this.acquire(id);
        
        // Apply options
        if (options.type) osc.type = options.type;
        if (options.frequency !== undefined) osc.frequency.value = options.frequency;
        if (options.detune !== undefined) osc.detune.value = options.detune;
        
        // Oscillators need to be started
        try {
            osc.start();
        } catch (e) {
            // Already started, that's ok
        }
        
        return osc;
    }
}

/**
 * GainPool - Specialized pool for gain nodes
 */
export class GainPool extends VoicePool {
    constructor(audioContext, maxSize = 100) {
        super(audioContext, (ctx) => ctx.createGain(), maxSize);
    }
    
    /**
     * Acquire a gain node with initial value
     * @param {string} id - Unique identifier
     * @param {number} value - Initial gain value
     * @returns {GainNode} - Configured gain node
     */
    acquireGain(id, value = 1) {
        const gain = this.acquire(id);
        gain.gain.value = value;
        return gain;
    }
}

/**
 * BufferSourcePool - Specialized pool for buffer sources
 * Note: BufferSources can't be reused, so this doesn't actually pool
 */
export class BufferSourcePool {
    constructor(audioContext, maxSize = 30) {
        this.audioContext = audioContext;
        this.maxSize = maxSize;
        this.totalCreated = 0;
        this.active = new Map();
    }
    
    /**
     * Create a new buffer source (no actual pooling)
     * @param {string} id - Unique identifier
     * @param {AudioBuffer} buffer - The audio buffer to use
     * @param {Object} options - Additional options (loop, playbackRate, etc)
     * @returns {AudioBufferSourceNode} - Configured buffer source
     */
    acquireBufferSource(id, buffer, options = {}) {
        // Always create a new BufferSource since they can't be reused
        const source = this.audioContext.createBufferSource();
        
        // Track for statistics
        this.active.set(source, {
            id: id,
            acquiredAt: Date.now()
        });
        this.totalCreated++;
        
        // Configure the source - ONLY set buffer if it's not already set
        if (buffer && !source.buffer) {
            source.buffer = buffer;
        }
        if (options.loop !== undefined) source.loop = options.loop;
        if (options.playbackRate !== undefined) source.playbackRate.value = options.playbackRate;
        if (options.loopStart !== undefined) source.loopStart = options.loopStart;
        if (options.loopEnd !== undefined) source.loopEnd = options.loopEnd;
        
        return source;
    }
    
    /**
     * Release - just remove from tracking
     */
    release(node) {
        if (this.active.has(node)) {
            this.active.delete(node);
        }
    }
    
    /**
     * Get pool statistics
     */
    getStats() {
        return {
            available: 0, // No pooling for buffer sources
            active: this.active.size,
            totalCreated: this.totalCreated,
            poolEfficiency: '0%' // No reuse possible
        };
    }
    
    /**
     * Clean up old nodes that have been active too long
     * @param {number} maxAge - Maximum age in milliseconds
     */
    cleanupOld(maxAge = 30000) {
        const now = Date.now();
        const nodesToRelease = [];
        
        this.active.forEach((metadata, node) => {
            if (now - metadata.acquiredAt > maxAge) {
                nodesToRelease.push(node);
            }
        });
        
        nodesToRelease.forEach(node => this.release(node));
    }
    
    /**
     * Clear all tracking
     */
    clear() {
        this.active.clear();
    }
}

/**
 * PoolManager - Manages all pools for an audio context
 */
export class PoolManager {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.pools = {
            oscillator: new OscillatorPool(audioContext),
            gain: new GainPool(audioContext),
            bufferSource: new BufferSourcePool(audioContext)
        };
        
        // Periodic cleanup of old nodes
        this.cleanupInterval = setInterval(() => {
            Object.values(this.pools).forEach(pool => {
                pool.cleanupOld(30000); // Clean up nodes older than 30 seconds
            });
        }, 10000); // Run every 10 seconds
    }
    
    /**
     * Get statistics for all pools
     */
    getAllStats() {
        const stats = {};
        Object.entries(this.pools).forEach(([name, pool]) => {
            stats[name] = pool.getStats();
        });
        return stats;
    }
    
    /**
     * Clean up all pools
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        Object.values(this.pools).forEach(pool => {
            pool.clear();
        });
    }
}