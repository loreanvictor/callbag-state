import { Sink } from 'callbag';

import { subDownstream, subUpstream } from './substream';
import { State, Downstream, Upstream,
         MsgType, _Start, _Data, _End, Change,
         SubState, _Latest, StateMsgType,
         _Downstream, _Upstream } from './types';
import { broadcast } from './util/broadcast';
import { postTrace } from './trace';


/**
 *
 * sends an END signal to all sinks, with given error as reason.
 * if a talkback is provided, will also send an END signal upwards to the
 * talkback.
 *
 */
function terminate<T>(sinks: Sink<Change<T>>[], talkback: any, err?: any) {
  broadcast(_End, err, sinks);
  sinks.length = 0;
  if (talkback) {
    talkback(_End, err);
  }
}

/**
 *
 * returns the latest value of the state.
 *
 */
function get<T>(this: State<T>) { return this(_Latest as any) as any as T; }

/**
 *
 * updates state's value.
 *
 */
function set<T>(this: State<T>, t: T) { this(_Data, t); }

/**
 *
 * clears the state (sending an end signal to all sinks, clearing memory).
 *
 */
function clear<T>(this: State<T>) { this(_End); }

/**
 *
 * returns the downstream of the state. the downstream is a read stream of changes
 * (NOT values) that happen to the state.
 *
 */
function getDownstream<T>(this: State<T>) { return this(_Downstream as any) as any as Downstream<T>; }

/**
 *
 * returns the upstream of the state. the upstream is a write stream through
 * which the state can request changes (NOT values) to be applied to it.
 *
 * 👉 not all changes that are sent to upstream are applied on the state. while
 * the state might temporarily apply the changes on itself for performance,
 * changes are semented to the state when they are broadcast back from the downstream.
 *
 */
function getUpstream<T>(this: State<T>) { return this(_Upstream as any) as any as Upstream<T>; }

/**
 *
 * returns a sub-state from the state. a sub-state represents the state of
 * a particular key of the object of its parent state.
 *
 */
function sub<T, K extends keyof T>(this: State<T>, k: K) {
  const _sub: SubState<T, K> = makeState(
    this.get() ? this.get()[k] : undefined,
    subDownstream(this.downstream(), k, () => _sub.get()),
    subUpstream(this.upstream(), k, () => this.get()),
  );

  return _sub;
}

//
// ⚠️ internal implementation thingy ⚠️
//
// a profile represents the explicit closure
// shared between all functions of a state. I used to keep it as
// an implicit closure, but for memory-consumption optimization made
// it explicit.
//
interface Profile<T> {
  downstream: Downstream<T>;          // 👉 this is the provided downstream, not state's downstream
  upstream: Upstream<T>;              // 👉 this is the provided upstream, which is the same as state's upstream
  sinks: Sink<Change<T>>[];           // 👉 a list of all sinks (listening to state's downstream)
  value: T;                           // 👉 latest value of the state
  talkback: any;                      // 👉 this is (provided) downstream talkback
}

//
// ⚠️ internal implementation thingy ⚠️
//
// this is the standard talkback passed down to
// all sinks of the state's downstream (downstream's greeter). it is shared
// for better memory consumption (an individual talkback for each
// sink consumes slightly more memory compared to a bound-function,
// which has a measurable impact on memory consumption
// when TONs of states / sub-states are used).
//
function _dsgreeter<T>(this: Profile<T>, sink: Sink<Change<T>>, type: MsgType) {
  if (type === _End) {
    const index = this.sinks.indexOf(sink);
    if (index >= 0) {
      this.sinks.splice(index, 1);
    }

    if (this.sinks.length === 0) {
      terminate(this.sinks, this.talkback);
      this.talkback = undefined;
    }
  }
}

