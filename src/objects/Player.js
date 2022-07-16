import * as THREE from 'three';

import { Body, RAPIER } from 'src/physics';
import { clamp } from 'src/utils/math';

// TODO seperate keyevents, player, and physics

const _clamp = new THREE.Vector2(0, 0);
const clampXZ = (vec3, max) => {
  _clamp.set(vec3.x, vec3.z);

  const length = _clamp.length();
  if (length < max) return null;

  _clamp.setLength(max);

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
      type: 'player',
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
    const pos = this.position;
    pos.set(x ?? pos.x, y ?? pos.y, z ?? pos.z);

    this.body.resetMovement();
    this.body.copyFromObj(this.object, true);
  }

  get velocity() {
    return this.body.rigidBody.linvel();
  }

  onGround(groundHeight) {
    // FIXME: for some reason proximity events are not emitted when colliding with terrain
    // (static bodies) so we need to use the getHeightAt code below
    // if (this.game.physics.isProximitied(this.floorColliderHandle)) return true;

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

    const groundHeight = this.game.chunkLoader.getHeightAt(
      this.position.x,
      this.position.z,
    );

    const onGround = this.onGround(groundHeight);

    const linvel = this.body.rigidBody.linvel();

    let updateVel = null;

    if (
      keystate.jump &&
      tick - this.lastJumpAt > 30 && // ~0.5 seconds
      onGround
    ) {
      updateVel = { ...linvel, y: jumpSpeed };
      this.lastJumpAt = tick;
    }

    // apply rotation to motion
    motion.applyMatrix4(
      this._motionRotation
        .set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        .makeRotationY(rotAngleY),
    );

    if (onGround) {
      const offset = this.position
        .clone()
        .add(motion.clone().multiplyScalar(0.1));

      const offsetHeight = this.game.chunkLoader.getHeightAt(
        offset.x,
        offset.z,
      );

      const slope = offsetHeight - groundHeight;

      motion.y = clamp(slope, 0, 0.1) * 3.0;
    }

    motion.setLength(onGround ? moveForce : moveForce * 0.2);

    // debug:
    // console.log(onGround, groundHeight, motion.x, motion.y, motion.z);

    this.body.rigidBody.resetForces();
    if (motion.lengthSq() > 0) {
      this.body.rigidBody.addForce(motion, true);

      // this.body.rigidBody.applyImpulse(motion, true);
    }

    const clampedVel = clampXZ(updateVel || linvel, maxSpeed);
    if (clampedVel) updateVel = clampedVel;

    if (updateVel) this.body.rigidBody.setLinvel(updateVel);

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

    // TODO: figure out the actual minimum height
    if (this.position.y < -100) {
      console.warn('Player fell out of the world!');

      this.setPos(null, groundHeight + 10, null);
    }
  }

  dispose() {
    // physics.unregisterContactListener(this.body.rigidBody.handle)
    this.body.dispose();
  }
}
