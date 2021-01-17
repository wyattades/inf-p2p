type ListenerFn<N, CB, Rest extends any[]> = (
  eventName: N,
  cb: CB,
  ...rest: Rest
) => any;

type Emitter<N, C, Rest extends any[]> =
  | {
      on: ListenerFn<N, C, Rest>;
      off: ListenerFn<N, C, []>;
    }
  | {
      addListener: ListenerFn<N, C, Rest>;
      removeListener: ListenerFn<N, C, []>;
    }
  | {
      addEventListener: ListenerFn<N, C, Rest>;
      removeEventListener: ListenerFn<N, C, []>;
    };

/**
 * Use EventManager to aggregate many event listeners, and easily unlisten to them.
 *
 * Supports any emitter object with functions: on/off, addListener/removeListener, or addEventListener/addEventListener
 *
 * @example
 * const em = new EventManager();
 *
 * em.on(window, 'click', doThing);
 * em.on(window, 'scroll', doThing);
 * em.on(document, 'click', doThing);
 *
 * em.off(window, 'click', doThing); // removes `window` 'click' `doThing` event listener
 * em.off(window, 'click'); // removes all `window` 'click' event listeners
 * em.off(window); // removes all `window` event listeners
 * em.off(); // remove ALL event listeners
 */
export default class EventManager {
  private events: {
    off: 'off' | 'removeListener' | 'removeEventListener';
    eventEmitter: any;
    eventName: any;
    cb: any;
    realCb: any;
  }[] = [];

  once<
    N extends string,
    CB extends (...args: any[]) => void,
    Rest extends any[]
  >(
    eventEmitter: Emitter<N, CB, Rest>,
    eventName: N,
    cb: CB,
    ...rest: Rest
  ): EventManager {
    this.addEvent(eventEmitter, eventName, cb, rest, true);

    return this;
  }

  on<N extends string, CB extends (...args: any[]) => void, Rest extends any[]>(
    eventEmitter: Emitter<N, CB, Rest>,
    eventName: N,
    cb: CB,
    ...rest: Rest
  ): EventManager {
    this.addEvent(eventEmitter, eventName, cb, rest, false);

    return this;
  }

  private addEvent<
    N extends string,
    CB extends (...args: any[]) => void,
    Rest extends any[]
  >(
    eventEmitter: Emitter<N, CB, Rest>,
    eventName: N,
    cb: CB,
    rest: Rest,
    once = false,
  ): void {
    const [on, off] =
      'on' in eventEmitter
        ? (['on', 'off'] as const)
        : 'addListener' in eventEmitter
        ? (['addListener', 'removeListener'] as const)
        : (['addEventListener', 'removeEventListener'] as const);

    const realCb = once
      ? (((...args) => {
          this.off(eventEmitter as any, eventName, cb);
          return cb(...args);
        }) as CB)
      : cb;

    (eventEmitter as any)[on](eventName, realCb, ...rest);
    this.events.push({ off, eventName, eventEmitter, cb, realCb });
  }

  off<N, CB>(
    eventEmitter?: Emitter<N, CB, []>,
    eventName?: N,
    cb?: CB,
  ): EventManager {
    this.events = this.events.filter((e) => {
      if (cb) {
        if (
          cb !== e.cb ||
          eventName !== e.eventName ||
          eventEmitter !== e.eventEmitter
        )
          return true;
      } else if (eventName) {
        if (eventName !== e.eventName || eventEmitter !== e.eventEmitter)
          return true;
      } else if (eventEmitter) {
        if (eventEmitter !== e.eventEmitter) return true;
      }

      (e.eventEmitter as any)[e.off](e.eventName, e.realCb);
      return false;
    });

    return this;
  }
}
