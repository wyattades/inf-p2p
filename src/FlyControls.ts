import * as THREE from 'three';

import type Game from 'src/Game';

export default class FlyControls {
  object: THREE.PerspectiveCamera;
  constructor(readonly game: Game) {
    this.object = game.camera!;
  }

  _motion = new THREE.Vector3();
  _velocity = new THREE.Vector3();
  _motionRotation = new THREE.Matrix4();
  update(delta: number, _tick: number) {
    const { x: rotAngleX, y: rotAngleY } = this.game.controls.rotation;

    // Apply controls to motion
    const motion = this._motion.set(0, 0, 0);

    const keystate = this.game.controls.keystate;

    if (keystate.forward) {
      motion.z -= 1;
    }
    if (keystate.backward) {
      motion.z += 1;
    }
    if (keystate.strafeLeft) {
      motion.x -= 1;
    }
    if (keystate.strafeRight) {
      motion.x += 1;
    }

    // apply rotation to motion
    motion.applyMatrix4(
      this._motionRotation
        .set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        .makeRotationY(rotAngleY),
    );

    let speed = delta * 20;
    if (keystate.sprint) speed *= 4;

    motion.setLength(speed);

    if (keystate.jump) motion.y += speed;

    if (keystate.crouch) motion.y -= speed;

    this.object.position.add(motion);

    this.object.rotation.set(0, 0, 0);
    // Y must be before X
    this.object.rotateY(rotAngleY);
    this.object.rotateX(rotAngleX);
  }

  dispose() {}
}
