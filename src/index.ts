export { makeState } from './state';
export { trace, change, postTrace } from './trace';
export { Change, ChangeTrace, ChangeTraceLeaf, ChangeTraceNode, isLeaf, Downstream, Upstream, State } from './types';


import { makeState } from './state';
import { bouncer } from './util/bouncer';


export function state<T>(t: T | undefined) {
  const _b = bouncer<T>();
  return makeState<T>(t, _b, _b);
}


export default state;
