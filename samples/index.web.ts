import { state } from '../src';
import subscribe from 'callbag-subscribe';

const btn = document.createElement('button');
btn.textContent = 'CLICK ME!';
document.body.append(btn);

const l: number[] = [];
const count = 1000;

const s = state(l);
const S: any[] = [];

function add() {
  const l2: number[] = [];

  for (let i = 0; i < count; i++) {
    l2.push(i);
  }

  const L = s.get().length;
  s.set(s.get().concat(l2));

  for (let i = 0; i < count; i++) {
    const _s = s.sub(L + i);
    // _s(0, () => {});
    subscribe(() => {})(_s);
    // S.push(_s);
  }
}

btn.addEventListener('click', add);
