import { Sink } from 'callbag';
import { MsgType } from '../types';


export function broadcast<T>(type: MsgType, msg: any, sinks: Sink<T>[]) {
  const _sinks = [...sinks];
  _sinks.forEach(sink => {
    if (sinks.indexOf(sink) >= 0) {
      sink(type as any, msg);
    }
  });
}
