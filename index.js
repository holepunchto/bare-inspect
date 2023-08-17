const ansiEscapes = require('bare-ansi-escapes')

const PLAIN_KEY = /^[a-zA-Z_][a-zA-Z_0-9]*$/

module.exports = function inspect (value, opts = {}) {
  const {
    colors = false,
    breakLength = 80
  } = opts

  const references = new InspectRefMap()

  const tree = inspectValue(value, 0, { colors, breakLength, references })

  return tree.toString()
}

class InspectRefMap {
  constructor () {
    this.refs = new WeakMap()
    this.ids = new WeakMap()
    this.nextId = 1
  }

  has (object) {
    return this.refs.has(object)
  }

  get (object) {
    return this.refs.get(object) || null
  }

  set (object, ref) {
    this.refs.set(object, ref)
  }

  id (object) {
    let id = this.ids.get(object)
    if (id) return id

    id = this.nextId++
    this.ids.set(object, id)

    return id
  }
}

class InspectNode {
  constructor (depth, length, opts) {
    this.depth = depth
    this.length = length
    this.breakLength = opts.breakLength
  }

  pad (n, string) {
    return string.padStart(n, ' ')
  }

  indent (n, string) {
    return '  '.repeat(n) + string
  }
}

class InspectRef extends InspectNode {
  constructor (depth, opts) {
    super(depth, '[circular *]'.length, opts)

    this.refs = opts.references
    this.count = 0
    this.circular = false
  }

  get id () {
    return this.refs.id(this)
  }

  increment () {
    return ++this.count
  }

  decrement () {
    return --this.count
  }

  toString (opts = {}) {
    const {
      offset = 0,
      pad = 0,
      indent = 0
    } = opts

    const value = this.pad(pad, '[circular *' + this.id + ']')

    return offset ? value : this.indent(indent, value)
  }
}

class InspectLeaf extends InspectNode {
  constructor (value, color, depth, opts) {
    const length = value.length

    super(depth, length, opts)

    this.value = value
    this.color = opts.colors && color
  }

  toString (opts = {}) {
    const {
      offset = 0,
      pad = 0,
      indent = 0
    } = opts

    let value = this.pad(pad, this.value)

    if (this.color) value = this.color + value + ansiEscapes.modifierReset

    return offset ? value : this.indent(indent, value)
  }
}

class InspectPair extends InspectNode {
  constructor (delim, left, right, depth, opts) {
    const length = (
      left.length +
      delim.length +
      right.length
    )

    super(depth, length, opts)

    this.delim = delim
    this.left = left
    this.right = right
  }

  toString (opts = {}) {
    const {
      indent = 0
    } = opts

    return this.indent(indent, this.left + this.delim + this.right.toString({ indent, offset: this.left.length + this.delim.length }))
  }
}

class InspectSequence extends InspectNode {
  constructor (header, footer, delim, values, depth, opts) {
    const {
      ref = null,
      tabulate = false
    } = opts

    const length = (
      (ref && ref.circular ? '<ref *>'.length + 1 : 0) +
      header.length +
      values.reduce((length, value, i) => length + value.length + (i === 0 ? 0 : delim.length), 0) +
      footer.length
    )

    super(depth, length, opts)

    this.header = header
    this.footer = footer
    this.delim = delim
    this.values = values
    this.ref = ref
    this.tabulate = tabulate
  }

