// tslint:disable: no-magic-numbers
// tslint:disable: max-file-line-count
// tslint:disable: no-unused-expression

import { should, expect } from 'chai'; should();
import { cloneDeep } from 'lodash';
import subscribe from 'callbag-subscribe';
import pipe from 'callbag-pipe';
const makeSubject = require('callbag-subject');

import { state } from '../index';
import { makeState } from '../state';
import { Change, isState } from '../types';


describe('state', () => {
  it('should pass `isState()` test', () => {
    isState(state(2)).should.be.true;
  });

  it('should initialize with given initial value.', () => {
    const s = state(42);
    s.get()!!.should.equal(42);
  });

  it('should emit proper initial value.', done => {
    const s = state(42);
    subscribe(() => {})(s);
    s.set(43);
    subscribe(v => {
      expect(v).to.equal(43);
      done();
    })(s);
  });

  it('should track its most recent values if is root state and subscribed.', () => {
    const s = state(41);
    s.get()!!.should.equal(41);
    s.set(42);
    s.get()!!.should.equal(42); // --> not subscribed
    subscribe(() => {})(s);
    s.set(43);
    s.get()!!.should.equal(43);
  });

  it('should emit its values when root state.', () => {
    const r : number[] = [];
    const s = state(41);
    pipe(s, subscribe(v => r.push(v!!)));
    s.set(42);
    s.set(43);
    s.set(42);
    s.set(42);
    r.should.eql([41, 42, 43, 42, 42]);
  });

  it('should echo received changes in upstream back to downstream when root state.', () => {
    const r : Change<number>[] = [];
    const s = state(42);
    const change = { value: 45, trace: { from: 42, to: 45 } };
    pipe(s.downstream(), subscribe(c => r.push(c)));
    s.upstream()(1, change);
    r[0].should.eql(change);
  });

  it('should emit values received from downstream.', () => {
    const d = makeSubject();
    const s = makeState(42, d, () => {});
    const r : number[] = [];
    pipe(s, subscribe(v => r.push(v!!)));

    d(1, { value: 43, trace: { from: 42, to: 43 } });
    d(1, { value: 44, trace: { from: 43, to: 44 } });
    r.should.eql([42, 43, 44]);
  });

  it('should keep its value in sync with latest incoming changes from downstream.', () => {
    const d = makeSubject();
    const s = makeState(42, d, () => {});
    s.get()!!.should.equal(42);
    d(1, { value: 43, trace: { from: 42, to: 43 } });
    s.get()!!.should.equal(42);      // --> not subscribed
    subscribe(() => {})(s);
    d(1, { value: 44, trace: { from: 43, to: 44 } });
    s.get()!!.should.equal(44);
  });

  it('should send received values up its upstream.', () => {
    const r : Change<number>[] = [];
    const d = makeSubject();
    const s = makeState(42, d, (t: any, m: any) => {
      if (t === 1) {
        r.push(m); d(1, m);
      }
    });

    subscribe(() => {})(s);
    s(1, 43);
    s(1, 42);
    s(1, 42);

    r.should.eql([
      { value: 43, trace: { from: 42, to: 43 } },
      { value: 42, trace: { from: 43, to: 42 } },
      { value: 42, trace: { from: 42, to: 42 } }
    ]);
  });

  it('should send received errors upstream.', done => {
    const err = {};
    makeState(undefined, makeSubject(), (t: any, d: any) => {
      if (t === 2 && d) {
        d.should.equal(err);
        done();
      }
    })(2, err);
  });

  it('should send complete signal upstream.', done => {
    makeState(undefined, makeSubject(), (t: any, d: any) => {
      if (t === 2 && !d) {
        done();
      }
    })(2);
  });

  it('should close its own subscriptions when completed.', done => {
    const s = state(undefined);
    subscribe({ complete: () => done() })(s);
    s(2);
  });

  it('should close its subscriptions without closing subscriptions to parent states.', () => {
    const s = state([1, 2, 3]);
    const s2 = s.sub(1);
    let c1 = false; let c2 = false;
    subscribe({ complete: () => c1 = true})(s);
    subscribe({ complete: () => c2 = true})(s2);

    c1.should.be.false;
    c2.should.be.false;
    s2(2);
    c1.should.be.false;
    c2.should.be.true;
  });

  it('should close subscriptions to its sub-tree without affecting other sub-trees.', () => {
    const root = state([{x: 2}, {x: 3}]);
    const s1 = root.sub(0);
    const s2 = root.sub(0);
    let c1 = false; let c2 = false;
    subscribe({ complete: () => c1 = true})(s1.sub('x'));
    subscribe({ complete: () => c2 = true})(s2.sub('x'));

    c1.should.be.false;
    c2.should.be.false;
    s2(2);
    c1.should.be.false;
    c2.should.be.true;
  });

  it('should properly multi-cast to sub-state subscriptions.', () => {
    const r: number[] = [];
    const s = state({x: 42});
    const sub = s.sub('x');
    pipe(sub, subscribe((n: number) => r.push(n!!)));
    pipe(sub, subscribe((n: number) => r.push(n!!)));

    s.set({x : 43});
    r.should.eql([42, 42, 43, 43]);
  });

  it('should only emit when value has changed.', () => {
    const r: any[] = [];
    const r2: any[] = [];
    const s = state({ x: { y: 2 }, z: 3 });
    pipe(s.sub('x'), subscribe(v => r.push(v)));
    pipe(s.sub('z'), subscribe(v => r2.push(v)));
    s.set({ x: { y: 2 }, z: 4 });
    r.should.eql([{y: 2}]);
    r2.should.eql([3, 4]);
  });

  it('should detect changes to arrays properly.', () => {
    const r: any[] = [];
    const r2: any[] = [];
    const r3: any[] = [];
    const s = state({x: [1, 2, 3, 4], y: true });
    pipe(s.sub('x'), subscribe(v => r.push(cloneDeep(v))));
    pipe(s.sub('x').sub(4), subscribe(v => r2.push(v)));
    pipe(s, subscribe(v => r3.push(cloneDeep(v))));

    s.set({ x: [1, 2, 3, 4, 5], y: false});
    s.sub('x').set([2, 3, 4, 5]);
    r.should.eql([[1, 2, 3, 4], [1, 2, 3, 4, 5], [2 ,3, 4, 5]]);
    r2.should.eql([undefined, 5, undefined]);
    r3.should.eql([
      {x: [1, 2, 3, 4], y: true},
      {x: [1, 2, 3, 4, 5], y: false},
      {x: [2, 3, 4, 5], y: false}
    ]);
  });

  it('should unsubscribe from downstream when cleared.', done => {
    const s = makeState(undefined, (t: any, d: any) => {
      if (t === 0) {
        d(0, (_t: any) => {
          if (_t === 2) {done();}
        });
      }
    }, () => {});

    subscribe(() => {})(s);
    s.clear();
  });

  it('should ignore non-start messages on its downstream.', () => {
    state(2).downstream()(1 as any);
  });

  it('should be ok with subscribers mistakenly unsubbing multiple times.', () => {
    const s = state(42);
    const s1 = subscribe(() => {})(s);
    s1(); s1();
  });

  it('should handle weird messages from downstream.', () => {
    const d = makeSubject();
    subscribe(() => {})(makeState(42, d, () => {}));

    d(23);
  });

  it('should handle weird messages.', () => { state(42)(42 as any); });

  describe('.sub()', () => {
    it('should set the initial value correctly based given key and its own value.', () => {
      state('hellow').sub(1).get()!!.should.equal('e');
    });

    it('should set initial value to `undefined` when the key cannot be found in value.', () => {
      expect(state([]).sub(1).get()).to.be.undefined;
    });

    it('should set the initial value to `undefined` when its own value is `undefined`.', () => {
      expect(state<never[]>(undefined as never).sub(1).get()).to.be.undefined;
    });

    it('should set initial value of sub substates to `undefined` when the subs are not defined.', () => {
      expect(state<{x: number}[]>([]).sub(1).sub('x').get()).to.be.undefined;
    });

    it('should add proper trace to changes coming from sub-state upstream.', done => {
      makeState([42, 43], makeSubject(), (t: any, change: any) => {
        if (t === 1) {
          expect(change.value).to.eql([42, 44]);
          expect(change.trace).to.eql({ subs: { 1: { from: 43, to: 44 } } });
          done();
        }
      }).sub(1).set(44);
    });

    it('should add proper trace to changes coming from sub-sub-state upstream.', done => {
      makeState([{num: 42}, {num: 43}], makeSubject(), (t: any, change: any) => {
        if (t === 1) {
          expect(change.value).to.eql([{num: 42}, {num: 44}]);
          expect(change.trace).to.eql({
            subs: {
              1: {
                subs: {
                  num: { from: 43, to: 44 }
                }
              }
            }
          });
          done();
        }
      }).sub(1).sub('num').set(44);
    });

    it('should route changes addressing the same key to the sub-state downstream.', () => {
      const r : Change<number>[] = [];
      const d = makeSubject();
      const s = makeState([42, 43], d, () => {});
      subscribe((c: any) => r.push(c))(s.sub(0).downstream());
      d(1, { value: [45, 43], trace: { subs: { 0: { from: 42, to: 45 }} }});
      expect(r[0].value).to.equal(45);
      expect(r[0].trace).to.eql({ from: 42, to: 45 });
    });

    it('should not route changes not addressing the same key to the sub-state downstream.', () => {
      const r : Change<number>[] = [];
      const d = makeSubject();
      const s = makeState([42, 43], d, () => {});
      subscribe((c: any) => r.push(c))(s.sub(1).downstream());
      d(1, { value: [45, 43], trace: { subs: { 0: { from: 42, to: 45 } } }});
      r.length.should.equal(0);
    });

    it('should properly adapt the trace of changes addressing a sub-state.', () => {
      const r : Change<{num: number}>[] = [];
      const d = makeSubject();
      const s = makeState([{ num: 42 }, { num: 43 }], d, () => {});
      subscribe((c: any) => r.push(c))(s.sub(0).downstream());
      d(1, {
        value: [{num: 45}, {num: 43}],
        trace: {
          subs: {
            0: {
              subs: {
                num: { from: 42, to: 45 }
              }
            }
          }
        }
      });
      expect(r[0].trace).to.eql({
        subs: {
          num: { from: 42, to: 45 }
        }
      });
    });

    it('should route changes without a trace that mutate sub-state value to sub-state downstream.', () => {
      const r : Change<number>[] = [];
      const d = makeSubject();
      const s = makeState([42, 43], d, () => {});
      subscribe((c: any) => r.push(c))(s.sub(0).downstream());
      d(1, { value: [45, 43], trace: { from: [42, 43], to: [45, 43] }});
      expect(r[0].value).to.equal(45);
    });

    it('should not route changes without a trace that do not mutate sub-state value to sub-state downstream.',
      () => {
      const r : Change<number>[] = [];
      const d = makeSubject();
      const s = makeState([42, 43], d, () => {});
      subscribe((c: any) => r.push(c))(s.sub(1).downstream());
      d(1, { value: [45, 43], trace: { from: [42, 43], to: [45, 43] } });
      r.length.should.equal(0);
    });

    it('should set the value of undefined for sub-sub-states for changes that make the sub-state undefined.', () => {
      const r : (number | undefined)[] = [];
      const s = state([{num: 42}, {num: 43}]);
      pipe(s.sub(1).sub('num'), subscribe((v: number) => r.push(v)));
      s.set([{num: 45}]);
      r.should.eql([43, undefined]);
    });

    it('should pass up errors on sub-states to the upstream.', done => {
      const err = {};
      makeState([], makeSubject(), (t: any, e: any) => {
        if (t === 2) {
          e.should.equal(err);
          done();
        }
      }).sub(1)(2, err);
    });

    it('should only emit when value has changed.', () => {
      const r: any[] = [];
      const r2: any[] = [];
      const r3: any[] = [];
      const s = state({ T: { x: { y: 2 }, z: 3 }, W: 1 });
      pipe(s.sub('T').sub('x'), subscribe(v => r.push(v)));
      pipe(s.sub('W'), subscribe(v => r2.push(v)));
      pipe(s.sub('T').sub('z'), subscribe(v => r3.push(v)));
      s.set({ T: { x: { y: 2 }, z: 4} , W: 1 });
      r.should.eql([{ y : 2 }]);
      r2.should.eql([ 1 ]);
      r3.should.eql([3, 4]);
    });

    it('should not throw an error when setting value on a collapsed sub-state.', () => {
      const s = state([{x: 1}, {x: 2}]);
      s.sub(2).sub('x').set(3);
    });
  });
});
