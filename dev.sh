#!/bin/bash
set -euo pipefail

source setup_correct_node.sh

echo "Installing node modules in ./"
npm install
echo "Installing node modules in ./app"
(cd app; npm install)
echo "Running npm run dev-prep"
npm run dev-prep

echo "Running npm run dev in the background"
npm run dev &
echo "Running npm run prepare-editor"
npm run prepare-editor
echo "Running npm run build, which should start the app"
npm run build
