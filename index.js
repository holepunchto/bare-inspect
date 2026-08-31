const ansiEscapes = require('bare-ansi-escapes')
const getType = require('bare-type')
const binding = require('./binding')

const defaultDepth = 2
const defaultBreakLength = 80
const defaultMaxArrayLength = 40

module.exports = exports = function inspect(value, opts = {}) {
  const {
    colors = false,
    depth = defaultDepth,
    breakLength = defaultBreakLength,
    stylize = defaultStylize(colors)
  } = opts

  const references = new InspectRefMap()

  const tree = inspectValue(value, 0, {
    colors,
    depth,
    breakLength,
    stylize,
    references
  })

  return tree.toString()
}

exports.styles = {
  bigint: ansiEscapes.colorYellow,
  boolean: ansiEscapes.colorYellow,
  date: ansiEscapes.colorMagenta,
  module: ansiEscapes.modifierUnderline,
  name: ansiEscapes.modifierReset,
  null: ansiEscapes.modifierBold,
  number: ansiEscapes.colorYellow,
  regexp: ansiEscapes.colorRed,
  special: ansiEscapes.colorCyan,
  string: ansiEscapes.colorGreen,
  symbol: ansiEscapes.colorGreen,
  undefined: ansiEscapes.colorBrightBlack
}

const styles = exports.styles

function defaultStylize(colors) {
  return function stylize(value, style) {
    const color = colors && styles[style]

    if (color) return color + value + ansiEscapes.modifierReset

    return value
  }
}

class InspectRefMap {
  constructor() {
    this.refs = new WeakMap()
    this.ids = new WeakMap()
    this.nextId = 1
  }

  has(object) {
    return this.refs.has(object)
  }

  get(object) {
    return this.refs.get(object) || null
  }

  set(object, ref) {
    this.refs.set(object, ref)
  }

  id(object) {
    let id = this.ids.get(object)
    if (id) return id

    id = this.nextId++
    this.ids.set(object, id)

    return id
  }
}

class InspectNode {
  constructor(depth, length, opts) {
    const { breakLength = defaultBreakLength, breakAlways = false } = opts

    this.depth = depth
    this.length = length
    this.breakLength = breakLength
    this.breakAlways = breakAlways
  }

  pad(n, string) {
    return string.padStart(n, ' ')
  }

  indent(n, string) {
    return '  '.repeat(n) + string
  }
}

class InspectRef extends InspectNode {
  constructor(depth, opts) {
    super(depth, '[circular *]'.length, opts)

    this.refs = opts.references
    this.count = 0
    this.circular = false
    this.color = opts.colors && styles.special
  }

  get id() {
    return this.refs.id(this)
  }

  increment() {
    return ++this.count
  }

  decrement() {
    return --this.count
  }

  toString(opts = {}) {
    const { offset = 0, pad = 0, indent = 0 } = opts

    let value = this.pad(pad, '[circular *' + this.id + ']')

    if (this.color) value = this.color + value + ansiEscapes.modifierReset

    return offset ? value : this.indent(indent, value)
  }
}

class InspectLeaf extends InspectNode {
  constructor(value, color, depth, opts) {
    const length = value.length

    if (value.includes('\n')) {
      value = value.replaceAll('\n', '\n' + '  '.repeat(depth))

      opts = { ...opts, breakAlways: true }
    }

    super(depth, length, opts)

    this.value = value
    this.color = opts.colors && color
  }

  toString(opts = {}) {
    const { offset = 0, pad = 0, indent = 0 } = opts

    let value = this.pad(pad, this.value)

    if (this.color) value = this.color + value + ansiEscapes.modifierReset

    return offset ? value : this.indent(indent, value)
  }
}

class InspectPair extends InspectNode {
  constructor(delim, left, right, depth, opts) {
    const length = left.length + delim.length + right.length

    if (left.breakAlways || right.breakAlways) {
      opts = { ...opts, breakAlways: true }
    }

    super(depth, length, opts)

    this.delim = delim
    this.left = left
    this.right = right
  }

