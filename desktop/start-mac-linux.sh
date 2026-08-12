#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo "Install Node.js from https://nodejs.org then run this again."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Installing the desktop widget..."
  npm install
fi
npm start
