import { Sink } from 'callbag';
import { MsgType } from '../types';


export function broadcast<T>(type: MsgType, msg: any, sinks: Sink<T>[]) {
  const _sinks = sinks.slice(0);
  for (let i = 0; i < _sinks.length; i++) {
    const sink = _sinks[i];
    if (sinks.indexOf(sink) !== -1) {
      sink(type as any, msg);
    }
  }
}
