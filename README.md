# callbag-state
[![tests](https://img.shields.io/github/workflow/status/loreanvictor/callbag-state/Test%20and%20Report%20Coverage?label=tests&logo=mocha&logoColor=green&style=flat-square)](https://github.com/loreanvictor/callbag-state/actions?query=workflow%3A%22Test+and+Report+Coverage%22)
[![coverage](https://img.shields.io/codecov/c/github/loreanvictor/callbag-state?logo=codecov&style=flat-square)](https://codecov.io/gh/loreanvictor/callbag-state)
[![version](https://img.shields.io/npm/v/callbag-state?logo=npm&style=flat-square)](https://www.npmjs.com/package/callbag-state)

Callbag-based state management.
```bash
npm i callbag-state
```
```ts
import state from 'callbag-state';
import subscribe from 'callbag-subscribe';

const s = state(42);
subscribe(v => console.log('GOT: ' + v))(s);
console.log(s.get());
s.set(43);
console.log(s.get());

// > GOT: 42
// > 42
// > GOT: 43
// > 43
```
[► TRY IT!](https://stackblitz.com/edit/callbag-state-demo1?devtoolsheight=33&embed=1&file=index.ts)

<br><br>

## Usage

👉 Track the state and mutate it via `.set()` and `.get()`:
```ts
import state from 'callbag-state';
import subscribe from 'callbag-subscribe';

const s = state(42);
subscribe(console.log)(s);

s.set(43);
s.set(s.get() + 1);

// > 42
// > 43
// > 44
```
[► TRY IT!](https://stackblitz.com/edit/callbag-state-demo2?devtoolsheight=33&embed=1&file=index.ts)

<br>

👉 Track sub-states:
```ts
import state from 'callbag-state';
import subscribe from 'callbag-subscribe';

const s = state({x : 42});
const x = s.sub('x');
subscribe(console.log)(s);

x.set(43);
x.set(x.get() + 1);

// > {x: 42}
// > {x: 43}
// > {x: 44}
```
[► TRY IT!](https://stackblitz.com/edit/callbag-state-demo3?devtoolsheight=33&embed=1&file=index.ts)

<br>

👉 Changes propagate properly wherever you make them on state-tree:
```ts
import state from 'callbag-state';
import subscribe from 'callbag-subscribe';

const s = state([{x : 42}, {x: 21}]);

subscribe(console.log)(s.sub(0).sub('x'));

s.set([{x: 44}]);
s.sub(0).set({x: 43});
s.sub(0).sub('x').set(45);

// > 42
// > 43
// > 44
// > 45
```
[► TRY IT!](https://stackblitz.com/edit/callbag-state-demo4?devtoolsheight=33&embed=1&file=index.ts)

<br>

👉 Track changes:

```ts
import state from 'callbag-state';
import subscribe from 'callbag-subscribe';

const s = state([1, 2, 3, 4]);
subscribe(console.log)(s.downstream());

s.set([5, 2, 3, 4, 1]);

// > {
// >   value: [5, 2, 3, 4, 1],
// >   trace: {
// >     subs: {
// >       0: { from: 1, to: 5 },
// >       4: { from: undefined, to: 1}
// >     }
// >  }
```
[► TRY IT!](https://stackblitz.com/edit/callbag-state-demo6?devtoolsheight=33&embed=1&file=index.ts)

<br><br>

## Gotchas

⚠️⚠️ Don't change an object without changing its reference:
```ts
// WRONG:
const s = state([1, 2, 3, 4])
s.get().push(5);              // --> no updates
```
```ts
// CORRECT:
const s = state([1, 2, 3, 4])
s.set([...s.get(), 5]);
```
```ts
// FUN & CORRECT:
const s = state([1, 2, 3, 4])
s.sub(s.get().length).set(5)
```
[► TRY IT!](https://stackblitz.com/edit/callbag-state-demo5?devtoolsheight=33&embed=1&file=index.ts)

<br>

⚠️⚠️ Only pass plain objects! Specifically, passing objects with circular references might result in stack-overflow!

<br><br>

## Contribution

Be nice and respectful, more importantly super open and welcoming to all.

👉 Useful commands for working on this repo:
```bash
git clone https://github.com/loreanvictor/callbag-state.git
```
```bash
npm i              # --> install dependencies
```
```bash
npm start          # --> run `samples/index.ts`
```
```bash
npm test           # --> run all tests
```
```bash
npm run cov:view   # --> view code coverage
```
