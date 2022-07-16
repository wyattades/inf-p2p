import { round } from 'lodash-es';

export default class Perf {
  static default = new Perf();

  data: Record<string, number> = {};

  constructor(private readonly prefix = '') {}

  start(name: string) {
    this.data[name] = performance.now();
  }

  end(name: string, ...extra: any[]) {
    const start = this.data[name];
    const end = performance.now();
    if (start != null && start <= end) {
      const delta = end - start;
      console.log(
        `PERF(${this.prefix}${name}): ${round(delta, 2)}ms`,
        ...extra,
      );
    }
    delete this.data[name];
  }

  next(prev: string, name: string) {
    this.end(prev);
    this.start(name);
  }

  measure(fn: (...args: any[]) => any, name = '?') {
    this.start(name);
    const res = fn();
    this.end(name);
    return res;
  }
}
