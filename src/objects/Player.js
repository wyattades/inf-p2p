import * as THREE from 'three';
import isEmpty from 'lodash/isEmpty';

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

const zeroVector3 = new THREE.Vector3();
const zeroQuaternion = new THREE.Quaternion();

export default class Player {
  /**
   * @param {import('../Game').default} game
   */
  constructor(game) {
    this.game = game;

    this.chunkLoader = game.chunkLoader;
    this.keystate = game.controls.keystate;
    this.lookRotation = game.controls.rotation;

    this.obj = new THREE.Object3D();
    this.position = this.obj.position;
    this.rotation = this.obj.rotation;

    this.body = new Body(this.position, physics.world);
    this.body.addCollider(
      RAPIER.ColliderDesc.capsule(playerHeight / 2, 1)
        .setFriction(friction)
        .setRestitution(restitution), // bounciness
    );

    physics.registerContactListener(this.body.rigidBody.handle);
  }

  setPos(x, y, z) {
    this.position.set(x, y, z);
    this.body.rigidBody.setTranslation({ x, y, z }, false);
  }

  get velocity() {
    return this.body.rigidBody.linvel();
  }

  onGround() {
    return !isEmpty(physics.getContacts(this.body.rigidBody.handle));
  }

  _motion = new THREE.Vector3(0, 0, 0);
  _velocity = new THREE.Vector3(0, 0, 0);
  updateControls(delta) {
    // const speed = delta * 1.1;
    const rotSpeed = delta * 1.2;

    // Apply controls to motion
    const motion = this._motion.set(0, 0, 0);

    if (this.keystate.forward) {
      motion.z -= 1;
    }
    if (this.keystate.backward) {
      motion.z += 1;
    }
    if (this.keystate.strafeLeft) {
      motion.x -= 1;
    }
    if (this.keystate.strafeRight) {
      motion.x += 1;
    }

    if (this.keystate.cameraUp) {
      this.lookRotation.x += rotSpeed;
    }
    if (this.keystate.cameraDown) {
      this.lookRotation.x -= rotSpeed;
    }
    if (this.keystate.cameraLeft) {
      this.lookRotation.y += rotSpeed;
    }
    if (this.keystate.cameraRight) {
      this.lookRotation.y -= rotSpeed;
    }

    if (this.keystate.jump && this.onGround()) {
      this.body.rigidBody.setLinvel(
        {
          ...this.body.rigidBody.linvel(),
          y: jumpSpeed,
        },
        true,
      );
      // this.velocity.y = jumpSpeed;
    }

    // apply rotation to motion
    const rotation = new THREE.Matrix4().makeRotationY(this.lookRotation.y);
    motion.applyMatrix4(rotation);

    motion.setLength(moveForce);

    // console.log(vel, clamped, this.body.rigidBody.linvel());

    // add acc and vel
    this.body.rigidBody.applyForce(motion, true);

    this.body.rigidBody.setLinvel(
      clampXZ(this.body.rigidBody.linvel(), maxSpeed),
    );

    // this.velocity.add(motion);
  }

  update(_delta) {
    // Do we even need delta if it's constant?
    // TODO move constants
    const drag = 0.91; // TODO: Use slope
    const gravity = 0.03; // This doesn't work cause it's not linear... TODO

    const { x: rotX, y: rotY } = this.lookRotation;
    this.obj.rotation.set(0, 0, 0);
    // Y must be before X
    this.obj.rotateY(rotY);
    this.obj.rotateX(rotX);
    this.body.rigidBody.setAngvel(zeroVector3);
    this.body.rigidBody.setRotation(zeroQuaternion);

    this.position.copy(this.body.rigidBody.translation());
    // this.rotation.copy(this.body.rigidBody.rotation());

    return;
    this.position.add(this.velocity);

    // hit ground
    const groundHeight = this.chunkLoader.getHeightAt(
      this.position.x,
      this.position.z,
    );
    const groundDist = this.position.y - playerHeight - groundHeight;
    this.onGround = groundDist <= 0;
    if (this.onGround) this.velocity.y = 0;
    if (groundDist < 0) this.position.y = groundHeight + playerHeight;

    // drag
    const velY = this.velocity.y;
    this.velocity.y = 0;
    if (groundDist < 0.5) {
      this.velocity.multiplyScalar(drag);
    }
    this.velocity.clampLength(-maxSpeed, maxSpeed);
    this.velocity.y = velY;

    // gravity
    this.velocity.y -= gravity;
  }
}
