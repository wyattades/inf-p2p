import * as THREE from 'three';
import { isEmpty } from 'lodash';

import { ZERO_VECTOR3 } from 'src/utils/empty';

const { Vector3 } = THREE; // it doesn't matter which Vector3 we use

/** @type {import('@dimforge/rapier3d')} */
export let RAPIER;

/** @type {Physics} */
let physics;

export const loadPhysicsModule = async () => {
  RAPIER = await import('@dimforge/rapier3d');
};

export const GRAVITY = -9.82 * 8;

export class Body {
  /**
   * @param {Pick<import('three').Object3D, 'position' | 'quaternion'>} obj
   * @param {import('@dimforge/rapier3d').World} world
   */
  constructor(
    obj,
    world,
    {
      bodyStatus = RAPIER.BodyStatus.Dynamic,
      lockRotation = false,
      lockTranslation = false,
      angularDamping = null,
      linearDamping = null,
      mass = null,
    } = {},
  ) {
    this.world = world;

    let desc = new RAPIER.RigidBodyDesc(bodyStatus)
      .setTranslation(obj.position)
      .setRotation(obj.quaternion);

    if (mass != null) desc = desc.setMass(mass, false);
    if (angularDamping != null && angularDamping >= 0)
      desc = desc.setAngularDamping(angularDamping);
    if (linearDamping != null && linearDamping >= 0)
      desc = desc.setLinearDamping(linearDamping);
    if (lockRotation) desc = desc.lockRotations();
    if (lockTranslation) desc = desc.lockTranslations();

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
    this.rigidBody.setAngvel(ZERO_VECTOR3);
  }

  copyToObj(obj, excludeRotation = false) {
    obj.position.copy(this.rigidBody.translation());
    if (!excludeRotation)
      obj.setRotationFromQuaternion(this.rigidBody.rotation());
  }
  copyFromObj(obj, excludeRotation = false) {
    this.rigidBody.setTranslation(obj.position);
    if (!excludeRotation) this.rigidBody.setRotation(obj.quaternion);
  }

  registerContactListener() {
    physics.registerContactListener(this.rigidBody.handle);
  }
  unregisterContactListener() {
    physics.unregisterContactListener(this.rigidBody.handle);
  }

