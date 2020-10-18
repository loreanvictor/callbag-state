import { makeState } from './state';
import { bouncer } from './util/bouncer';


export function state<T>(t: T | undefined) {
  const _b = bouncer<T>();
  return makeState<T>(t, _b, _b);
}


export default state;