//
// ⚠️ internal implementation thingy ⚠️
//
// represents the downstream callbag for the state, i.e. state's downstream. this is
// basically the provided downstream, which is shared, ref counted, and:
//
// - keeps state's value updated with the latest change coming through the downstream
// - post-trace's a change if the trace ends on this node. for example, if you
//   have `{ x: { y: { z: 2, w: 3 } } }` as the parent state, then you change `y` sub
//   to `{z: 3, w: 3}`, the original trace only goes as far as `y` sub, and without post-tracing,
//   both `z` and `w` would have to be notified of the incoming change. with post-tracing, however,
//   the change is traced in further depth and only `z` will be notified.
//
// 👉 in a cleaner code, this would also be an anonymous function within makeState()'s implicit
// closure context. however, for more efficient memory consumption, this is kept as a shared bound function.
// also this is why I didn't use `subject` with some added operators, since all the additional talkbacks
// would lead to memory overheads.
//
function _downstream<T>(this: Profile<T>, type: MsgType, m?: any) {
  if (type === _Start) {
    const sink = m as Sink<Change<T>>;
    this.sinks.push(sink);

    //
    // TODO: we can perhaps keep track of sub sinks (sinks listening for a particular sub)
    //       more efficiently, so changes are broadcast to them properly by accessing them via
    //       a hash table. this helps performance of cases with large fan-out (like big arrays).
    //
    sink(_Start, _dsgreeter.bind(this, sink));

    if (this.sinks.length === 1) {          // 👉 first sink, lets connect to downstream (basically ref counting here)
      this.downstream(_Start, (t: MsgType, _m?: any) => {
        if (t === _Start) {
          this.talkback = _m;
        } else if (t === _Data) {
          const change = postTrace<T>(_m);  // 👉 post-trace changes to know in detail what happens at further depths
          if (change.value !== this.value) {
            this.value = change.value!!;    // 👉 update the state's value based on the incoming change
          }
          broadcast(_Data, change, this.sinks); // 👉 broadcast the change to all sinks
        } else if (t === _End) {
          terminate(this.sinks, this.talkback, _m);
          this.talkback = undefined;
        }
      });
    }
  }
}

//
// ⚠️ internal implementation thingy ⚠️
//
// this is the standard talkback provided to state's downstream for each state sink.
// basically represents a simple map operation, passing `.value` of change objects
// going through the downstream to value sinks, and also passing the last value on
// greet to the sinks.
//
function _sgreeter<T>(this: Profile<T>, sink: Sink<T | undefined>, t: MsgType, m?: any) {
  if (t === _Start) {
    sink(_Start, m);           // 👉 pass on greetings from state's downstream
    sink(_Data, this.value);   // 👉 provide the sink with latest value as well
  } else if (t === _Data) {
    sink(_Data, m.value);      // 👉 pass on the value of incoming changes to the sink
  } else if (t === _End) {
    sink(_End, m);
  }
}

//
// ⚠️ internal implementation thingy ⚠️
//
// represents the core callbag of each state. this could have been an anonymous
// function within the context of `makeState()`'s implicit closure, however it is kept
// as a shared bound function for better memory consumption.
//
// alongside the profile, this guy also needs the state downstream (the modified downstream,
// see `_downstream()` and `_dsgreeter()`). it will simply hook up sinks to that downstream,
// pass incoming changes to the upstream, and terminates everything when receives a terminate
// signal.
//
function _state<T>(this: Profile<T>, _d: Downstream<T>, type: StateMsgType, m?: any) {
  if (type === _Start) {
    const sink = m as Sink<T | undefined>;
    _d(_Start, _sgreeter.bind(this, sink));
  }
  else if (type === _Data) {
    this.upstream(_Data, { value: m, trace: { from: this.value, to: m }});
    if (this.sinks.length === 0) {
      this.value = m;
    }
  }
  else if (type === _End) {
    this.upstream(_End, m);
    terminate(this.sinks, this.talkback, m);
    this.talkback = undefined;
  }
  else if (type === _Latest) { return this.value; }
  else if (type === _Downstream) { return _d; }
  else if (type === _Upstream) { return this.upstream; }
}


/**
 *
 * builds a state using given initial value, downstream and upstream.
 *
 * @param initial is the initial value of the state
 * @param downstream is the source dictating changes to the state
 * @param upstream is the sink that (potential) changes to the state are communicated to
 *
 */
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
