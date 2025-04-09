/* global Bare */
const test = require('brittle')
const inspect = require('.')

test('undefined', (t) => {
  t.is(inspect(undefined), 'undefined', 'undefined')
})

test('numbers', (t) => {
  t.is(inspect(NaN), 'NaN', 'NaN')

  t.is(inspect(0), '0', 'positive zero')
  t.is(inspect(-0), '-0', 'negative zero')

  t.is(inspect(42), '42', 'positive integer')
  t.is(inspect(-42), '-42', 'negative integer')

  t.is(inspect(12.34), '12.34', 'positive float')
  t.is(inspect(-12.34), '-12.34', 'negative float')
})

test('bigints', (t) => {
  t.is(inspect(42n), '42n', 'positive integer')
  t.is(inspect(-42n), '-42n', 'negative integer')
})

test('strings', (t) => {
  t.is(inspect('foo'), "'foo'", 'without quotes')

  t.is(inspect("f'oo"), "'f\\'oo'", 'with single quotes')
  t.is(inspect('f"oo'), "'f\"oo'", 'with double quotes')
  t.is(inspect('f`oo'), "'f`oo'", 'with backticks')

  t.is(inspect('f\noo'), "'f\\noo'", 'with newline')
})

test('arrays', (t) => {
  t.is(inspect([]), '[]', 'empty array')

  t.is(inspect([1, 2, 3, 4]), '[ 1, 2, 3, 4 ]', 'short array')

  t.is(
    inspect(new Array(40).fill().map((_, i) => i)),
    trim`
[
   0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39
]
  `,
    'long array'
  )
})

test('dates', (t) => {
  t.is(inspect(new Date('2000-01-02')), '2000-01-02T00:00:00.000Z')
})

test('regular expressions', (t) => {
  t.is(inspect(/regExp/gi), '/regExp/gi')
})

test('promises', (t) => {
  t.plan(4)

  t.is(inspect(Promise.resolve(42)), 'Promise { 42 }', 'resolved')
  t.is(inspect(Promise.reject(42)), 'Promise { <rejected> 42 }', 'rejected')
  t.is(
    inspect(new Promise((resolve) => queueMicrotask(resolve))),
    'Promise { <pending> }',
    'pending'
  )

  Bare.once('unhandledRejection', () => t.pass('caught'))
})

test('maps', (t) => {
  t.is(inspect(new Map()), 'Map(0) {}', 'empty map')

  t.is(
    inspect(
      new Map([
        ['foo', 1],
        [42, true]
      ])
    ),
    "Map(2) { 'foo' => 1, 42 => true }",
    'short map'
  )
})

test('set', (t) => {
  t.is(inspect(new Set()), 'Set(0) {}', 'empty set')

  t.is(
    inspect(new Set(['foo', 42, true])),
    "Set(3) { 'foo', 42, true }",
    'short set'
  )
})

test('array views', (t) => {
  t.is(inspect(new ArrayBuffer(4)), 'ArrayBuffer { byteLength: 4 }')
})

test('buffers', (t) => {
  t.is(
    inspect(Buffer.from([2, 4, 8, 16])),
    '<Buffer 02 04 08 10>',
    'short buffer'
  )

  t.is(
    inspect(Buffer.alloc(40)),
    trim`
<Buffer
  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  00 00 00 00 00 00 00 00 00 00 00 00 00 00
>
  `,
    'long buffer'
  )
})

test('typed arrays', (t) => {
  t.is(inspect(Int8Array.from([2, 4, 8, 16])), 'Int8Array(4) [ 2, 4, 8, 16 ]')
  t.is(inspect(Uint8Array.from([2, 4, 8, 16])), 'Uint8Array(4) [ 2, 4, 8, 16 ]')
  t.is(
    inspect(Uint8ClampedArray.from([2, 4, 8, 16])),
    'Uint8ClampedArray(4) [ 2, 4, 8, 16 ]'
  )
  t.is(inspect(Int16Array.from([2, 4, 8, 16])), 'Int16Array(4) [ 2, 4, 8, 16 ]')
  t.is(
    inspect(Uint16Array.from([2, 4, 8, 16])),
    'Uint16Array(4) [ 2, 4, 8, 16 ]'
  )
  t.is(inspect(Int32Array.from([2, 4, 8, 16])), 'Int32Array(4) [ 2, 4, 8, 16 ]')
  t.is(
    inspect(Uint32Array.from([2, 4, 8, 16])),
    'Uint32Array(4) [ 2, 4, 8, 16 ]'
  )
  t.is(
    inspect(Float32Array.from([2, 4, 8, 16])),
    'Float32Array(4) [ 2, 4, 8, 16 ]'
  )
  t.is(
    inspect(Float64Array.from([2, 4, 8, 16])),
    'Float64Array(4) [ 2, 4, 8, 16 ]'
  )
  t.is(
    inspect(BigInt64Array.from([2n, 4n, 8n, 16n])),
    'BigInt64Array(4) [ 2n, 4n, 8n, 16n ]'
  )
  t.is(
    inspect(BigUint64Array.from([2n, 4n, 8n, 16n])),
    'BigUint64Array(4) [ 2n, 4n, 8n, 16n ]'
  )
})

