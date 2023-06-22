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
