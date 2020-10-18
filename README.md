# callbag-state
Callbag-based state management.
```bash
npm i callbag-state
```
```ts
import state from 'callbag-state';
import subscribe from 'callbag-subscribe';

const s = state(42);
subscribe(v => console.log('GOT: ' + v))(s); // GOT: 42
console.log(s.get());                        // 42
s.set(43);                                   // GOT: 43
console.log(s.get());                        // 43
```

<br><br>

## Usage

```ts
import state from 'callbag-state';
import subscribe from 'callbag-subscribe';

const s = state(42);
subscribe(console.log)(s);

s.set(43);
s.set(44);
```
```ts
import state from 'callbag-state';
import subscribe from 'callbag-subscribe';

const s = state({x : 42});
const x = s.sub('x');
subscribe(console.log)(s);

x.set(43);
x.set(44);
```
