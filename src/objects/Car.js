import * as THREE from 'three';

import { loadModel } from 'src/utils/models';
import Player from 'src/objects/Player';

class Wheel {
  static RADIUS = 1;

  /**
   * @param {Car} car
   * @param {Number} x
   * @param {Number} z
   */
  constructor(car, x, z) {
    this.car = car;
    this.game = this.car.game;

    this.offset = new THREE.Vector3(x, 0, z);
    this.position = car.position.copy().add(this.offset);
  }

  update(delta) {
    const groundHeight = this.game.chunkLoader.getHeightAt(
      this.position.x,
      this.position.z,
    );
    const groundDist = this.position.y - Wheel.RADIUS - groundHeight;
    if (groundDist < 0) this.position.y = groundHeight + Wheel.RADIUS;
  }
}

export default class Car extends Player {
  /**
   * @param {import('../Game').default} game
   */
  constructor(game) {
    super(game);

    this.wheels = [
      new Wheel(this, -3, 4),
      new Wheel(this, 3, 4),
      new Wheel(this, 3, -4),
      new Wheel(this, -3, -4),
    ];

    loadModel(() => import('src/models/car.json'))
      .then((model) => {
        // model.scale.setScalar(0.034);
        // obj.rotateX(-Math.PI / 2);
        game.scene.add(model);
        this.model = model;
      })
      .catch(console.error);
  }

  update(delta) {
    const speed = delta * 1.1;
    // const rotSpeed = delta * 1.2;
    // const drag = 0.91; // TODO: Use slope
    const gravity = 0.03; // This doesn't work cause it's not linear... TODO
    const maxSpeed = 0.7;

    let touchingGround = 0;
    for (const wheel of this.wheels) {
      const groundHeight = this.game.chunkLoader.getHeightAt(
        wheel.position.x,
        wheel.position.z,
      );
      const groundDist = this.position.y - Wheel.RADIUS - groundHeight;
      if (groundDist < 0) this.position.y = groundHeight + Wheel.RADIUS;

      if (groundDist < 0.5) touchingGround++;
    }

    this.position.add(this.velocity);

    // drag
    const velY = this.velocity.y;
    this.velocity.y = 0;

    const drag = 1 - touchingGround * 0.02;
    // if (avgGroundDist < 0.5) {
    if (drag < 1) this.velocity.multiplyScalar(drag);
    // }
    this.velocity.clampLength(-maxSpeed, maxSpeed);
    this.velocity.y = velY;

    // gravity
    this.velocity.y -= gravity;
  }
}
