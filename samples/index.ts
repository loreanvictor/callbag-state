// tslint:disable: no-magic-numbers

import { state } from '../src';
import pipe from 'callbag-pipe';
import map from 'callbag-map';
import subscribe from 'callbag-subscribe';


const s = state([42, 43, 44]);
const x = s.sub(0);

pipe(
  x,
  map(l => l!! * 2),
  subscribe(console.log)
);

x.set(45);