  toString(opts = {}) {
    const { indent = 0 } = opts

    return this.indent(
      indent,
      this.left +
        this.delim +
        this.right.toString({
          indent,
          offset: this.left.length + this.delim.length
        })
    )
  }
}

class InspectSuspension extends InspectNode {
  constructor(overflow, depth, opts) {
    const label = `... ${overflow} more`

    super(depth, label.length, opts)

    this.label = label
  }

  toString(opts = {}) {
    const { indent = 0 } = opts

    return this.indent(indent, this.label)
  }
}

class InspectSequence extends InspectNode {
  constructor(header, footer, delim, values, ref, depth, opts) {
    const { tabulate = false } = opts

    const length =
      (ref.circular ? '<ref *>'.length + 1 : 0) +
      header.length +
      values.reduce((length, value, i) => length + value.length + (i === 0 ? 0 : delim.length), 0) +
      footer.length

    if (values.some((value) => value.breakAlways)) {
      opts = { ...opts, breakAlways: true }
    }

    super(depth, length, opts)

    this.header = header
    this.footer = footer
    this.delim = delim
    this.values = values
    this.ref = ref
    this.tabulate = tabulate
  }

  toString(opts = {}) {
    const { offset = 0, indent = 0 } = opts

    const split =
      this.breakAlways ||
      (this.values.length &&
        (offset + this.length > this.breakLength || indent * 2 + this.length > this.breakLength))

    let header = this.header

    if (this.ref.circular) {
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
      const widest = this.values.reduce(
        (length, value) => (value.breakAlways ? length : Math.max(length, value.length)),
        0
      )

      if (widest) {
        columns = Math.max(
          columns,
          Math.floor((this.breakLength - indent * 2) / (widest + this.delim.length))
        )

        if (columns > 1) pad = widest
      }
    }

    for (let i = 0, n = this.values.length, offset = 0; i < n; i++) {
      const value = this.values[i]

      if (split) {
        let part

        if (i % columns === 0 || value.breakAlways) {
          part = value.toString({ indent: indent + 1, pad })
        } else {
          part = value.toString({ pad })
        }

        string += part

        if (i < n - 1) {
          if (i % columns === columns - 1 || this.values[i + 1].breakAlways) {
            string += this.delim.trimEnd() + '\n'
          } else {
            string += this.delim
          }
        }
      } else {
        if (i > 0) string += this.delim

        string += value.toString({ offset })

        // TODO Lunte thinks this refers to `const { offset }...` further up
        offset += value.length // eslint-disable-line
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

function inspectValue(value, depth, opts) {
  const type = getType(value)

  if (type.isUndefined()) return inspectUndefined(depth, opts)
  if (type.isNull()) return inspectNull(depth, opts)
  if (type.isBoolean()) return inspectBoolean(value, depth, opts)
  if (type.isNumber()) return inspectNumber(value, depth, opts)
  if (type.isBigInt()) return inspectBigInt(value, depth, opts)
  if (type.isString()) return inspectString(value, depth, opts)
  if (type.isSymbol()) return inspectSymbol(value, depth, opts)
  if (type.isObject()) return inspectObject(type, value, depth, opts)
  if (type.isFunction()) return inspectFunction(type, value, depth, opts)
  if (type.isExternal()) return inspectExternal(value, opts, opts)
}

function inspectUndefined(depth, opts) {
  return new InspectLeaf('undefined', styles.undefined, depth, opts)
}

function inspectNull(depth, opts) {
  return new InspectLeaf('null', styles.null, depth, opts)
}

function inspectBoolean(value, depth, opts) {
  return new InspectLeaf(value.toString(), styles.boolean, depth, opts)
}

function inspectNumber(value, depth, opts) {
  let string

  if (Object.is(value, -0)) {
    string = '-0'
  } else {
    string = value.toString(10)
  }

  return new InspectLeaf(string, styles.number, depth, opts)
}

function inspectBigInt(value, depth, opts) {
  return new InspectLeaf(value.toString(10) + 'n', styles.bigint, depth, opts)
}

const STRING_ESCAPES = /[\ud800-\udbff][\udc00-\udfff]|[\u0000-\u001f'\\\ud800-\udfff]/g

function inspectString(value, depth, opts) {
  // https://tc39.es/ecma262/multipage/structured-data.html#sec-quotejsonstring
  const string = value.replace(STRING_ESCAPES, (match) => {
    if (match.length === 2) return match

    switch (match) {
      case "'":
        return "\\'"
      case '\\':
        return '\\\\'
      case '\b':
        return '\\b'
      case '\t':
        return '\\t'
      case '\n':
        return '\\n'
      case '\f':
        return '\\f'
      case '\r':
        return '\\r'
      default:
        return '\\u' + match.charCodeAt(0).toString(16).padStart(4, '0')
    }
  })

  return new InspectLeaf("'" + string + "'", styles.string, depth, opts)
}

function inspectSymbol(value, depth, opts) {
  return new InspectLeaf(value.toString(), styles.symbol, depth, opts)
}

const PLAIN_KEY = /^[a-zA-Z_][a-zA-Z_0-9]*$/

function inspectKey(value, depth, opts) {
  if (typeof value === 'symbol') {
    return inspectValue(value, depth, opts)
  } else if (PLAIN_KEY.test(value)) {
    return new InspectLeaf(value, null, depth, opts)
  } else {
    return inspectValue(value, depth, opts)
  }
}

function inspectObject(type, object, depth, opts) {
  const refs = opts.references

  let ref = refs.get(object)
  if (ref === null) {
    ref = new InspectRef(depth, opts)
    refs.set(object, ref)
  } else if (ref.count) {
    ref.circular = true
    return ref
  }

  const maxDepth = typeof opts.depth === 'number' ? opts.depth : Infinity

  if (maxDepth < depth) {
    const name = nameOf(object)

    return new InspectLeaf('[' + (name || 'Object') + ']', styles.special, depth, opts)
  }

  const { value: inspect } = attempt(
    () => object[Symbol.for('bare.inspect')] || object[Symbol.for('nodejs.util.inspect.custom')]
  )

  if (typeof inspect === 'function') {
    const { value, threw, error } = attempt(() =>
      inspect.call(
        object,
        typeof opts.depth === 'number' ? opts.depth - depth : null,
        {
          colors: opts.colors,
          breakLength: opts.breakLength,
          stylize: opts.stylize
        },
        exports
      )
    )

    if (threw) {
      return new InspectLeaf(
        '<inspect threw ' + errorLabel(error) + '>',
        styles.special,
        depth,
        opts
      )
    }

    if (typeof value === 'object' && value !== null) {
      refs.set(value, ref)
    }

    if (typeof value !== 'string') {
      return inspectValue(value, depth, opts)
    }

    return new InspectLeaf(value, null, depth, opts)
  }

  if (type.isArray()) return inspectArray(object, ref, depth, opts)
  if (type.isDate()) return inspectDate(object, ref, depth, opts)
  if (type.isRegExp()) return inspectRegExp(object, ref, depth, opts)
  if (type.isError()) return inspectError(object, ref, depth, opts)
  if (type.isPromise()) return inspectPromise(object, ref, depth, opts)
  if (type.isMap()) return inspectMap(object, ref, depth, opts)
  if (type.isSet()) return inspectSet(object, ref, depth, opts)
  if (type.isWeakMap()) return inspectWeakMap(object, ref, depth, opts)
  if (type.isWeakSet()) return inspectWeakSet(object, ref, depth, opts)
  if (type.isWeakRef()) return inspectWeakRef(object, ref, depth, opts)
  if (type.isArrayBuffer()) return inspectArrayBuffer(object, ref, depth, opts)
  if (type.isSharedArrayBuffer()) return inspectSharedArrayBuffer(object, ref, depth, opts)
  if (type.isTypedArray()) return inspectTypedArray(object, ref, depth, opts)
  if (type.isDataView()) return inspectDataView(object, ref, depth, opts)

  ref.increment()

  const values = []

  for (const key of keysOf(object)) {
    if (key === 'constructor') continue

    values.push(
      new InspectPair(
        ': ',
        inspectKey(key, depth + 1, opts),
        inspectProperty(object, key, depth + 1, opts),
        depth + 1,
        opts
      )
    )
  }

  for (const key of symbolsOf(object)) {
    values.push(
      new InspectPair(
        ': ',
        inspectKey(key, depth + 1, opts),
        inspectProperty(object, key, depth + 1, opts),
        depth + 1,
        opts
      )
    )
  }

  ref.decrement()

  let header = '{ '

  const { value: tag } = attempt(() => object[Symbol.toStringTag])

  if (typeof tag === 'string' && tag) header = '[' + tag + '] ' + header

  const name = nameOf(object)

  if (name && name !== 'Object') header = name + ' ' + header

  return new InspectSequence(header, ' }', ', ', values, ref, depth, opts)
}

function inspectArray(array, ref, depth, opts) {
  const { maxArrayLength = defaultMaxArrayLength } = opts

  ref.increment()

  const values = []

  let remaining = Math.max(maxArrayLength, 0)

  for (let i = 0, n = array.length; i < n; i++) {
    if (remaining-- === 0) {
      values.push(
        new InspectSuspension(array.length - values.length, depth + 1, {
          ...opts,
          breakAlways: true
        })
      )

      break
    }

    values.push(inspectProperty(array, i, depth + 1, opts))
  }

  for (const key of nonIndexKeysOf(array)) {
    values.push(
      new InspectPair(
        ': ',
        inspectKey(key, depth + 1, opts),
        inspectProperty(array, key, depth + 1, opts),
        depth + 1,
        { ...opts, breakAlways: remaining < 0 }
      )
    )
  }

  ref.decrement()

  let header = '[ '

  const name = nameOf(array)

  if (name && name !== 'Array') header = name + '(' + array.length + ') ' + header

  return new InspectSequence(header, ' ]', ', ', values, ref, depth, {
    ...opts,
    tabulate: true
  })
}

function inspectProperty(object, key, depth, opts) {
  const descriptor = descriptorOf(object, key)

  if (descriptor === null) {
    return new InspectLeaf('<unreadable>', styles.special, depth, opts)
  }

  if (descriptor === undefined) return inspectUndefined(depth, opts)

  if ('value' in descriptor === false) {
    let label = '[getter/setter]'

    if (descriptor.get === undefined) label = '[setter]'
    else if (descriptor.set === undefined) label = '[getter]'

    return new InspectLeaf(label, styles.special, depth, opts)
  }

  return inspectValue(descriptor.value, depth, opts)
}

function inspectDate(date, ref, depth, opts) {
  const { value: time } = attempt(() => date.getTime())

  if (Number.isNaN(time)) {
    return new InspectLeaf('Invalid Date', styles.date, depth, opts)
  }

  const { value: string } = attempt(() => date.toISOString())

  return new InspectLeaf(string || '[Date]', styles.date, depth, opts)
}

function inspectRegExp(regExp, ref, depth, opts) {
  const { value: string } = attempt(() => regExp.toString())

  return new InspectLeaf(string || '[RegExp]', styles.regexp, depth, opts)
}

function inspectError(error, ref, depth, opts) {
  let header = attempt(() => error.stack).value

  if (typeof header === 'string') {
    if (depth > 0) {
      header = header.replaceAll('\n', '\n' + '  '.repeat(depth))
    }
  } else {
    header = attempt(() => error.toString()).value

    if (typeof header !== 'string') header = errorLabel(error)
  }

  const builtins = ['cause']

  const { value: name } = attempt(() => error.name)

  if (name === 'AggregateError') {
    builtins.push('errors')
  } else if (name === 'SuppressedError') {
    builtins.push('error', 'suppressed')
  }

  const values = []

  for (const key of builtins) {
    if (descriptorOf(error, key) === undefined) continue

    values.push(
      new InspectPair(
        ': ',
        new InspectLeaf('[' + key + ']', null, depth + 1, opts),
        inspectProperty(error, key, depth + 1, opts),
        depth + 1,
        opts
      )
    )
  }

  for (const key of keysOf(error)) {
    if (key === 'constructor' || builtins.includes(key)) continue

    values.push(
      new InspectPair(
        ': ',
        inspectKey(key, depth + 1, opts),
        inspectProperty(error, key, depth + 1, opts),
        depth + 1,
        opts
      )
    )
  }

  if (values.length === 0) return new InspectLeaf(header, null, depth, opts)

  return new InspectSequence(header + ' {', ' }', ', ', values, ref, depth, opts)
}

function inspectPromise(promise, ref, depth, opts) {
  ref.increment()

  const state = binding.getPromiseState(promise)

  const values = []

  switch (state) {
    case 0: // Pending
      values.push(new InspectLeaf('<pending>', styles.special, depth, opts))
      break

    case 1: // Fulfilled
      values.push(inspectValue(binding.getPromiseResult(promise), depth, opts))
      break

    case 2: // Rejected
      values.push(
        new InspectLeaf('<rejected>', styles.special, depth, opts),
        inspectValue(binding.getPromiseResult(promise), depth, opts)
      )
  }

  ref.decrement()

  const header = (nameOf(promise) || 'Promise') + ' { '

  return new InspectSequence(header, ' }', ' ', values, ref, depth, opts)
}

function inspectMap(map, ref, depth, opts) {
  const { maxArrayLength = defaultMaxArrayLength, maxMapLength = maxArrayLength } = opts

  ref.increment()

  const values = []

  let remaining = maxMapLength

  const { value: size } = attempt(() => map.size)

  attempt(() => {
    for (const entry of map) {
      if (remaining-- === 0) {
        values.push(
          new InspectSuspension(size - values.length, depth + 1, {
            ...opts,
            breakAlways: true
          })
        )
        break
      }

      values.push(
        new InspectPair(
          ' => ',
          inspectValue(entry[0], depth + 1, opts),
          inspectValue(entry[1], depth + 1, opts),
          depth + 1,
          opts
        )
      )
    }
  })

  for (const key of keysOf(map)) {
    if (key === 'constructor') continue

    const value = inspectProperty(map, key, depth + 1, opts)

    values.push(
      new InspectPair(': ', inspectKey(key, depth + 1, opts), value, depth + 1, {
        ...opts,
        breakAlways: remaining < 0
      })
    )
  }

  ref.decrement()

  const header = (nameOf(map) || 'Map') + '(' + size + ') { '

  return new InspectSequence(header, ' }', ', ', values, ref, depth, {
    ...opts,
    tabulate: true
  })
}

function inspectSet(set, ref, depth, opts) {
  const { maxArrayLength = defaultMaxArrayLength, maxSetLength = maxArrayLength } = opts

  ref.increment()

  const values = []

  let remaining = maxSetLength

  const { value: size } = attempt(() => set.size)

  attempt(() => {
    for (const entry of set) {
      if (remaining-- === 0) {
        values.push(
          new InspectSuspension(size - values.length, depth + 1, {
            ...opts,
            breakAlways: true
          })
        )
        break
      }

      values.push(inspectValue(entry, depth + 1, opts))
    }
  })

  for (const key of keysOf(set)) {
    if (key === 'constructor') continue

    const value = inspectProperty(set, key, depth + 1, opts)

    values.push(
      new InspectPair(': ', inspectKey(key, depth + 1, opts), value, depth + 1, {
        ...opts,
        breakAlways: remaining < 0
      })
    )
  }

  ref.decrement()

  const header = (nameOf(set) || 'Set') + '(' + size + ') { '

  return new InspectSequence(header, ' }', ', ', values, ref, depth, {
    ...opts,
    tabulate: true
  })
}

function inspectWeakMap(weakMap, ref, depth, opts) {
  const header = (nameOf(weakMap) || 'WeakMap') + ' { '

  return new InspectSequence(
    header,
    ' }',
    ' ',
    [new InspectLeaf('<items unknown>', styles.special, depth + 1, opts)],
    ref,
    depth,
    opts
  )
}

function inspectWeakSet(weakSet, ref, depth, opts) {
  const header = (nameOf(weakSet) || 'WeakSet') + ' { '

  return new InspectSequence(
    header,
    ' }',
    ' ',
    [new InspectLeaf('<items unknown>', styles.special, depth + 1, opts)],
    ref,
    depth,
    opts
  )
}

function inspectWeakRef(weakRef, ref, depth, opts) {
  const { value: target } = attempt(() => weakRef.deref())

  let value

  if (target === undefined) {
    value = new InspectLeaf('<cleared>', styles.special, depth + 1, opts)
  } else {
    value = inspectValue(target, depth + 1, opts)
  }

  const header = (nameOf(weakRef) || 'WeakRef') + ' { '

  return new InspectSequence(header, ' }', ' ', [value], ref, depth, opts)
}

function inspectArrayBuffer(arrayBuffer, ref, depth, opts) {
  ref.increment()

  const values = []

  for (const key of ['byteLength']) {
    values.push(
      new InspectPair(
        ': ',
        inspectKey(key, depth + 1, opts),
        inspectValue(arrayBuffer[key], depth + 1, opts),
        depth + 1,
        opts
      )
    )
  }

  ref.decrement()

  const header = (nameOf(arrayBuffer) || 'ArrayBuffer') + ' { '

  return new InspectSequence(header, ' }', ', ', values, ref, depth, opts)
}

function inspectSharedArrayBuffer(sharedArrayBuffer, ref, depth, opts) {
  ref.increment()

  const values = []

  for (const key of ['byteLength']) {
    values.push(
      new InspectPair(
        ': ',
        inspectKey(key, depth + 1, opts),
        inspectValue(sharedArrayBuffer[key], depth + 1, opts),
        depth + 1,
        opts
      )
    )
  }

  ref.decrement()

  const header = (nameOf(sharedArrayBuffer) || 'SharedArrayBuffer') + ' { '

  return new InspectSequence(header, ' }', ', ', values, ref, depth, opts)
}

function inspectTypedArray(typedArray, ref, depth, opts) {
  if (Buffer.isBuffer(typedArray)) {
    return inspectBuffer(typedArray, ref, depth, opts)
  }

  const { maxArrayLength = defaultMaxArrayLength, maxTypedArrayLength = maxArrayLength } = opts

  ref.increment()

  const values = []

  let remaining = Math.max(maxTypedArrayLength, 0)

  for (let i = 0, n = typedArray.length; i < n; i++) {
    if (remaining-- === 0) {
      values.push(
        new InspectSuspension(typedArray.length - values.length, depth + 1, {
          ...opts,
          breakAlways: true
        })
      )

      break
    }

    values.push(inspectValue(typedArray[i], depth + 1, opts))
  }

  for (const key of nonIndexKeysOf(typedArray)) {
    values.push(
      new InspectPair(
        ': ',
        inspectKey(key, depth + 1, opts),
        inspectProperty(typedArray, key, depth + 1, opts),
        depth + 1,
        { ...opts, breakAlways: remaining < 0 }
      )
    )
  }

  ref.decrement()

  const header = (nameOf(typedArray) || 'TypedArray') + '(' + typedArray.length + ') [ '

  return new InspectSequence(header, ' ]', ', ', values, ref, depth, {
    ...opts,
    tabulate: true
  })
}

function inspectBuffer(buffer, ref, depth, opts) {
  const { maxArrayLength = defaultMaxArrayLength, maxBufferLength = maxArrayLength } = opts

  ref.increment()

  const values = []

  let remaining = Math.max(maxBufferLength, 0)

  for (let i = 0, n = buffer.byteLength; i < n; i++) {
    if (remaining-- === 0) {
      values.push(
        new InspectSuspension(buffer.length - values.length, depth + 1, {
          ...opts,
          breakAlways: true
        })
      )

      break
    }

    values.push(new InspectLeaf(buffer[i].toString(16).padStart(2, '0'), null, depth + 1, opts))
  }

  for (const key of nonIndexKeysOf(buffer)) {
    values.push(
      new InspectPair(
        ': ',
        inspectKey(key, depth + 1, opts),
        inspectProperty(buffer, key, depth + 1, opts),
        depth + 1,
        { ...opts, breakAlways: remaining < 0 }
      )
    )
  }

  ref.decrement()

  return new InspectSequence('<Buffer ', '>', ' ', values, ref, depth, {
    ...opts,
    tabulate: true
  })
}

function inspectDataView(dataView, ref, depth, opts) {
  ref.increment()

  const values = []

  for (const key of ['byteLength', 'byteOffset', 'buffer']) {
    values.push(
      new InspectPair(
        ': ',
        inspectKey(key, depth + 1, opts),
        inspectValue(dataView[key], depth + 1, opts),
        depth + 1,
        opts
      )
    )
  }

  for (const key of nonIndexKeysOf(dataView)) {
    values.push(
      new InspectPair(
        ': ',
        inspectKey(key, depth + 1, opts),
        inspectProperty(dataView, key, depth + 1, opts),
        depth + 1,
        opts
      )
    )
  }

  ref.decrement()

  const header = (nameOf(dataView) || 'DataView') + ' { '

  return new InspectSequence(header, ' }', ', ', values, ref, depth, opts)
}

function inspectFunction(type, fn, depth, opts) {
  const { value: source } = attempt(() => fn.toString())

  if (typeof source === 'string' && source.startsWith('class')) {
    return inspectClass(fn, depth, opts)
  }

  let tag = 'function'

  if (type.isGeneratorFunction()) tag = 'generator ' + tag
  if (type.isAsyncFunction()) tag = 'async ' + tag

  const { value: name } = attempt(() => fn.name)

  return new InspectLeaf(
    '[' + tag + ' ' + (name ? name : '(anonymous)') + ']',
    styles.special,
    depth,
    opts
  )
}

function inspectClass(ctor, depth, opts) {
  const { value: name } = attempt(() => ctor.name)

  return new InspectLeaf(
    '[class ' + (name ? name : '(anonymous)') + ']',
    styles.special,
    depth,
    opts
  )
}

function inspectExternal(external, depth, opts) {
  return new InspectLeaf(
    '[external 0x' + binding.getExternal(external).toString(16) + ']',
    styles.special,
    depth,
    opts
  )
}

// An inspection must not fail on the value it inspects, so everything read from
// that value is read through one of the helpers below. Values are read for
// their own sake, which is why an accessor is reported rather than called, but
// the labels an inspection puts around them are read as they are written.

function attempt(fn) {
  try {
    return { value: fn(), threw: false, error: null }
  } catch (err) {
    return { value: undefined, threw: true, error: err }
  }
}

// The name a value is labelled with, which is the name of its constructor.
function nameOf(object) {
  const { value: name } = attempt(() => object.constructor.name)

  return typeof name === 'string' ? name : ''
}

function keysOf(object) {
  const keys = []

  // A partial list is the best that can be had from a value that stops
  // answering halfway through.
  attempt(() => {
    for (const key in object) keys.push(key)
  })

  return keys
}

function symbolsOf(object) {
  return attempt(() => Object.getOwnPropertySymbols(object)).value || []
}

function nonIndexKeysOf(object) {
  return attempt(() => binding.getOwnNonIndexPropertyNames(object)).value || []
}

// Returns the descriptor, `undefined` if the property is absent, or `null` if
// the lookup itself could not be made, as with a proxy that throws.
function descriptorOf(object, key) {
  let target = object

  while (target !== null && target !== undefined) {
    const { value: descriptor, threw } = attempt(() => Object.getOwnPropertyDescriptor(target, key))

    if (threw) return null

    if (descriptor) return descriptor

    const { value: prototype, threw: unreadable } = attempt(() => Object.getPrototypeOf(target))

    if (unreadable) return null

    target = prototype
  }

  return undefined
}

function errorLabel(err) {
  if (err === null || typeof err !== 'object') return 'a non-error'

  const { value: message } = attempt(() => err.message)

  const name = nameOf(err) || 'Error'

  return typeof message === 'string' && message ? name + ': ' + message : name
}
