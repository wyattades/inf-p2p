import * as THREE from 'three';

import { CHUNK_SEGMENTS, SEGMENT_SIZE } from './constants';
import * as options from './options';
// import createTerrainBody from './terrain/terrainBody';

// const groundMaterial = new THREE.MeshLambertMaterial({
//   vertexColors: THREE.FaceColors,
// });

const groundMaterial = new THREE.MeshPhongMaterial({
  vertexColors: THREE.FaceColors,
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

  constructor(group, x, z) {
    this.group = group;
    this.x = x;
    this.z = z;
    // this.lod = 1;
    this.mesh = null;
  }

  getHeightAt(x, z) {
    if (!this.mesh) return 0;

    // setTimeout(() => {
    //   groundRayCaster.ray.origin.set(x, 1000, z);
    //   // groundRayCaster.set(groundRayCaster.ray.origin, groundRayCaster.ray.direction);

    //   // const objects = this.scene.children;
    //   // const inter = groundRayCaster.intersectObject(this.mesh);
    //   // console.log('later', this.mesh, groundRayCaster, inter);
    // }, 500);

    // this.mesh.geometry.computeBoundingBox();
    // this.mesh.geometry.computeBoundingSphere();

    // Slower than the below method, but it actually works...
    groundRayCaster.ray.origin.set(x, 1000, z);
    // groundRayCaster.set(groundRayCaster.ray.origin, groundRayCaster.ray.direction);

    // const objects = this.scene.children;
    const inter = groundRayCaster.intersectObject(this.mesh);
    if (inter && inter.length) return inter[0].point.y;

    return 0;

    // x -= this.x * Chunk.SIZE;
    // z -= this.z * Chunk.SIZE;

    // x /= SEGMENT_SIZE;
    // z /= SEGMENT_SIZE;

    // // Get integer floor of x, z
    // const ix = Math.floor(x);
    // const iz = Math.floor(z);
    // // Get real (fractional) component of x, z
    // // This is the amount of each into the cell
    // const rx = x - ix;
    // const rz = z - iz;
    // // Edges of cell
    // const size = CHUNK_SEGMENTS;
    // const array = this._geometryPositions;
    // const a = array[(iz * size + ix) * 3 + 1];
    // const b = array[(iz * size + (ix + 1)) * 3 + 1];
    // const c = array[((iz + 1) * size + (ix + 1)) * 3 + 1];
    // const d = array[((iz + 1) * size + ix) * 3 + 1];
    // // Interpolate top edge (left and right)
    // const e = (a * (1 - rx) + b * rx);
    // // Interpolate bottom edge (left and right)
    // const f = (c * rx + d * (1 - rx));
    // // Interpolate between top and bottom
    // const y = (e * (1 - rz) + f * rz);
    // return y || 0.0;
  }

  enablePhysics() {
    const { array: terrain, count } = this.mesh.geometry.getAttribute(
      'position',
    );

    const heightData = [];
    const lastRow = [];

    for (
      let i = 0, p = 0, i6 = 0;
      i < count;
      i++, p += 3, i6 = i6 === 5 ? 0 : i6 + 1
    ) {
      if (i6 === 0 || (i6 === 2 && terrain[p] === CHUNK_SEGMENTS)) {
        heightData.push(terrain[p + 1]);
      }
      if (i6 === 1 && terrain[p + 2] === CHUNK_SEGMENTS)
        lastRow.push(terrain[p + 1]);
    }

    heightData.push(...lastRow, terrain[(count - 2) * 3 + 1]);

    // this.terrainBody = createTerrainBody(
    //   heightData,
    //   new THREE.Vector3(
    //     (this.x + 0.5) * Chunk.SIZE,
    //     0,
    //     (this.z + 0.5) * Chunk.SIZE,
    //   ),
    // );
  }

  // setLOD(lod) {
  //   if (this.lod === lod) return;

  //   this.mesh.geometry.dispose();
  // }

  setTerrain(attr) {
    const geometry = new THREE.BufferGeometry();
    for (const key of ['position', 'color', 'uv', 'normal']) {
      const { array, itemSize, normalized } = attr[key];
      geometry.addAttribute(
        key,
        new THREE.BufferAttribute(array, itemSize, normalized),
      );
    }

    this.mesh = new THREE.Mesh(geometry, groundMaterial.clone());
    this.mesh.matrixAutoUpdate = false;
    this.mesh.position.set(
      (this.x + 0.5) * Chunk.SIZE,
      0,
      (this.z + 0.5) * Chunk.SIZE,
    );

    this.mesh.updateMatrix();

    this.mesh.castShadow = this.mesh.receiveShadow = options.get('shadows');

    this.group.add(this.mesh);

    if (options.get('debug')) {
      this.debugMesh = new THREE.LineSegments(
        new THREE.EdgesGeometry(
          new THREE.BoxGeometry(Chunk.SIZE, 512, Chunk.SIZE),
        ),
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }),
      );
      this.debugMesh.position.copy(this.mesh.position);
      this.group.add(this.debugMesh);
    }
  }

  dispose() {
    this.group.remove(this.mesh);
    if (this.debugMesh) this.group.remove(this.debugMesh);
    if (this.terrainBody) this.terrainBody.dispose();
  }
}
