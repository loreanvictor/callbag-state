import { Sink } from 'callbag';
import { MsgType, _End, _Start } from '../types';


export function bouncer<T>() {
  let sink: Sink<T> | undefined = undefined;

  return (type: MsgType, data?: any) => {
    if (type === _Start) {
      if (!sink) {
        sink = data;
        sink!!(_Start, (req: MsgType) => {
          if (req === _End) { sink = undefined; }
        });
      }
    } else {
      if (sink) {
        sink(type as any, data);
        if (type === _End) { sink = undefined; }
      }
    }
  };
}
