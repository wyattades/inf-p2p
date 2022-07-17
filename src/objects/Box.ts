import * as THREE from 'three';

import { Body, RAPIER } from 'src/physics';
import type Game from 'src/Game';

// const materialPerColor: Record<number, THREE.Material> = {};
const geometryPerSize: Record<number, THREE.BoxGeometry> = {};
const material = new THREE.MeshPhongMaterial({
  map: new THREE.TextureLoader().load(
    new URL('src/textures/box.png', import.meta.url).href,
  ),
});

export default class Box {
  mesh: THREE.Mesh;
  body: Body;

  constructor(
    readonly game: Game,
    pos: THREE.Vector3,
    size = 3,
    // color = 0xc329c9,
  ) {
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
    // mesh.quaternion.copy(quat);

    // @ts-expect-error TODO better way to iterate objects
    this.mesh.gameObject = this;

    this.body = new Body(this.mesh, game.physics, {
      type: 'box',
      bodyType: RAPIER.RigidBodyType.Fixed,
    });
    this.body.addCollider(
      RAPIER.ColliderDesc.cuboid(size * 0.5, size * 0.5, size * 0.5),
    );
  }

  update(_delta: number, _tick: number) {
    this.body.copyToObj(this.mesh);
  }

  dispose() {
    this.body.dispose();
    // @ts-expect-error cannot assign null
    this.body = null;

    this.mesh.removeFromParent();
    // @ts-expect-error cannot assign null
    this.mesh = null;
  }
}
