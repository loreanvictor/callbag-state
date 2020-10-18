// tslint:disable: no-magic-numbers

import { state } from '../src';
import pipe from 'callbag-pipe';
import subscribe from 'callbag-subscribe';

const s = state([42, 43, 44]);
const x = s.sub(0);

pipe(
  s,
  subscribe(console.log)
);

x.set(45);
