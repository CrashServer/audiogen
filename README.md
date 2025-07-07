# AudioGen - Modular Generative Soundscape

A web-based generative audio synthesizer and soundscape creator built with Web Audio API.

## Quick Start (Direct File Access)

1. Install dependencies and build:
```bash
npm install
npm run build:standalone
```

2. Open `index.html` directly in your browser!

The standalone build bundles all modules into a single `app.bundle.js` file that works without a server.

## Development Mode

For development with hot reload:

```bash
npm run dev
```

Then open `http://localhost:3000`

## Rebuilding After Changes

After modifying any source files:

```bash
npm run build:standalone
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
audiogen/
├── src/
│   ├── generators/     # Audio generators (drone, drums, etc.)
│   ├── effects/        # Audio effects (reverb, delay, etc.)
│   ├── utils/          # Utility functions
│   └── app.js          # Main application
├── index.html          # UI
├── styles.css          # Styles
└── vite.config.js      # Build configuration
```