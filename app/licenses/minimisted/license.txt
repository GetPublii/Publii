# minimisted v2.0.1

![CI](https://github.com/kt3k/minimisted/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/kt3k/minimisted/branch/master/graph/badge.svg)](https://codecov.io/gh/kt3k/minimisted)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

> A handy wrapper of `minimist`

# Install

    npm install minimisted

# Usage

You can write your cli like the following:

```js
// Your cli's entry point
const main = (argv) => {
}

require('minimisted')(main)
```

where `argv` is the command line options parsed by `minimist` i.e. `minimist(process.argv.slice(2))`.

Using object destructuring syntax, you can write it like the following:

```js
/**
 * @param {boolean} help Shows help message if true
 * @param {boolean} version Shows the version if true
 * ...
 * @param {string[]} _ The parameters
 */
const main = ({ help, version, _ }) => {
}

require('minimisted')(main)
```

# API

```js
const minimisted = require('minimisted')
```

## minimisted(main[, opts[, argv]])

- @param {Function} main The main function
- @param {Object} opts The option which is passed to minimist's 2rd arguments
- @param {string} argv The command line arguments. Default is `process.argv.slice(2)`.

This calls `main` with command line options parsed by the minimist with the given options.

# License

MIT