  toString (opts = {}) {
    const {
      offset = 0,
      indent = 0
    } = opts

    const split = this.values.length && (
      offset + this.length > this.breakLength ||
      indent * 2 + this.length > this.breakLength
    )

    let header = this.header

    if (this.ref && this.ref.circular) {
      header = '<ref *' + this.ref.id + '> ' + header
    }

    if (this.values.length === 0) {
      header = header.trimEnd()
    }

    if (offset === 0) {
      header = this.indent(indent, header)
    }

    if (split) {
      header = header.trimEnd() + '\n'
    }

    let string = header

    let columns = 1
    let pad = 0

    if (this.tabulate) {
      const widest = this.values.reduce((length, value) => Math.max(length, value.length), 0)

      if (widest) {
        columns = Math.max(columns, Math.floor((this.breakLength - indent * 2) / (widest + this.delim.length)))

        if (columns > 1) pad = widest
      }
    }

    for (let i = 0, n = this.values.length; i < n; i++) {
      const value = this.values[i]

      if (split) {
        let part

        if (i % columns === 0) {
          part = value.toString({ indent: indent + 1, pad })
        } else {
          part = value.toString({ pad })
        }

        string += part

        if (i < n - 1) {
          if (i % columns === columns - 1) {
            string += this.delim.trimEnd() + '\n'
          } else {
            string += this.delim
          }
        }
      } else {
        if (i > 0) string += this.delim

        string += value.toString({ offset: string.length })
      }
    }

    let footer = this.footer

    if (this.values.length === 0) {
      footer = footer.trimStart()
    }

    if (split) {
      string += '\n' + this.indent(indent, footer.trimStart())
    } else {
      string += footer
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
  return new InspectLeaf('undefined', ansiEscapes.colorBlack, depth, opts)
}

function inspectNull (depth, opts) {
  return new InspectLeaf('null', ansiEscapes.modifierBold, depth, opts)
}

function inspectBoolean (value, depth, opts) {
  return new InspectLeaf(value.toString(), ansiEscapes.colorYellow, depth, opts)
}

function inspectNumber (value, depth, opts) {
  let string

  if (Object.is(value, -0)) {
    string = '-0'
  } else {
    string = value.toString(10)
  }

  return new InspectLeaf(string, ansiEscapes.colorYellow, depth, opts)
}

function inspectBigInt (value, depth, opts) {
  return new InspectLeaf(value.toString(10) + 'n', ansiEscapes.colorYellow, depth, opts)
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

  return new InspectLeaf('\'' + string + '\'', ansiEscapes.colorGreen, depth, opts)
}

function inspectSymbol (value, depth, opts) {
  return new InspectLeaf(value.toString(), ansiEscapes.colorGreen, depth, opts)
}

function inspectKey (value, depth, opts) {
  if (PLAIN_KEY.test(value)) {
    return new InspectLeaf(value, null, depth, opts)
  } else {
    return inspectValue(value, depth, opts)
  }
}

function inspectObject (object, depth, opts) {
  if (object instanceof Array) return inspectArray(object, depth, opts)
  if (object instanceof Error) return inspectError(object, depth, opts)
  if (object instanceof Buffer) return inspectBuffer(object, depth, opts)

  const refs = opts.references

  let ref = refs.get(object)
  if (ref === null) {
    ref = new InspectRef(depth, opts)
    refs.set(object, ref)
  } else if (ref.count) {
    ref.circular = true
    return ref
  }

  ref.increment()

  const values = []

  for (const key in object) {
    values.push(new InspectPair(': ', inspectKey(key, depth + 1, opts), inspectValue(object[key], depth + 1, opts), depth + 1, opts))
  }

  ref.decrement()

  let header = '{ '

  if (object.constructor) {
    const name = object.constructor.name

    if (name && name !== 'Object') {
      header = object.constructor.name + ' ' + header
    }
  }

  return new InspectSequence(header, ' }', ', ', values, depth, { ...opts, ref })
}

function inspectArray (array, depth, opts) {
  const refs = opts.references

  let ref = refs.get(array)
  if (ref === null) {
    ref = new InspectRef(depth, opts)
    refs.set(array, ref)
  } else if (ref.count) {
    ref.circular = true
    return ref
  }

  ref.increment()

  const values = []

  for (const key in array) {
    const value = inspectValue(array[key], depth + 1, opts)

    if (Number.isInteger(+key)) {
      values.push(value)
    } else {
      values.push(new InspectPair(': ', inspectKey(key, depth + 1, opts), value, depth + 1, opts))
    }
  }

  ref.decrement()

  return new InspectSequence('[ ', ' ]', ', ', values, depth, { ...opts, ref, tabulate: true })
}

function inspectError (error, depth, opts) {
  return new InspectLeaf(error.stack, null, depth, opts)
}

function inspectBuffer (buffer, depth, opts) {
  const values = []

  for (let i = 0, n = buffer.byteLength; i < n; i++) {
    values.push(new InspectLeaf(buffer[i].toString(16).padStart(2, '0'), null, depth + 1, opts))
  }

  return new InspectSequence('<Buffer ', '>', ' ', values, depth, { ...opts, tabulate: true })
}

function inspectFunction (fn, depth, opts) {
  if (fn.toString().startsWith('class')) return inspectClass(fn, depth, opts)

  return new InspectLeaf('[function ' + (fn.name ? fn.name : '(anonymous)') + ']', ansiEscapes.colorCyan, depth, opts)
}

function inspectClass (ctor, depth, opts) {
  return new InspectLeaf('[class ' + (ctor.name ? ctor.name : '(anonymous)') + ']', ansiEscapes.colorCyan, depth, opts)
}
