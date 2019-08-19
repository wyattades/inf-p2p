/* eslint-disable new-cap */
import ammo from 'ammo';

const importWasm = (url) =>
  WebAssembly.instantiateStreaming(fetch(url)).then(
    (obj) => obj.instance.exports,
  );

const GRAVITY = -9.82;

// let Ammo;
export const Ammo = ammo();

let physicsWorld = null;
export const getWorld = () => physicsWorld;

export const createWorld = () => {
  // Ammo = await importWasm('ammo.wasm');

  // Physics configuration
  const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();
  physicsWorld = new Ammo.btDiscreteDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration,
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, GRAVITY, 0));

  return physicsWorld;
};

export const update = (delta) => {
  physicsWorld.stepSimulation(delta, 1);
};

export const dispose = () => {
  physicsWorld.__destroy__();
  // Ammo.destroy();
};
