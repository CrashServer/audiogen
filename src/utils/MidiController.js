export class MidiController {
    constructor() {
        this.midi = null;
        this.inputs = new Map();
        this.ccMappings = new Map();
        this.isEnabled = false;
    }

    async initialize() {
        try {
            this.midi = await navigator.requestMIDIAccess();
            this.midi.addEventListener('statechange', (e) => this.onStateChange(e));
            
            // Setup existing inputs
            for (const input of this.midi.inputs.values()) {
                this.setupInput(input);
            }
            
            this.isEnabled = true;
            console.log('MIDI Controller initialized');
            return true;
        } catch (err) {
            console.warn('MIDI not available:', err);
            return false;
        }
    }

    setupInput(input) {
        input.addEventListener('midimessage', (e) => this.onMidiMessage(e));
        this.inputs.set(input.id, input);
        console.log('MIDI Input connected:', input.name);
    }

    onStateChange(event) {
        const port = event.port;
        if (port.type === 'input') {
            if (port.state === 'connected') {
                this.setupInput(port);
            } else if (port.state === 'disconnected') {
                this.inputs.delete(port.id);
                console.log('MIDI Input disconnected:', port.name);
            }
        }
    }

    onMidiMessage(event) {
        const [command, controller, value] = event.data;
        
        // Handle CC messages (Control Change)
        if (command >= 176 && command <= 191) {
            const channel = command - 176;
            this.handleCC(channel, controller, value);
        }
    }

    handleCC(channel, controller, value) {
        const mapping = this.ccMappings.get(controller);
        if (mapping) {
            const normalizedValue = value / 127;
            const scaledValue = mapping.min + (normalizedValue * (mapping.max - mapping.min));
            
            // Update the UI control
            const element = document.getElementById(mapping.elementId);
            if (element) {
                element.value = scaledValue;
                element.dispatchEvent(new Event('input'));
            }
        }
    }

    mapCC(controller, elementId, min = 0, max = 100) {
        this.ccMappings.set(controller, {
            elementId,
            min,
            max
        });
        console.log(`Mapped CC ${controller} to ${elementId} (${min}-${max})`);
    }

    unmapCC(controller) {
        this.ccMappings.delete(controller);
    }

    getConnectedInputs() {
        return Array.from(this.inputs.values()).map(input => ({
            id: input.id,
            name: input.name
        }));
    }
}