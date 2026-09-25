# Status Logger

Manage complex CLI output with arrays and automatically print any changes to stdout via [ansi-diff-stream](https://github.com/mafintosh/ansi-diff-stream).

**WARNING: Awesomeness elsewhere.** `status-logger` was nice but it wasn't enough, it still *felt* like node but I wanted frontend javascript fun. Introducing... 🥁  ... [neat-log](https://github.com/joehand/neat-log). **neat-log** is much neater and I'd definitely recommend using that. It uses `status-logger` under the hood.

## Example

The example here will initially print:

```
Status Logger Example:
starting...
```

Then once it gets started, it will print the time every second:

```
Status Logger Example:
Time = 10 seconds
```

```js
var output = ['Status Logger Example:', 'starting...']
var log = statusLogger(output)
setInterval(function () {
  log.print()
}, 100)
log.print()
start()

function start () {
  var sec = 0
  setInterval(function () {
    sec++
    output[1] = `Time = ${sec} seconds`
  }, 1000)
}
```

Run `node basic-example.js` or `node example.js` to see full examples. You can find more complex usage in these modules:

* ~[Dat CLI](https://github.com/datproject/dat)~ Using `neat-log` now (built on this)
* [bkr](https://github.com/beakerbrowser/bkr/)

## Installation

```
npm install status-logger
```

## API

### `var log = statusLogger(messages, opts)`

`messages` is an array with of lines to print. They will be printed in order with a newline spacer between each. Message arrays are flattened so they can be any mix of nested arrays and strings.

### Options

* `quiet`: do not print anything
* `debug`: print everything to console.log or console.error

### `log.print()`

Print messages from all groups.

### `var output = log.clear(messages)`

Clear all output and create a empty output array (or with new `messages`).

### `log.diff`

`ansi-diff-stream` instance

### `log.messages`

Stored reference to the original messages array.

## License

MIT
