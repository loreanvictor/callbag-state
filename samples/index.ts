// tslint:disable: no-magic-numbers

import { state } from '../src';
import pipe from 'callbag-pipe';
import map from 'callbag-map';
import subscribe from 'callbag-subscribe';


const count = 1000;
const l: number[] = [];

for (let i = 0; i < count; i++) {
  l.push(i);
}

const s = state(l);
const x: any[] = [];

for (let i = 0; i < count; i++) {
  x.push(s.sub(i));
}

setInterval(() => {}, 1000);
