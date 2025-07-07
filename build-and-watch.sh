#!/bin/bash

echo "Building standalone bundle..."
npm run build:standalone

echo "Bundle created! You can now open index.html directly in your browser."
echo ""
echo "To rebuild after making changes, run:"
echo "  npm run build:standalone"
echo ""
echo "Or for development with hot reload, run:"
echo "  npm run dev"