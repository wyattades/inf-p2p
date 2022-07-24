import * as THREE from 'three';

import { Body, RAPIER } from 'src/physics';
import type Game from 'src/Game';

import { GameObject, physicsMixin } from './base';

// TODO seperate keyevents, player, and physics

const _clamp = new THREE.Vector2(0, 0);
const clampXZ = (vec3: Point3, max: number) => {
  _clamp.set(vec3.x, vec3.z);

  const length = _clamp.length();
  if (length < max) return null;

  _clamp.setLength(max);

  vec3.x = _clamp.x;
  vec3.z = _clamp.y;

  return vec3;
};

const _planeNormal = new THREE.Vector3();
function projectOnPlane(vector: Point3, planeNormal: Point3) {
  _planeNormal.copy(planeNormal as THREE.Vector3);
  const dot = _planeNormal.dot(vector as THREE.Vector3);
  return _planeNormal.multiplyScalar(-dot).add(vector as THREE.Vector3);
}

export const playerHeight = 6.0;
const playerWidth = 2.0;
const jumpSpeed = 40;
const maxSpeed = 45;
const moveForce = 4000;
const nonGroundedMoveForce = moveForce * 0.2;
const friction = 1.1;
const restitution = 0.15;
const floorColliderDist = 1.0;
const minWorldY = -100; // TODO: figure out the actual minimum height
const stuckInGroundDelta = -0.5;
const stuckInGroundIterations = 5;

export default class Player extends physicsMixin(GameObject) {
  object = new THREE.Object3D();
  position = this.object.position;
  quaternion = this.object.quaternion;
  rotation = this.object.rotation;

  body!: Body;

  constructor(game: Game) {
    super(game);
    this.enablePhysics();
  }

  enablePhysics() {
    this.body = new Body(this, this.game.physics, {
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
  }

  setPos(x: number | null, y: number | null, z: number | null) {
    const pos = this.position;
    pos.set(x ?? pos.x, y ?? pos.y, z ?? pos.z);

    this.body.resetMovement();
    this.body.copyFromObj(this, true);
  }

  get velocity() {
    return this.body.rigidBody.linvel();
  }

  stuckInGroundCounter = 0;

  _motion = new THREE.Vector3();
  _motionRotation = new THREE.Matrix4();
  lastJumpAt = -9999;
  lastJumpY: number | null = null;

  update(_delta: number, tick: number) {
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

    const [groundNormal, groundHeight] = this.game.physics.getSlopeAt(
      this.position,
      playerHeight,
    );

    const groundDeltaY = this.position.y - playerHeight / 2 - groundHeight;

    const onGround = groundDeltaY <= floorColliderDist;

    const linvel = this.body.rigidBody.linvel();

    let updateVel = null;

    // the last jump failed if player `y` didn't change since last jump
    // (wait for 2 iterations b/c sometimes `y` doesn't change after 1 iteration)
    const lastJumpFailed =
      tick - this.lastJumpAt === 2 &&
      this.lastJumpY != null &&
      this.lastJumpY === this.position.y;

    if (tick - this.lastJumpAt >= 2) this.lastJumpY = null;

    if (
      keystate.jump &&
      tick - this.lastJumpAt > 30 && // ~0.5 seconds
      onGround
    ) {
      updateVel = { ...linvel, y: jumpSpeed };
      this.lastJumpAt = tick;
      this.lastJumpY = this.position.y;
    }

    const applyingMotion = motion.lengthSq() > 0;

    if (applyingMotion) {
      // apply rotation to motion
      motion.applyMatrix4(
        this._motionRotation
          .set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
          .makeRotationY(rotAngleY),
      );

      if (onGround) {
        const slopeVec = projectOnPlane(motion, groundNormal);

        if (slopeVec.y > 0) {
          slopeVec.y *= 0.5; // reduce upward force a bit

          motion.copy(slopeVec);
        }
      }

      motion.setLength(onGround ? moveForce : nonGroundedMoveForce);
    }

    // debug:
    // console.log(onGround, groundHeight, motion.x, motion.y, motion.z);

    this.body.rigidBody.resetForces(true);
    if (applyingMotion) {
      this.body.rigidBody.addForce(motion, true);

      // this.body.rigidBody.applyImpulse(motion, true);
    }

    const clampedVel = clampXZ(updateVel || linvel, maxSpeed);
    if (clampedVel) updateVel = clampedVel;

    if (updateVel) this.body.rigidBody.setLinvel(updateVel, true);

    // const drag = 0.91; // TODO: Use slope

    this.object.rotation.set(0, 0, 0);
    // Y must be before X
    this.object.rotateY(rotAngleY);
    this.object.rotateX(rotAngleX);

    this.body.copyToObj(this, true);

    if (groundDeltaY < stuckInGroundDelta) this.stuckInGroundCounter++;
    else this.stuckInGroundCounter = 0;

    if (this.position.y < minWorldY) {
      console.warn('Player fell out of the world!');

      this.setPos(
        null,
        Math.max(
          0,
          this.game.physics.getMaxHeightAt(this.position.x, this.position.z),
        ) + 10,
        null,
      );
    } else if (this.stuckInGroundCounter >= stuckInGroundIterations) {
      this.stuckInGroundCounter = 0;
      console.warn('Player got stuck in the ground!');
      this.setPos(null, this.position.y + 1, null);
    } else if (lastJumpFailed) {
      console.warn('Last player jump failed!');
      this.setPos(null, this.position.y + 1, null);
      this.body.rigidBody.setLinvel(new RAPIER.Vector3(0, jumpSpeed, 0), true);
    }
  }
}
