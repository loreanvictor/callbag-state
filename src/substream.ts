import { Sink, START } from 'callbag';
import { Change, ChangeTraceNode, Downstream, isLeaf, Upstream, MsgType, _Data, _End, _Start } from './types';


export function subDownstream<T, K extends keyof T>(src: Downstream<T>, key: K, current: () => T[K] | undefined)
: Downstream<T[K] | undefined> {
  return ((start: START, sink: Sink<Change<T[K] | undefined>>) => {
    if (start !== _Start) { return; }
    let talkback: any = undefined;

    src(_Start, (t: MsgType, m?: any) => {
      if (t === _Start) { talkback = m; }
      else if (t === _Data) {
        const change = m as Change<T>;
        const value = change.value ? change.value[key] : undefined;
        if (
          (isLeaf(change.trace) && value !== current()) ||
          (!isLeaf(change.trace) && key in change.trace?.subs)
        ) {
          sink(_Data, {
            value,
            trace: isLeaf(change.trace) ? undefined : ((change.trace as ChangeTraceNode<T>).subs as any)[key]
          });
        }
      } else if (t === _End) { sink(_End, m); }
    });

    sink(_Start, (t: MsgType, m?: any) => { if (talkback) { talkback(t, m); } });
  }) as any;
}


export function subUpstream<T, K extends keyof T>(src: Upstream<T>, key: K, ref: T | undefined)
: Upstream<T[K]> {
  return (type: MsgType, m?: any) => {
    if (type === _Data) {
      const change = m as Change<T[K]>;
      if (ref) { ref[key] = change.value!!; }

      src(_Data, {
        value: ref,
        trace: {
          subs: {
            [key]: change.trace
          }
        }
      });
    } else if (type === _End && m) {
      src(_End, m);
    }
  };
}