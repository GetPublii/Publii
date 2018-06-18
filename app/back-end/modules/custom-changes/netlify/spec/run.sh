#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
node $DIR/../node_modules/jasmine-node/lib/jasmine-node/cli.js $DIR