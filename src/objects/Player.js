import * as THREE from 'three';
import { isEmpty } from 'lodash';

import physics, { Body, RAPIER } from 'src/physics';

// TODO seperate keyevents, player, and physics

const _clamp = new THREE.Vector2(0, 0);
const clampXZ = (vec3, max) => {
  _clamp.set(vec3.x, vec3.z);

  if (_clamp.lengthSq() > max * max) {
    _clamp.setLength(max);

    return {
      x: _clamp.x,
      y: vec3.y,
      z: _clamp.y,
    };
  }

  return vec3;
};

const playerHeight = 4.0;
const jumpSpeed = 40;
const maxSpeed = 45;
const moveForce = 6000;
const friction = 1.1;
const restitution = 0.15;

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

    this.body = new Body(this.object, physics.world, { lockRotation: true });
    this.body.addCollider(
      RAPIER.ColliderDesc.capsule(playerHeight / 2, 1)
        .setFriction(friction)
        .setRestitution(restitution), // bounciness
    );

    // TODO
    // const floorSensorCollider = this.body.addCollider(
    //   RAPIER.ColliderDesc.capsule(0, 0.5)
    //     .setIsSensor(true)
    //     .setTranslation({ x: 0, y: -playerHeight / 2, z: 0 }),
    // );

    this.body.registerContactListener();
  }

  setPos(x, y, z) {
    if (x == null) x = this.position.x;
    if (y == null) y = this.position.y;
    if (z == null) z = this.position.z;

    this.position.set(x, y, z);
    this.body.rigidBody.setTranslation({ x, y, z }, false);
  }

  get velocity() {
    return this.body.rigidBody.linvel();
  }

  onGround() {
    return !isEmpty(physics.getContacts(this.body.rigidBody.handle));
  }

  _motion = new THREE.Vector3();
  _velocity = new THREE.Vector3();
  _motionRotation = new THREE.Matrix4();
  lastJumpAt = -9999;
  update(_delta, tick) {
    const { x: rotAngleX, y: rotAngleY } = this.game.controls.rotation;

    // const speed = delta * 1.1;
    // const rotSpeed = delta * 1.2;

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

    // if (keystate.cameraUp) {
    //   this.lookRotation.x += rotSpeed;
    // }
    // if (keystate.cameraDown) {
    //   this.lookRotation.x -= rotSpeed;
    // }
    // if (keystate.cameraLeft) {
    //   this.lookRotation.y += rotSpeed;
    // }
    // if (keystate.cameraRight) {
    //   this.lookRotation.y -= rotSpeed;
    // }

    if (
      keystate.jump &&
      tick - this.lastJumpAt > 30 && // ~0.5 seconds
      this.onGround()
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

    motion.setLength(moveForce);

    // console.log(vel, clamped, this.body.rigidBody.linvel());

    // add acc and vel
    this.body.rigidBody.applyForce(motion, true);

    this.body.rigidBody.setLinvel(
      clampXZ(this.body.rigidBody.linvel(), maxSpeed),
    );

    // this.velocity.add(motion);

    // TODO move constants
    // const drag = 0.91; // TODO: Use slope
    // const gravity = 0.03; // This doesn't work cause it's not linear... TODO

    this.object.rotation.set(0, 0, 0);
    // Y must be before X
    this.object.rotateY(rotAngleY);
    this.object.rotateX(rotAngleX);
    // this.body.rigidBody.setAngvel(ZERO_VECTOR3);
    // this.body.rigidBody.setRotation(ZERO_QUATERNION);

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
