import * as THREE from 'three';

import { Body, RAPIER } from 'src/physics';

// TODO seperate keyevents, player, and physics

const _clamp = new THREE.Vector2(0, 0);
const clampXZ = (vec3, max) => {
  _clamp.set(vec3.x, vec3.z).clampLength(0, max);

  vec3.x = _clamp.x;
  vec3.z = _clamp.y;

  return vec3;
};

const playerHeight = 6.0;
const playerWidth = 2.0;
const jumpSpeed = 40;
const maxSpeed = 45;
const moveForce = 6000;
const friction = 1.1;
const restitution = 0.15;
const floorColliderDist = 1.0;

export default class Player {
  /**
   * @param {import('src/Game').default} game
   */
  constructor(game) {
    this.game = game;

    this.object = new THREE.Object3D();
    // this.game.scene.add(this.object);
    this.position = this.object.position;
    this.rotation = this.object.rotation;

    this.body = new Body(this.object, this.game.physics, {
      lockRotation: true,
    });
    this.body.addCollider(
      RAPIER.ColliderDesc.capsule(
        Math.max(0, playerHeight / 2 - playerWidth / 2),
        playerWidth / 2,
      )
        .setFriction(friction)
        .setRestitution(restitution), // bounciness
    );

    // sensor and heightmap are slow together: https://github.com/dimforge/rapier/issues/332
    // this.floorColliderHandle = this.body.addCollider(
    //   RAPIER.ColliderDesc.ball(floorColliderDist)
    //     .setSensor(true)
    //     .setTranslation(0, -playerHeight / 2, 0),
    // ).handle;

    // this.floorSensor.registerContactListener();
    // this.body.registerContactListener();
  }

  setPos(x, y, z) {
    if (x == null) x = this.position.x;
    if (y == null) y = this.position.y;
    if (z == null) z = this.position.z;

    this.object.position.set(x, y, z);

    this.body.resetMovement();
    this.body.copyFromObj(this.object, true);
  }

  get velocity() {
    return this.body.rigidBody.linvel();
  }

  onGround() {
    // FIXME: for some reason proximity events are not emitted when colliding with terrain
    // (static bodies) so we need to use the getHeightAt code below
    // if (this.game.physics.isProximitied(this.floorColliderHandle)) return true;

    const groundHeight = this.game.chunkLoader.getHeightAt(
      this.position.x,
      this.position.z,
    );

    return (
      this.position.y - playerHeight / 2 - floorColliderDist <= groundHeight
    );
  }

  _motion = new THREE.Vector3();
  _motionRotation = new THREE.Matrix4();
  lastJumpAt = -9999;
  update(_delta, tick) {
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

    const onGround = this.onGround();

    if (
      keystate.jump &&
      tick - this.lastJumpAt > 30 && // ~0.5 seconds
      onGround
    ) {
      this.body.rigidBody.setLinvel(
        {
          ...this.body.rigidBody.linvel(),
          y: jumpSpeed,
        },
        true,
      );
      this.lastJumpAt = tick;
    }

    // apply rotation to motion
    motion.applyMatrix4(
      this._motionRotation
        .set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        .makeRotationY(rotAngleY),
    );

    motion.setLength(onGround ? moveForce : moveForce * 0.2);

    this.body.rigidBody.resetForces();
    this.body.rigidBody.addForce(motion);

    const linVel = this.body.rigidBody.linvel();
    this.body.rigidBody.setLinvel(clampXZ(linVel, maxSpeed));

    // const drag = 0.91; // TODO: Use slope

    this.object.rotation.set(0, 0, 0);
    // Y must be before X
    this.object.rotateY(rotAngleY);
    this.object.rotateX(rotAngleX);

    this.body.copyToObj(this.object, true);

    // // hit ground
    // const groundHeight = this.chunkLoader.getHeightAt(
    //   this.position.x,
    //   this.position.z,
    // );
    // const groundDist = this.position.y - playerHeight - groundHeight;
    // this.onGround = groundDist <= 0;
    // if (this.onGround) this.velocity.y = 0;
    // if (groundDist < 0) this.position.y = groundHeight + playerHeight;

    // // drag
    // const velY = this.velocity.y;
    // this.velocity.y = 0;
    // if (groundDist < 0.5) {
    //   this.velocity.multiplyScalar(drag);
    // }
    // this.velocity.clampLength(-maxSpeed, maxSpeed);
    // this.velocity.y = velY;

    // // gravity
    // this.velocity.y -= gravity;
  }

  dispose() {
    // physics.unregisterContactListener(this.body.rigidBody.handle)
    this.body.dispose();
  }
}
