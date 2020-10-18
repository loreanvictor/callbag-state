import { Source, Sink, START, DATA, END } from 'callbag';


export type ChangeTraceLeaf<T> = {
  from: T | undefined;
  to: T | undefined;
};

export type ChangeTraceNode<T> = {
  subs: (T extends any[] ? {
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

export type MsgType = START | DATA | END ;

export type State<T> = Source<T | undefined> & Sink<T> & {
  get(): T | undefined;
  set(t: T): void;
  clear(): void;
  downstream(): Downstream<T>;
  upstream(): Upstream<T>;
  sub<K extends keyof T>(key: K): State<T[K]>;
};

export const _Start = 0;
export const _Data = 1;
export const _End = 2;
