export default class Perf {
  static default = new Perf();

  data: Record<string, number> = {};

  start(name: string) {
    this.data[name] = performance.now();
  }

  end(name: string) {
    const start = this.data[name];
    const end = performance.now();
    if (start != null && start <= end) {
      const delta = end - start;
      console.log(`PERF(${name}): ${delta}ms`);
    }
    delete this.data[name];
  }

  measure(fn: (...args: any[]) => any, name = '?') {
    this.start(name);
    const res = fn();
    this.end(name);
    return res;
  }
}
