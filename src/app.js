import { DroneGenerator } from './generators/DroneGenerator.js';
import { DrumsGenerator } from './generators/DrumsGenerator.js';
import { AdvancedDrumsGenerator } from './generators/AdvancedDrumsGenerator.js';
import { GlitchGenerator } from './generators/GlitchGenerator.js';
import { SineBleepsGenerator } from './generators/SineBleepsGenerator.js';
import { DataBurstGenerator } from './generators/DataBurstGenerator.js';
import { FMSynthGenerator } from './generators/FMSynthGenerator.js';
import { NoiseGenerator } from './generators/NoiseGenerator.js';
import { AcidGenerator } from './generators/AcidGenerator.js';
import { GranularGenerator } from './generators/GranularGenerator.js';
import { SpaceMelodyGenerator } from './generators/SpaceMelodyGenerator.js';
import { AmbientPadGenerator } from './generators/AmbientPadGenerator.js';
import { ArpeggiatorGenerator } from './generators/ArpeggiatorGenerator.js';
import { ChordGenerator } from './generators/ChordGenerator.js';
import { VocalSynthGenerator } from './generators/VocalSynthGenerator.js';
import { KarplusStrongGenerator } from './generators/KarplusStrongGenerator.js';
import { AdditiveSynthGenerator } from './generators/AdditiveSynthGenerator.js';
import { MasterBus } from './effects/MasterBus.js';
import { PoolManager } from './utils/VoicePool.js';
import { ADSREnvelope } from './utils/ADSREnvelope.js';
import { AutomationRecorder } from './utils/AutomationRecorder.js';

export class GenerativeSoundscape {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        
        // Initialize performance monitoring
        this.activeVoices = 0;
        this.maxVoices = 100;
        this.performanceThrottle = 1;
        this.performanceMonitor = null;
        
        // Master bus for effects
        this.masterBus = null;
        
        // Voice pool manager
        this.poolManager = null;
        
        // Generators
        this.generators = {};
        
        // Group enable states
        this.groupEnabled = {
            drone: true,
            glitch: true,
            drums: true,
            bleeps: true,
            burst: true,
            fm: true,
            noise: true,
            acid: true,
            granular: true,
            spaceMelody: true,
            ambientPad: true,
            arpeggiator: true,
            chord: true,
            vocal: true,
            karplus: true,
            additive: true
        };
        
        // Animation state
        this.animatedParams = new Map();
        this.morphState = null;
        this.morphStartParams = null;
        this.morphTargetParams = null;
        this.morphStartTime = null;
        
        // Morph system
        this.morphing = false;
        this.morphTargets = new Map();
        this.morphStartValues = new Map();
        this.morphDuration = 5000; // 5 seconds default
        
        // LFO and modulation state
        this.modulationModes = new Map();
        this.randomIntervals = new Map();
        this.lfoControllers = new Map();
        
        // Auto mode and lite mode
        this.autoModeInterval = null;
        this.liteMode = false;
        
        // ADSR envelope system
        this.globalEnvelope = null;
        this.adsrMode = 'global'; // 'global', 'perGroup', 'disabled'
        this.groupEnvelopes = new Map();
        
        // Automation system
        this.automationRecorder = null;
        
        // Initialize UI
        this.initializeUI();
        
        // Initialize keyboard shortcuts
        this.initializeKeyboardShortcuts();
        
        // Set initial button state
        const stopButton = document.getElementById('stopButton');
        if (stopButton) stopButton.disabled = true;
        
