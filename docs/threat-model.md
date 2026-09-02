# Threat model

## What this is

`bare-inspect` is compiled into Bare. It is listed in `src/builtins.json`, so every Bare process has it. That holds whether or not the process sealed, and no code has to load anything to reach it.

So this addon is part of Bare, and [Bare's threat model](https://github.com/holepunchto/bare/blob/main/docs/threat-model.md) covers it. Read that one first. This one only says where this addon sits in it.

## What it inherits

- **The promise.** Bare promises a sealed process gets no new native code. This addon is native code that is already in, so the seal neither adds it nor takes it away.
- **The attacker.** Untrusted JavaScript in a sealed process. It writes what it likes, runs on as many threads as it wants, and calls anything it can reach in any order and all at once. It can reach all of this addon.
- **The trust.** This addon is trusted, because Bare compiles it in. Whatever you compile in is your security policy, and this is one of the things you picked.
- **The walls.** The same table applies. A thread is not a wall and neither is a realm, so nothing here gets to assume it is alone.
- **The rules.** What Bare says to report, and what Bare says is not a bug, is the same here.

## What counts

- **Counts:** `binding.c` and the JavaScript that ships with it. Sealed JavaScript reaches all of it without loading a thing.
- **Does not count:** tests, benchmarks, and scratch code.

## What this addon adds

Three reads over values it is handed: a promise's state, a settled promise's result, and an object's own non-index property names. On top of those it turns values into strings.

It only looks at what the caller already holds, so it gives away nothing about the process that the caller could not have found another way. Reading promise state is the one thing here that JavaScript cannot do on its own, and it is still a read of a value you have.

Externals get an opaque token instead of their address. Inspecting one tells you that two externals are the same object, and nothing more. Addresses do not reach JavaScript.

## Where the risk is

Formatting runs over objects an attacker built, including proxies, getters and cycles. `console` reaches it in a default build, so it runs on far more than its callers expect.

## What to report

- Any address, or any other host detail, that reaches JavaScript through inspection
- Memory bugs in `binding.c` that JavaScript can reach
- Anything on Bare's report list
