import * as THREE from 'three';

import { CHUNK_SEGMENTS, LODs, SEGMENT_SIZE } from 'src/constants';
import { Body, RAPIER } from 'src/physics';
import { ZERO_QUATERNION } from 'src/utils/empty';
import { deserializeGeometry } from 'src/utils/geometry';
import { enforceSqrt } from 'src/utils/math';
import type Game from 'src/Game';
import type { LoadChunkResponse } from 'src/terrain/terrain.worker';

// or MeshLambertMaterial?
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

  lod: number | null = null;
  mesh: THREE.Mesh | null = null;
  body: Body | null = null;
  heightsArray: Float32Array | null = null;
  debugChunkBoundsMesh: THREE.LineSegments | null = null;

  constructor(
    readonly game: Game,
    readonly group: THREE.Group,
    readonly x: number,
    readonly z: number,
  ) {}

  static loadKeyFor(x: number, z: number) {
    return `${x},${z}`;
  }

  get loadKey() {
    return Chunk.loadKeyFor(this.x, this.z);
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

  getHeightAt(x: number, z: number) {
    // TODO: not accurate
    if (!this.mesh) return -99998;

    groundRayCaster.ray.origin.set(x, 1000, z);

    const inter = groundRayCaster.intersectObject(this.mesh);
    if (inter?.length) return inter[0].point.y;

    return -99997;
  }

  enablePhysics() {
    // for now, we'll use the base LOD to test if we should enable physics.
    if (this.lod !== LODs[0]) {
      this.body?.dispose();
      this.body = null;
      return;
    }

    const physics = this.game.physics;

    if (!physics.world)
      return console.warn('Chunk#enablePhysics: Physics not loaded yet');

    if (this.body)
      return console.warn('Chunk#enablePhysics: body already exists');

    if (!this.heightsArray)
      return console.warn('Chunk#enablePhysics: terrain data not loaded yet');

    this.body = new Body(this, physics, {
      bodyType: RAPIER.RigidBodyType.Fixed,
      type: 'chunk',
      userData: {
        x: this.x,
        z: this.z,
      },
    });

    const segments = enforceSqrt(this.heightsArray.length) - 1;

    this.body.addCollider(
      RAPIER.ColliderDesc.heightfield(
        // `nrows` and `ncols` are the number of segments, not vertices, on each side of the heightfield
        segments,
        segments,
        this.heightsArray,
        { x: Chunk.SIZE, y: 1.0, z: Chunk.SIZE }, // scale
      ).setFriction(1.0),
    );
    // this.body.renderWireframe(this.group);
  }

  setTerrain({ lod, heightsArray, ...serializedGeometry }: LoadChunkResponse) {
    // TODO: there could be a race condition here where lower-res terrain takes priority over higher-res
    if (lod !== this.lod)
      return console.warn(
        `setTerrain called with mismatch lod: ${this.x},${this.z}: ${this.lod} != ${lod}`,
      );

    this.lod = lod;

    this.heightsArray = heightsArray;

    this.disposeMesh();

    const geometry = deserializeGeometry(serializedGeometry);

    this.mesh = new THREE.Mesh(geometry, groundMaterial.clone());
    this.mesh.matrixAutoUpdate = false; // it's not gonna move
    this.mesh.position.copy(this.position);

    this.mesh.updateMatrix();

    this.mesh.castShadow = this.mesh.receiveShadow =
      !!this.game.options!.get('shadows');

    this.group.add(this.mesh);

    if (this.game.options!.get('debug')) {
      this.debugChunkBoundsMesh = new THREE.LineSegments(
        new THREE.EdgesGeometry(
          new THREE.BoxGeometry(Chunk.SIZE, 512, Chunk.SIZE),
        ),
        new THREE.LineBasicMaterial({
          color: new THREE.Color()
            .setHSL(0, 0, 1 - LODs.indexOf(this.lod) / LODs.length)
            .getHex(),
          linewidth: 1,
        }),
      );
      this.mesh.matrixAutoUpdate = false;
      this.debugChunkBoundsMesh.position.copy(this.mesh.position);
      this.group.add(this.debugChunkBoundsMesh);
    }
  }

  disposeMesh() {
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }

    if (this.debugChunkBoundsMesh) {
      this.group.remove(this.debugChunkBoundsMesh);
      this.debugChunkBoundsMesh.geometry.dispose();
      (this.debugChunkBoundsMesh.material as THREE.Material).dispose();
      this.debugChunkBoundsMesh = null;
    }
  }

  dispose() {
    this.heightsArray = null;

    this.disposeMesh();

    if (this.body) {
      this.body.dispose();
      this.body = null;
    }
  }
}