  getRotation() {
    return this.rigidBody.rotation();
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

// add 2 Vector3s
const add = (a, b) => {
  const c = { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  return c;
  // return new THREE.Vector3(c.x, c.y, c.z);
};

const _pos = new THREE.Vector3(),
  _quat = new THREE.Quaternion();
const rot = (pos, quat) => {
  return _pos.copy(pos).applyQuaternion(_quat.copy(quat));
};

const COLORS = {
  red: new THREE.Color(0xff0000),
  orange: new THREE.Color(0xffa500),
  green: new THREE.Color(0x00ff00),
  yellow: new THREE.Color(0xffff00),
};

class Physics {
  init() {
    const gravity = new Vector3(0.0, GRAVITY, 0.0);

    this.eventQueue = new RAPIER.EventQueue(true);

    this.world = new RAPIER.World(gravity);
  }

  contacts = {};
  proximities = {};

  registerContactListener(handle) {
    this.contacts[handle] = {};
  }
  unregisterContactListener(handle) {
    delete this.contacts[handle];
  }

  getContacts(handle) {
    return this.contacts[handle];
  }

  handleContactEvent = (body1, body2, isStarted) => {
    // if (body1 === window.FFF || body2 === window.FFF)
    //   console.log('cont', body1, body2, isStarted);

    let changed = false;
    if (body1 in this.contacts) {
      changed = true;
      if (isStarted) this.contacts[body1][body2] = true;
      else delete this.contacts[body1][body2];
    }
    if (body2 in this.contacts) {
      changed = true;
      if (isStarted) this.contacts[body2][body1] = true;
      else delete this.contacts[body2][body1];
    }

    if (changed) this.printContacts(this.contacts);
  };

  printPairs(obj) {
    const a = new Set();
    for (const [h1, o] of Object.entries(obj))
      for (const h2 of Object.keys(o)) a.add([h1, h2].sort().join('-'));
    if (a.size > 0) console.log(...a.keys());
  }

  isProximitied(colliderHandle) {
    return !isEmpty(this.proximities[colliderHandle]);
  }

  handleProximityEvent = (collider1, collider2, prevProx, prox) => {
    // console.log('prox', collider1, collider2, prevProx, prox);
    // eslint-disable-next-line default-case
    switch (prevProx) {
      case RAPIER.Proximity.Intersecting:
        if (prox === RAPIER.Proximity.Disjoint) {
          delete (this.proximities[collider1] ||= {})[collider2];
          delete (this.proximities[collider2] ||= {})[collider1];
        } else {
          (this.proximities[collider1] ||= {})[collider2] = true;
          (this.proximities[collider2] ||= {})[collider1] = true;
        }
        break;
      case RAPIER.Proximity.WithinMargin:
        if (prox === RAPIER.Proximity.Disjoint) {
          delete (this.proximities[collider1] ||= {})[collider2];
          delete (this.proximities[collider2] ||= {})[collider1];
        } else {
          (this.proximities[collider1] ||= {})[collider2] = true;
          (this.proximities[collider2] ||= {})[collider1] = true;
        }
        break;
      case RAPIER.Proximity.Disjoint:
        (this.proximities[collider1] ||= {})[collider2] = true;
        (this.proximities[collider2] ||= {})[collider1] = true;
        break;
    }
  };

  lastError = null;
  update(_delta, _tick) {
    // if (tick % 2 !== 0) return;

    this.world.step(this.eventQueue);

    this.eventQueue.drainContactEvents(this.handleContactEvent);
    this.eventQueue.drainProximityEvents(this.handleProximityEvent);
  }

  debugForces = {};
  updateDebugForce(key, orig, force) {
    if (!this._debugMesh) return;

    if (!orig) delete this.debugForces[key];
    else this.debugForces[key] = [orig, add(orig, force)];
  }

  debugMesh() {
    let mesh = this._debugMesh;
    if (mesh) {
      // clear vertices
      mesh.geometry.vertices.length = 0;
      mesh.geometry.colors.length = 0;
    } else {
      mesh = this._debugMesh = new THREE.LineSegments(
        new THREE.Geometry(),
        new THREE.LineBasicMaterial({ vertexColors: true }),
      );
    }

    const addLine = (p1, p2, color) => {
      mesh.geometry.vertices.push(p1, p2);
      mesh.geometry.colors.push(color, color);
    };

    for (const [p1, p2] of Object.values(this.debugForces)) {
      addLine(p1, p2, COLORS.yellow);
    }

    const bodies = {};

    this.world.bodies.forEachRigidBody((body) => {
      if (body.isDynamic()) {
        const position = body.translation();
        const rotation = body.rotation();

        bodies[body.handle] = { position, rotation };

        // for (let i = 0, l = body.numColliders(); i < l; i++) {
        //   const collider = this.world.colliders.get(body.collider(i));

        //   const shapeType = collider.shapeType();
        //   if (RAPIER.ShapeType.Cylinder === shapeType) {

        //   }
        // }
        addLine(position, add(position, { x: 0, y: 10, z: 0 }), COLORS.red);
      }
    });

    this.world.joints.forEachJoint((joint) => {
      const b1 = bodies[joint.bodyHandle1()];
      const b2 = bodies[joint.bodyHandle2()];

      if (!b1 || !b2) return;

      const a1 = add(b1.position, rot(joint.anchor1(), b1.rotation));
      const a2 = add(b2.position, rot(joint.anchor2(), b2.rotation));
      // a1 and a2 should be the same!

      const x1 = rot(joint.axis1(), b1.rotation);
      const x2 = rot(joint.axis2(), b2.rotation);

      addLine(add(a1, x1), a1, COLORS.orange);
      addLine(add(a2, x2), a2, COLORS.green);
    });

    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.colorsNeedUpdate = true;

    return mesh;
  }

  dispose() {
    this.eventQueue?.free();
    this.world?.free();
    this.contacts = {};
  }
}

physics = new Physics();

export default physics;
