#!/bin/bash
set -euo pipefail

source setup_correct_node.sh

npm install
(cd app; npm install)

rm -rf dist
npm run packager:mac-m

DEST="$HOME/Dropbox/brittany/Publii-for-Brittany.app"
rm -rf "$DEST"
cp -av dist/mac-arm64/Publii.app "$DEST"
