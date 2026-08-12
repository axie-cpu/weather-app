#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo "Install Node.js from https://nodejs.org then run this again."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Setting up Atmosphere..."
  npm install
fi
echo "Pinning Atmosphere to your screen..."
npm run pin-atmosphere
