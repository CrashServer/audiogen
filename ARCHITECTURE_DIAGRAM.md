# Audiogen System Architecture Diagram

```
                                    AUDIOGEN SYSTEM ARCHITECTURE
                                    ==============================

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           USER INTERFACE LAYER                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Main Controls │    │   Parameter      │    │   Preset System │    │     Visual Controls             │ │
│  │   ─────────────  │    │   Controls       │    │   ──────────────│    │     ──────────────              │ │
│  │  • PLAY/STOP    │    │  • 200+ Sliders  │    │  • Save/Load    │    │  • Visual Mode Toggle          │ │
│  │  • RANDOMIZE    │    │  • Selectors     │    │  • Export/Import│    │  • Grid Configuration          │ │
│  │  • AUTO MODE    │    │  • Checkboxes    │    │  • Default Sets │    │  • Palette Selection           │ │
│  │  • MORPH        │    │  • LFO Buttons   │    │  • Local Storage│    │  • Keyboard Shortcuts          │ │
│  │  • RECORD       │    │  • Real-time     │    │                 │    │                                 │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────────────────────┘ │
│           │                       │                       │                              │                 │
└───────────┼───────────────────────┼───────────────────────┼──────────────────────────────┼─────────────────┘
            │                       │                       │                              │
            ▼                       ▼                       ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CONTROL & STATE MANAGEMENT LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│                          ┌─────────────────────────────────────────────────────────────┐                  │
│                          │              GenerativeSoundscape (app.js)                  │                  │
│                          │              ═══════════════════════════════════             │                  │
│                          │  • Main Application Controller                              │                  │
│                          │  • Event Handling & Parameter Routing                      │                  │
│                          │  • Group State Management (19 generators)                  │                  │
│                          │  • Master Timing & Tempo Sync                              │                  │
│                          │  • Audio Context Management                                │                  │
│                          │  • Automation & Recording Control                          │                  │
│                          │  • Preset Save/Load Logic                                  │                  │
│                          └─────────────────────────────────────────────────────────────┘                  │
│                                                     │                                                       │
│    ┌─────────────────────┬──────────────────────────┼──────────────────────────┬─────────────────────┐    │
│    │                     │                          │                          │                     │    │
│    ▼                     ▼                          ▼                          ▼                     ▼    │
│ ┌──────────────┐ ┌─────────────────┐ ┌─────────────────────────┐ ┌────────────────┐ ┌─────────────────┐  │
│ │LFO Controller│ │ Automation      │ │    Parameter            │ │  Preset        │ │   Performance   │  │
│ │──────────────│ │ Recorder        │ │    State Manager        │ │  Manager       │ │   Monitor       │  │
│ │• Per-Param   │ │ ──────────────  │ │    ─────────────────    │ │  ─────────     │ │   ──────────    │  │
│ │  LFOs (Map)  │ │• Parameter      │ │ • parameterStates Map   │ │• Local Storage │ │• Voice Count    │  │
│ │• Phase Sync  │ │  Recording      │ │ • groupEnabled States   │ │• JSON Export   │ │• CPU Usage      │  │
│ │• Visual Feed │ │• Playback       │ │ • Real-time Updates     │ │• Default Sets  │ │• Auto Throttle  │  │
│ │• Modulation  │ │• Loop Control   │ │ • Change Velocity Track │ │• Configuration │ │• Memory Cleanup │  │
│ └──────────────┘ └─────────────────┘ └─────────────────────────┘ └────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     │
                    ┌────────────────────────────────┼────────────────────────────────┐
                    │                                │                                │
                    ▼                                ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         AUDIO ENGINE LAYER                                               │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              SOUND GENERATORS (19 Modules)                                           │ │
│  │  ═══════════════════════════════════════════════════════════                                         │ │
│  │                                                                                                       │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │ │
│  │  │   Continuous │ │   Rhythmic   │ │   Melodic    │ │  Advanced    │ │ Experimental │              │ │
│  │  │  ──────────  │ │  ─────────   │ │  ────────    │ │  ────────    │ │  ──────────  │              │ │
│  │  │• Drone       │ │• Drums       │ │• FM Synth    │ │• Granular    │ │• Biological  │              │ │
│  │  │• Noise       │ │• Bleeps      │ │• Acid        │ │• Vocal Synth │ │• Chaos       │              │ │
│  │  │• Ambient Pad │ │• Data Burst  │ │• Space Melody│ │• Karplus-    │ │• Sample      │              │ │
│  │  │              │ │• Glitch      │ │• Arpeggiator │ │  Strong      │ │  Player      │              │ │
│  │  │              │ │              │ │• Chord       │ │• Additive    │ │              │              │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘              │ │
│  │                                                                                                       │ │
│  │  Each Generator:                                                                                      │ │
│  │  • start(params, masterNodes) - Initialize with parameters                                           │ │
│  │  • stop() - Clean shutdown                                                                           │ │
│  │  • updateParameter(param, value) - Real-time parameter updates                                       │ │
│  │  • updateTempo(masterTempo) - Tempo synchronization                                                  │ │
│  │  • Uses Voice Pool for optimized node management                                                     │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                     │                                                       │
│                                                     ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                   VOICE POOL MANAGER                                                 │ │
│  │  ═══════════════════════════════════════════════════                                                 │ │
│  │  • Oscillator Pool - Reusable OscillatorNodes                                                        │ │
│  │  • Gain Pool - Reusable GainNodes                                                                    │ │
│  │  • Filter Pool - Reusable BiquadFilterNodes                                                          │ │
│  │  • Performance Optimization - Reduces GC pressure                                                    │ │
│  │  • acquire(id, config) / release(node) pattern                                                       │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                     │                                                       │
│                                                     ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                    MASTER BUS & EFFECTS                                              │ │
│  │  ═══════════════════════════════════════════════════                                                 │ │
│  │                                                                                                       │ │
│  │  Input Mixer → Distortion → EQ (3-Band) → Compressor → Chorus → Sidechain →┐                        │ │
│  │                                                                              │                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┘                        │ │
│  │  │                                                                                                    │ │
│  │  ├─→ Reverb (ConvolverNode) ──────────────────────────┐                                              │ │
│  │  │                                                   │                                              │ │
│  │  ├─→ Delay (Feedback Network) ────────────────────────┼─→ Master Gain → AudioContext.destination    │ │
│  │  │                                                   │                                              │ │
│  │  └─→ Dry Signal ──────────────────────────────────────┘                                              │ │
│  │                                                                                                       │ │
│  │  Master Tempo Sync: Updates all generators with synchronized timing                                  │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     │
                    ┌────────────────────────────────┼────────────────────────────────┐
                    │                                │                                │
                    ▼                                ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      VISUALIZATION LAYER                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              DATA MATRIX VISUALIZATION                                               │ │
│  │  ═══════════════════════════════════════════════════                                                 │ │
│  │                                                                                                       │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────────┐  │ │
│  │  │   Grid System    │  │  Parameter Map   │  │ Organic Elements │  │     Visual Modes            │  │ │
│  │  │  ─────────────   │  │  ─────────────   │  │ ──────────────── │  │     ───────────             │  │ │
│  │  │• LED Matrix      │  │• Parameter to    │  │• Tentacles       │  │• Matrix (LED Grid)          │  │ │
│  │  │  (32x32 cells)   │  │  Cell Mapping    │  │• Emitters        │  │• Organic (Flow Patterns)   │  │ │
│  │  │• Configurable    │  │• Activity Level  │  │• Particles       │  │• Glitch (Chaos Effects)    │  │ │
│  │  │  Size & Spacing  │  │  Visualization   │  │• Connections     │  │• Wave (Distortion)          │  │ │
│  │  │• Color Palettes  │  │• Real-time       │  │• Flow Systems    │  │• Neural (Network Display)  │  │ │
│  │  │• Performance     │  │  Updates         │  │• Burst Effects   │  │• Particle (Explosion)      │  │ │
│  │  │  Optimization    │  │• LFO Integration │  │                  │  │• Hybrid (Combined)         │  │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  └─────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                     │                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              AUDIO SPECTRUM VISUALIZATION                                            │ │
│  │  ═══════════════════════════════════════════════════                                                 │ │
│  │  • FFT Analysis (AnalyserNode)                                                                       │ │
│  │  • Frequency Bars Display                                                                            │ │
│  │  • Waveform Visualization                                                                            │ │
│  │  • Real-time Audio Feature Extraction                                                                │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘


                                          DATA FLOW DIAGRAM
                                          =================

┌─────────────┐    Parameter     ┌─────────────────┐    Audio      ┌─────────────────┐    Visual    ┌─────────────┐
│    User     │─────Changes────→│ GenerativeSoun- │────Signals───→│   Generators    │────Data────→│ DataMatrix  │
│ Interaction │                 │    dscape       │               │   & Effects     │             │Visualization│
└─────────────┘                 └─────────────────┘               └─────────────────┘             └─────────────┘
      │                                   │                                │                              │
      │                                   ▼                                ▼                              │
      │         ┌─────────────────────────────────────────────────────────────────────────────────────────┘
      │         │
      │         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FEEDBACK LOOPS                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│  1. PARAMETER FEEDBACK:                                                                                   │
│     UI Input → Parameter Change → Generator Update → Audio Output → Visual Response → User Feedback     │
│                                                                                                             │
│  2. AUTOMATION FEEDBACK:                                                                                  │
│     Recorded Automation → Parameter Playback → Audio Changes → Visual Updates → User Monitoring         │
│                                                                                                             │
│  3. LFO FEEDBACK:                                                                                         │
│     LFO Controller → Parameter Modulation → Audio Variation → Visual Pulsing → Dynamic Display          │
│                                                                                                             │
│  4. TEMPO FEEDBACK:                                                                                       │
│     Master BPM → All Generators Sync → Rhythmic Audio → Synchronized Visuals → Unified Experience       │
│                                                                                                             │
│  5. PERFORMANCE FEEDBACK:                                                                                 │
│     System Load → Performance Monitor → Throttling Decisions → Optimized Rendering → Smooth Operation   │
│                                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘


                                       SYSTEM STATES & PERSISTENCE
                                       ============================

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      RUNTIME STATE                                                       │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  • isPlaying: boolean - Master playback state                                                            │
│  • groupEnabled: Map<string, boolean> - Generator enable states                                          │
│  • parameterStates: Map<string, object> - Real-time parameter tracking                                   │
│  • lfoControllers: Map<string, LFOController> - Modulation states                                        │
│  • masterTempo: object - Centralized timing information                                                  │
│  • audioContext: AudioContext - Web Audio API context                                                    │
│  • generators: Map<string, Generator> - Active generator instances                                        │
│  • masterBus: MasterBus - Central audio routing                                                          │
│  • automationRecorder: AutomationRecorder - Recording state                                              │
│  • poolManager: PoolManager - Voice allocation tracking                                                  │
│  • dataMatrix: DataMatrix - Visualization state                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PERSISTENT STATE                                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  • localStorage: presets, configurations, user preferences                                               │
│  • URL parameters: shareable state encoding                                                              │
│  • JSON export/import: portable configuration exchange                                                   │
│  • Default presets: built-in configuration templates                                                     │
│  • Sample library: cached audio files for sample player                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘


                                         KEY DESIGN PRINCIPLES
                                         =====================

1. **MODULARITY**: Each generator/effect is independent and hot-swappable
2. **PERFORMANCE**: Voice pooling, frame skipping, and optimization for real-time audio
3. **REAL-TIME**: All parameter changes affect audio immediately via Web Audio API
4. **VISUAL FEEDBACK**: Every audio parameter has corresponding visual representation
5. **EXTENSIBILITY**: Easy to add new generators, effects, or visualization modes
6. **STATE MANAGEMENT**: Centralized state with distributed update propagation
7. **AUTOMATION**: Full automation recording/playback for all parameters
8. **PERSISTENCE**: Save/load complete system configurations
9. **RESPONSIVENESS**: Adaptive performance based on system capabilities
10. **USER EXPERIENCE**: Intuitive controls with comprehensive keyboard shortcuts
```