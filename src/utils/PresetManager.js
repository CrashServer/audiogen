export class PresetManager {
    constructor() {
        this.presets = new Map();
        this.loadPresetsFromStorage();
    }

    savePreset(name, params) {
        this.presets.set(name, {
            ...params,
            timestamp: Date.now()
        });
        this.savePresetsToStorage();
    }

    loadPreset(name) {
        return this.presets.get(name);
    }

    deletePreset(name) {
        this.presets.delete(name);
        this.savePresetsToStorage();
    }

    getAllPresets() {
        return Array.from(this.presets.keys());
    }

    savePresetsToStorage() {
        try {
            localStorage.setItem('audiogen_presets', JSON.stringify(Array.from(this.presets.entries())));
        } catch (e) {
            console.warn('Could not save presets to localStorage:', e);
        }
    }

    loadPresetsFromStorage() {
        try {
            const stored = localStorage.getItem('audiogen_presets');
            if (stored) {
                const entries = JSON.parse(stored);
                this.presets = new Map(entries);
            }
        } catch (e) {
            console.warn('Could not load presets from localStorage:', e);
        }
    }

    exportPresets() {
        return JSON.stringify(Array.from(this.presets.entries()), null, 2);
    }

    importPresets(jsonString) {
        try {
            const entries = JSON.parse(jsonString);
            entries.forEach(([name, preset]) => {
                this.presets.set(name, preset);
            });
            this.savePresetsToStorage();
            return true;
        } catch (e) {
            console.error('Could not import presets:', e);
            return false;
        }
    }
}