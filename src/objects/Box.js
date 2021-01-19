import * as THREE from 'three';

import physics, { Body, RAPIER } from 'src/physics';

export default class Box {
  constructor(pos, size = 3) {
    const geometry = new THREE.BoxGeometry(size, size, size, 1, 1, 1);

    const material = new THREE.MeshPhongMaterial({
      color: 0xc329c9,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(pos);
    // mesh.quaternion.copy(quat);

    this.body = new Body(this.mesh, physics.world);
    this.body.addCollider(
      RAPIER.ColliderDesc.cuboid(size * 0.5, size * 0.5, size * 0.5),
    );
  }

  update() {
    this.body.copyToObj(this.mesh);
  }
}