test('data views', (t) => {
  t.is(
    inspect(new DataView(new ArrayBuffer(4))),
    'DataView { byteLength: 4, byteOffset: 0, buffer: ArrayBuffer { byteLength: 4 } }'
  )
})

test('objects', (t) => {
  t.is(inspect({}), '{}', 'empty object')

  t.is(inspect({ hello: 'world' }), "{ hello: 'world' }")
})

test('errors', (t) => {
  t.comment(
    inspect(
      new AggregateError(
        [new Error('First error'), new Error('Second error')],
        'Error name',
        {
          cause: new Error('Outer cause', {
            cause: new Error('Inner cause')
          })
        }
      ),
      {
        depth: null
      }
    )
  )
})

test('functions', (t) => {
  let foo
  t.is(
    inspect(function foo() {}),
    '[function foo]',
    'named function'
  )
  t.is(
    inspect(function () {}),
    '[function (anonymous)]',
    'anonymous function'
  )
  t.is(inspect((foo = () => {})), '[function foo]', 'named arrow function')
  t.is(
    inspect(() => {}),
    '[function (anonymous)]',
    'anonymous arrow function'
  )
  t.is(
    inspect(function* foo() {}),
    '[generator function foo]',
    'named generator function'
  )
  t.is(
    inspect(function* () {}),
    '[generator function (anonymous)]',
    'anonymous generator function'
  )
  t.is(
    inspect(async function foo() {}),
    '[async function foo]',
    'named async function'
  )
  t.is(
    inspect(async function () {}),
    '[async function (anonymous)]',
    'anonymous async function'
  )
  t.is(
    inspect((foo = async () => {})),
    '[async function foo]',
    'named async arrow function'
  )
  t.is(
    inspect(async () => {}),
    '[async function (anonymous)]',
    'anonymous async arrow function'
  )
  t.is(
    inspect(async function* foo() {}),
    '[async generator function foo]',
    'named async generator function'
  )
  t.is(
    inspect(async function* () {}),
    '[async generator function (anonymous)]',
    'anonymous async generator function'
  )
})

test('classes', (t) => {
  t.is(inspect(class Foo {}), '[class Foo]', 'named class')
  t.is(inspect(class {}), '[class (anonymous)]', 'anonymous class')
})

test('class instances', (t) => {
  class Foo {
    constructor() {
      this.hello = 'world'
    }
  }

  t.is(inspect(new Foo()), "Foo { hello: 'world' }", 'named class')

  class Bar {}

  t.is(inspect(new Bar()), 'Bar {}', 'empty class')
})

test('recursive object reference', (t) => {
  const foo = { bar: null }
  const bar = { foo }

  foo.bar = bar

  t.is(inspect(foo), '<ref *1> { bar: { foo: [circular *1] } }')
})

test('recursive array reference', (t) => {
  const foo = []
  const bar = [foo]

  foo[0] = bar

  t.is(inspect(foo), '<ref *1> [ [ [circular *1] ] ]')
})

test('recursive buffer reference', (t) => {
  const buf = Buffer.alloc(4)
  buf.buf = buf

  t.is(inspect(buf), '<ref *1> <Buffer 00 00 00 00 buf: [circular *1]>')
})

test('recursive typed array reference', (t) => {
  const arr = new Uint8Array(4)
  arr.arr = arr

  t.is(
    inspect(arr),
    '<ref *1> Uint8Array(4) [ 0, 0, 0, 0, arr: [circular *1] ]'
  )
})

