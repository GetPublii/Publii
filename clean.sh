#!/bin/bash
set -euo pipefail

for d in . app; do
    rm -vrf $d/node_modules $d/package-lock.json
done

