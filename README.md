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

## API

See the [`bare-inspect` reference](https://docs.pears.com/reference/bare/modules/bare-inspect).

## Threat model

`bare-inspect` is one of the addons Bare compiles into its binary, so it inherits [Bare's threat model](https://github.com/holepunchto/bare/blob/main/docs/threat-model.md). See [`docs/threat-model.md`](docs/threat-model.md) for where this addon sits in it.

## License

Apache-2.0
