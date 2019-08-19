/* eslint-disable new-cap */
import * as THREE from 'three';

import { Ammo, physicsWorld } from '../physics';

export const createBox = (pos, quat, w, l, h, mass, friction) => {
  const material = mass > 0 ? materialDynamic : materialStatic;
  const shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
  const geometry = new Ammo.btBoxShape(
    new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5),
  );

  if (!mass) mass = 0;
  if (!friction) friction = 1;

  const mesh = new THREE.Mesh(shape, material);
  mesh.position.copy(pos);
  mesh.quaternion.copy(quat);
  this.scene.add(mesh);

  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  const motionState = new Ammo.btDefaultMotionState(transform);

  const localInertia = new Ammo.btVector3(0, 0, 0);
  geometry.calculateLocalInertia(mass, localInertia);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    geometry,
    localInertia,
  );
  const body = new Ammo.btRigidBody(rbInfo);

  body.setFriction(friction);
  // body.setRestitution(.9);
  // body.setDamping(0.2, 0.2);

  physicsWorld.addRigidBody(body);

  if (mass > 0) {
    body.setActivationState(DISABLE_DEACTIVATION);
    // Sync physics and graphics
    syncList.push((delta) => {
      const ms = body.getMotionState();
      if (ms) {
        if (!TRANSFORM_AUX) TRANSFORM_AUX = new Ammo.btTransform();
        ms.getWorldTransform(TRANSFORM_AUX);
        const p = TRANSFORM_AUX.getOrigin();
        const q = TRANSFORM_AUX.getRotation();
        mesh.position.set(p.x(), p.y(), p.z());
        mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    });
  }

  return mesh;
};
