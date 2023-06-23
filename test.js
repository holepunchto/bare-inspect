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
})

test('objects', (t) => {
  t.is(inspect({ hello: 'world' }), '{ hello: \'world\' }')
})

test('arrays', (t) => {
  t.is(inspect([1, 2, 3, 4]), '[ 1, 2, 3, 4 ]')
})

test('buffers', (t) => {
  t.is(inspect(Buffer.from([2, 4, 8, 16])), '<Buffer 02 04 08 10>')
})

test('recursive object reference', (t) => {
  const foo = { bar: null }
  const bar = { foo }

  foo.bar = bar

  t.is(inspect(foo), '<ref *1> { bar: { foo: [Circular *1] } }')
})

test('recursive array reference', (t) => {
  const foo = []
  const bar = [foo]

  foo[0] = bar

  t.is(inspect(foo), '<ref *1> [ [ [Circular *1] ] ]')
})
