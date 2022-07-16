import * as THREE from 'three';

import { Body, RAPIER } from 'src/physics';

export default class Box {
  /**
   * @param {import('src/Game').default} game
   */
  constructor(game, pos, size = 3) {
    const geometry = new THREE.BoxGeometry(size, size, size, 1, 1, 1);

    const material = new THREE.MeshPhongMaterial({
      color: 0xc329c9,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(pos);
    // mesh.quaternion.copy(quat);

    this.mesh.gameObject = this;

    this.body = new Body(this.mesh, game.physics, { type: 'box' });
    this.body.addCollider(
      RAPIER.ColliderDesc.cuboid(size * 0.5, size * 0.5, size * 0.5),
    );
  }

  update(_delta, _tick) {
    this.body.copyToObj(this.mesh);
  }
}
