import * as THREE from 'three';

import { ZERO_VECTOR3 } from 'src/utils/empty';

const { Vector3 } = THREE; // it doesn't matter which Vector3 we use

/** @type {import('@dimforge/rapier3d')} */
export let RAPIER;

/** @type {Physics} */
let physics;

export const loadPhysicsModule = async () => {
  RAPIER = await import('@dimforge/rapier3d');
};

const GRAVITY = -9.82 * 8;

export class Body {
  /**
   * @param {Pick<import('three').Object3D, 'position' | 'quaternion'>} obj
   * @param {import('@dimforge/rapier3d').World} world
   */
  constructor(obj, world, { isStatic = false, lockRotation = false } = {}) {
    this.world = world;

    let desc = new RAPIER.RigidBodyDesc(
      isStatic ? RAPIER.BodyStatus.Static : RAPIER.BodyStatus.Dynamic,
    )
      .setTranslation(obj.position)
      .setRotation(obj.quaternion);

    if (lockRotation) desc = desc.lockRotations();

    // .setPrincipalAngularInertia({ x: 0, y: 0, z: 0 }, true, false, false),

    this.rigidBody = world.createRigidBody(desc);
  }

  addCollider(colliderDesc) {
    return this.world.createCollider(colliderDesc, this.rigidBody.handle);
  }

  getSpeed() {
    this._getSpeed ||= new THREE.Vector3();

    return this._getSpeed.copy(this.rigidBody.linvel()).length();
  }

  get colliders() {
    const c = [];
    for (let i = 0, l = this.rigidBody.numColliders(); i < l; i++)
      c.push(this.world.colliders.get(this.rigidBody.collider(i)));
    return c;
  }

  resetMovement() {
    this.rigidBody.setLinvel(ZERO_VECTOR3);
  }

  copyToObj(obj, excludeRotation = false) {
    obj.position.copy(this.rigidBody.translation());
    if (!excludeRotation)
      obj.setRotationFromQuaternion(this.rigidBody.rotation());
  }

  registerContactListener() {
    physics.registerContactListener(this.rigidBody.handle);
  }
  unregisterContactListener() {
    physics.unregisterContactListener(this.rigidBody.handle);
  }

  // getGeometry() {
  //   const collider = this.colliders[0];
  //   const indices = collider.trimeshIndices();
  //   const vertices = collider.trimeshVertices();
  //   const geom = new THREE.BufferGeometry();
  //   geom.setAttribute(
  //     'position',
  //     new THREE.BufferAttribute(new Float32Array(), 1234),
  //   );
  //   return geom;
  // }

  // renderWireframe(group) {
  //   this.wireframe = new THREE.LineSegments(
  //     new THREE.WireframeGeometry(this.getGeometry()),
  //     new THREE.LineBasicMaterial({ color: 0x00ff00 }),
  //   );

  //   this.updateObjPosition(this.wireframe);

  //   group.add(this.wireframe);
  // }

  dispose() {
    this.unregisterContactListener();
    // removes the RigidBody and Colliders
    this.world.removeRigidBody(this.rigidBody);
    this.rigidBody = null;
  }
}

class Physics {
  init() {
    const gravity = new Vector3(0.0, GRAVITY, 0.0);

    this.eventQueue = new RAPIER.EventQueue(true);

    this.world = new RAPIER.World(gravity);
  }

  contacts = {};

  registerContactListener(handle) {
    this.contacts[handle] = {};
  }
  unregisterContactListener(handle) {
    delete this.contacts[handle];
  }

  getContacts(handle) {
    return this.contacts[handle];
  }

  handleContactEvent = (h1, h2, isStarted) => {
    if (h1 in this.contacts) {
      if (isStarted) this.contacts[h1][h2] = true;
      else delete this.contacts[h1][h2];
    }
    if (h2 in this.contacts) {
      if (isStarted) this.contacts[h2][h1] = true;
      else delete this.contacts[h2][h1];
    }
  };

  handleProximityEvent = (h1, h2, prevProx, prox) => {
    // console.log('prox', h1, h2, prevProx, prox);
  };

  lastError = null;
  update(_delta, _tick) {
    // if (tick % 2 !== 0) return;

    this.world.step(this.eventQueue);

    this.eventQueue.drainContactEvents(this.handleContactEvent);
    this.eventQueue.drainProximityEvents(this.handleProximityEvent);
  }

  dispose() {
    this.eventQueue?.free();
    this.world?.free();
    this.contacts = {};
  }
}

physics = new Physics();

export default physics;
