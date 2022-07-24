import * as THREE from 'three';

import type Game from 'src/Game';

export class MoveBot {
  origin = new THREE.Vector3();
  radius = 40;
  private follow = new THREE.Vector3();

  // cursor = new THREE.Mesh(
  //   new THREE.SphereGeometry(5),
  //   new THREE.MeshPhongMaterial({ color: 0xffffff }),
  // );

  constructor(readonly game: Game) {
    // this.cursor.visible = false;
  }

  enabled = false;
  enable() {
    this.enabled = true;

    this.origin.copy(this.game.player.position);

    // this.cursor.visible = true;
    // this.game.scene.add(this.cursor);
    // this.game.player.setPos(this.origin.x, this.origin.y + 5, this.origin.z);
  }
  disable() {
    this.enabled = false;
    // this.cursor.visible = false;
    // this.cursor.removeFromParent();
  }

  update(delta: number, tick: number) {
    if (!this.enabled) return;

    const player = this.game.player;

    const time = tick / 80.0;

    this.follow.set(
      this.origin.x + this.radius * Math.cos(time),
      this.origin.y,
      this.origin.z + this.radius * Math.sin(time),
    );
    // this.cursor.position.copy(this.follow);

    const angle = Math.atan2(
      this.follow.x - player.position.x,
      this.follow.z - player.position.z,
    );

    this.game.controls.rotation.set(0, angle + Math.PI);
    // player.object.rotation.set(0, angle + Math.PI, 0);

    const keys = this.game.controls.keystate;
    const prevForward = keys.forward;
    const prevJump = keys.jump;

    keys.forward = true;
    keys.jump = true;

    player.update(delta, tick);

    keys.forward = prevForward;
    keys.jump = prevJump;
  }

  dispose() {}
}
