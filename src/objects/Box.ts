import * as THREE from 'three';

import { Body, RAPIER } from 'src/physics';
import type Game from 'src/Game';

import { GameObject, physicsMixin } from './base';

// const materialPerColor: Record<number, THREE.Material> = {};
const geometryPerSize: Record<number, THREE.BoxGeometry> = {};
const material = new THREE.MeshPhongMaterial({
  map: new THREE.TextureLoader().load(
    new URL('src/textures/box.png', import.meta.url).href,
  ),
});

export default class Box extends physicsMixin(GameObject) {
  mesh: THREE.Mesh;

  constructor(
    game: Game,
    pos: THREE.Vector3,
    readonly size = 3, // color = 0xc329c9,
  ) {
    super(game);

    const geometry = (geometryPerSize[size] ||= new THREE.BoxGeometry(
      size,
      size,
      size,
      1,
      1,
      1,
    ));

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(pos);

    this.position = this.mesh.position;
    this.quaternion = this.mesh.quaternion;

    // mesh.quaternion.copy(quat);

    // @ts-expect-error TODO better way to iterate objects
    this.mesh.gameObject = this;

    this.enablePhysics();
  }

  enablePhysics(): void {
    this.body = new Body(this, this.game.physics, {
      type: 'box',
      bodyType: RAPIER.RigidBodyType.Fixed,
    });

    const halfSize = this.size / 2;
    this.body.addCollider(
      RAPIER.ColliderDesc.cuboid(halfSize, halfSize, halfSize).setFriction(1.0),
    );
  }

  update(_delta: number, _tick: number) {
    this.body?.copyToObj(this);
  }

  dispose() {
    super.dispose();

    this.mesh.removeFromParent();
    // @ts-expect-error cannot assign null
    this.mesh = null;
  }
}
