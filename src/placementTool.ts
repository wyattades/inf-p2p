import * as THREE from 'three';

import type Game from 'src/Game';
import ChunkLoader from 'src/ChunkLoader';
import Box from 'src/objects/Box';
import Chunk from 'src/Chunk';
import { CHUNK_SEGMENTS, SEGMENT_SIZE } from 'src/constants';

const cursorSize = 2;
const cursorHeight = cursorSize / 5;
const maxCursorDistance = 50;
const maxCursorDistanceWhileFlying = 200;
const boxSize = 5;
const growthRadius = 5;
const growthSpeed = 0.5;
const updateEveryTick = 5;

const cursorMaterial = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  opacity: 0.5,
  transparent: true,
});

export class PlacementTool {
  ray = new THREE.Raycaster();
  terraformCursor: THREE.Mesh;
  buildCursor: THREE.Mesh;

  constructor(readonly game: Game) {
    this.terraformCursor = new THREE.Mesh(
      new THREE.BoxGeometry(cursorSize, cursorHeight, cursorSize),
      cursorMaterial,
    );
    this.game.scene.add(this.terraformCursor);
    this.terraformCursor.visible = false;

    this.buildCursor = new THREE.Mesh(
      new THREE.BoxGeometry(boxSize, boxSize, boxSize),
      cursorMaterial,
    );
    this.game.scene.add(this.buildCursor);
    this.buildCursor.visible = false;

    game.controls.bindClick = (evt) => {
      if (evt.button === 0) this.removeBox();
      else if (evt.button === 2) this.addBox();
    };
  }

  addBox() {
    let pos;

    if (this.buildCursor.visible) {
      pos = this.buildCursor.position;
    } else if (this.terraformCursor.visible) {
      pos = this.terraformCursor.position.clone();
      pos.y += -cursorHeight * 0.5 + boxSize * 0.5;
    } else return;

    const box = new Box(this.game, pos, boxSize);
    this.game.objectGroup.add(box.mesh);
  }

  intersectingBox: Box | null = null;
  removeBox() {
    this.intersectingBox?.dispose();
  }

  cursorActions(pressingAction: boolean) {
    this.ray.setFromCamera({ x: 0, y: 0 }, this.game.camera);

    const { x: cx, z: cz } = ChunkLoader.worldPosToChunk(
      this.ray.ray.origin.x,
      this.ray.ray.origin.z,
    );

    const chunk = this.game.chunkLoader.getChunk(cx, cz);

    const [inter] = this.ray.intersectObjects(
      [...(chunk?.mesh ? [chunk.mesh] : []), ...this.game.objectGroup.children],
      false,
    );

    this.intersectingBox = null;
    this.terraformCursor.visible = false;
    this.buildCursor.visible = false;

    if (!inter) return;

    if (
      inter.distance >
      (this.game.flyControls ? maxCursorDistanceWhileFlying : maxCursorDistance)
    ) {
      return;
    }

    const object = inter.object as THREE.Mesh & { gameObject?: Chunk | Box };
    if (object.gameObject instanceof Chunk) {
      this.terraformCursor.visible = true;
      this.terraformCursor.position.copy(inter.point);
      this.terraformCursor.position.y += cursorHeight * 0.5;

      if (pressingAction) {
        this.terraformChunk(chunk!, inter.point);
      }
    } else if (object.gameObject instanceof Box) {
      this.intersectingBox = object.gameObject;

      this.buildCursor.visible = true;
      // this.buildCursor.position.copy(inter.point);

      this.buildCursor.position
        .copy(inter.object.position)
        .add(inter.face!.normal.clone().multiplyScalar(boxSize));
    }
  }

  terraformChunk(chunk: Chunk, position: THREE.Vector3) {
    const relative = new THREE.Vector3(Chunk.SIZE / 2, 0, Chunk.SIZE / 2)
      .sub(chunk.mesh!.position)
      .add(position)
      .divideScalar(SEGMENT_SIZE)
      .round();

    const positionAttr = chunk.mesh!.geometry!.attributes.position;
    const array = positionAttr.array as Float32Array;
    const size = CHUNK_SEGMENTS + 1;

    const physicsHeightArray = chunk.heightsArray!;

    for (let dx = -growthRadius; dx <= growthRadius; dx++) {
      for (let dz = -growthRadius; dz <= growthRadius; dz++) {
        const x = relative.x + dx;
        const z = relative.z + dz;

        // out of bounds
        if (x < 0 || x >= size || z < 0 || z >= size) continue;

        const i18 = (z * (size - 1) + x) * 18;

        const ml = dx === -growthRadius ? 0 : 1; // left
        const mr = dx === growthRadius ? 0 : 1; // right
        const mb = dz === growthRadius ? 0 : 1; // bottom
        const mt = dz === -growthRadius ? 0 : 1; // top

        array[i18 + 1] += growthSpeed * (mt * ml); // tl
        array[i18 + 4] = array[i18 + 10] += growthSpeed * (mb * ml); // bl
        array[i18 + 13] += growthSpeed * (mb * mr); // br
        array[i18 + 7] = array[i18 + 16] += growthSpeed * (mt * mr); // tr

        // physicsHeightArray uses column-major order
        physicsHeightArray[x * size + z] += ml * mr * mb * mt * growthSpeed;
      }
    }

    positionAttr.needsUpdate = true;

    chunk.updatePhysicsShape();
  }

  update(_delta: number, tick: number) {
    this.cursorActions(
      this.game.controls.pointerState[0] && tick % updateEveryTick === 0,
    );
  }
}
