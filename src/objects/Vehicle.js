import * as THREE from 'three';

import { Body, RAPIER } from 'src/physics';
import { ZERO_QUATERNION } from 'src/utils/empty';

// wheel indices
const FRONT_LEFT = 0;
const FRONT_RIGHT = 1;
const BACK_LEFT = 2;
const BACK_RIGHT = 3;

// Vehicle constants:

const chassisWidth = 4;
const chassisHeight = 1.5;
const chassisLength = 7;
// const massVehicle = 800;

const wheelAxisPositionBack = -2;
const wheelRadiusBack = 1.4; // 0.8;
const wheelWidthBack = 0.8;
const wheelHalfTrackBack = chassisWidth / 2 + wheelWidthBack / 2 + 0.3;
const wheelAxisHeightBack = -0.8;

const wheelAxisPositionFront = 2.5;
const wheelRadiusFront = wheelRadiusBack;
const wheelWidthFront = wheelWidthBack;
const wheelHalfTrackFront = wheelHalfTrackBack;
const wheelAxisHeightFront = wheelAxisHeightBack;

// const suspensionStiffness = 20.0;
// const suspensionDamping = 2.3;
// const suspensionCompression = 4.4;
// const suspensionRestLength = 0.6;
// const rollInfluence = 0.2;
// const chassisLinearDamping = 2.0;

const steeringIncrement = 0.04;
const steeringClamp = 0.6;
const maxEngineForce = 50;
const maxBreakingForce = 20;
const maxWheelAngularSpeed = 10.0;
const wheelAngularDamping = 4.0;
const wheelFriction = 3.0;
const wheelDensity = 0.7;
const chassisDensity = 0.6;

// let _rotationMatrix;
// /**
//  * @param {THREE.Object3D} object
//  * @param {THREE.Vector3} axis
//  * @param {number} radians
//  */
// function rotateAroundObjectAxis(object, axis, radians) {
//   _rotationMatrix = new THREE.Matrix4();
//   _rotationMatrix.makeRotationAxis(axis.normalize(), radians);
//   object.matrix.multiply(_rotationMatrix); // post-multiply
//   object.rotation.setFromRotationMatrix(object.matrix, object.order);
// }

class Wheel {
  /**
   * @param {Vehicle} vehicle
   * @param {number} index
   * @param {number} radius
   * @param {number} width
   * @param {THREE.Vector3} offset
   */
  constructor(vehicle, index, radius, width, offset) {
    this.game = vehicle.game;
    this.vehicle = vehicle;
    this.index = index;
    this.radius = radius;
    this.width = width;
    this.offset = offset;
    this.scene = this.vehicle.scene;

    const geometry = new THREE.CylinderGeometry(radius, radius, width, 24, 1);

    const mesh = (this.mesh = new THREE.Mesh(
      geometry,
      this.vehicle.wheelMaterial,
    ));

    const stickHeight = width * 0.25;
    const stickMesh = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 1.75, stickHeight, radius * 0.25, 1, 1, 1),
      this.vehicle.wheelMaterial,
    );
    stickMesh.position.y += width / 2 + stickHeight / 2;
    mesh.add(stickMesh);

    // -1 is left side, 1 is right side
    const dir = (this.dir = Math.sign(offset.x));

    mesh.rotateZ(-dir * Math.PI * 0.5);

    mesh.position.copy(offset).add(this.vehicle.chassisMesh.position);

    this.scene.add(mesh);
    // this.chassisMesh.add(mesh);

    const body = (this.body = new Body(mesh, this.game.physics, {
      angularDamping: wheelAngularDamping,
      type: 'wheel',
    }));
    body.addCollider(
      RAPIER.ColliderDesc.cylinder(width / 2, radius)
        .setDensity(wheelDensity)
        .setFriction(wheelFriction),
    );

    this.joint = this.game.physics.world.createImpulseJoint(
      RAPIER.JointData.revolute(
        offset,
        new THREE.Vector3(dir, 0, 0),
        // new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-dir, 0, 0).applyQuaternion(mesh.quaternion),
      ),
      this.vehicle.chassisBody.rigidBody,
      body.rigidBody,
    );
  }

  applyWheelForces(forwardVel, engineForce, brakingForce) {
    // save some computation by returning early
    // if (engineForce === 0 && brakingForce === 0) return;

    const wheelBody = this.body;
    const wheelMesh = this.mesh;

    const dirXSign =
      this.index === BACK_LEFT || this.index === FRONT_LEFT ? -1 : 1;
    // const dirZ =
    //   wheelIndex === FRONT_LEFT || wheelIndex === FRONT_RIGHT ? 1 : -1;

    const vel = this.localAngVel().y; // angular velocity of wheel. wheels on the LEFT will have opposite velocity
    const velSign = Math.sign(vel);

    const applyEngineForceInSameDirection =
      engineForce !== 0 && Math.sign(engineForce) * dirXSign === velSign;

    let torque = 0;

    if (
      engineForce !== 0 &&
      !(applyEngineForceInSameDirection && Math.abs(vel) > maxWheelAngularSpeed)
    ) {
      torque += dirXSign * engineForce;
    }

    if (brakingForce !== 0) {
      // HACK: this seems to prevent stuttering when vehicle has forwardVel ~= 0 ???
      if (Math.abs(forwardVel) > 1.0) {
        torque += -velSign * brakingForce;
      }
    }

    if (torque !== 0) {
      const torqueVec = this.vehicle._vec3a
        .set(0, torque, 0)
        .applyQuaternion(wheelMesh.quaternion);

      wheelBody.rigidBody.applyTorqueImpulse(torqueVec, true);

      this.game.physics.updateDebugForce(
        wheelBody.rigidBody.handle,
        wheelMesh.position.clone(),
        torqueVec,
      );
    } else {
      this.game.physics.updateDebugForce(wheelBody.rigidBody.handle, null);
    }
  }

  setSteeringValue(steeringAngle) {
    // TODO: how to change joint angle? probably need to attach to another joint :/
  }

  localAngVel() {
    return this.vehicle._vec3b
      .copy(this.body.rigidBody.angvel())
      .applyQuaternion(this.vehicle._quat.copy(this.mesh.quaternion).invert());
  }

  copyToObj() {
    this.body.copyToObj(this.mesh);
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.body.dispose();
    this.body = null;
    this.mesh = null;
    this.scene = null;
  }
}

