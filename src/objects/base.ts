import type * as THREE from 'three';

import type { Body } from 'src/physics';
import type Game from 'src/Game';

export class GameObject {
  isGameObject = true;

  // make sure to define these in your object!
  position!: THREE.Vector3;
  quaternion!: THREE.Quaternion;

  constructor(readonly game: Game) {}

  dispose() {}
}

type GameObjectClass = new (...args: any[]) => GameObject;

export const physicsMixin = <Base extends GameObjectClass>(Klass: Base) => {
  return class Physical extends Klass {
    body: Body | null = null;

    enablePhysics(): void {}

    dispose(): void {
      super.dispose();

      this.body?.dispose();
      this.body = null;
    }
  };
};
