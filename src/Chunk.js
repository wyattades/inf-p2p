import * as THREE from 'three';

import { CHUNK_SEGMENTS, SEGMENT_SIZE } from 'src/constants';
import { Body, RAPIER } from 'src/physics';
import { ZERO_QUATERNION } from 'src/utils/empty';
import { deserializeBufferAttr, deserializeGeometry } from 'src/utils/geometry';

// const groundMaterial = new THREE.MeshLambertMaterial({
//   vertexColors: THREE.FaceColors,
// });

const groundMaterial = new THREE.MeshPhongMaterial({
  vertexColors: true,
  flatShading: true,
  shininess: 10,
});

// const colors = [new THREE.Color(255, 0, 0), new THREE.Color(0, 255, 0), new THREE.Color(255, 255, 0)];
// const ranges = [0, 0.4, 0.6];

// const groundMaterial = new THREE.ShaderMaterial({
//   lights: true,

//   uniforms: {
//     colors: new THREE.Uniform(colors),
//     ranges: new THREE.Uniform(ranges),
//   },
// });

const groundRayCaster = new THREE.Raycaster(
  new THREE.Vector3(0, 1000, 0),
  new THREE.Vector3(0, -1, 0),
);

export default class Chunk {
  static SIZE = CHUNK_SEGMENTS * SEGMENT_SIZE;

  /**
   * @param {import('src/Game').default} game
   * @param {import(THREE.Group)} group
   * @param {number} x
   * @param {number} z
   * @param {number} lod
   */
  constructor(game, group, x, z, lod) {
    this.game = game;
    this.group = group;
    this.x = x;
    this.z = z;
    this.lod = lod;
    this.mesh = null;
  }

  static loadKeyFor(x, z, lod) {
    return `${x},${z}:${lod}`;
  }

  get loadKey() {
    return Chunk.loadKeyFor(this.x, this.z, this.lod);
  }

  get quaternion() {
    return ZERO_QUATERNION;
  }

  get position() {
    return new THREE.Vector3(
      (this.x + 0.5) * Chunk.SIZE,
      0,
      (this.z + 0.5) * Chunk.SIZE,
    );
  }

  getHeightAt(x, z) {
    // TODO: not accurate
    if (!this.mesh) return 0;

    groundRayCaster.ray.origin.set(x, 1000, z);

    const inter = groundRayCaster.intersectObject(this.mesh);
    if (inter?.length) return inter[0].point.y;

    return 0;
  }

  enablePhysics() {
    const physics = this.game.physics;

    if (!physics.world)
      return console.warn('Chunk#enablePhysics: Physics not loaded yet');

    if (this.body)
      return console.warn('Chunk#enablePhysics: body already exists');

    if (!this.heightsArray)
      return console.warn('Chunk#enablePhysics: terrain data not loaded yet');

    this.body = new Body(this, physics, {
      bodyType: RAPIER.RigidBodyType.Static,
    });
    this.body.addCollider(
      RAPIER.ColliderDesc.heightfield(
        CHUNK_SEGMENTS - 1,
        CHUNK_SEGMENTS - 1,
        this.heightsArray,
        { x: Chunk.SIZE, y: 1.0, z: Chunk.SIZE },
      ).setFriction(1.0),
    );
    // this.body.renderWireframe(this.group);
  }

  // setLOD(lod) {
  //   if (this.lod === lod) return;

  //   this.mesh.geometry.dispose();
  // }

  setTerrain({ lod, heightsArray, ...serializedGeometry }) {
    this.lod = lod;

    this.heightsArray = heightsArray;

    const geometry = deserializeGeometry(serializedGeometry);

    this.mesh = new THREE.Mesh(geometry, groundMaterial.clone());
    this.mesh.matrixAutoUpdate = false; // it's not gonna move
    this.mesh.position.copy(this.position);

    this.mesh.castShadow = this.mesh.receiveShadow =
      !!this.game.options.get('shadows');

    this.mesh.updateMatrix();

    this.group.add(this.mesh);

    if (this.game.options.get('debug')) {
      this.debugChunkBoundsMesh = new THREE.LineSegments(
        new THREE.EdgesGeometry(
          new THREE.BoxGeometry(Chunk.SIZE, 512, Chunk.SIZE),
        ),
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 }),
      );
      this.mesh.matrixAutoUpdate = false;
      this.debugChunkBoundsMesh.position.copy(this.mesh.position);
      this.group.add(this.debugChunkBoundsMesh);
    }
  }

  dispose() {
    this.heightsArray = null;

    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      // clear the giant ArrayBuffers
      for (const attr in this.mesh.geometry.attributes)
        this.mesh.geometry.deleteAttribute(attr);
      this.mesh = null;
    }

    if (this.debugChunkBoundsMesh) {
      this.group.remove(this.debugChunkBoundsMesh);
      this.debugChunkBoundsMesh.geometry.dispose();
      for (const attr in this.debugChunkBoundsMesh.geometry.attributes)
        this.debugChunkBoundsMesh.geometry.deleteAttribute(attr);
      this.debugChunkBoundsMesh = null;
    }

    if (this.body) {
      this.body.dispose();
      this.body = null;
    }
  }
}
