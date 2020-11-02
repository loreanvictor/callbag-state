import { Sink } from 'callbag';

import { subDownstream, subUpstream } from './substream';
import { State, Downstream, Upstream,
         MsgType, _Start, _Data, _End, Change,
         SubState, _Latest, StateMsgType,
         _Downstream, _Upstream } from './types';
import { broadcast } from './util/broadcast';
import { postTrace } from './trace';


function terminate<T>(sinks: Sink<Change<T>>[], talkback: any, err?: any) {
  broadcast(_End, err, sinks);
  sinks.length = 0;
  if (talkback) {
    talkback(_End, err);
  }
}

function get<T>(this: State<T>) { return this(_Latest as any) as any as T; }
function set<T>(this: State<T>, t: T) { this(_Data, t); }
function clear<T>(this: State<T>) { this(_End); }
function getDownstream<T>(this: State<T>) { return this(_Downstream as any) as any as Downstream<T>; }
function getUpstream<T>(this: State<T>) { return this(_Upstream as any) as any as Upstream<T>; }
function sub<T, K extends keyof T>(this: State<T>, k: K) {
  const _sub: SubState<T, K> = makeState(
    this.get() ? this.get()[k] : undefined,
    subDownstream(this.downstream(), k, () => _sub.get()),
    subUpstream(this.upstream(), k, this.get()),
  );

  return _sub;
}

interface Profile<T> {
  downstream: Downstream<Change<T>>;
  upstream: Upstream<T>;
  sinks: Sink<Change<T>>[];
  value: T;
  talkback: any;
}


function _dsgreeter<T>(this: Profile<T>, sink: Sink<Change<T>>, type: MsgType) {
  if (type === _End) {
    const index = this.sinks.indexOf(sink);
    if (index >= 0) { this.sinks.splice(index, 1); }
    if (this.sinks.length === 0) {
      terminate(this.sinks, this.talkback);
      this.talkback = undefined;
    }
  }
}

function _downstream<T>(this: Profile<T>, type: MsgType, m?: any) {
  if (type === _Start) {
    const sink = m as Sink<Change<T>>;
    this.sinks.push(sink);
    // TODO: we can perhaps keep track of sub sinks (sinks listening for a particular sub)
    //       more efficiently, so changes are broadcast to them properly by accessing them via
    //       a hash table. this helps performance of cases with large fan-out (like big arrays).
    sink(_Start, _dsgreeter.bind(this, sink));

    if (this.sinks.length === 1) {
      this.downstream(_Start, (t: MsgType, _m?: any) => {
        if (t === _Start) { this.talkback = _m; }
        else if (t === _Data) {
          const change = postTrace<T>(_m);
          if (change.value !== this.value) { this.value = change.value!!; }
          broadcast(_Data, change, this.sinks);
        } else if (t === _End) { terminate(this.sinks, this.talkback, _m); this.talkback = undefined; }
      });
    }
  }
}

function _sgreeter<T>(this: Profile<T>, sink: Sink<T | undefined>, t: MsgType, m?: any) {
  if (t === _Start) { sink(_Start, m); sink(_Data, this.value); }
  else if (t === _Data) { sink(_Data, m.value); }
  else if (t === _End) { sink(_End, m); }
}

function _state<T>(this: Profile<T>, _d: Downstream<Change<T>>, type: StateMsgType, m?: any) {
  if (type === _Start) {
    const sink = m as Sink<T | undefined>;
    _d(_Start, _sgreeter.bind(this, sink));
  }
  else if (type === _Data) { this.upstream(_Data, { value: m, trace: { from: this.value, to: m }}); }
  else if (type === _End) {
    this.upstream(_End, m);
    terminate(this.sinks, this.talkback, m);
    this.talkback = undefined;
  }
  else if (type === _Latest) { return this.value; }
  else if (type === _Downstream) { return _d; }
  else if (type === _Upstream) { return this.upstream; }
}


export function makeState<T>(initial: T, downstream: Downstream<T>, upstream: Upstream<T>): State<T>;
export function makeState<T, K extends keyof T>
  (initial: T[K] | undefined, downstream: Downstream<T[K] | undefined>, upstream: Upstream<T[K]>): SubState<T, K>;
export function makeState<T>(
  initial: T,
  downstream: Downstream<T>,
  upstream: Upstream<T>,
) {
  const profile: Profile<T> = {
    sinks: [],
    value: initial,
    talkback: undefined,
    downstream, upstream
  };

  const _d = _downstream.bind(profile);
  const _s = _state.bind(profile, _d);

  _s.get = get; _s.set = set; _s.clear = clear;
  _s.downstream = getDownstream; _s.upstream = getUpstream;
  _s.sub = sub;

  return _s;
}
