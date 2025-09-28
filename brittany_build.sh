#!/bin/bash
set -euo pipefail

source setup_correct_node.sh

echo "Killing any stray webpack processes"
pkill webpack || true

echo "Running npm install"
rm -vf package-lock.json app/package-lock.json
npm install
(cd app; npm install)

echo "Running npm run prod"
npm run prod

echo "Running npm run prepare-editor"
npm run prepare-editor

echo "Running packager"
rm -rf dist
npm run packager:mac-m

DEST="$HOME/Dropbox/brittany/Publii-for-Brittany.app"
rm -rf "$DEST"
cp -av dist/mac-arm64/Publii.app "$DEST"
