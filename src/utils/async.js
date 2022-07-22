import { EventEmitter } from 'events';

const PENDING = 0;
const COMPLETE = 1;
const ERROR = 2;

export class Subject {
  _ee = new EventEmitter();
  _next = [];
  _error = null;
  _complete = null;
  _done = PENDING;

  constructor({ pushNext = true } = {}) {
    this.pushNext = pushNext;
  }

  _finish(error, complete) {
    if (this._done === ERROR && error) error(this._error);
    else if (this._done === COMPLETE && complete) complete(this._complete);

    if (this._done !== PENDING) {
      this._ee.removeAllListeners();
      return true;
    }
    return false;
  }

  subscribe(next, error, complete) {
    if (next) {
      if (this.pushNext) for (const val of this._next) next(val);
      if (this._done === PENDING) this._ee.on('next', next);
    }
    const finish = () => this._finish(error, complete);
    if (finish());
    else if (error || complete) {
      this._ee.once('done', finish);
    }
    return () => {
      this._ee.off('next', next);
      this._ee.off('done', finish);
    };
  }

  next(val) {
    if (this._done) return;

    this._next.push(val);
    this._ee.emit('next', val);
  }

  complete(val) {
    if (this._done) return;

    this._done = COMPLETE;
    this._complete = val;
    this._ee.emit('done', null, val);
  }

  error(err) {
    if (this._done) return;

    this._done = ERROR;
    this._error = err;
    this._ee.emit('done', err, null);
  }

  toPromise() {
    return new Promise((resolve, reject) => {
      if (!this._finish(reject, resolve))
        this._ee.once('done', () => {
          this._finish(reject, resolve);
        });
    });
  }
}
