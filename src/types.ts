import { Source, Sink, START, DATA, END, Callbag } from 'callbag';


export type ChangeTraceLeaf<T> = {
  from: T | undefined;
  to: T | undefined;
};

export type ChangeTraceNode<T> = {
  subs: (T extends Array<unknown>? {
    [index: number]: ChangeTrace<T[number]> } :
    Partial<{[K in keyof T]: ChangeTrace<T[K]>}>) | {}
};

export type ChangeTrace<T> = ChangeTraceLeaf<T> | ChangeTraceNode<T>;

export interface Change<T> {
  value: T | undefined;
  trace?: ChangeTrace<T> | undefined;
}

export function isLeaf<T>(c: ChangeTrace<T> | undefined): c is ChangeTraceLeaf<T> | undefined {
  return !c || !(c as any).subs;
}

export type Downstream<T> = Source<Change<T>>;
export type Upstream<T> = Sink<Change<T>>;

export type MsgType = START | DATA | END;
export type StateMsgType = MsgType | typeof _Latest | typeof _Downstream | typeof _Upstream;

export type SubState<T, K extends keyof T> = Callbag<T[K], T[K] | undefined> & {
  get(): T[K] | undefined;
  set(t: T[K]): void;
  clear(): void;
  downstream(): Downstream<T[K] | undefined>;
  upstream(): Upstream<T[K]>;
  sub<K2 extends keyof T[K]>(key: K2): SubState<T[K], K2>;
};

export type State<T> = Callbag<T, T> & {
  get(): T;
  set(t: T): void;
  clear(): void;
  downstream(): Downstream<T>;
  upstream(): Upstream<T>;
  sub<K extends keyof T>(key: K): SubState<T, K>;
};

export function isState<T>(cb: Source<T>): cb is State<T> {
  return cb && typeof cb === 'function' && cb.length === 2
    && (cb as any).get && typeof (cb as any).get === 'function' && (cb as any).get.length === 0
    && (cb as any).set && typeof (cb as any).set === 'function' && (cb as any).set.length === 1
    && (cb as any).clear && typeof (cb as any).clear === 'function' && (cb as any).clear.length === 0
    && (cb as any).downstream && typeof (cb as any).downstream === 'function' && (cb as any).downstream.length === 0
    && (cb as any).upstream && typeof (cb as any).upstream === 'function' && (cb as any).upstream.length === 0
    && (cb as any).sub && typeof (cb as any).sub === 'function' && (cb as any).sub.length === 1
    ;
}

export const _Start = 0;
export const _Data = 1;
export const _End = 2;
export const _Latest = 100;
export const _Downstream = 101;
export const _Upstream = 102;
