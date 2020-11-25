// tslint:disable: no-magic-numbers

import { state } from '../src';
import pipe from 'callbag-pipe';
import map from 'callbag-map';
import subscribe from 'callbag-subscribe';


const s = state<any>({a: 'A1', b: 'B1'});
const a = s.sub('a');
const b = s.sub('b');
subscribe(console.log)(s);

s.set({a: 'A2', b: 'B2'});
b.set('B3');
