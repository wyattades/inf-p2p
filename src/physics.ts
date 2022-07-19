import * as THREE from 'three';
import type * as RapierType from '@dimforge/rapier3d';

import { ZERO_POINT3, ZERO_VECTOR3 } from 'src/utils/empty';
import type Game from 'src/Game';

export { RapierType };

// eslint-disable-next-line import/no-mutable-exports
export let RAPIER: typeof RapierType;

export const loadPhysicsModule = async () => {
  RAPIER = await import('@dimforge/rapier3d');
};

export const GRAVITY = -9.82 * 8;

type GameObject = THREE.Object3D;

export class Body {
  world: RapierType.World;
  rigidBody: RapierType.RigidBody;

  constructor(
    obj: {
      position: Point3;
      quaternion: Quaternion;
    },
    physics: Physics,
    {
      bodyType = RAPIER.RigidBodyType.Dynamic,
      lockRotation = false,
      lockTranslation = false,
      angularDamping,
      linearDamping,
      mass,
      type = 'unknown',
      userData = {},
    }: {
      bodyType?: RapierType.RigidBodyType;
      lockRotation?: boolean;
      lockTranslation?: boolean;
      angularDamping?: number;
      linearDamping?: number;
      mass?: number;
      type?: string;
      userData?: Record<string, any>;
    } = {},
  ) {
    this.world = physics.world;

    let desc = new RAPIER.RigidBodyDesc(bodyType)
      .setTranslation(obj.position.x, obj.position.y, obj.position.z)
      .setRotation(obj.quaternion);

    if (mass != null) desc = desc.setAdditionalMass(mass);
    if (angularDamping != null && angularDamping >= 0)
      desc = desc.setAngularDamping(angularDamping);
    if (linearDamping != null && linearDamping >= 0)
      desc = desc.setLinearDamping(linearDamping);
    if (lockRotation) desc = desc.lockRotations();
    if (lockTranslation) desc = desc.lockTranslations();

    // .setPrincipalAngularInertia({ x: 0, y: 0, z: 0 }, true, false, false),

    this.rigidBody = this.world.createRigidBody(desc);

    this.rigidBody.userData = {
      ...userData,
      type,
    };
  }

  addCollider(colliderDesc: RapierType.ColliderDesc) {
    return this.world.createCollider(colliderDesc, this.rigidBody);
  }

  _getSpeed?: THREE.Vector3;
  getSpeed() {
    return (this._getSpeed ||= new THREE.Vector3())
      .copy(this.rigidBody.linvel() as THREE.Vector3)
      .length();
  }

  get colliders() {
    const c = [];
    for (let i = 0, l = this.rigidBody.numColliders(); i < l; i++)
      c.push(this.rigidBody.collider(i));
    return c;
  }

  get firstShape() {
    return this.rigidBody.collider(0).shape;
  }

  resetMovement() {
    this.rigidBody.setLinvel(ZERO_VECTOR3 as Point3, false);
    this.rigidBody.setAngvel(ZERO_VECTOR3 as Point3, false);
  }

  copyToObj(obj: GameObject, excludeRotation = false) {
    obj.position.copy(this.rigidBody.translation() as THREE.Vector3);
    if (!excludeRotation)
      obj.setRotationFromQuaternion(
        this.rigidBody.rotation() as THREE.Quaternion,
      );
  }
  copyFromObj(obj: GameObject, excludeRotation = false) {
    this.rigidBody.setTranslation(obj.position as Point3, true);
    if (!excludeRotation)
      this.rigidBody.setRotation(obj.quaternion as Quaternion, false);
  }

  // registerContactListener() {
  //   physics.registerContactListener(this.rigidBody.handle);
  // }
  // unregisterContactListener() {
  //   physics.unregisterContactListener(this.rigidBody.handle);
  // }

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
    // this.unregisterContactListener();
    // removes the RigidBody and Colliders
    this.world.removeRigidBody(this.rigidBody);
    // @ts-expect-error can't assign null
    this.rigidBody = null;
  }
}

