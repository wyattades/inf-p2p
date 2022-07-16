import { flatten } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { useUpdate } from 'react-use';

export const useSubscribe = <V>(
  emitter: any,
  eventName: string | string[],
  mapValue: (arg?: any) => V,
  runMapValueOnUpdate = false,
): V => {
  const [initValue] = useState(mapValue);
  const update = useUpdate();
  const value = useRef(initValue);
  const first = useRef(true);

  useEffect(() => {
    if (!first.current) {
      value.current = mapValue();
      update();
    } else first.current = false;

    const eventNames = flatten([eventName]);
    const cb = (next: V) => {
      value.current = runMapValueOnUpdate ? mapValue(next) : next;
      update();
    };
    for (const name of eventNames) emitter.on(name, cb);
    return () => {
      for (const name of eventNames) emitter.off(name, cb);
    };
  }, [emitter]);

  return value.current;
};
