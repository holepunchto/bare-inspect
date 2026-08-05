/** A function that applies a named style (such as `'string'` or `'number'`) to a value before it's included in the output. */
interface InspectStylize {
  (value: string, style: keyof typeof inspect.styles): string
}

/** Options for `inspect()`. `colors` enables ANSI styling, `depth` limits how many levels of nested objects are inspected (defaults to `2`), `breakLength` sets the line-wrap width (defaults to `80`), and `stylize` is a custom function for applying styles to values. */
interface InspectOptions {
  colors?: boolean
  depth?: number
  breakLength?: number
  stylize?: InspectStylize
}

/**
 * Returns a string representation of `value` for debugging, similar to Node's `util.inspect()`. If `value` has a `Symbol.for('bare.inspect')` or `Symbol.for('nodejs.util.inspect.custom')` method, it is used to produce the output.
 * @param value - The value to produce a string representation of.
 * @param opts - Formatting options; see `InspectOptions`.
 */
declare function inspect(value: unknown, opts?: InspectOptions): string

declare namespace inspect {
  export const styles: {
    bigint: string
    boolean: string
    date: string
    module: string
    name: string
    null: string
    number: string
    regexp: string
    special: string
    string: string
    symbol: string
    undefined: string
  }

  export { type InspectOptions, type InspectStylize }
}

export = inspect
