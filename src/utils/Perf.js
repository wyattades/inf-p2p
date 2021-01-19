export default class Perf {
  static default = new Perf();

  data = {};

  start(name) {
    this.data[name] = performance.now();
  }

  end(name) {
    const start = this.data[name];
    const end = performance.now();
    if (start != null && start <= end) {
      const delta = end - start;
      console.log(`PERF(${name}): ${delta}ms`);
    }
    delete this.data[name];
  }

  measure(fn, name = '?') {
    this.start(name);
    const res = fn();
    this.end(name);
    return res;
  }
}
