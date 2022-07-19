import * as THREE from 'three';

import type Game from 'src/Game';
import ChunkLoader from 'src/ChunkLoader';
import Box from 'src/objects/Box';
import Chunk from 'src/Chunk';
import { CHUNK_SEGMENTS, SEGMENT_SIZE } from 'src/constants';
import { BodyUserData, RAPIER } from 'src/physics';
import { copyVector } from 'src/utils/math';

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
  opacity: 0.4,
  transparent: true,
});

export class PlacementTool {
  ray = new RAPIER.Ray(
    new RAPIER.Vector3(0, 0, 0),
    new RAPIER.Vector3(0, 0, 0),
  );
  helperRay = new THREE.Raycaster();

  terraformCursor: THREE.Mesh;
  buildCursor: THREE.Mesh;
  pendingBoxCursor: THREE.Mesh;

  constructor(readonly game: Game) {
    this.terraformCursor = new THREE.Mesh(
      new THREE.BoxGeometry(cursorSize, cursorHeight, cursorSize),
      cursorMaterial,
    );
    this.terraformCursor.visible = false;
    this.game.scene.add(this.terraformCursor);

    this.buildCursor = new THREE.Mesh(
      new THREE.SphereGeometry(cursorHeight),
      cursorMaterial,
    );
    this.buildCursor.visible = false;
    this.game.scene.add(this.buildCursor);

    this.pendingBoxCursor = new THREE.Mesh(
      new THREE.BoxGeometry(boxSize, boxSize, boxSize),
      cursorMaterial,
    );
    this.pendingBoxCursor.visible = false;
    this.game.scene.add(this.pendingBoxCursor);

    game.controls.bindClick = (evt) => {
      if (evt.button === 0) this.removeBox();
      else if (evt.button === 2) this.addBox();
    };
  }

  addBox() {
    let pos;

    if (this.pendingBoxCursor.visible) {
      pos = this.pendingBoxCursor.position;
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

  cursorActions(pressingAction: 'add' | 'sub' | null) {
    // use threejs raycaster `setFromCamera` util to set the ray
    this.helperRay.setFromCamera({ x: 0, y: 0 }, this.game.camera);
    copyVector(this.helperRay.ray.origin, this.ray.origin);
    copyVector(this.helperRay.ray.direction, this.ray.dir);

    const { x: cx, z: cz } = ChunkLoader.worldPosToChunk(
      this.ray.origin.x,
      this.ray.origin.z,
    );

    const chunk = this.game.chunkLoader.getChunk(cx, cz);

    const inter = this.game.physics.world.castRayAndGetNormal(
      this.ray,
      this.game.flyControls ? maxCursorDistanceWhileFlying : maxCursorDistance,
      true,
      undefined,
      undefined,
      undefined,
      this.game.player.body.rigidBody,
    );

    this.intersectingBox = null;
    this.terraformCursor.visible = false;
    this.buildCursor.visible = false;
    this.pendingBoxCursor.visible = false;

    if (!inter) return;

    const normal = inter.normal;
    const interPoint = this.ray.pointAt(inter.toi);

    // convoluted way to get the gameObject from the collider
    const gameObject = (
      inter.collider.parent()?.userData as BodyUserData | undefined
    )?.gameObject;

    if (gameObject instanceof Chunk) {
      this.terraformCursor.visible = true;
      this.terraformCursor.position.copy(interPoint as THREE.Vector3);
      this.terraformCursor.position.y += cursorHeight * 0.5;

      if (pressingAction) {
        this.terraformChunk(
          chunk!,
          interPoint,
          pressingAction === 'add' ? 1 : -1,
        );
      }
    } else if (gameObject instanceof Box) {
      this.intersectingBox = gameObject;

      this.buildCursor.visible = true;
      this.pendingBoxCursor.visible = true;

      this.buildCursor.position.copy(interPoint as THREE.Vector3);

      this.pendingBoxCursor.position
        .copy(gameObject.mesh.position)
        .add(
          new THREE.Vector3()
            .copy(normal as THREE.Vector3)
            .multiplyScalar(boxSize),
        );
    }
  }

  terraformChunk(chunk: Chunk, position: Point3, dir = 1) {
    const relative = new THREE.Vector3(Chunk.SIZE / 2, 0, Chunk.SIZE / 2)
      .sub(chunk.mesh!.position)
      .add(position as THREE.Vector3)
      .divideScalar(SEGMENT_SIZE)
      .round();

    const positionAttr = chunk.mesh!.geometry!.attributes.position;
    const array = positionAttr.array as Float32Array;
    const size = CHUNK_SEGMENTS + 1;

    const physicsHeightArray = chunk.heightsArray!;

    const growthVel = growthSpeed * dir;

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

        array[i18 + 1] += growthVel * (mt * ml); // tl
        array[i18 + 4] = array[i18 + 10] += growthVel * (mb * ml); // bl
        array[i18 + 13] += growthVel * (mb * mr); // br
        array[i18 + 7] = array[i18 + 16] += growthVel * (mt * mr); // tr

        // physicsHeightArray uses column-major order
        physicsHeightArray[x * size + z] += ml * mr * mb * mt * growthVel;
      }
    }

    positionAttr.needsUpdate = true;

    chunk.updatePhysicsShape();
  }

  update(_delta: number, tick: number) {
    this.cursorActions(
      (this.game.controls.pointerState[0] &&
        tick % updateEveryTick === 0 &&
        (this.game.controls.keystate.sprint ? 'sub' : 'add')) ||
        null,
    );
  }
}
