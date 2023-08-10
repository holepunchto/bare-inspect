const test = require('brittle')
const inspect = require('.')

test('numbers', (t) => {
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
  t.is(inspect('foo'), '\'foo\'', 'without quotes')

  t.is(inspect('f\'oo'), '\'f\\\'oo\'', 'with single quotes')
  t.is(inspect('f"oo'), '\'f"oo\'', 'with double quotes')
  t.is(inspect('f`oo'), '\'f`oo\'', 'with backticks')

  t.is(inspect('f\noo'), '\'f\\noo\'', 'with newline')
})

test('functions', (t) => {
  let foo
  t.is(inspect(function foo () {}), '[function foo]', 'named function')
  t.is(inspect(function () {}), '[function (anonymous)]', 'anonymous function')
  t.is(inspect(foo = () => {}, foo), '[function foo]', 'named arrow function')
  t.is(inspect(() => {}), '[function (anonymous)]', 'anonymous arrow function')
})

test('classes', (t) => {
  t.is(inspect(class Foo {}), '[class Foo]', 'named class')
  t.is(inspect(class {}), '[class (anonymous)]', 'anonymous class')
})

test('class instances', (t) => {
  class Foo {
    constructor () {
      this.hello = 'world'
    }
  }

  t.is(inspect(new Foo()), 'Foo { hello: \'world\' }', 'named class')

  class Bar {}

  t.is(inspect(new Bar()), 'Bar {}', 'empty class')
})

test('objects', (t) => {
  t.is(inspect({}), '{}', 'empty object')

  t.is(inspect({ hello: 'world' }), '{ hello: \'world\' }')
})

test('arrays', (t) => {
  t.is(inspect([]), '[]', 'empty array')

  t.is(inspect([1, 2, 3, 4]), '[ 1, 2, 3, 4 ]', 'short array')

  t.is(inspect(new Array(48).fill().map((_, i) => i)), trim`
[
   0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  40, 41, 42, 43, 44, 45, 46, 47
]
  `, 'long array')
})

test('buffers', (t) => {
  t.is(inspect(Buffer.from([2, 4, 8, 16])), '<Buffer 02 04 08 10>', 'short buffer')

  t.is(inspect(Buffer.alloc(48)), trim`
<Buffer
  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
>
  `, 'long buffer')
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

test('object with same reference twice', (t) => {
  const foo = {}
  const bar = { 1: foo, 2: foo }

  t.is(inspect(bar), '{ 1: {}, 2: {} }')
})

test('array with same reference twice', (t) => {
  const foo = {}
  const bar = [foo, foo]

  t.is(inspect(bar), '[ {}, {} ]')
})

function trim (strings, ...substitutions) {
  return String.raw(strings, ...substitutions).trim()
}