        // Load settings from URL if present
        this.loadSettingsFromURL();
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT') return;
            
            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    if (this.isPlaying) {
                        this.stop();
                    } else {
                        this.start();
                    }
                    break;
                case 'r':
                    if (!e.ctrlKey && !e.metaKey) { // Don't interfere with browser refresh
                        e.preventDefault();
                        this.randomize();
                    }
                    break;
                case 'm':
                    e.preventDefault();
                    this.startMorph();
                    break;
                case 'a':
                    e.preventDefault();
                    this.toggleAutoMode();
                    break;
                case 'l':
                    e.preventDefault();
                    this.toggleLiteMode();
                    break;
                case 'escape':
                    e.preventDefault();
                    if (this.isPlaying) {
                        this.stop();
                    }
                    break;
                case '?':
                case 'h':
                    e.preventDefault();
                    this.showKeyboardHelp();
                    break;
            }
        });
    }
    
    initializeUI() {
        // Add event listeners with null checks
        const addListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        };
        
        // Play button
        addListener('playButton', 'click', () => this.start());
        
        // Stop button
        addListener('stopButton', 'click', () => this.stop());
        
        // Randomize button
        addListener('randomizeButton', 'click', () => this.randomize());
        
        // Morph button
        addListener('morphButton', 'click', () => this.startMorph());
        
        // Morph time slider
        addListener('morphTime', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
        });
        
        // Auto change time slider
        addListener('autoChangeTime', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            // If auto mode is active, update the interval
            if (this.autoModeInterval) {
                this.updateAutoModeInterval();
            }
        });
        
        // Min groups slider
        addListener('minGroups', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            // Ensure max is not less than min
            const maxSlider = document.getElementById('maxGroups');
            if (maxSlider && parseInt(maxSlider.value) < parseInt(e.target.value)) {
                maxSlider.value = e.target.value;
                maxSlider.dispatchEvent(new Event('input'));
            }
        });
        
        // Max groups slider
        addListener('maxGroups', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            // Ensure min is not greater than max
            const minSlider = document.getElementById('minGroups');
            if (minSlider && parseInt(minSlider.value) > parseInt(e.target.value)) {
                minSlider.value = e.target.value;
                minSlider.dispatchEvent(new Event('input'));
            }
        });
        
        // Record button
        addListener('recordButton', 'click', () => this.toggleRecording());
        
        // Auto button
        addListener('autoButton', 'click', () => this.toggleAutoMode());
        
        // Lite button
        addListener('liteButton', 'click', () => this.toggleLiteMode());
        
        // Share button
        addListener('shareButton', 'click', () => this.shareSettings());
        
        // Help button
        addListener('helpButton', 'click', () => this.showKeyboardHelp());
        
        // LFO buttons
        document.querySelectorAll('.lfo-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const param = e.target.dataset.param;
                this.toggleLFO(param, e.target);
            });
        });
        
        // Master controls
        addListener('masterVolume', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setMasterVolume(parseFloat(e.target.value) / 100);
            }
        });
        
        addListener('reverb', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setReverbMix(parseFloat(e.target.value) / 100);
            }
        });
        
        addListener('delayTime', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = parseFloat(e.target.value).toFixed(1);
            }
            if (this.masterBus) {
                this.masterBus.setDelayTime(parseFloat(e.target.value));
            }
        });
        
        addListener('delay', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setDelayMix(parseFloat(e.target.value) / 100);
            }
        });
        
        // Effects controls
        addListener('compressorMix', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.compressor.setMix(parseFloat(e.target.value));
            }
        });
        
        addListener('compThreshold', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setCompressorThreshold(parseFloat(e.target.value));
            }
        });
        
        addListener('compRatio', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setCompressorRatio(parseFloat(e.target.value));
            }
        });
        
        addListener('eqPreset', 'change', (e) => {
            if (this.masterBus) {
                this.masterBus.setEQPreset(e.target.value);
            }
        });
        
        addListener('eqLow', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setEQLowShelf(parseFloat(e.target.value));
            }
        });
        
        addListener('eqMid', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setEQMidGain(parseFloat(e.target.value));
            }
        });
        
        addListener('eqHigh', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setEQHighShelf(parseFloat(e.target.value));
            }
        });
        
        addListener('distortionMix', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setDistortionMix(parseFloat(e.target.value));
            }
        });
        
        addListener('distType', 'change', (e) => {
            if (this.masterBus) {
                this.masterBus.setDistortionType(e.target.value);
            }
        });
        
        addListener('distDrive', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setDistortionDrive(parseFloat(e.target.value));
            }
        });
        
        addListener('chorusMix', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setChorusMix(parseFloat(e.target.value));
            }
        });
        
        addListener('chorusMode', 'change', (e) => {
            if (this.masterBus) {
                this.masterBus.setChorusMode(e.target.value);
            }
        });
        
        addListener('chorusRate', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.setChorusRate(parseFloat(e.target.value));
            }
        });
        
        addListener('sidechainEnable', 'change', (e) => {
            if (this.masterBus) {
                const pattern = document.getElementById('sidechainPattern')?.value || 'quarter';
                this.masterBus.setSidechainPumpMode(e.target.checked, pattern);
            }
        });
        
        addListener('sidechainPattern', 'change', (e) => {
            if (this.masterBus) {
                const enabled = document.getElementById('sidechainEnable')?.checked || false;
                if (enabled) {
                    this.masterBus.setSidechainPumpMode(true, e.target.value);
                }
            }
        });
        
        addListener('sidechainAmount', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
            if (this.masterBus) {
                this.masterBus.sidechain.setLFODepth(parseFloat(e.target.value));
            }
        });
        
        // ADSR controls
        addListener('globalAttack', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = parseFloat(e.target.value).toFixed(3);
            }
            if (this.globalEnvelope) {
                this.globalEnvelope.attack = parseFloat(e.target.value);
            }
        });
        
        addListener('globalDecay', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = parseFloat(e.target.value).toFixed(3);
            }
            if (this.globalEnvelope) {
                this.globalEnvelope.decay = parseFloat(e.target.value);
            }
        });
        
        addListener('globalSustain', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = parseFloat(e.target.value).toFixed(2);
            }
            if (this.globalEnvelope) {
                this.globalEnvelope.sustain = parseFloat(e.target.value);
            }
        });
        
        addListener('globalRelease', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = parseFloat(e.target.value).toFixed(3);
            }
            if (this.globalEnvelope) {
                this.globalEnvelope.release = parseFloat(e.target.value);
            }
        });
        
        addListener('adsrMode', 'change', (e) => {
            this.adsrMode = e.target.value;
            // Reinitialize generators if playing to apply new ADSR mode
            if (this.isPlaying) {
                Object.keys(this.groupEnabled).forEach(group => {
                    if (this.groupEnabled[group]) {
                        this.updateGroupState(group, false);
                        this.updateGroupState(group, true);
                    }
                });
            }
        });
        
        // Drum pattern mode change
        addListener('drumPatternMode', 'change', (e) => {
            // Restart drums if playing to apply new pattern mode
            if (this.isPlaying && this.groupEnabled.drums) {
                this.updateGroupState('drums', false);
                this.updateGroupState('drums', true);
            }
        });
        
        // Sample kit toggle
        addListener('useSampleKit', 'change', (e) => {
            // Restart drums if playing to switch between sample kit and synthesis
            if (this.isPlaying && this.groupEnabled.drums) {
                this.updateGroupState('drums', false);
                this.updateGroupState('drums', true);
            }
        });
        
        // Automation controls
        addListener('automationRecord', 'click', () => {
            if (!this.automationRecorder) return;
            
            const button = document.getElementById('automationRecord');
            if (this.automationRecorder.isRecording) {
                this.automationRecorder.stopRecording();
                button.classList.remove('recording');
                button.textContent = 'REC';
            } else {
                this.automationRecorder.startRecording();
                button.classList.add('recording');
                button.textContent = 'STOP REC';
            }
        });
        
        addListener('automationPlay', 'click', () => {
            if (!this.automationRecorder) return;
            
            const button = document.getElementById('automationPlay');
            if (this.automationRecorder.isPlaying) {
                this.automationRecorder.stopPlayback();
                button.classList.remove('active');
            } else {
                // Callback to update parameters during playback
                this.automationRecorder.startPlayback((paramId, value) => {
                    const control = document.getElementById(paramId);
                    if (control) {
                        control.value = value;
                        control.dispatchEvent(new Event('input'));
                    }
                });
                button.classList.add('active');
            }
        });
        
        addListener('automationStop', 'click', () => {
            if (!this.automationRecorder) return;
            
            this.automationRecorder.stopPlayback();
            this.automationRecorder.stopRecording();
            
            document.getElementById('automationRecord').classList.remove('recording');
            document.getElementById('automationRecord').textContent = 'REC';
            document.getElementById('automationPlay').classList.remove('active');
        });
        
        addListener('automationClear', 'click', () => {
            if (!this.automationRecorder) return;
            this.automationRecorder.clearRecordings();
        });
        
        addListener('automationLoop', 'change', (e) => {
            if (!this.automationRecorder) return;
            this.automationRecorder.setLoop(e.target.checked);
        });
        
        addListener('automationDuration', 'input', (e) => {
            const display = e.target.nextElementSibling;
            if (display && display.classList.contains('value')) {
                display.textContent = e.target.value;
            }
        });
        
        // Group toggles
        document.querySelectorAll('.group-enable').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                // Extract group name from ID and handle special cases
                let groupName = e.target.id.replace('Enable', '');
                
                // Skip arpEnable as it's a parameter, not a group
                if (groupName === 'arp') return;
                
                // The group name is already correct after removing 'Enable'
                // No mapping needed anymore
                
                if (this.groupEnabled.hasOwnProperty(groupName)) {
                    this.updateGroupState(groupName, e.target.checked);
                }
            });
        });
        
        // Parameter controls - all range inputs and selects
        document.querySelectorAll('input[type="range"], select').forEach(control => {
            // Skip group enables and master controls already handled
            if (control.classList.contains('group-enable') || 
                ['masterVolume', 'reverb', 'delay', 'delayTime'].includes(control.id)) {
                return;
            }
            
            control.addEventListener('input', (e) => {
                // Update value display for range inputs
                if (control.type === 'range') {
                    const display = control.nextElementSibling;
                    if (display && display.classList.contains('value')) {
                        const value = e.target.value;
                        display.textContent = control.step && parseFloat(control.step) < 1 ? 
                            parseFloat(value).toFixed(1) : value;
                    }
                }
                
                if (this.isPlaying) {
                    // Check which group this parameter belongs to
                    const groupName = this.getGroupForParameter(control.id);
                    
                    // If it's a group-specific parameter and the group is enabled, restart the generator
                    if (groupName && this.groupEnabled[groupName]) {
                        // For generators that need restarting on parameter change
                        const generatorsNeedingRestart = [
                            'bleeps', 'burst', 'acid', 'granular', 'spaceMelody', 
                            'ambientPad', 'arpeggiator', 'chord', 'vocal', 
                            'karplus', 'additive', 'sample'
                        ];
                        
                        if (generatorsNeedingRestart.includes(groupName)) {
                            // Restart the generator with new parameters
                            this.updateGroupState(groupName, false);
                            this.updateGroupState(groupName, true);
                        } else {
                            // Try dynamic update first
                            this.updateParameter(control.id, parseFloat(control.value));
                        }
                    } else {
                        // Master parameters or other non-group parameters
                        this.updateParameter(control.id, parseFloat(control.value));
                    }
                }
                
                // Record automation if enabled
                if (this.automationRecorder && this.automationRecorder.isRecording && control.type === 'range') {
                    this.automationRecorder.recordValue(control.id, parseFloat(control.value));
                }
            });
        });
        
        // Update value displays for all range inputs on page load
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            const display = slider.nextElementSibling;
            if (display && display.classList.contains('value')) {
                const value = slider.value;
                display.textContent = slider.step && parseFloat(slider.step) < 1 ? 
                    parseFloat(value).toFixed(1) : value;
            }
        });
    }


    async start() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // Initialize pool manager when audio context is created
            this.poolManager = new PoolManager(this.audioContext);
            
            // Initialize global ADSR envelope
            this.globalEnvelope = new ADSREnvelope(this.audioContext);
            this.globalEnvelope.setADSR(
                parseFloat(document.getElementById('globalAttack')?.value || 0.01),
                parseFloat(document.getElementById('globalDecay')?.value || 0.1),
                parseFloat(document.getElementById('globalSustain')?.value || 0.7),
                parseFloat(document.getElementById('globalRelease')?.value || 0.3)
            );
            
            // Initialize automation recorder
            this.automationRecorder = new AutomationRecorder(this.audioContext);
        }
        
        this.isPlaying = true;
        
        // Update button states
        const playButton = document.getElementById('playButton');
        const stopButton = document.getElementById('stopButton');
        if (playButton) playButton.disabled = true;
        if (stopButton) stopButton.disabled = false;
        
        this.setupAudioGraph();
        this.initializeGenerators();
        this.startGenerators();
        this.startAnimations();
        this.startPerformanceMonitoring();
    }

    stop() {
        this.isPlaying = false;
        
        // Update button states
        const playButton = document.getElementById('playButton');
        const stopButton = document.getElementById('stopButton');
        if (playButton) playButton.disabled = false;
        if (stopButton) stopButton.disabled = true;
        
        // Stop auto mode if running
        if (this.autoModeInterval) {
            clearInterval(this.autoModeInterval);
            this.autoModeInterval = null;
            const autoButton = document.getElementById('autoButton');
            if (autoButton) {
                autoButton.classList.remove('active');
                autoButton.textContent = 'AUTO';
            }
        }
        
        // Stop morphing if in progress
        this.morphing = false;
        const morphButton = document.getElementById('morphButton');
        if (morphButton) {
            morphButton.textContent = 'MORPH';
        }
        
        // Stop all generators
        Object.values(this.generators).forEach(generator => {
            if (generator && generator.stop) {
                generator.stop();
            }
        });
        
        // Clear animations
        this.animatedParams.forEach((animation, param) => {
            if (animation.interval) {
                clearInterval(animation.interval);
            }
            if (animation.frameId) {
                cancelAnimationFrame(animation.frameId);
            }
        });
        this.animatedParams.clear();
        
        // Clear random intervals
        this.randomIntervals.forEach(interval => {
            clearInterval(interval);
        });
        this.randomIntervals.clear();
        
        // Clear modulation modes
        this.modulationModes.clear();
        
        // Reset all slider classes
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.classList.remove('animated', 'random-jump', 'other-mod');
        });
        
        // Reset all LFO buttons
        document.querySelectorAll('.lfo-button').forEach(button => {
            button.textContent = 'MOD';
            button.classList.remove('active', 'random', 'other');
        });
        
        // Stop performance monitoring
        if (this.performanceMonitor) {
            clearInterval(this.performanceMonitor);
            this.performanceMonitor = null;
        }
        
        // Stop activity monitoring
        if (this.activityMonitor) {
            clearInterval(this.activityMonitor);
            this.activityMonitor = null;
        }
        
        // Clear all activity indicators
        document.querySelectorAll('.activity-indicator').forEach(indicator => {
            indicator.classList.remove('active');
        });
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Disconnect master nodes
        this.disconnectAll();
        
        // Clean up voice pools
        if (this.poolManager) {
            console.log('Voice Pool Stats:', this.poolManager.getAllStats());
        }
    }

    setupAudioGraph() {
        // Initialize master bus with effects
        this.masterBus = new MasterBus(this.audioContext);
        this.masterBus.initialize(this.performanceThrottle);
        
        // Set initial values from UI
        const masterVolume = parseFloat(document.getElementById('masterVolume')?.value || 70) / 100;
        const reverbMix = parseFloat(document.getElementById('reverb')?.value || 20) / 100;
        const delayTime = parseFloat(document.getElementById('delayTime')?.value || 0.3);
        const delayFeedback = 0.4; // Default value since there's no delayFeedback control in HTML
        const delayMix = parseFloat(document.getElementById('delay')?.value || 0) / 100;
        
        this.masterBus.setMasterVolume(masterVolume);
        this.masterBus.setReverbMix(reverbMix);
        this.masterBus.setDelayTime(delayTime);
        this.masterBus.setDelayFeedback(delayFeedback);
        this.masterBus.setDelayMix(delayMix);
    }

    initializeGenerators() {
        // Initialize all modular generators with pool manager
        this.generators.drone = new DroneGenerator(this.audioContext, this.poolManager);
        
        // Use advanced drums if pattern mode is not traditional
        const useAdvancedDrums = document.getElementById('drumPatternMode')?.value !== 'traditional';
        this.generators.drums = useAdvancedDrums ? 
            new AdvancedDrumsGenerator(this.audioContext, this.poolManager) :
            new DrumsGenerator(this.audioContext, this.poolManager);
            
        // Setup file input for drums if advanced
        if (this.generators.drums.setupFileInput) {
            this.generators.drums.setupFileInput();
        }
        this.generators.glitch = new GlitchGenerator(this.audioContext, this.poolManager);
        this.generators.bleeps = new SineBleepsGenerator(this.audioContext, this.poolManager);
        this.generators.burst = new DataBurstGenerator(this.audioContext, this.poolManager);
        this.generators.fm = new FMSynthGenerator(this.audioContext, this.poolManager);
        this.generators.noise = new NoiseGenerator(this.audioContext, this.poolManager);
        this.generators.acid = new AcidGenerator(this.audioContext, this.poolManager);
        this.generators.granular = new GranularGenerator(this.audioContext, this.poolManager);
        this.generators.spaceMelody = new SpaceMelodyGenerator(this.audioContext, this.poolManager);
        this.generators.ambientPad = new AmbientPadGenerator(this.audioContext, this.poolManager);
        this.generators.arpeggiator = new ArpeggiatorGenerator(this.audioContext, this.poolManager);
        this.generators.chord = new ChordGenerator(this.audioContext, this.poolManager);
        this.generators.vocal = new VocalSynthGenerator(this.audioContext, this.poolManager);
        this.generators.karplus = new KarplusStrongGenerator(this.audioContext, this.poolManager);
        this.generators.additive = new AdditiveSynthGenerator(this.audioContext, this.poolManager);
    }

    startGenerators() {
        // Start drone if enabled
        if (this.groupEnabled.drone) {
            const droneParams = {
                frequency: parseFloat(document.getElementById('droneFreq').value),
                detune: parseFloat(document.getElementById('droneDetune').value),
                voices: parseInt(document.getElementById('droneVoices').value),
                filterFreq: parseFloat(document.getElementById('droneFilter').value)
            };
            this.generators.drone.start(droneParams);
            const droneOutput = this.generators.drone.getOutputNode();
            if (droneOutput) {
                this.connectToMaster(droneOutput);
            }
        }
        
        // Start drums if enabled
        if (this.groupEnabled.drums) {
            const drumParams = {
                pattern: document.getElementById('drumPattern').value,
                tempo: parseInt(document.getElementById('drumTempo').value),
                density: parseFloat(document.getElementById('drumDensity').value) / 100,
                variation: parseFloat(document.getElementById('drumVariation').value) / 100,
                swing: parseFloat(document.getElementById('drumSwing').value) / 100,
                snareRush: parseFloat(document.getElementById('snareRush').value) / 100,
                ghostNotes: parseFloat(document.getElementById('ghostNotes').value) / 100,
                hihatSpeed: parseInt(document.getElementById('hihatSpeed').value),
                // Advanced pattern parameters
                patternMode: document.getElementById('drumPatternMode')?.value || 'traditional',
                euclideanSteps: parseInt(document.getElementById('euclideanSteps')?.value || 16),
                kickPulses: parseInt(document.getElementById('kickPulses')?.value || 4),
                snarePulses: parseInt(document.getElementById('snarePulses')?.value || 2),
                hihatPulses: parseInt(document.getElementById('hihatPulses')?.value || 8),
                probability: document.getElementById('drumProbability')?.checked,
                humanize: parseFloat(document.getElementById('drumHumanize')?.value || 20) / 100,
                useSamples: document.getElementById('useSampleKit')?.checked || false,
                samplePitch: parseFloat(document.getElementById('drumSamplePitch')?.value || 1),
                pitchVariation: parseFloat(document.getElementById('drumPitchVariation')?.value || 0)
            };
            
            this.generators.drums.start(drumParams, this.masterBus.getConnectionNodes());
        }
        
        // Start glitch if enabled
        if (this.groupEnabled.glitch) {
            const glitchParams = {
                intensity: parseFloat(document.getElementById('glitchIntensity').value) / 100,
                rate: parseFloat(document.getElementById('glitchRate').value),
                bitCrush: parseInt(document.getElementById('bitCrush').value)
            };
            this.generators.glitch.start(glitchParams);
            const glitchOutput = this.generators.glitch.getOutputNode();
            if (glitchOutput) {
                this.connectToMaster(glitchOutput);
            }
        }
        
        // Start sine bleeps if enabled
        if (this.groupEnabled.bleeps) {
            const bleepsParams = {
                density: parseFloat(document.getElementById('bleepDensity').value) / 100,
                range: parseFloat(document.getElementById('bleepRange').value),
                duration: parseFloat(document.getElementById('bleepDuration').value)
            };
            this.generators.bleeps.start(bleepsParams, (node) => this.connectToMaster(node), this.getEnvelopeForGroup('bleeps'));
        }
        
        // Start data burst if enabled
        if (this.groupEnabled.burst) {
            const burstParams = {
                activity: parseFloat(document.getElementById('burstActivity').value) / 100,
                complexity: parseInt(document.getElementById('burstComplexity').value),
                speed: parseFloat(document.getElementById('burstSpeed').value)
            };
            this.generators.burst.start(burstParams, (node) => this.connectToMaster(node));
        }
        
        // Start FM synthesis if enabled
        if (this.groupEnabled.fm) {
            const fmParams = {
                carrierFreq: parseFloat(document.getElementById('fmCarrier').value),
                modIndex: parseFloat(document.getElementById('fmIndex').value) / 100,
                ratio: parseFloat(document.getElementById('fmRatio').value),
                lfoSpeed: parseFloat(document.getElementById('fmLFO').value)
            };
            this.generators.fm.start(fmParams);
            const fmOutput = this.generators.fm.getOutputNode();
            if (fmOutput) {
                this.connectToMaster(fmOutput);
            }
        }
        
        // Start noise if enabled
        if (this.groupEnabled.noise) {
            const noiseParams = {
                type: document.getElementById('noiseType').value,
                level: parseFloat(document.getElementById('noiseLevel').value) / 100,
                filterFreq: parseFloat(document.getElementById('noiseFilter').value)
            };
            this.generators.noise.start(noiseParams);
            const noiseOutput = this.generators.noise.getOutputNode();
            if (noiseOutput) {
                this.connectToMaster(noiseOutput);
            }
        }
        
        // Start acid if enabled
        if (this.groupEnabled.acid) {
            const acidParams = {
                level: parseFloat(document.getElementById('acidLevel').value) / 100,
                baseFreq: parseFloat(document.getElementById('acidFreq').value),
                resonance: parseFloat(document.getElementById('acidResonance').value) / 100,
                decay: parseFloat(document.getElementById('acidDecay').value),
                speed: parseFloat(document.getElementById('acidSpeed').value),
                tempo: parseInt(document.getElementById('drumTempo').value)
            };
            this.generators.acid.start(acidParams, (node) => this.connectToMaster(node));
        }
        
        // Start granular if enabled
        if (this.groupEnabled.granular) {
            const granularParams = {
                density: parseFloat(document.getElementById('grainDensity').value) / 100,
                grainSize: parseFloat(document.getElementById('grainSize').value),
                pitchSpread: parseFloat(document.getElementById('grainPitch').value) / 100,
                panSpread: parseFloat(document.getElementById('grainPan').value) / 100
            };
            this.generators.granular.start(granularParams, this.masterBus.getConnectionNodes());
        }
        
        // Start space melody if enabled
        if (this.groupEnabled.spaceMelody) {
            const spaceMelodyParams = {
                density: parseFloat(document.getElementById('spaceMelodyDensity').value) / 100,
                range: parseInt(document.getElementById('spaceMelodyRange').value),
                speed: parseFloat(document.getElementById('spaceMelodySpeed').value),
                echo: parseFloat(document.getElementById('spaceMelodyEcho').value) / 100,
                portamento: parseFloat(document.getElementById('spaceMelodyPortamento').value)
            };
            this.generators.spaceMelody.start(spaceMelodyParams, this.masterBus.getConnectionNodes());
        }
        
        // Start ambient pad if enabled
        if (this.groupEnabled.ambientPad) {
            const ambientPadParams = {
                density: parseFloat(document.getElementById('padDensity').value) / 100,
                attack: parseFloat(document.getElementById('padAttack').value),
                release: parseFloat(document.getElementById('padRelease').value),
                filterSweep: parseFloat(document.getElementById('padFilterSweep').value) / 100,
                shimmer: parseFloat(document.getElementById('padShimmer').value) / 100
            };
            this.generators.ambientPad.start(ambientPadParams, this.masterBus.getConnectionNodes());
        }
        
        // Start arpeggiator if enabled
        if (this.groupEnabled.arpeggiator) {
            const arpeggiatorParams = {
                enable: parseFloat(document.getElementById('arpEnable').value) / 100,
                pattern: document.getElementById('arpPattern').value,
                speed: parseInt(document.getElementById('arpSpeed').value),
                octaves: parseInt(document.getElementById('arpOctaves').value),
                gate: parseFloat(document.getElementById('arpGate').value) / 100,
                tempo: parseInt(document.getElementById('drumTempo').value)
            };
            this.generators.arpeggiator.start(arpeggiatorParams, this.masterBus.getConnectionNodes());
        }
        
        // Start chord generator if enabled
        if (this.groupEnabled.chord) {
            const chordParams = {
                density: parseFloat(document.getElementById('chordDensity').value) / 100,
                progression: document.getElementById('chordProgression').value,
                voicing: document.getElementById('chordVoicing').value,
                brightness: parseFloat(document.getElementById('chordBrightness').value),
                spread: parseFloat(document.getElementById('chordSpread').value)
            };
            this.generators.chord.start(chordParams, (node) => this.connectToMaster(node));
        }
        
        // Start vocal synthesis if enabled
        if (this.groupEnabled.vocal) {
            const vocalParams = {
                density: parseFloat(document.getElementById('vocalDensity').value) / 100,
                vowel: document.getElementById('vocalVowel').value,
                pitch: parseFloat(document.getElementById('vocalPitch').value),
                vibrato: parseFloat(document.getElementById('vocalVibrato').value) / 100,
                whisper: parseFloat(document.getElementById('vocalWhisper').value) / 100
            };
            this.generators.vocal.start(vocalParams, (node) => this.connectToMaster(node));
        }
        
        // Start Karplus-Strong if enabled
        if (this.groupEnabled.karplus) {
            const karplusParams = {
                density: parseFloat(document.getElementById('karplusDensity').value) / 100,
                pitch: parseFloat(document.getElementById('karplusPitch').value),
                damping: parseFloat(document.getElementById('karplusDamping').value),
                brightness: parseFloat(document.getElementById('karplusBrightness').value),
                pluckHardness: parseFloat(document.getElementById('karplusPluck').value) / 100
            };
            this.generators.karplus.start(karplusParams, (node) => this.connectToMaster(node));
        }
        
        // Start Additive Synthesis if enabled
        if (this.groupEnabled.additive) {
            const additiveParams = {
                density: parseFloat(document.getElementById('additiveDensity').value) / 100,
                fundamental: parseFloat(document.getElementById('additiveFundamental').value),
                harmonics: parseInt(document.getElementById('additiveHarmonics').value),
                harmonicDecay: parseFloat(document.getElementById('additiveDecay').value),
                inharmonicity: parseFloat(document.getElementById('additiveInharmonicity').value),
                brightness: parseFloat(document.getElementById('additiveBrightness').value)
            };
            this.generators.additive.start(additiveParams, (node) => this.connectToMaster(node));
        }
    }

    connectToMaster(node) {
        if (node && this.masterBus) {
            const masterNodes = this.masterBus.getConnectionNodes();
            node.connect(masterNodes.dryGain);
            node.connect(masterNodes.convolver);
            node.connect(masterNodes.delay);
        }
    }

    updateGroupState(groupName, enabled) {
        // Update the state immediately
        this.groupEnabled[groupName] = enabled;
        
        // Only start/stop generators if we're playing
        if (!this.isPlaying) return;
        
        // Stop the generator
        if (this.generators[groupName] && this.generators[groupName].stop) {
            this.generators[groupName].stop();
        }
        
        // Restart if enabled
        if (enabled) {
            switch(groupName) {
                case 'drone':
                    const droneParams = {
                        frequency: parseFloat(document.getElementById('droneFreq').value),
                        detune: parseFloat(document.getElementById('droneDetune').value),
                        voices: parseInt(document.getElementById('droneVoices').value),
                        filterFreq: parseFloat(document.getElementById('droneFilter').value)
                    };
                    this.generators.drone.start(droneParams);
                    const droneOutput = this.generators.drone.getOutputNode();
                    if (droneOutput) {
                        this.connectToMaster(droneOutput);
                    }
                    break;
                case 'drums':
                    // Recreate drums generator if pattern mode changed
                    const patternMode = document.getElementById('drumPatternMode')?.value || 'traditional';
                    const needsAdvanced = patternMode !== 'traditional';
                    const isAdvanced = this.generators.drums instanceof AdvancedDrumsGenerator;
                    
                    if (needsAdvanced !== isAdvanced) {
                        this.generators.drums = needsAdvanced ? 
                            new AdvancedDrumsGenerator(this.audioContext, this.poolManager) :
                            new DrumsGenerator(this.audioContext, this.poolManager);
                            
                        // Setup file input for drums if advanced
                        if (this.generators.drums.setupFileInput) {
                            this.generators.drums.setupFileInput();
                        }
                    }
                    
                    const drumParams = {
                        pattern: document.getElementById('drumPattern').value,
                        tempo: parseInt(document.getElementById('drumTempo').value),
                        density: parseFloat(document.getElementById('drumDensity').value) / 100,
                        variation: parseFloat(document.getElementById('drumVariation').value) / 100,
                        swing: parseFloat(document.getElementById('drumSwing').value) / 100,
                        snareRush: parseFloat(document.getElementById('snareRush').value) / 100,
                        ghostNotes: parseFloat(document.getElementById('ghostNotes').value) / 100,
                        hihatSpeed: parseInt(document.getElementById('hihatSpeed').value),
                        // Advanced pattern parameters
                        patternMode: patternMode,
                        euclideanSteps: parseInt(document.getElementById('euclideanSteps')?.value || 16),
                        kickPulses: parseInt(document.getElementById('kickPulses')?.value || 4),
                        snarePulses: parseInt(document.getElementById('snarePulses')?.value || 2),
                        hihatPulses: parseInt(document.getElementById('hihatPulses')?.value || 8),
                        probability: document.getElementById('drumProbability')?.checked,
                        humanize: parseFloat(document.getElementById('drumHumanize')?.value || 20) / 100,
                        useSamples: document.getElementById('useSampleKit')?.checked || false,
                        samplePitch: parseFloat(document.getElementById('drumSamplePitch')?.value || 1),
                        pitchVariation: parseFloat(document.getElementById('drumPitchVariation')?.value || 0)
                    };
                    
                    this.generators.drums.start(drumParams, this.masterBus.getConnectionNodes());
                    break;
                case 'glitch':
                    const glitchParams = {
                        intensity: parseFloat(document.getElementById('glitchIntensity').value) / 100,
                        rate: parseFloat(document.getElementById('glitchRate').value),
                        bitCrush: parseInt(document.getElementById('bitCrush').value)
                    };
                    this.generators.glitch.start(glitchParams);
                    const glitchOutput = this.generators.glitch.getOutputNode();
                    if (glitchOutput) {
                        this.connectToMaster(glitchOutput);
                    }
                    break;
                case 'bleeps':
                    const bleepsParams = {
                        density: parseFloat(document.getElementById('bleepDensity').value) / 100,
                        range: parseFloat(document.getElementById('bleepRange').value),
                        duration: parseFloat(document.getElementById('bleepDuration').value)
                    };
                    this.generators.bleeps.start(bleepsParams, (node) => this.connectToMaster(node), this.getEnvelopeForGroup('bleeps'));
                    break;
                case 'burst':
                    const burstParams = {
                        activity: parseFloat(document.getElementById('burstActivity').value) / 100,
                        complexity: parseInt(document.getElementById('burstComplexity').value),
                        speed: parseFloat(document.getElementById('burstSpeed').value)
                    };
                    this.generators.burst.start(burstParams, (node) => this.connectToMaster(node));
                    break;
                case 'fm':
                    const fmParams = {
                        carrierFreq: parseFloat(document.getElementById('fmCarrier').value),
                        modIndex: parseFloat(document.getElementById('fmIndex').value) / 100,
                        ratio: parseFloat(document.getElementById('fmRatio').value),
                        lfoSpeed: parseFloat(document.getElementById('fmLFO').value)
                    };
                    this.generators.fm.start(fmParams);
                    const fmOutput = this.generators.fm.getOutputNode();
                    if (fmOutput) {
                        this.connectToMaster(fmOutput);
                    }
                    break;
                case 'noise':
                    const noiseParams = {
                        type: document.getElementById('noiseType').value,
                        level: parseFloat(document.getElementById('noiseLevel').value) / 100,
                        filterFreq: parseFloat(document.getElementById('noiseFilter').value)
                    };
                    this.generators.noise.start(noiseParams);
                    const noiseOutput = this.generators.noise.getOutputNode();
                    if (noiseOutput) {
                        this.connectToMaster(noiseOutput);
                    }
                    break;
                case 'acid':
                    const acidParams = {
                        level: parseFloat(document.getElementById('acidLevel').value) / 100,
                        baseFreq: parseFloat(document.getElementById('acidFreq').value),
                        resonance: parseFloat(document.getElementById('acidResonance').value) / 100,
                        decay: parseFloat(document.getElementById('acidDecay').value),
                        speed: parseFloat(document.getElementById('acidSpeed').value),
                        tempo: parseInt(document.getElementById('drumTempo').value)
                    };
                    this.generators.acid.start(acidParams, (node) => this.connectToMaster(node));
                    break;
                case 'granular':
                    const granularParams = {
                        density: parseFloat(document.getElementById('grainDensity').value) / 100,
                        grainSize: parseFloat(document.getElementById('grainSize').value),
                        pitchSpread: parseFloat(document.getElementById('grainPitch').value) / 100,
                        panSpread: parseFloat(document.getElementById('grainPan').value) / 100
                    };
                    this.generators.granular.start(granularParams, this.masterBus.getConnectionNodes());
                    break;
                case 'spaceMelody':
                    const spaceMelodyParams = {
                        density: parseFloat(document.getElementById('spaceMelodyDensity').value) / 100,
                        range: parseInt(document.getElementById('spaceMelodyRange').value),
                        speed: parseFloat(document.getElementById('spaceMelodySpeed').value),
                        echo: parseFloat(document.getElementById('spaceMelodyEcho').value) / 100,
                        portamento: parseFloat(document.getElementById('spaceMelodyPortamento').value)
                    };
                    this.generators.spaceMelody.start(spaceMelodyParams, this.masterBus.getConnectionNodes());
                    break;
                case 'ambientPad':
                    const ambientPadParams = {
                        density: parseFloat(document.getElementById('padDensity').value) / 100,
                        attack: parseFloat(document.getElementById('padAttack').value),
                        release: parseFloat(document.getElementById('padRelease').value),
                        filterSweep: parseFloat(document.getElementById('padFilterSweep').value) / 100,
                        shimmer: parseFloat(document.getElementById('padShimmer').value) / 100
                    };
                    this.generators.ambientPad.start(ambientPadParams, this.masterBus.getConnectionNodes());
                    break;
                case 'arpeggiator':
                    const arpeggiatorParams = {
                        enable: parseFloat(document.getElementById('arpEnable').value) / 100,
                        pattern: document.getElementById('arpPattern').value,
                        speed: parseInt(document.getElementById('arpSpeed').value),
                        octaves: parseInt(document.getElementById('arpOctaves').value),
                        gate: parseFloat(document.getElementById('arpGate').value) / 100,
                        tempo: parseInt(document.getElementById('drumTempo').value)
                    };
                    this.generators.arpeggiator.start(arpeggiatorParams, this.masterBus.getConnectionNodes());
                    break;
                case 'chord':
                    const chordParams = {
                        density: parseFloat(document.getElementById('chordDensity').value) / 100,
                        progression: document.getElementById('chordProgression').value,
                        voicing: document.getElementById('chordVoicing').value,
                        brightness: parseFloat(document.getElementById('chordBrightness').value),
                        spread: parseFloat(document.getElementById('chordSpread').value)
                    };
                    this.generators.chord.start(chordParams, (node) => this.connectToMaster(node));
                    break;
                case 'vocal':
                    const vocalParams = {
                        density: parseFloat(document.getElementById('vocalDensity').value) / 100,
                        vowel: document.getElementById('vocalVowel').value,
                        pitch: parseFloat(document.getElementById('vocalPitch').value),
                        vibrato: parseFloat(document.getElementById('vocalVibrato').value) / 100,
                        whisper: parseFloat(document.getElementById('vocalWhisper').value) / 100
                    };
                    this.generators.vocal.start(vocalParams, (node) => this.connectToMaster(node));
                    break;
                case 'karplus':
                    const karplusParams = {
                        density: parseFloat(document.getElementById('karplusDensity').value) / 100,
                        pitch: parseFloat(document.getElementById('karplusPitch').value),
                        damping: parseFloat(document.getElementById('karplusDamping').value),
                        brightness: parseFloat(document.getElementById('karplusBrightness').value),
                        pluckHardness: parseFloat(document.getElementById('karplusPluck').value) / 100
                    };
                    this.generators.karplus.start(karplusParams, (node) => this.connectToMaster(node));
                    break;
                case 'additive':
                    const additiveParams = {
                        density: parseFloat(document.getElementById('additiveDensity').value) / 100,
                        fundamental: parseFloat(document.getElementById('additiveFundamental').value),
                        harmonics: parseInt(document.getElementById('additiveHarmonics').value),
                        harmonicDecay: parseFloat(document.getElementById('additiveDecay').value),
                        inharmonicity: parseFloat(document.getElementById('additiveInharmonicity').value),
                        brightness: parseFloat(document.getElementById('additiveBrightness').value)
                    };
                    this.generators.additive.start(additiveParams, (node) => this.connectToMaster(node));
                    break;
            }
        }
    }

    updateParameter(paramId, value) {
        // Route parameter updates to appropriate generators
        if (paramId.startsWith('drone')) {
            if (this.generators.drone && this.generators.drone.updateParameter) {
                const param = paramId.replace('drone', '').toLowerCase();
                this.generators.drone.updateParameter(param, value);
            }
        } else if (paramId === 'bitCrush') {
            if (this.generators.glitch && this.generators.glitch.updateParameter) {
                this.generators.glitch.updateParameter('bitcrush', value);
            }
        } else if (paramId === 'glitchIntensity') {
            if (this.generators.glitch && this.generators.glitch.updateParameter) {
                this.generators.glitch.updateParameter('intensity', value);
            }
        } else if (paramId.startsWith('fm')) {
            if (this.generators.fm && this.generators.fm.updateParameter) {
                const param = paramId.replace('fm', '').toLowerCase();
                this.generators.fm.updateParameter(param, value);
            }
        } else if (paramId.startsWith('noise')) {
            if (this.generators.noise && this.generators.noise.updateParameter) {
                const param = paramId.replace('noise', '').toLowerCase();
                this.generators.noise.updateParameter(param, value);
            }
        } else if (paramId === 'spaceMelodyEcho') {
            if (this.generators.spaceMelody && this.generators.spaceMelody.updateParameter) {
                this.generators.spaceMelody.updateParameter('echo', value / 100);
            }
        }
        // Note: Most generators handle their parameters in the start method
        // Dynamic parameter updates can be added here as needed
    }

    disconnectAll() {
        if (this.masterBus) {
            this.masterBus.disconnect();
        }
    }

    startAnimations() {
        this.animatedParams.forEach((animation, param) => {
            this.animateParameter(param, animation);
        });
    }

    setParameterAnimation(paramId, mode) {
        if (mode === 'none') {
            const animation = this.animatedParams.get(paramId);
            if (animation && animation.interval) {
                clearInterval(animation.interval);
            }
            this.animatedParams.delete(paramId);
        } else {
            this.animatedParams.set(paramId, { mode, phase: 0 });
            if (this.isPlaying) {
                this.animateParameter(paramId, this.animatedParams.get(paramId));
            }
        }
    }

    animateParameter(paramId, animation) {
        const control = document.getElementById(paramId);
        if (!control) return;
        
        const min = parseFloat(control.min);
        const max = parseFloat(control.max);
        const range = max - min;
        
        if (animation.interval) {
            clearInterval(animation.interval);
        }
        
        animation.interval = setInterval(() => {
            let value;
            
            switch(animation.mode) {
                case 'lfo':
                    animation.phase += 0.02;
                    value = min + (Math.sin(animation.phase) * 0.5 + 0.5) * range;
                    break;
                case 'random':
                    if (Math.random() < 0.1) {
                        value = min + Math.random() * range;
                    } else {
                        return;
                    }
                    break;
                case 'drift':
                    const target = min + Math.random() * range;
                    const current = parseFloat(control.value);
                    value = current + (target - current) * 0.05;
                    break;
            }
            
            if (value !== undefined) {
                control.value = value;
                control.dispatchEvent(new Event('input'));
            }
        }, 50);
    }

    getGroupForParameter(paramId) {
        // Map parameter IDs to their groups
        if (paramId.startsWith('drone')) return 'drone';
        if (paramId.startsWith('glitch') || paramId === 'bitCrush') return 'glitch';
        if (paramId.startsWith('drum') || paramId.includes('snare') || paramId.includes('ghost') || paramId.includes('hihat')) return 'drums';
        if (paramId.startsWith('bleep')) return 'bleeps';
        if (paramId.startsWith('burst')) return 'burst';
        if (paramId.startsWith('fm')) return 'fm';
        if (paramId.startsWith('noise')) return 'noise';
        if (paramId.startsWith('acid')) return 'acid';
        if (paramId.startsWith('grain')) return 'granular';
        if (paramId.startsWith('spaceMelody')) return 'spaceMelody';
        if (paramId.startsWith('pad')) return 'ambientPad';
        if (paramId.startsWith('arp') && paramId !== 'arpEnable') return 'arpeggiator';
        if (paramId.startsWith('chord')) return 'chord';
        if (paramId.startsWith('vocal')) return 'vocal';
        if (paramId.startsWith('karplus')) return 'karplus';
        if (paramId.startsWith('additive')) return 'additive';
        if (paramId.startsWith('sample')) return 'sample';
        return null; // Master/effect parameters
    }
    
    randomize() {
        const params = [
            // Master (excluding volume)
            { id: 'reverb', min: 0, max: 100 },
            { id: 'delay', min: 0, max: 100 },
            { id: 'delayTime', min: 0.1, max: 1 },
            // Drone
            { id: 'droneFreq', min: 50, max: 500 },
            { id: 'droneDetune', min: 0, max: 50 },
            { id: 'droneVoices', min: 1, max: 8 },
            { id: 'droneFilter', min: 100, max: 5000 },
            { id: 'droneLFO', min: 0, max: 10 },
            // Glitch
            { id: 'glitchIntensity', min: 0, max: 30 },
            { id: 'glitchRate', min: 0.1, max: 10 },
            { id: 'bitCrush', min: 4, max: 16 },
            // Drums  
            { id: 'drumTempo', min: 80, max: 140 },
            { id: 'drumDensity', min: 20, max: 80 },
            { id: 'drumVariation', min: 0, max: 50 },
            { id: 'drumSwing', min: 0, max: 50 },
            { id: 'snareRush', min: 0, max: 30 },
            { id: 'ghostNotes', min: 0, max: 30 },
            { id: 'hihatSpeed', min: 1, max: 4 },
            // Bleeps
            { id: 'bleepDensity', min: 0, max: 20 },
            { id: 'bleepRange', min: 500, max: 5000 },
            { id: 'bleepDuration', min: 0.01, max: 0.2 },
            // Data Burst
            { id: 'burstActivity', min: 0, max: 30 },
            { id: 'burstComplexity', min: 1, max: 5 },
            { id: 'burstSpeed', min: 0.5, max: 5 },
            // FM
            { id: 'fmCarrier', min: 100, max: 500 },
            { id: 'fmIndex', min: 0, max: 30 },
            { id: 'fmRatio', min: 0.5, max: 5 },
            { id: 'fmLFO', min: 0, max: 10 },
            // Noise
            { id: 'noiseLevel', min: 0, max: 20 },
            { id: 'noiseFilter', min: 500, max: 5000 },
            // Acid
            { id: 'acidLevel', min: 0, max: 50 },
            { id: 'acidFreq', min: 80, max: 300 },
            { id: 'acidResonance', min: 20, max: 80 },
            { id: 'acidDecay', min: 0.2, max: 1 },
            { id: 'acidSpeed', min: 0.5, max: 2 },
            // Granular
            { id: 'grainDensity', min: 0, max: 30 },
            { id: 'grainSize', min: 20, max: 200 },
            { id: 'grainPitch', min: 0, max: 50 },
            { id: 'grainPan', min: 0, max: 50 },
            // Space Melody
            { id: 'spaceMelodyDensity', min: 0, max: 30 },
            { id: 'spaceMelodyRange', min: 1, max: 3 },
            { id: 'spaceMelodySpeed', min: 0.5, max: 2 },
            { id: 'spaceMelodyEcho', min: 0, max: 50 },
            { id: 'spaceMelodyPortamento', min: 0, max: 200 },
            // Ambient Pad
            { id: 'padDensity', min: 0, max: 30 },
            { id: 'padAttack', min: 1, max: 5 },
            { id: 'padRelease', min: 1, max: 5 },
            { id: 'padFilterSweep', min: 0, max: 50 },
            { id: 'padShimmer', min: 0, max: 50 },
            // Arpeggiator
            { id: 'arpEnable', min: 0, max: 30 },
            { id: 'arpSpeed', min: 2, max: 12 },
            { id: 'arpOctaves', min: 1, max: 3 },
            { id: 'arpGate', min: 30, max: 70 },
            // Chord
            { id: 'chordDensity', min: 0, max: 30 },
            { id: 'chordRoot', min: 140, max: 280 },
            { id: 'chordTempo', min: 40, max: 100 },
            { id: 'chordBrightness', min: 500, max: 3000 },
            { id: 'chordSpread', min: 0, max: 30 },
            // Vocal
            { id: 'vocalDensity', min: 0, max: 20 },
            { id: 'vocalPitch', min: 150, max: 300 },
            { id: 'vocalVibrato', min: 0, max: 50 },
            { id: 'vocalWhisper', min: 0, max: 50 },
            // Karplus-Strong
            { id: 'karplusDensity', min: 0, max: 25 },
            { id: 'karplusPitch', min: 150, max: 500 },
            { id: 'karplusDamping', min: 0.9, max: 0.99 },
            { id: 'karplusBrightness', min: 2000, max: 8000 },
            { id: 'karplusPluck', min: 20, max: 80 },
            // Advanced drum parameters
            { id: 'euclideanSteps', min: 8, max: 32 },
            { id: 'kickPulses', min: 1, max: 12 },
            { id: 'snarePulses', min: 1, max: 8 },
            { id: 'hihatPulses', min: 1, max: 16 },
            { id: 'drumHumanize', min: 0, max: 50 },
            // Additive Synthesis
            { id: 'additiveDensity', min: 0, max: 25 },
            { id: 'additiveFundamental', min: 100, max: 400 },
            { id: 'additiveHarmonics', min: 3, max: 12 },
            { id: 'additiveDecay', min: 1, max: 2 },
            { id: 'additiveInharmonicity', min: 0, max: 5 },
            { id: 'additiveBrightness', min: 1000, max: 5000 },
            // Sample Player
            { id: 'sampleDensity', min: 0, max: 30 },
            { id: 'samplePitch', min: 0.5, max: 2 },
            { id: 'sampleReverse', min: 0, max: 50 },
            { id: 'sampleChop', min: 0, max: 50 },
            { id: 'sampleScatter', min: 0, max: 50 },
            // Effects
            { id: 'compressorMix', min: 50, max: 100 },
            { id: 'compThreshold', min: 20, max: 60 },
            { id: 'compRatio', min: 30, max: 80 },
            { id: 'eqLow', min: -6, max: 6 },
            { id: 'eqMid', min: -6, max: 6 },
            { id: 'eqHigh', min: -6, max: 6 },
            { id: 'distortionMix', min: 0, max: 30 },
            { id: 'distDrive', min: 10, max: 70 },
            { id: 'chorusMix', min: 0, max: 40 },
            { id: 'chorusRate', min: 10, max: 50 },
            { id: 'sidechainAmount', min: 20, max: 80 }
        ];
        
        // Use weighted randomization for better musical results
        params.forEach(param => {
            const slider = document.getElementById(param.id);
            if (slider) {
                // Get the group for this parameter
                const groupName = this.getGroupForParameter(param.id);
                
                let value;
                // For disabled groups, ensure density/level params have reasonable defaults
                if (groupName && !this.groupEnabled[groupName]) {
                    if (param.id.includes('Density') || param.id.includes('Level') || 
                        param.id.includes('Activity') || param.id === 'arpEnable') {
                        // Set a reasonable default density for disabled groups
                        value = param.min + (param.max - param.min) * 0.3; // 30% of range
                    } else {
                        // Randomize other parameters normally
                        value = Math.random() * (param.max - param.min) + param.min;
                    }
                } else {
                    // For enabled groups, use weighted randomization
                    if (param.id === 'drumDensity') {
                        // Special case for drums - favor higher values for better audibility
                        value = param.min + Math.pow(Math.random(), 0.7) * (param.max - param.min);
                    } else if (param.id.includes('Density') || param.id.includes('Intensity') || 
                        param.id.includes('Level') || param.id.includes('Enable') || 
                        param.id.includes('Activity') || param.id.includes('Rush') || 
                        param.id.includes('Ghost')) {
                        // Use exponential distribution favoring lower values
                        value = param.min + (1 - Math.pow(Math.random(), 3)) * (param.max - param.min);
                    } else {
                        // Normal random distribution
                        value = Math.random() * (param.max - param.min) + param.min;
                    }
                }
                slider.value = value;
                slider.dispatchEvent(new Event('input'));
            }
        });
        
        // Randomly select drum pattern
        const drumPatterns = ['techno', 'breakbeat', 'jungle', 'idm', 'gabber', 'trap'];
        const drumPattern = document.getElementById('drumPattern');
        if (drumPattern) {
            drumPattern.value = drumPatterns[Math.floor(Math.random() * drumPatterns.length)];
            drumPattern.dispatchEvent(new Event('change'));
        }
        
        // Randomly select drum pattern mode
        const drumPatternModes = ['traditional', 'euclidean', 'markov', 'polyrhythm'];
        const drumPatternMode = document.getElementById('drumPatternMode');
        if (drumPatternMode) {
            drumPatternMode.value = drumPatternModes[Math.floor(Math.random() * drumPatternModes.length)];
            drumPatternMode.dispatchEvent(new Event('change'));
        }
        
        // Randomly set drum probability mode
        const drumProbability = document.getElementById('drumProbability');
        if (drumProbability) {
            drumProbability.checked = Math.random() > 0.3; // 70% chance of being on
            drumProbability.dispatchEvent(new Event('change'));
        }
        
        // Randomly set use sample kit (only if samples are loaded)
        const useSampleKit = document.getElementById('useSampleKit');
        const drumKitStatus = document.getElementById('drumKitStatus');
        if (useSampleKit && drumKitStatus && !drumKitStatus.textContent.includes('No samples')) {
            useSampleKit.checked = Math.random() > 0.5; // 50% chance if samples loaded
            useSampleKit.dispatchEvent(new Event('change'));
        }
        
        // Randomly select noise type
        const noiseTypes = ['white', 'pink', 'brown', 'crackle'];
        const noiseSelect = document.getElementById('noiseType');
        if (noiseSelect) {
            noiseSelect.value = noiseTypes[Math.floor(Math.random() * noiseTypes.length)];
            noiseSelect.dispatchEvent(new Event('change'));
        }
        
        // Randomly select arpeggiator pattern
        const arpPatterns = ['up', 'down', 'updown', 'random'];
        const arpPatternSelect = document.getElementById('arpPattern');
        if (arpPatternSelect) {
            arpPatternSelect.value = arpPatterns[Math.floor(Math.random() * arpPatterns.length)];
            arpPatternSelect.dispatchEvent(new Event('change'));
        }
        
        // Randomly select chord progression
        const chordProgressions = ['major', 'minor', 'jazz', 'suspended'];
        const chordProgSelect = document.getElementById('chordProgression');
        if (chordProgSelect) {
            chordProgSelect.value = chordProgressions[Math.floor(Math.random() * chordProgressions.length)];
            chordProgSelect.dispatchEvent(new Event('change'));
        }
        
        // Randomly select chord voicing
        const chordVoicings = ['close', 'open', 'drop2', 'spread'];
        const chordVoiceSelect = document.getElementById('chordVoicing');
        if (chordVoiceSelect) {
            chordVoiceSelect.value = chordVoicings[Math.floor(Math.random() * chordVoicings.length)];
            chordVoiceSelect.dispatchEvent(new Event('change'));
        }
        
        // Randomly select vowel
        const vowels = ['a', 'e', 'i', 'o', 'u', 'ah', 'oo'];
        const vowelSelect = document.getElementById('vocalVowel');
        if (vowelSelect) {
            vowelSelect.value = vowels[Math.floor(Math.random() * vowels.length)];
            vowelSelect.dispatchEvent(new Event('change'));
        }
        
        // Randomly select sample (get available samples from select options)
        const sampleSelect = document.getElementById('sampleSelect');
        if (sampleSelect && sampleSelect.options.length > 0) {
            const randomIndex = Math.floor(Math.random() * sampleSelect.options.length);
            sampleSelect.selectedIndex = randomIndex;
            sampleSelect.dispatchEvent(new Event('change'));
        }
        
        // Randomly activate some LFOs (20% chance for each to reduce CPU load)
        document.querySelectorAll('.lfo-button').forEach(button => {
            if (Math.random() < 0.2 && !button.classList.contains('active')) {
                button.click();
            } else if (Math.random() < 0.8 && button.classList.contains('active')) {
                button.click();
            }
        });
        
        // Randomly enable/disable groups respecting min/max limits
        const minGroups = parseInt(document.getElementById('minGroups')?.value || 3);
        const maxGroups = parseInt(document.getElementById('maxGroups')?.value || 8);
        const targetGroupCount = minGroups + Math.floor(Math.random() * (maxGroups - minGroups + 1));
        
        // Get all group toggles (excluding non-group controls)
        const groupToggles = Array.from(document.querySelectorAll('.group-enable')).filter(toggle => {
            return toggle.id !== 'arpEnable' && toggle.id !== 'sidechainEnable';
        });
        
        // Shuffle the groups array
        const shuffled = [...groupToggles].sort(() => Math.random() - 0.5);
        
        // Enable the first targetGroupCount groups, disable the rest
        shuffled.forEach((toggle, index) => {
            const shouldEnable = index < targetGroupCount;
            if (toggle.checked !== shouldEnable) {
                toggle.checked = shouldEnable;
                toggle.dispatchEvent(new Event('change'));
            }
        });
    }

    startMorph() {
        if (this.morphing) {
            // Cancel current morph
            this.morphing = false;
            return;
        }
        
        // Save current values
        this.morphStartValues = new Map();
        const allControls = [...document.querySelectorAll('input[type="range"]')].filter(input => 
            input.id !== 'masterVolume' // Exclude master volume from morphing
        );
        
        allControls.forEach(control => {
            this.morphStartValues.set(control.id, parseFloat(control.value));
        });
        
        // Generate random target values
        this.generateMorphTargets();
        
        // Get morph duration from slider
        this.morphDuration = parseFloat(document.getElementById('morphTime').value) * 1000;
        
        // Start morphing
        this.morphing = true;
        this.morphStartTime = Date.now();
        document.getElementById('morphButton').textContent = 'STOP MORPH';
        
        this.animateMorph();
    }
    
    generateMorphTargets() {
        this.morphTargets = new Map();
        
        const params = [
            // Master params (always enabled)
            { id: 'reverb', min: 0, max: 100, group: 'master' },
            { id: 'delay', min: 0, max: 100, group: 'master' },
            { id: 'delayTime', min: 0.1, max: 1, group: 'master' },
            // Drone
            { id: 'droneFreq', min: 50, max: 500, group: 'drone' },
            { id: 'droneDetune', min: 0, max: 50, group: 'drone' },
            { id: 'droneVoices', min: 1, max: 4, group: 'drone' },
            { id: 'droneFilter', min: 100, max: 5000, group: 'drone' },
            { id: 'droneLFO', min: 0, max: 10, group: 'drone' },
            // Glitch
            { id: 'glitchIntensity', min: 0, max: 30, group: 'glitch' },
            { id: 'glitchRate', min: 0.1, max: 10, group: 'glitch' },
            { id: 'bitCrush', min: 4, max: 16, group: 'glitch' },
            // Drums
            { id: 'drumTempo', min: 80, max: 140, group: 'drums' },
            { id: 'drumDensity', min: 20, max: 80, group: 'drums' },
            { id: 'drumVariation', min: 0, max: 50, group: 'drums' },
            { id: 'drumSwing', min: 0, max: 50, group: 'drums' },
            { id: 'snareRush', min: 0, max: 30, group: 'drums' },
            { id: 'ghostNotes', min: 0, max: 30, group: 'drums' },
            { id: 'hihatSpeed', min: 1, max: 4, group: 'drums' },
            // Bleeps
            { id: 'bleepDensity', min: 0, max: 20, group: 'bleeps' },
            { id: 'bleepRange', min: 500, max: 5000, group: 'bleeps' },
            { id: 'bleepDuration', min: 0.01, max: 0.2, group: 'bleeps' },
            // Burst
            { id: 'burstActivity', min: 0, max: 30, group: 'burst' },
            { id: 'burstComplexity', min: 1, max: 5, group: 'burst' },
            { id: 'burstSpeed', min: 0.5, max: 5, group: 'burst' },
            // FM
            { id: 'fmCarrier', min: 100, max: 500, group: 'fm' },
            { id: 'fmIndex', min: 0, max: 30, group: 'fm' },
            { id: 'fmRatio', min: 0.5, max: 5, group: 'fm' },
            { id: 'fmLFO', min: 0, max: 10, group: 'fm' },
            // Noise
            { id: 'noiseLevel', min: 0, max: 20, group: 'noise' },
            { id: 'noiseFilter', min: 500, max: 5000, group: 'noise' },
            // Acid
            { id: 'acidLevel', min: 0, max: 50, group: 'acid' },
            { id: 'acidFreq', min: 80, max: 300, group: 'acid' },
            { id: 'acidResonance', min: 20, max: 80, group: 'acid' },
            { id: 'acidDecay', min: 0.2, max: 1, group: 'acid' },
            { id: 'acidSpeed', min: 0.5, max: 2, group: 'acid' },
            // Granular
            { id: 'grainDensity', min: 0, max: 30, group: 'granular' },
            { id: 'grainSize', min: 20, max: 200, group: 'granular' },
            { id: 'grainPitch', min: 0, max: 50, group: 'granular' },
            { id: 'grainPan', min: 0, max: 50, group: 'granular' },
            // Space Melody
            { id: 'spaceMelodyDensity', min: 0, max: 30, group: 'spaceMelody' },
            { id: 'spaceMelodyRange', min: 1, max: 3, group: 'spaceMelody' },
            { id: 'spaceMelodySpeed', min: 0.5, max: 2, group: 'spaceMelody' },
            { id: 'spaceMelodyEcho', min: 0, max: 50, group: 'spaceMelody' },
            { id: 'spaceMelodyPortamento', min: 0, max: 200, group: 'spaceMelody' },
            // Ambient Pad
            { id: 'padDensity', min: 0, max: 30, group: 'ambientPad' },
            { id: 'padAttack', min: 1, max: 5, group: 'ambientPad' },
            { id: 'padRelease', min: 1, max: 5, group: 'ambientPad' },
            { id: 'padFilterSweep', min: 0, max: 50, group: 'ambientPad' },
            { id: 'padShimmer', min: 0, max: 50, group: 'ambientPad' },
            // Arpeggiator
            { id: 'arpEnable', min: 0, max: 30, group: 'arpeggiator' },
            { id: 'arpSpeed', min: 2, max: 12, group: 'arpeggiator' },
            { id: 'arpOctaves', min: 1, max: 3, group: 'arpeggiator' },
            { id: 'arpGate', min: 30, max: 70, group: 'arpeggiator' },
            // Chord
            { id: 'chordDensity', min: 0, max: 30, group: 'chord' },
            { id: 'chordRoot', min: 140, max: 280, group: 'chord' },
            { id: 'chordTempo', min: 40, max: 100, group: 'chord' },
            { id: 'chordBrightness', min: 500, max: 3000, group: 'chord' },
            { id: 'chordSpread', min: 0, max: 30, group: 'chord' },
            // Vocal
            { id: 'vocalDensity', min: 0, max: 20, group: 'vocal' },
            { id: 'vocalPitch', min: 150, max: 300, group: 'vocal' },
            { id: 'vocalVibrato', min: 0, max: 50, group: 'vocal' },
            { id: 'vocalWhisper', min: 0, max: 50, group: 'vocal' },
            // Karplus-Strong
            { id: 'karplusDensity', min: 0, max: 25, group: 'karplus' },
            { id: 'karplusPitch', min: 150, max: 500, group: 'karplus' },
            { id: 'karplusDamping', min: 0.9, max: 0.99, group: 'karplus' },
            { id: 'karplusBrightness', min: 2000, max: 8000, group: 'karplus' },
            { id: 'karplusPluck', min: 20, max: 80, group: 'karplus' },
            // Additive Synthesis
            { id: 'additiveDensity', min: 0, max: 25, group: 'additive' },
            { id: 'additiveFundamental', min: 100, max: 400, group: 'additive' },
            { id: 'additiveHarmonics', min: 3, max: 12, group: 'additive' },
            { id: 'additiveDecay', min: 1, max: 2, group: 'additive' },
            { id: 'additiveInharmonicity', min: 0, max: 5, group: 'additive' },
            { id: 'additiveBrightness', min: 1000, max: 5000, group: 'additive' },
            // Sample Player
            { id: 'sampleDensity', min: 0, max: 30, group: 'sample' },
            { id: 'samplePitch', min: 0.5, max: 2, group: 'sample' },
            { id: 'sampleReverse', min: 0, max: 50, group: 'sample' },
            { id: 'sampleChop', min: 0, max: 50, group: 'sample' },
            { id: 'sampleScatter', min: 0, max: 50, group: 'sample' }
        ];
        
        params.forEach(param => {
            // Skip if group is disabled (master is always enabled)
            if (param.group !== 'master' && !this.groupEnabled[param.group]) {
                return;
            }
            
            let value;
            // Use same biasing as randomize
            if (param.id === 'drumDensity') {
                // Special case for drums - favor higher values for better audibility
                value = param.min + Math.pow(Math.random(), 0.7) * (param.max - param.min);
            } else if (param.id.includes('Density') || param.id.includes('Intensity') || 
                param.id.includes('Level') || param.id.includes('Enable') || 
                param.id.includes('Activity') || param.id.includes('Rush') || 
                param.id.includes('Ghost')) {
                value = param.min + (1 - Math.pow(Math.random(), 3)) * (param.max - param.min);
            } else {
                value = Math.random() * (param.max - param.min) + param.min;
            }
            this.morphTargets.set(param.id, value);
        });
        
        // Random drum pattern (only if drums enabled)
        if (this.groupEnabled.drums) {
            const drumPatterns = ['techno', 'breakbeat', 'jungle', 'idm', 'gabber', 'trap'];
            this.morphTargets.set('drumPattern', drumPatterns[Math.floor(Math.random() * drumPatterns.length)]);
        }
        
        // Random noise type (only if noise enabled)
        if (this.groupEnabled.noise) {
            const noiseTypes = ['white', 'pink', 'brown', 'crackle'];
            this.morphTargets.set('noiseType', noiseTypes[Math.floor(Math.random() * noiseTypes.length)]);
        }
        
        // Random arpeggiator pattern (only if arpeggiator enabled)
        if (this.groupEnabled.arpeggiator) {
            const arpPatterns = ['up', 'down', 'updown', 'random'];
            this.morphTargets.set('arpPattern', arpPatterns[Math.floor(Math.random() * arpPatterns.length)]);
        }
        
        // Random chord settings (only if chord enabled)
        if (this.groupEnabled.chord) {
            const chordProgressions = ['major', 'minor', 'jazz', 'suspended'];
            this.morphTargets.set('chordProgression', chordProgressions[Math.floor(Math.random() * chordProgressions.length)]);
            const chordVoicings = ['close', 'open', 'drop2', 'spread'];
            this.morphTargets.set('chordVoicing', chordVoicings[Math.floor(Math.random() * chordVoicings.length)]);
        }
        
        // Random vocal vowel (only if vocal enabled)
        if (this.groupEnabled.vocal) {
            const vowels = ['a', 'e', 'i', 'o', 'u', 'ah', 'oo'];
            this.morphTargets.set('vocalVowel', vowels[Math.floor(Math.random() * vowels.length)]);
        }
        
        // Random advanced drum settings (only if drums enabled)
        if (this.groupEnabled.drums) {
            // Pattern mode
            const drumPatternModes = ['traditional', 'euclidean', 'markov', 'polyrhythm'];
            this.morphTargets.set('drumPatternMode', drumPatternModes[Math.floor(Math.random() * drumPatternModes.length)]);
            
            // Probability mode
            this.morphTargets.set('drumProbability', Math.random() > 0.3);
        }
        
        // Randomly enable/disable groups respecting min/max limits
        const minGroups = parseInt(document.getElementById('minGroups')?.value || 3);
        const maxGroups = parseInt(document.getElementById('maxGroups')?.value || 8);
        const targetGroupCount = minGroups + Math.floor(Math.random() * (maxGroups - minGroups + 1));
        
        // Get all group names and shuffle them
        const allGroups = Object.keys(this.groupEnabled);
        const shuffled = [...allGroups].sort(() => Math.random() - 0.5);
        
        // Enable the first targetGroupCount groups, disable the rest
        shuffled.forEach((group, index) => {
            const shouldEnable = index < targetGroupCount;
            this.morphTargets.set(group + 'Enable', shouldEnable);
        });
        
        // Randomly set modulation modes for parameters with modulation buttons
        const modulatableParams = [
            'reverb', 'delay',
            'droneFreq', 'droneFilter', 'droneDetune',
            'glitchIntensity', 'glitchRate', 'bitCrush', 
            'drumTempo', 'drumDensity', 'drumSwing',
            'bleepRange', 'bleepDuration',
            'burstActivity', 'burstSpeed',
            'fmCarrier', 'fmIndex', 'fmRatio',
            'noiseFilter', 'noiseLevel',
            'acidFreq', 'acidResonance',
            'grainDensity', 'grainSize', 'grainPitch',
            'spaceMelodyDensity', 'spaceMelodySpeed', 'spaceMelodyPortamento', 'spaceMelodyEcho',
            'padFilterSweep', 'padShimmer',
            'arpSpeed', 'arpGate',
            'chordDensity', 'chordRoot', 'chordTempo', 'chordBrightness', 'chordSpread',
            'vocalDensity', 'vocalPitch', 'vocalVibrato', 'vocalWhisper',
            'karplusDensity', 'karplusPitch', 'karplusDamping', 'karplusBrightness', 'karplusPluck'
        ];
        modulatableParams.forEach(param => {
            // 20% chance to activate modulation
            if (Math.random() < 0.2) {
                const modes = ['lfo', 'random', 'other'];
                const randomMode = modes[Math.floor(Math.random() * modes.length)];
                this.morphTargets.set(param + 'Mod', randomMode);
            } else {
                this.morphTargets.set(param + 'Mod', 'fixed');
            }
        });
    }
    
    animateMorph() {
        if (!this.morphing) {
            document.getElementById('morphButton').textContent = 'MORPH';
            return;
        }
        
        const elapsed = Date.now() - this.morphStartTime;
        const progress = Math.min(elapsed / this.morphDuration, 1);
        
        // Smooth easing function
        const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
        
        // Update all morphing parameters
        this.morphStartValues.forEach((startValue, paramId) => {
            const targetValue = this.morphTargets.get(paramId);
            if (targetValue !== undefined && typeof targetValue === 'number') {
                const slider = document.getElementById(paramId);
                if (slider) {
                    const currentValue = startValue + (targetValue - startValue) * easeProgress;
                    slider.value = currentValue;
                    slider.dispatchEvent(new Event('input'));
                }
            }
        });
        
        // Handle discrete changes at the end
        if (progress >= 1) {
            // Change drum pattern
            const drumPattern = document.getElementById('drumPattern');
            if (drumPattern && this.morphTargets.has('drumPattern')) {
                drumPattern.value = this.morphTargets.get('drumPattern');
                drumPattern.dispatchEvent(new Event('change'));
            }
            
            // Change noise type
            const noiseType = document.getElementById('noiseType');
            if (noiseType && this.morphTargets.has('noiseType')) {
                noiseType.value = this.morphTargets.get('noiseType');
                noiseType.dispatchEvent(new Event('change'));
            }
            
            // Change arpeggiator pattern
            const arpPattern = document.getElementById('arpPattern');
            if (arpPattern && this.morphTargets.has('arpPattern')) {
                arpPattern.value = this.morphTargets.get('arpPattern');
                arpPattern.dispatchEvent(new Event('change'));
            }
            
            // Change chord progression
            const chordProgression = document.getElementById('chordProgression');
            if (chordProgression && this.morphTargets.has('chordProgression')) {
                chordProgression.value = this.morphTargets.get('chordProgression');
                chordProgression.dispatchEvent(new Event('change'));
            }
            
            // Change chord voicing
            const chordVoicing = document.getElementById('chordVoicing');
            if (chordVoicing && this.morphTargets.has('chordVoicing')) {
                chordVoicing.value = this.morphTargets.get('chordVoicing');
                chordVoicing.dispatchEvent(new Event('change'));
            }
            
            // Change vocal vowel
            const vocalVowel = document.getElementById('vocalVowel');
            if (vocalVowel && this.morphTargets.has('vocalVowel')) {
                vocalVowel.value = this.morphTargets.get('vocalVowel');
                vocalVowel.dispatchEvent(new Event('change'));
            }
            
            // Change sample selection
            const sampleSelect = document.getElementById('sampleSelect');
            if (sampleSelect && this.morphTargets.has('sampleSelect')) {
                sampleSelect.value = this.morphTargets.get('sampleSelect');
                sampleSelect.dispatchEvent(new Event('change'));
            }
            
            // Change drum pattern mode
            const drumPatternMode = document.getElementById('drumPatternMode');
            if (drumPatternMode && this.morphTargets.has('drumPatternMode')) {
                drumPatternMode.value = this.morphTargets.get('drumPatternMode');
                drumPatternMode.dispatchEvent(new Event('change'));
            }
            
            // Change drum probability mode
            const drumProbability = document.getElementById('drumProbability');
            if (drumProbability && this.morphTargets.has('drumProbability')) {
                drumProbability.checked = this.morphTargets.get('drumProbability');
                drumProbability.dispatchEvent(new Event('change'));
            }
            
            // Apply group enable/disable states
            Object.keys(this.groupEnabled).forEach(group => {
                const enableKey = group + 'Enable';
                if (this.morphTargets.has(enableKey)) {
                    const toggle = document.getElementById(enableKey);
                    if (toggle) {
                        const shouldEnable = this.morphTargets.get(enableKey);
                        if (toggle.checked !== shouldEnable) {
                            toggle.checked = shouldEnable;
                            toggle.dispatchEvent(new Event('change'));
                        }
                    }
                }
            });
            
            // Apply modulation modes
            const modulatableParams = [
                'reverb', 'delay',
                'droneFreq', 'droneFilter', 'droneDetune',
                'glitchIntensity', 'glitchRate', 'bitCrush', 
                'drumTempo', 'drumDensity', 'drumSwing',
                'bleepRange', 'bleepDuration',
                'burstActivity', 'burstSpeed',
                'fmCarrier', 'fmIndex', 'fmRatio',
                'noiseFilter', 'noiseLevel',
                'acidFreq', 'acidResonance',
                'grainDensity', 'grainSize', 'grainPitch',
                'spaceMelodyDensity', 'spaceMelodySpeed', 'spaceMelodyPortamento', 'spaceMelodyEcho',
                'padFilterSweep', 'padShimmer',
                'arpSpeed', 'arpGate'
            ];
            modulatableParams.forEach(param => {
                const modKey = param + 'Mod';
                if (this.morphTargets.has(modKey)) {
                    const targetMode = this.morphTargets.get(modKey);
                    const button = document.querySelector(`.lfo-button[data-param="${param}"]`);
                    if (button) {
                        const currentMode = this.modulationModes.get(param) || 'fixed';
                        // Click button until we reach target mode
                        if (currentMode !== targetMode) {
                            const modes = ['fixed', 'lfo', 'random', 'other'];
                            const currentIndex = modes.indexOf(currentMode);
                            const targetIndex = modes.indexOf(targetMode);
                            let clicks = (targetIndex - currentIndex + 4) % 4;
                            for (let i = 0; i < clicks; i++) {
                                button.click();
                            }
                        }
                    }
                }
            });
            
            this.morphing = false;
            document.getElementById('morphButton').textContent = 'MORPH';
        } else {
            requestAnimationFrame(() => this.animateMorph());
        }
    }
    
    toggleLFO(paramId, button) {
        // Get current mode (default to 'fixed' if not set)
        let currentMode = this.modulationModes.get(paramId) || 'fixed';
        
        // Clean up current mode
        this.cleanupModulation(paramId);
        
        // Cycle to next mode
        const modes = ['fixed', 'lfo', 'random', 'other'];
        const currentIndex = modes.indexOf(currentMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        
        // Set new mode
        this.modulationModes.set(paramId, nextMode);
        
        // Update button appearance and start modulation
        switch(nextMode) {
            case 'fixed':
                button.textContent = 'MOD';
                button.classList.remove('active', 'random', 'other');
                break;
                
            case 'lfo':
                button.textContent = 'LFO';
                button.classList.add('active');
                button.classList.remove('random', 'other');
                this.startLFO(paramId);
                break;
                
            case 'random':
                button.textContent = 'RND';
                button.classList.add('active', 'random');
                button.classList.remove('other');
                this.startRandomJumps(paramId);
                break;
                
            case 'other':
                button.textContent = 'OTH';
                button.classList.add('active', 'other');
                button.classList.remove('random');
                this.startOtherModulation(paramId);
                break;
        }
    }
    
    cleanupModulation(paramId) {
        // Stop LFO animation
        if (this.animatedParams.has(paramId)) {
            const animation = this.animatedParams.get(paramId);
            if (animation.frameId) {
                cancelAnimationFrame(animation.frameId);
            }
            this.animatedParams.delete(paramId);
        }
        
        // Stop random jumps
        if (this.randomIntervals.has(paramId)) {
            clearInterval(this.randomIntervals.get(paramId));
            this.randomIntervals.delete(paramId);
        }
        
        // Remove slider animation class
        const slider = document.getElementById(paramId);
        if (slider) {
            slider.classList.remove('animated', 'random-jump', 'other-mod');
        }
    }
    
    startLFO(paramId) {
        const slider = document.getElementById(paramId);
        if (slider) {
            slider.classList.add('animated');
            // Get LFO speed from drone LFO control (or use default)
            const lfoSpeed = parseFloat(document.getElementById('droneLFO')?.value) || 0.5;
            const animation = {
                min: parseFloat(slider.min),
                max: parseFloat(slider.max),
                speed: lfoSpeed,
                phase: 0
            };
            this.animatedParams.set(paramId, animation);
            this.animateLFOParameter(paramId, animation);
        }
    }
    
    startRandomJumps(paramId) {
        const slider = document.getElementById(paramId);
        if (slider) {
            slider.classList.add('random-jump');
            const jumpInterval = setInterval(() => {
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                const value = Math.random() * (max - min) + min;
                slider.value = value;
                slider.dispatchEvent(new Event('input'));
            }, 500 + Math.random() * 1500); // Random interval between 0.5-2 seconds
            
            this.randomIntervals.set(paramId, jumpInterval);
        }
    }
    
    startOtherModulation(paramId) {
        const slider = document.getElementById(paramId);
        if (slider) {
            slider.classList.add('other-mod');
            // Implement a stepped/quantized modulation
            const steps = 8;
            let currentStep = 0;
            const stepInterval = setInterval(() => {
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                const stepSize = (max - min) / steps;
                const value = min + (currentStep * stepSize);
                slider.value = value;
                slider.dispatchEvent(new Event('input'));
                currentStep = (currentStep + 1) % steps;
            }, 400);
            
            this.randomIntervals.set(paramId, stepInterval);
        }
    }
    
    animateLFOParameter(paramId, animation) {
        if (!this.animatedParams.has(paramId)) return;
        
        const slider = document.getElementById(paramId);
        if (!slider) return;
        
        animation.phase += animation.speed * 0.01;
        const value = animation.min + (Math.sin(animation.phase) + 1) / 2 * (animation.max - animation.min);
        
        slider.value = value;
        slider.dispatchEvent(new Event('input'));
        
        animation.frameId = requestAnimationFrame(() => this.animateLFOParameter(paramId, animation));
    }

    captureCurrentState() {
        const state = {};
        document.querySelectorAll('input[type="range"], select').forEach(control => {
            if (control.id) {
                state[control.id] = parseFloat(control.value) || 0;
            }
        });
        return state;
    }

    async toggleRecording() {
        const button = document.getElementById('recordButton');
        
        if (!this.isRecording) {
            // Start recording
            const stream = this.audioContext.createMediaStreamDestination();
            if (this.masterBus) {
                this.masterBus.nodes.output.connect(stream);
            }
            
            // Try to use MediaRecorder with different codecs
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4'
            ];
            
            let selectedMimeType = 'audio/webm';
            for (const mimeType of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedMimeType = mimeType;
                    break;
                }
            }
            
            this.mediaRecorder = new MediaRecorder(stream.stream, { mimeType: selectedMimeType });
            this.recordedChunks = [];
            this.recordingMimeType = selectedMimeType;
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.showExportDialog();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            button.classList.add('recording');
            button.textContent = 'STOP REC';
        } else {
            // Stop recording
            this.mediaRecorder.stop();
            this.isRecording = false;
            button.classList.remove('recording');
            button.textContent = 'RECORD';
        }
    }
    
    showExportDialog() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1000';
        
        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#000';
        dialog.style.border = '1px solid #fff';
        dialog.style.padding = '2rem';
        dialog.style.textAlign = 'center';
        
        const title = document.createElement('h3');
        title.textContent = 'Export Recording';
        title.style.color = '#fff';
        title.style.marginBottom = '1.5rem';
        title.style.textTransform = 'uppercase';
        title.style.letterSpacing = '0.1em';
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '1rem';
        buttonsContainer.style.justifyContent = 'center';
        buttonsContainer.style.flexWrap = 'wrap';
        
        // Create export buttons for different formats
        const formats = [
            { label: 'WAV', format: 'wav', type: 'audio/wav' },
            { label: 'WebM', format: 'webm', type: this.recordingMimeType },
            { label: 'MP3*', format: 'mp3', type: 'audio/mpeg', note: 'Requires conversion' }
        ];
        
        formats.forEach(({ label, format, type, note }) => {
            const button = document.createElement('button');
            button.className = 'control-button secondary';
            button.textContent = label;
            button.style.minWidth = '100px';
            
            button.addEventListener('click', () => {
                if (format === 'wav') {
                    this.exportAsWAV();
                } else {
                    this.exportAsFormat(format, type);
                }
                overlay.remove();
            });
            
            if (note) {
                button.title = note;
            }
            
            buttonsContainer.appendChild(button);
        });
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.className = 'control-button secondary';
        cancelButton.textContent = 'CANCEL';
        cancelButton.style.marginTop = '1rem';
        cancelButton.addEventListener('click', () => {
            overlay.remove();
        });
        
        dialog.appendChild(title);
        dialog.appendChild(buttonsContainer);
        dialog.appendChild(cancelButton);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }
    
    exportAsFormat(format, mimeType) {
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audiogen_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    async exportAsWAV() {
        // Convert recorded chunks to WAV format
        const blob = new Blob(this.recordedChunks, { type: this.recordingMimeType });
        
        try {
            // Decode the audio data
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Convert to WAV
            const wavBlob = this.audioBufferToWav(audioBuffer);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audiogen_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error converting to WAV:', error);
            // Fallback to WebM export
            this.exportAsFormat('webm', this.recordingMimeType);
        }
    }
    
    audioBufferToWav(buffer) {
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numberOfChannels * bytesPerSample;
        
        const data = [];
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            data.push(buffer.getChannelData(i));
        }
        
        const length = data[0].length;
        const arrayBuffer = new ArrayBuffer(44 + length * blockAlign);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * blockAlign, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, format, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, length * blockAlign, true);
        
        // Convert float samples to PCM
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, data[channel][i]));
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, value, true);
                offset += 2;
            }
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    startPerformanceMonitoring() {
        this.performanceMonitor = setInterval(() => {
            // Simple performance estimation based on voice count
            const load = this.activeVoices / this.maxVoices;
            
            if (load > 0.8) {
                this.performanceThrottle = 0.5;
            } else if (load > 0.6) {
                this.performanceThrottle = 0.7;
            } else {
                this.performanceThrottle = 1;
            }
            
            // Update generators with performance throttle
            if (this.generators.drums) {
                this.generators.drums.setPerformanceThrottle(this.performanceThrottle);
            }
            if (this.generators.granular) {
                this.generators.granular.setPerformanceThrottle(this.performanceThrottle);
            }
            
            // Update master bus reverb
            if (this.masterBus) {
                this.masterBus.updatePerformance(this.performanceThrottle);
            }
            
            // Log pool statistics in development
            if (this.poolManager && window.location.hostname === 'localhost') {
                const stats = this.poolManager.getAllStats();
                console.log('Voice Pool Performance:', {
                    oscillator: `${stats.oscillator.active} active, ${stats.oscillator.available} pooled (${stats.oscillator.poolEfficiency} reuse)`,
                    gain: `${stats.gain.active} active, ${stats.gain.available} pooled (${stats.gain.poolEfficiency} reuse)`,
                    buffer: `${stats.bufferSource.active} active, ${stats.bufferSource.available} pooled (${stats.bufferSource.poolEfficiency} reuse)`
                });
            }
        }, 1000);
        
        // Update activity indicators
        this.activityMonitor = setInterval(() => {
            this.updateActivityIndicators();
        }, 100);
    }
    
    updateActivityIndicators() {
        // Update indicators based on generator state and density
        Object.keys(this.groupEnabled).forEach(group => {
            const indicator = document.getElementById(group + 'Activity');
            const section = indicator?.closest('.section');
            
            if (indicator) {
                const isEnabled = this.groupEnabled[group];
                const generator = this.generators[group];
                
                // Check if generator is playing and has non-zero density/level
                let isActive = false;
                if (isEnabled && generator && generator.isPlaying) {
                    // Check density/level parameters
                    const densityParam = document.getElementById(group + 'Density') || 
                                       document.getElementById(group + 'Level') ||
                                       document.getElementById(group + 'Activity') ||
                                       (group === 'arpeggiator' ? document.getElementById('arpEnable') : null);
                    
                    if (densityParam) {
                        const value = parseFloat(densityParam.value);
                        isActive = value > 0;
                    } else if (group === 'drone') {
                        // Drone is always active when playing
                        isActive = true;
                    }
                }
                
                if (isActive) {
                    indicator.classList.add('active');
                    section?.classList.add('active');
                } else {
                    indicator.classList.remove('active');
                    section?.classList.remove('active');
                }
            }
        });
    }
    
    toggleAutoMode() {
        if (this.autoModeInterval) {
            // Stop auto mode
            clearInterval(this.autoModeInterval);
            this.autoModeInterval = null;
            const autoButton = document.getElementById('autoButton');
            if (autoButton) {
                autoButton.classList.remove('active');
                autoButton.textContent = 'AUTO';
            }
        } else {
            // Start auto mode
            const autoButton = document.getElementById('autoButton');
            if (autoButton) {
                autoButton.classList.add('active');
                autoButton.textContent = 'AUTO ON';
            }
            
            // Get auto change duration
            const autoChangeTime = parseFloat(document.getElementById('autoChangeTime')?.value || 30) * 1000;
            
            // Start with a randomize to get fresh settings
            this.randomize();
            
            // Set up interval to randomize at specified intervals
            this.autoModeInterval = setInterval(() => {
                this.randomize();
            }, autoChangeTime);
        }
    }
    
    updateAutoModeInterval() {
        if (this.autoModeInterval) {
            // Restart auto mode with new interval
            clearInterval(this.autoModeInterval);
            const autoChangeTime = parseFloat(document.getElementById('autoChangeTime')?.value || 30) * 1000;
            this.autoModeInterval = setInterval(() => {
                this.randomize();
            }, autoChangeTime);
        }
    }
    
    toggleLiteMode() {
        if (this.liteMode) {
            // Disable lite mode - restore effects
            this.liteMode = false;
            const liteButton = document.getElementById('liteButton');
            if (liteButton) {
                liteButton.classList.remove('active');
                liteButton.textContent = 'LITE MODE';
            }
            
            // Re-enable all effects
            if (this.masterBus) {
                // Restore effect mixes to their slider values
                const compressorMix = parseFloat(document.getElementById('compressorMix')?.value || 100);
                const distortionMix = parseFloat(document.getElementById('distortionMix')?.value || 0);
                const chorusMix = parseFloat(document.getElementById('chorusMix')?.value || 0);
                const reverbMix = parseFloat(document.getElementById('reverb')?.value || 20) / 100;
                const delayMix = parseFloat(document.getElementById('delay')?.value || 0) / 100;
                
                this.masterBus.compressor.setMix(compressorMix);
                this.masterBus.setDistortionMix(distortionMix);
                this.masterBus.setChorusMix(chorusMix);
                this.masterBus.setReverbMix(reverbMix);
                this.masterBus.setDelayMix(delayMix);
            }
            
            // Restore voice pool sizes
            if (this.poolManager) {
                this.poolManager.setMaxPoolSize('oscillator', 200);
                this.poolManager.setMaxPoolSize('gain', 200);
                this.poolManager.setMaxPoolSize('bufferSource', 100);
            }
            
            // Restore max voices
            this.maxVoices = 100;
        } else {
            // Enable lite mode - disable heavy effects
            this.liteMode = true;
            const liteButton = document.getElementById('liteButton');
            if (liteButton) {
                liteButton.classList.add('active');
                liteButton.textContent = 'LITE ON';
            }
            
            // Disable CPU-intensive effects
            if (this.masterBus) {
                // Keep compressor but disable other effects
                this.masterBus.setDistortionMix(0);
                this.masterBus.setChorusMix(0);
                this.masterBus.setReverbMix(0);
                this.masterBus.setDelayMix(0);
            }
            
            // Reduce voice pool sizes
            if (this.poolManager) {
                this.poolManager.setMaxPoolSize('oscillator', 50);
                this.poolManager.setMaxPoolSize('gain', 50);
                this.poolManager.setMaxPoolSize('bufferSource', 25);
            }
            
            // Reduce max voices
            this.maxVoices = 50;
        }
    }
    
    showKeyboardHelp() {
        const helpText = `
Keyboard Shortcuts:
    
Space    - Play/Stop
R        - Randomize
M        - Morph
A        - Toggle Auto Mode
L        - Toggle Lite Mode
Esc      - Stop
? or H   - Show this help
        
Press any key to close this help.`;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1000';
        
        const helpBox = document.createElement('pre');
        helpBox.style.color = '#fff';
        helpBox.style.backgroundColor = '#000';
        helpBox.style.border = '1px solid #fff';
        helpBox.style.padding = '2rem';
        helpBox.style.fontFamily = 'Monaco, Courier New, monospace';
        helpBox.style.fontSize = '14px';
        helpBox.textContent = helpText;
        
        overlay.appendChild(helpBox);
        document.body.appendChild(overlay);
        
        // Close on any key press
        const closeHelp = (e) => {
            e.preventDefault();
            overlay.remove();
            document.removeEventListener('keydown', closeHelp);
        };
        
        setTimeout(() => {
            document.addEventListener('keydown', closeHelp);
        }, 100);
    }
    
    shareSettings() {
        // Collect all current settings
        const settings = {
            // Groups enabled state
            groups: {},
            // Parameters
            params: {},
            // Selects
            selects: {}
        };
        
        // Get group states
        Object.keys(this.groupEnabled).forEach(group => {
            settings.groups[group] = this.groupEnabled[group];
        });
        
        // Get all range inputs
        document.querySelectorAll('input[type="range"]').forEach(input => {
            if (input.id) {
                settings.params[input.id] = parseFloat(input.value);
            }
        });
        
        // Get all selects
        document.querySelectorAll('select').forEach(select => {
            if (select.id) {
                settings.selects[select.id] = select.value;
            }
        });
        
        // Get checkboxes (non-group enables)
        settings.checkboxes = {};
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.id && !checkbox.classList.contains('group-enable')) {
                settings.checkboxes[checkbox.id] = checkbox.checked;
            }
        });
        
        // Encode settings as base64
        const settingsJSON = JSON.stringify(settings);
        const encoded = btoa(settingsJSON);
        
        // Create shareable URL
        const url = new URL(window.location.href);
        url.searchParams.set('preset', encoded);
        
        // Copy to clipboard
        navigator.clipboard.writeText(url.toString()).then(() => {
            // Show confirmation
            const shareButton = document.getElementById('shareButton');
            if (shareButton) {
                const originalText = shareButton.textContent;
                shareButton.textContent = 'COPIED!';
                setTimeout(() => {
                    shareButton.textContent = originalText;
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy URL:', err);
            // Fallback: show URL in prompt
            prompt('Copy this URL to share your settings:', url.toString());
        });
    }
    
    loadSettingsFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const preset = urlParams.get('preset');
        
        if (preset) {
            try {
                // Decode settings
                const settingsJSON = atob(preset);
                const settings = JSON.parse(settingsJSON);
                
                // Apply group states
                if (settings.groups) {
                    Object.entries(settings.groups).forEach(([group, enabled]) => {
                        if (this.groupEnabled.hasOwnProperty(group)) {
                            this.groupEnabled[group] = enabled;
                            const toggle = document.getElementById(group + 'Enable');
                            if (toggle) {
                                toggle.checked = enabled;
                            }
                        }
                    });
                }
                
                // Apply parameters
                if (settings.params) {
                    Object.entries(settings.params).forEach(([id, value]) => {
                        const input = document.getElementById(id);
                        if (input) {
                            input.value = value;
                            input.dispatchEvent(new Event('input'));
                        }
                    });
                }
                
                // Apply selects
                if (settings.selects) {
                    Object.entries(settings.selects).forEach(([id, value]) => {
                        const select = document.getElementById(id);
                        if (select) {
                            select.value = value;
                            select.dispatchEvent(new Event('change'));
                        }
                    });
                }
                
                // Apply checkboxes
                if (settings.checkboxes) {
                    Object.entries(settings.checkboxes).forEach(([id, checked]) => {
                        const checkbox = document.getElementById(id);
                        if (checkbox) {
                            checkbox.checked = checked;
                            checkbox.dispatchEvent(new Event('change'));
                        }
                    });
                }
                
                console.log('Settings loaded from URL');
            } catch (err) {
                console.error('Failed to load settings from URL:', err);
            }
        }
    }
    
    getEnvelopeForGroup(groupName) {
        if (this.adsrMode === 'disabled') {
            return null;
        }
        
        if (this.adsrMode === 'perGroup') {
            // Create per-group envelope if it doesn't exist
            if (!this.groupEnvelopes.has(groupName)) {
                const envelope = new ADSREnvelope(this.audioContext);
                // Copy global envelope settings as default
                if (this.globalEnvelope) {
                    envelope.setParameters(this.globalEnvelope.getParameters());
                }
                this.groupEnvelopes.set(groupName, envelope);
            }
            return this.groupEnvelopes.get(groupName);
        }
        
        // Default to global envelope
        return this.globalEnvelope;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.soundscape = new GenerativeSoundscape();
    });
} else {
    // DOM is already loaded
    window.soundscape = new GenerativeSoundscape();
}