// add 2 Vector3s
const add = (a: Point3, b: Point3) => {
  const c = { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  return c;
  // return new THREE.Vector3(c.x, c.y, c.z);
};

// const _pos = new THREE.Vector3(),
//   _quat = new THREE.Quaternion();
// const rot = (pos, quat) => {
//   return _pos.copy(pos).applyQuaternion(_quat.copy(quat));
// };

const COLORS = {
  red: new THREE.Color(0xff0000),
  orange: new THREE.Color(0xffa500),
  green: new THREE.Color(0x00ff00),
  yellow: new THREE.Color(0xffff00),
};

export class Physics {
  world: RapierType.World;
  eventQueue?: RapierType.EventQueue;

  constructor(readonly game: Game) {
    const gravity = new RAPIER.Vector3(0.0, GRAVITY, 0.0);

    // this.eventQueue = new RAPIER.EventQueue(true);

    this.world = new RAPIER.World(gravity);
  }

  // contacts = {};
  // proximities = {};

  // registerContactListener(handle) {
  //   this.contacts[handle] = {};
  // }
  // unregisterContactListener(handle) {
  //   delete this.contacts[handle];
  // }

  // getContacts(handle) {
  //   return this.contacts[handle];
  // }

  // /**
  //  * @type {Parameters<import('@dimforge/rapier3d').EventQueue['drainCollisionEvents']>[0]}
  //  */
  // handleCollisionEvent = (body1, body2, isStarted) => {
  //   // if (body1 === window.FFF || body2 === window.FFF)
  //   //   console.log('cont', body1, body2, isStarted);

  //   let changed = false;
  //   if (body1 in this.contacts) {
  //     changed = true;
  //     if (isStarted) this.contacts[body1][body2] = true;
  //     else delete this.contacts[body1][body2];
  //   }
  //   if (body2 in this.contacts) {
  //     changed = true;
  //     if (isStarted) this.contacts[body2][body1] = true;
  //     else delete this.contacts[body2][body1];
  //   }

  //   if (changed) this.printContacts(this.contacts);
  // };

  // // TODO
  // printContacts(contacts) {
  //   console.log(contacts);
  // }

  // printPairs(obj) {
  //   const a = new Set();
  //   for (const [h1, o] of Object.entries(obj))
  //     for (const h2 of Object.keys(o)) a.add([h1, h2].sort().join('-'));
  //   if (a.size > 0) console.log(...a.keys());
  // }

  // TODO
  // isProximitied(colliderHandle) {
  //   return false;
  //   // return !isEmpty(this.proximities[colliderHandle]);
  // }

  // handleProximityEvent = (collider1, collider2, prevProx, prox) => {
  //   // console.log('prox', collider1, collider2, prevProx, prox);
  //   // eslint-disable-next-line default-case
  //   switch (prevProx) {
  //     case RAPIER.Proximity.Intersecting:
  //       if (prox === RAPIER.Proximity.Disjoint) {
  //         delete (this.proximities[collider1] ||= {})[collider2];
  //         delete (this.proximities[collider2] ||= {})[collider1];
  //       } else {
  //         (this.proximities[collider1] ||= {})[collider2] = true;
  //         (this.proximities[collider2] ||= {})[collider1] = true;
  //       }
  //       break;
  //     case RAPIER.Proximity.WithinMargin:
  //       if (prox === RAPIER.Proximity.Disjoint) {
  //         delete (this.proximities[collider1] ||= {})[collider2];
  //         delete (this.proximities[collider2] ||= {})[collider1];
  //       } else {
  //         (this.proximities[collider1] ||= {})[collider2] = true;
  //         (this.proximities[collider2] ||= {})[collider1] = true;
  //       }
  //       break;
  //     case RAPIER.Proximity.Disjoint:
  //       (this.proximities[collider1] ||= {})[collider2] = true;
  //       (this.proximities[collider2] ||= {})[collider1] = true;
  //       break;
  //   }
  // };

  lastError = null;
  update(_delta: number, _tick: number) {
    // this.world.step(this.eventQueue);
    this.world.step();

    // this.eventQueue.drainCollisionEvents(this.handleCollisionEvent);
    // this.eventQueue.drainProximityEvents(this.handleProximityEvent);
  }

  debugForces: Record<string, [Point3, Point3]> = {};
  updateDebugForce(key: string, orig: Point3, force: Point3) {
    if (!this._debugMesh) return;

    if (!orig) delete this.debugForces[key];
    else this.debugForces[key] = [orig, add(orig, force)];
  }

  _debugMesh?: THREE.LineSegments;
  debugMesh() {
    const points: Point3[] = [];
    const colors: THREE.Color[] = [];
    const addLine = (p1: Point3, p2: Point3, color: THREE.Color) => {
      points.push(p1, p2);
      colors.push(color, color);
    };

    for (const [p1, p2] of Object.values(this.debugForces)) {
      addLine(p1, p2, COLORS.yellow);
    }

    this.world.bodies.forEach((body) => {
      if (body.isDynamic()) {
        if ((body.userData as { type: string }).type === 'player') return;

        const position = body.translation();

        addLine(position, add(position, body.linvel()), COLORS.orange);

        addLine(position, add(position, { x: 0, y: 10, z: 0 }), COLORS.red);
      }
    });

    // TODO: `axis1()` DNE
    // this.world.impulseJoints.forEach((joint) => {
    //   const b1 = joint.body1();
    //   const b2 = joint.body2();

    //   if (!b1 || !b2) return;

    //   const a1 = add(b1.translation(), rot(joint.anchor1(), b1.rotation()));
    //   const a2 = add(b2.translation(), rot(joint.anchor2(), b2.rotation()));
    //   // a1 and a2 should be the same!

    //   const x1 = rot(joint.axis1(), b1.rotation());
    //   const x2 = rot(joint.axis2(), b2.rotation());

    //   addLine(add(a1, x1), a1, COLORS.orange);
    //   addLine(add(a2, x2), a2, COLORS.green);
    // });

    let mesh = this._debugMesh;
    if (!mesh) {
      mesh = this._debugMesh = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ vertexColors: true }),
      );
      const bufferPoints = 1000; // arbitrary large buffer
      mesh.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(bufferPoints * 3), 3),
      );
      mesh.geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(new Float32Array(bufferPoints * 3), 3),
      );
    }

    const { position, color } = mesh.geometry.attributes as {
      position: THREE.BufferAttribute;
      color: THREE.BufferAttribute;
    };

    (position.array as Float32Array).fill(0);
    position.copyVector3sArray(points);
    position.needsUpdate = true;

    (color.array as Float32Array).fill(0);
    color.copyColorsArray(colors);
    color.needsUpdate = true;

    return mesh;
  }

  groundRayCaster = new RAPIER.Ray(
    new RAPIER.Vector3(0, 0, 0),
    new RAPIER.Vector3(0, -1, 0),
  );

  // by default, raycasts will ignore the player.
  getSlopeAt(
    position: Point3,
    // is the maximum "time-of-impact" that can be reported by the ray-cast.
    // The notion of "time-of-impact" refer to the fact that a ray can be
    // seen as a point starting at ray.origin moving at a linear velocity
    // equal to ray.dir. Therefore, max_toi limits the ray-cast to the segment:
    // [ray.origin, ray.origin + ray.dir * max_toi]
    maxToi: number,
    // filterGroups: player, objects, terrain // TODO
  ): [normal: Point3, height: number] {
    // TODO: not accurate
    // if (!this.body) return [0, -99998];

    // this.octree?.capsuleIntersect(this.game.player.object);

    this.groundRayCaster.origin.x = position.x;
    this.groundRayCaster.origin.y = position.y;
    this.groundRayCaster.origin.z = position.z;

    const playerBody = this.game.player.body.rigidBody;

    // docs: https://rapier.rs/docs/user_guides/javascript/scene_queries
    const inter = this.world.castRayAndGetNormal(
      this.groundRayCaster,
      maxToi,
      false,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, // why doesn't this exclude the player?
      undefined,
      undefined,
      playerBody,
    );

    if (!inter) return [ZERO_POINT3, -99997];

    if (inter.collider.parent()?.handle === playerBody.handle) {
      console.warn('player hit the raycaster!');
      return [ZERO_POINT3, -99996];
    }

    const interPoint = this.groundRayCaster.pointAt(inter.toi);

    return [inter.normal, interPoint.y];
  }

  getMaxHeightAt(x: number, z: number): number {
    const maxToi = 3000; // assumes the max terrain height

    return this.getSlopeAt({ x, y: maxToi / 2, z }, maxToi)[1];
  }

  dispose() {
    this.eventQueue?.free();
    this.world?.free();
    // this.contacts = {};
  }
}
