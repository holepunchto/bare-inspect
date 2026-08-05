# bare-inspect

Inspect objects as strings for debugging.

```
npm i bare-inspect
```

## Usage

```js
const inspect = require('bare-inspect')

console.log(inspect(globalThis))
```

## License

Apache-2.0

<!-- bare-refgen:api start -->

## API

### Functions

#### `inspect(value: unknown, opts?: InspectOptions): string`

Returns a string representation of `value` for debugging, similar to Node's `util.inspect()`. If `value` has a `Symbol.for('bare.inspect')` or `Symbol.for('nodejs.util.inspect.custom')` method, it is used to produce the output.

**Parameters**

| Parameter | Type             | Default | Description                                      |
| --------- | ---------------- | ------- | ------------------------------------------------ |
| `value`   | `unknown`        | —       | The value to produce a string representation of. |
| `opts?`   | `InspectOptions` | —       | Formatting options; see `InspectOptions`.        |

### Types

#### `InspectOptions`

```ts
interface InspectOptions {
  colors?: boolean
  depth?: number
  breakLength?: number
  stylize?: InspectStylize
}
```

Options for `inspect()`. `colors` enables ANSI styling, `depth` limits how many levels of nested objects are inspected (defaults to `2`), `breakLength` sets the line-wrap width (defaults to `80`), and `stylize` is a custom function for applying styles to values.

#### `InspectStylize`

```ts
interface InspectStylize {}
```

A function that applies a named style (such as `'string'` or `'number'`) to a value before it's included in the output.
<!-- bare-refgen:api end -->
