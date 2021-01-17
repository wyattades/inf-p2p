import * as THREE from 'three';
// import * as RAPIER from '@dimforge/rapier3d';

// export { RAPIER };

const { Vector3 } = THREE; // it doesn't matter which Vector3 we use

/** @type {import('@dimforge/rapier3d')} */
export let RAPIER;

export const loadPhysicsModule = async () => {
  RAPIER = await import('@dimforge/rapier3d');
};

const GRAVITY = -9.82 * 8;

export class Body {
  /**
   * @param {import('src/objects/GameObject')} obj
   * @param {import('@dimforge/rapier3d').World} world
   */
  constructor(position, world, isStatic = false) {
    this.world = world;

    this.rigidBody = world.createRigidBody(
      new RAPIER.RigidBodyDesc(
        isStatic ? RAPIER.BodyStatus.Static : RAPIER.BodyStatus.Dynamic,
      ).setTranslation(position),
    );
  }

  addCollider(colliderDesc) {
    return this.world.createCollider(colliderDesc, this.rigidBody.handle);
  }

  get colliders() {
    const c = [];
    for (let i = 0, l = this.rigidBody.numColliders(); i < l; i++)
      c.push(this.world.colliders.get(this.rigidBody.collider(i)));
    return c;
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
  update(delta, tick) {
    // if (tick % 2 !== 0) return;

    try {
      this.world.step(this.eventQueue);
      this.lastError = null;

      this.eventQueue.drainContactEvents(this.handleContactEvent);
      this.eventQueue.drainProximityEvents(this.handleProximityEvent);
    } catch (err) {
      if (this.lastError === null) console.error(err);
      this.lastError = err.message;
    }
  }

  dispose() {
    this.eventQueue?.free();
    this.world?.free();
    this.contacts = {};
  }
}

export default new Physics();
