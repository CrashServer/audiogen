# Sample Player Guide

## How to Use the Sample Player

The Sample Player is fully integrated and ready to use!

### Built-in Samples
The player comes with 5 built-in samples:
- **Kick**: Deep bass drum
- **Snare**: Punchy snare drum
- **Hi-Hat**: Crisp metallic percussion
- **Chord Stab**: Musical chord hit
- **Bass Hit**: Sub bass tone

### Controls
- **Density**: How often samples trigger (0-100%)
- **Sample**: Select which sample to play
- **Pitch**: Playback speed/pitch (0.25x to 4x)
- **Reverse**: Amount of reverse playback (0-100%)
- **Chop**: Cuts samples into smaller pieces (0-100%)
- **Scatter**: Randomizes timing (0-100%)

### Adding Your Own Samples
1. Place audio files in the `/samples` directory
2. Supported formats: WAV, MP3, OGG, M4A, FLAC
3. Files will automatically appear in the dropdown when served via HTTP
4. Note: External samples don't work when opening the HTML file directly (due to browser security)

### Tips
- Set low density (5-20%) for occasional hits
- Use pitch to create melodic variations
- Combine chop + scatter for glitchy effects
- Reverse works great with chord and pad samples
- The sample player respects the global ADSR envelope settings

### Integration with Other Features
- **Randomize**: Automatically selects random samples
- **Morph**: Smoothly transitions between different samples
- **Auto Mode**: Includes sample selection in automatic changes
- **URL Sharing**: Sample selection is saved in shareable URLs

The sample player works seamlessly with all other generators and effects!