export default class Vehicle {
  material = new THREE.MeshPhongMaterial({
    color: 0x995500,
  });
  wheelMaterial = new THREE.MeshPhongMaterial({
    color: 0x221100,
  });

  vehicleSteering = 0;

  /** @type {THREE.Vector3} */
  position;

  /**
   * @param {import('src/Game').default} game
   */
  constructor(game, position = new THREE.Vector3(20, 5, 20)) {
    this.game = game;
    this.scene = game.scene;

    this.game.controls.setKeyBind('acceleration', 'ArrowUp');
    this.game.controls.setKeyBind('braking', 'ArrowDown');
    this.game.controls.setKeyBind('turnLeft', 'ArrowLeft');
    this.game.controls.setKeyBind('turnRight', 'ArrowRight');

    this.createVehicle(position);
  }

  get matrixWorld() {
    return this.chassisMesh.matrixWorld;
  }

  setPos(x, y, z) {
    if (x == null) x = this.position.x;
    if (y == null) y = this.position.y;
    if (z == null) z = this.position.z;

    this.chassisMesh.position.set(x, y, z);
    this.chassisMesh.quaternion.copy(ZERO_QUATERNION);

    for (let i = 0; i < 4; i++) this.wheels[i].body.resetMovement();
    this.chassisBody.resetMovement();

    this.chassisBody.copyFromObj(this.chassisMesh);
  }

  flip() {
    this.setPos(this.position.x, this.position.y + 5, this.position.z);
  }

  /** @type {Wheel[]} */
  wheels = [];

