module.exports = function inspect (value, opts = {}) {
  const {
    breakLength = 80
  } = opts

  const tree = inspectValue(value, 0, { breakLength })

  return tree.toString()
}

class InspectNode {
  constructor (depth, length, opts) {
    this.depth = depth
    this.length = length
    this.breakLength = opts.breakLength
  }

  indent (n, string) {
    return '  '.repeat(n) + string
  }
}

class InspectLeaf extends InspectNode {
  constructor (value, color, depth, opts) {
    const length = value.length

    super(depth, length, opts)

    this.value = value
    this.color = color
  }

  toString (indent = 0, offset = 0) {
    return this.value
  }
}

class InspectPair extends InspectNode {
  constructor (delim, left, right, depth, opts) {
    const length = (
      left.length +
      delim.length + 1 +
      right.length
    )

    super(depth, length, opts)

    this.delim = delim
    this.left = left
    this.right = right
  }

  toString (indent = 0, offset = 0) {
    return this.indent(indent, this.left + this.delim + ' ' + this.right.toString(indent, this.left.length + this.delim.length))
  }
}

class InspectSequence extends InspectNode {
  constructor (header, footer, delim, values, depth, opts) {
    const length = (
      header.length + 1 +
      values.reduce((length, value, i) => length + value.length + (i === 0 ? 0 : delim.length + 1), 0) +
      footer.length + 1
    )

    super(depth, length, opts)

    this.header = header
    this.footer = footer
    this.delim = delim
    this.values = values
  }

  toString (indent = 0, offset = 0) {
    const split = this.values.length && (
      offset + this.length > this.breakLength ||
      indent * 2 + this.length > this.breakLength
    )

    const spacer = this.values.length ? ' ' : ''

    let string = ''

    if (split) {
      string += this.header + '\n'
    } else if (offset) {
      string += this.header + spacer
    } else {
      string += this.indent(indent, this.header + spacer)
    }

    for (let i = 0, n = this.values.length; i < n; i++) {
      const value = this.values[i]

      if (split) {
        string += value.toString(indent + 1)

        if (i < n - 1) string += this.delim + '\n'
      } else {
        if (i > 0) string += this.delim + ' '

        string += value.toString(0, string.length)
      }
    }

    if (split) {
      string += '\n' + this.indent(indent, this.footer)
    } else {
      string += spacer + this.footer
    }

    return string
  }
}

function inspectValue (value, depth, opts) {
  if (value === undefined) return inspectUndefined(depth, opts)
  if (value === null) return inspectNull(depth, opts)

  switch (typeof value) {
    case 'boolean': return inspectBoolean(value, depth, opts)
    case 'number': return inspectNumber(value, depth, opts)
    case 'bigint': return inspectBigInt(value, depth, opts)
    case 'string': return inspectString(value, depth, opts)
    case 'symbol': return inspectSymbol(value, depth, opts)
    case 'object': return inspectObject(value, depth, opts)
    case 'function': return inspectFunction(value, depth, opts)
  }
}

function inspectUndefined (depth, opts) {
  return new InspectLeaf('undefined', null, depth, opts)
}

function inspectNull (depth, opts) {
  return new InspectLeaf('null', null, depth, opts)
}

function inspectBoolean (value, depth, opts) {
  return new InspectLeaf(value.toString(), null, depth, opts)
}

function inspectNumber (value, depth, opts) {
  let string

  if (Object.is(value, -0)) {
    string = '-0'
  } else {
    string = value.toString(10)
  }

  return new InspectLeaf(string, null, depth, opts)
}

function inspectBigInt (value, depth, opts) {
  return new InspectLeaf(value.toString(10) + 'n', null, depth, opts)
}

function inspectString (value, depth, opts) {
  const string = value
    .replace(/'/g, '\\\'')

    // Escape control characters
    .replace(/[\b]/g, '\\b')
    .replace(/[\f]/g, '\\f')
    .replace(/[\n]/g, '\\n')
    .replace(/[\r]/g, '\\r')
    .replace(/[\t]/g, '\\t')

  return new InspectLeaf('\'' + string + '\'', null, depth, opts)
}

function inspectSymbol (value, depth, opts) {
  return new InspectLeaf(value.toString(), null, depth, opts)
}

function inspectKey (value, depth, opts) {
  return new InspectLeaf(value, null, depth, opts)
}

function inspectObject (object, depth, opts) {
  if (object instanceof Array) return inspectArray(object, depth, opts)
  if (object instanceof Error) return inspectError(object, depth, opts)

  const values = []

  for (const key in object) {
    values.push(new InspectPair(':', inspectKey(key, depth + 1, opts), inspectValue(object[key], depth + 1, opts), depth + 1, opts))
  }

  return new InspectSequence('{', '}', ',', values, depth, opts)
}

function inspectArray (array, depth, opts) {
  const values = []

  for (const key in array) {
    const value = inspectValue(array[key], depth + 1, opts)

    if (Number.isInteger(+key)) {
      values.push(value)
    } else {
      values.push(new InspectPair(':', inspectKey(key, depth + 1, opts), value, depth + 1, opts))
    }
  }

  return new InspectSequence('[', ']', ',', values, depth, opts)
}

function inspectError (error, depth, opts) {
  return new InspectLeaf(error.stack, null, depth, opts)
}

function inspectFunction (fn, depth, opts) {
  return new InspectLeaf('[Function' + (fn.name ? ': ' + fn.name : ' (anonymous)') + ']', null, depth, opts)
}
