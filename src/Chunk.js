import * as THREE from 'three';


const CHUNK_SEGMENTS = 64;
const SEGMENT_SIZE = 2;
const SCALE = 1 / 64.0;

const groundMaterial = new THREE.MeshLambertMaterial();

export default class Chunk {

  static SIZE = CHUNK_SEGMENTS * SEGMENT_SIZE;

  constructor(x, z) {
    this.x = x;
    this.z = z;
    // this.heightArray = null;
    this.array = null;
    this.geometry = null;
    this.material = null;
    this.mesh = null;
  }

  getHeightAt(x, z) {
    x -= this.x * Chunk.SIZE;
    z -= this.z * Chunk.SIZE;

    x /= SEGMENT_SIZE;
    z /= SEGMENT_SIZE;

    // Get integer floor of x, z
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    // Get real (fractional) component of x, z
    // This is the amount of each into the cell
    const rx = x - ix;
    const rz = z - iz;
    // Edges of cell
    const a = this.array[(iz * CHUNK_SEGMENTS + ix) * 3 + 1];
    const b = this.array[(iz * CHUNK_SEGMENTS + (ix + 1)) * 3 + 1];
    const c = this.array[((iz + 1) * CHUNK_SEGMENTS + (ix + 1)) * 3 + 1];
    const d = this.array[((iz + 1) * CHUNK_SEGMENTS + ix) * 3 + 1];
    // Interpolate top edge (left and right)
    const e = (a * (1 - rx) + b * rx);
    // Interpolate bottom edge (left and right)
    const f = (c * rx + d * (1 - rx));
    // Interpolate between top and bottom
    const y = (e * (1 - rz) + f * rz);
    return y || 0.0;
  }

  setTerrain(heightArray) {
    // this.heightArray = heightArray;

    this.geometry = new THREE.PlaneBufferGeometry(
      Chunk.SIZE,
      Chunk.SIZE,
      CHUNK_SEGMENTS - 1,
      CHUNK_SEGMENTS - 1,
    );
    // Make flat
    this.geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    const array = this.geometry.attributes.position.array;
    heightArray.forEach((y, i) => {
      // TODO
      array[i * 3 + 1] = y * SCALE;
    });
    this.array = array;
    this.geometry.computeVertexNormals();

    this.material = groundMaterial.clone();
    const color = new THREE.Color(0xffffff);
    color.setRGB(heightArray[0] / 255, heightArray[1] / 255, heightArray[2] / 255);
    this.material.color = color;

    this.mesh = new THREE.Mesh(this.geometry, this.material);

    this.mesh.position.set((this.x + 0.5) * Chunk.SIZE, 0, (this.z + 0.5) * Chunk.SIZE);
  }

}
