import * as THREE from 'three';

import { CHUNK_SEGMENTS, LODs, SEGMENT_SIZE } from 'src/constants';
import { Body, RAPIER } from 'src/physics';
import { ZERO_QUATERNION } from 'src/utils/empty';
import { deserializeGeometry } from 'src/utils/geometry';
import { enforceSqrt, mean } from 'src/utils/math';
import { GameObject, physicsMixin } from 'src/objects/base';
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

// let groundRayCaster: RapierType.Ray | undefined;

export default class Chunk extends physicsMixin(GameObject) {
  static SIZE = CHUNK_SEGMENTS * SEGMENT_SIZE;

  lod: number | null = null;
  mesh: THREE.Mesh | null = null;
  heightsArray: Float32Array | null = null;
  debugChunkBoundsMesh: THREE.LineSegments | null = null;

  constructor(
    game: Game,
    readonly group: THREE.Group,
    readonly x: number,
    readonly z: number,
  ) {
    super(game);

    this.quaternion = ZERO_QUATERNION;

    this.position = new THREE.Vector3(
      (x + 0.5) * Chunk.SIZE,
      0,
      (z + 0.5) * Chunk.SIZE,
    );
  }

  static loadKeyFor(x: number, z: number) {
    return `${x},${z}`;
  }

  get loadKey() {
    return Chunk.loadKeyFor(this.x, this.z);
  }

  // get groundRayCaster() {
  //   return (groundRayCaster ||= new RAPIER.Ray(
  //     new RAPIER.Vector3(0, -1000, 0),
  //     new RAPIER.Vector3(0, 1, 0),
  //   ));
  // }

  // unused:
  // getSlopeAt(x: number, z: number): [slope: number, height: number] {

  // import { Octree } from 'three/examples/jsm/math/Octree';
  // import { OctreeHelper } from 'three/examples/jsm/helpers/OctreeHelper';

  // const hit = this.octree?.capsuleIntersect(this.game.player.object);

  //   if (!hit) return [0, -99997];

  //   const hitPoint = this.groundRayCaster.pointAt(hit.toi);

  //   return [slope, hitPoint.y];
  // }

  approximateHeight() {
    const arr = this.heightsArray;
    if (!arr) return 0;
    return mean([arr[0], arr[(arr.length / 2) | 0], arr[arr.length - 1]]);
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

  updatePhysicsShape() {
    if (!this.body || !this.heightsArray) return;

    const segments = enforceSqrt(this.heightsArray.length) - 1;

    const bodyShape = new RAPIER.Heightfield(
      segments,
      segments,
      this.heightsArray,
      { x: Chunk.SIZE, y: 1.0, z: Chunk.SIZE },
    );

    this.body.rigidBody.collider(0).setShape(bodyShape);
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

    this.mesh = new THREE.Mesh(geometry, groundMaterial);
    // @ts-expect-error assign it
    this.mesh.gameObject = this;

    this.mesh.matrixAutoUpdate = false; // it's not gonna move
    this.mesh.position.copy(this.position);

    this.mesh.updateMatrix();

    this.mesh.castShadow = this.mesh.receiveShadow =
      !!this.game.options!.get('shadows');

    this.group.add(this.mesh);

    this.game.updateOutlineMesh(this.mesh);

    // if (!this.octree) {
    //   this.game.chunkLoader.worldOctree = new Octree();
    //   console.log('octree:', this.x, this.z);
    //   this.octree.fromGraphNode(this.mesh);
    // }

    this.debugBoundary();
  }

  debugBoundary() {
    if (!this.game.options.get('debug') || !this.mesh || this.lod == null)
      return;

    // if (this.game.chunkLoader.worldOctree)
    //   this.game.chunkLoader.octreeHelper ||= new OctreeHelper(
    //     this.game.chunkLoader.worldOctree,
    //   );

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

  disposeMesh() {
    if (this.mesh) {
      this.game.updateOutlineMesh(this.mesh, false);
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
    super.dispose();

    this.heightsArray = null;

    this.disposeMesh();
  }
}
