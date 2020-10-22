import { Sink } from 'callbag';

import { subDownstream, subUpstream } from './substream';
import { State, Downstream, Upstream, MsgType, _Start, _Data, _End, Change, SubState } from './types';
import { broadcast } from './util/broadcast';
import { postTrace } from './trace';


export function makeState<T>(initial: T, downstream: Downstream<T>, upstream: Upstream<T>): State<T>;
export function makeState<T, K extends keyof T>
  (initial: T[K] | undefined, downstream: Downstream<T[K] | undefined>, upstream: Upstream<T[K]>): SubState<T, K>;
export function makeState<T>(
  initial: T,
  downstream: Downstream<T>,
  upstream: Upstream<T>,
) {
  const sinks: Sink<Change<T>>[] = [];
  let value = initial;
  let talkback: any = undefined;

  const terminate = (err?: any) => {
    broadcast(_End, err, sinks);
    sinks.length = 0;
    if (talkback) {
      talkback(_End, err);
      talkback = undefined;
    }
  };

  const _downstream = (type: MsgType, m?: any) => {
    if (type === _Start) {
      const sink = m as Sink<Change<T>>;
      sinks.push(sink);

      sink(_Start, (t: MsgType) => {
        if (t === _End) {
          const index = sinks.indexOf(sink);
          if (index >= 0) { sinks.splice(index, 1); }
          if (sinks.length === 0) { terminate(); }
        }
      });

      if (sinks.length === 1) {
        downstream(_Start, (t: MsgType, _m?: any) => {
          if (t === _Start) { talkback = _m; }
          else if (t === _Data) {
            const change = postTrace<T>(_m);
            if (change.value !== value) { value = change.value!!; }
            broadcast(_Data, change, sinks);
          } else if (t === _End) { terminate(_m); }
        });
      }
    }
  };

  const _state = (type: MsgType, m?: any) => {
    if (type === _Start) {
      const sink = m as Sink<T | undefined>;
      _downstream(_Start, (t: MsgType, _m?: any) => {
        if (t === _Start) { sink(_Start, _m); sink(_Data, value); }
        else if (t === _Data) { sink(_Data, _m.value); }
        else if (t === _End) { sink(_End, _m); }
      });
    }
    else if (type === _Data) { upstream(_Data, { value: m, trace: { from: value, to: m }}); }
    else if (type === _End) {
      upstream(_End, m);
      terminate(m);
    }
  };

  _state.get = () => value;
  _state.set = (v: T) => _state(_Data, v);
  _state.clear = () => _state(_End);
  _state.downstream = () => _downstream;
  _state.upstream = () => upstream;
  _state.sub = <K extends keyof T>(k: K) => {
    const _sub: SubState<T, K> = makeState(
      value? value[k] : undefined,
      subDownstream(_downstream, k, () => _sub.get()),
      subUpstream(upstream, k, value),
    );

    return _sub;
  };

  return _state;
}