test('object with same reference twice', (t) => {
  const foo = {}
  const bar = { 1: foo, 2: foo }

  t.is(inspect(bar), "{ '1': {}, '2': {} }")
})

test('array with same reference twice', (t) => {
  const foo = {}
  const bar = [foo, foo]

  t.is(inspect(bar), '[ {}, {} ]')
})

test('truncated array', (t) => {
  t.is(
    inspect(new Array(48).fill().map((_, i) => i)),
    trim`
[
   0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  ... 8 more
]
  `
  )
})

test('truncated array with additional properties', (t) => {
  const arr = new Array(48).fill().map((_, i) => i)
  arr.foo = 'a'
  arr.bar = 'b'

  t.is(
    inspect(arr),
    trim`
[
   0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  ... 8 more,
  foo: 'a',
  bar: 'b'
]
  `
  )
})

test('truncated buffer', (t) => {
  t.is(
    inspect(Buffer.alloc(48)),
    trim`
<Buffer
  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  00 00 00 00 00 00 00 00 00 00 00 00 00 00
  ... 8 more
>
  `
  )
})

test('truncated buffer with additional properties', (t) => {
  const buf = Buffer.alloc(48)
  buf.foo = 'a'
  buf.bar = 'b'

  t.is(
    inspect(buf),
    trim`
<Buffer
  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  00 00 00 00 00 00 00 00 00 00 00 00 00 00
  ... 8 more
  foo: 'a'
  bar: 'b'
>
  `
  )
})

test('truncated typed array', (t) => {
  t.is(
    inspect(new Uint8Array(48)),
    trim`
Uint8Array(48) [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ... 8 more
]
  `
  )
})

test('truncated typed array with additional properties', (t) => {
  const arr = new Uint8Array(48)
  arr.foo = 'a'
  arr.bar = 'b'

  t.is(
    inspect(arr),
    trim`
Uint8Array(48) [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ... 8 more,
  foo: 'a',
  bar: 'b'
]
  `
  )
})

test('deep object', (t) => {
  t.is(inspect({ foo: { bar: { baz: 42 } } }), '{ foo: { bar: [Object] } }')
  t.is(inspect({ foo: { bar: new Date() } }), '{ foo: { bar: [Date] } }')
})

test('custom inspect method', (t) => {
  t.plan(2)

  class Foo {
    constructor() {
      this.foo = true
    }

    [Symbol.for('bare.inspect')](depth, opts, inspect) {
      t.ok(this instanceof Foo)

      return {
        __proto__: { constructor: Foo },
        bar: false
      }
    }
  }

  t.is(inspect(new Foo()), 'Foo { bar: false }')
})

test('custom inspect method with cycle', (t) => {
  class Foo {
    [Symbol.for('bare.inspect')]() {
      return {
        __proto__: { constructor: Foo },
        self: this
      }
    }
  }

  t.is(inspect(new Foo()), '<ref *1> Foo { self: [circular *1] }')
})

test('custom inspect method with string result', (t) => {
  class Foo {
    [Symbol.for('bare.inspect')]() {
      return 'Foo'
    }
  }

  t.is(inspect(new Foo()), 'Foo')
})

test('custom inspect method with stylize', (t) => {
  class Foo {
    [Symbol.for('bare.inspect')](depth, opts) {
      return opts.stylize('Foo', 'special')
    }
  }

  t.is(inspect(new Foo()), 'Foo')
})

test('custom inspect method with custom stylize', (t) => {
  class Foo {
    [Symbol.for('bare.inspect')](depth, opts) {
      return opts.stylize('Foo', 'special')
    }
  }

  function stylize(value, style) {
    return value.toUpperCase()
  }

  t.is(inspect(new Foo(), { stylize }), 'FOO')
})

test('custom inspect method, Node.js compatibility', (t) => {
  t.plan(2)

  class Foo {
    constructor() {
      this.foo = true
    }

    [Symbol.for('nodejs.util.inspect.custom')](depth, opts, inspect) {
      t.ok(this instanceof Foo)

      return {
        __proto__: { constructor: Foo },
        bar: false
      }
    }
  }

  t.is(inspect(new Foo()), 'Foo { bar: false }')
})

function trim(strings, ...substitutions) {
  return String.raw(strings, ...substitutions).trim()
}