  createVehicle(pos) {
    // Chassis:

    const chassisMesh = (this.chassisMesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        chassisWidth,
        chassisHeight,
        chassisLength,
        1,
        1,
        1,
      ),
      this.material,
    ));
    this.position = chassisMesh.position;
    this.rotation = chassisMesh.rotation;

    this.position.copy(pos);

    const chassisBody = (this.chassisBody = new Body(
      chassisMesh,
      this.game.physics,
      { type: 'vehicle' },
    ));
    chassisBody.addCollider(
      RAPIER.ColliderDesc.cuboid(
        chassisWidth * 0.5,
        chassisHeight * 0.5,
        chassisLength * 0.5,
      ).setDensity(chassisDensity),
    );

    this.scene.add(chassisMesh);

    // Wheels:

    // const wheelDirectionCS0 = new THREE.Vector3(0, -1, 0);
    // const wheelAxleCS = new THREE.Vector3(-1, 0, 0);

    const addWheel = (index, radius, width, offset) => {
      this.wheels[index] = new Wheel(this, index, radius, width, offset);
    };

    addWheel(
      FRONT_LEFT,
      wheelRadiusFront,
      wheelWidthFront,
      new THREE.Vector3(
        -wheelHalfTrackFront,
        wheelAxisHeightFront,
        wheelAxisPositionFront,
      ),
    );
    addWheel(
      FRONT_RIGHT,
      wheelRadiusFront,
      wheelWidthFront,
      new THREE.Vector3(
        wheelHalfTrackFront,
        wheelAxisHeightFront,
        wheelAxisPositionFront,
      ),
    );
    addWheel(
      BACK_LEFT,
      wheelRadiusBack,
      wheelWidthBack,
      new THREE.Vector3(
        -wheelHalfTrackBack,
        wheelAxisHeightBack,
        wheelAxisPositionBack,
      ),
    );
    addWheel(
      BACK_RIGHT,
      wheelRadiusBack,
      wheelWidthBack,
      new THREE.Vector3(
        wheelHalfTrackBack,
        wheelAxisHeightBack,
        wheelAxisPositionBack,
      ),
    );
  }

  // temp vectors to perform calculations with and avoid new object allocations
  _vec3a = new THREE.Vector3();
  _vec3b = new THREE.Vector3();
  _quat = new THREE.Quaternion();

  getForwardVelocity() {
    const localLinVel = this._vec3a
      .copy(this.chassisBody.rigidBody.linvel())
      .applyQuaternion(this.chassisMesh.quaternion);

    return localLinVel.z;
  }

  update(_delta, _tick) {
    const forwardVel = this.getForwardVelocity();

    const keystate = this.game.controls.keystate;

    const maxReverseSpeedForAccel = 0.5;

    let engineForce = 0;
    let breakingForce = 0;

    if (keystate.acceleration) {
      if (forwardVel < -maxReverseSpeedForAccel)
        breakingForce = maxBreakingForce;
      else engineForce = maxEngineForce;
    }
    if (keystate.braking) {
      if (forwardVel > maxReverseSpeedForAccel)
        breakingForce = maxBreakingForce;
      else engineForce = -maxEngineForce;
    }
    if (keystate.turnLeft) {
      if (this.vehicleSteering < steeringClamp)
        this.vehicleSteering += steeringIncrement;
    } else if (keystate.turnRight) {
      if (this.vehicleSteering > -steeringClamp)
        this.vehicleSteering -= steeringIncrement;
    } else if (this.vehicleSteering < -steeringIncrement)
      this.vehicleSteering += steeringIncrement;
    else if (this.vehicleSteering > steeringIncrement)
      this.vehicleSteering -= steeringIncrement;
    else {
      this.vehicleSteering = 0;
    }
    // console.log(_.round(forwardVel, 4), engineForce, breakingForce);

    this.wheels[BACK_LEFT].applyWheelForces(
      forwardVel,
      engineForce,
      breakingForce,
    );
    this.wheels[BACK_RIGHT].applyWheelForces(
      forwardVel,
      engineForce,
      breakingForce,
    );
    this.wheels[FRONT_LEFT].applyWheelForces(
      forwardVel,
      0,
      breakingForce * 0.5,
    );
    this.wheels[FRONT_RIGHT].applyWheelForces(
      forwardVel,
      0,
      breakingForce * 0.5,
    );

    this.wheels[FRONT_LEFT].setSteeringValue(this.vehicleSteering);
    this.wheels[FRONT_RIGHT].setSteeringValue(this.vehicleSteering);

    // TEMP
    // if (this.vehicleSteering !== 0)
    //   this.chassisBody.rigidBody.applyTorqueImpulse(
    //     new THREE.Vector3(0, 100 * this.vehicleSteering, 0).applyQuaternion(
    //       this.chassisMesh.quaternion,
    //     ),
    //   );

    // copy physics body data to visual meshes
    this.chassisBody.copyToObj(this.chassisMesh);
    for (const w of this.wheels) w.copyToObj();
  }

  dispose() {
    this.scene.remove(this.chassisMesh);
    this.chassisBody.dispose();
    while (this.wheels.length > 0) this.wheels.pop().dispose();
  }
}
