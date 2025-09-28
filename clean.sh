#!/bin/bash
set -euo pipefail

for d in . app; do
    rm -vrf $d/node_modules
    git checkout $d/package-lock.json
done

