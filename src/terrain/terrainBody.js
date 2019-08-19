/* eslint-disable new-cap */
import { Ammo, getWorld } from '../physics';
import { SEGMENT_SIZE, CHUNK_SEGMENTS } from '../constants';
import * as debug from '../debug';

const createTerrainShape = ({ heightData, minHeight, maxHeight }) => {
  const size = CHUNK_SEGMENTS;

  // This parameter is not really used, since we are using PHY_FLOAT height data type and hence it is ignored
  const heightScale = 1;

  // Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
  const upAxis = 1;

  // hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
  const hdt = 'PHY_FLOAT';

  // Set this to your needs (inverts the triangles)
  const flipQuadEdges = false;

  // Creates height data buffer in Ammo heap
  const ammoHeightData = Ammo._malloc(4 * size * size);

  // Copy the javascript height data array to the Ammo one.
  let p = 0;
  let p2 = 0;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      // write 32-bit float data to memory
      Ammo.HEAPF32[(ammoHeightData + p2) >> 2] = heightData[p];

      p++;

      // 4 bytes/float
      p2 += 4;
    }
  }

  // Creates the heightfield physics shape
  const heightFieldShape = new Ammo.btHeightfieldTerrainShape(
    size,
    size,

    ammoHeightData,

    heightScale,
    minHeight,
    maxHeight,

    upAxis,
    hdt,
    flipQuadEdges,
  );

  // Set horizontal scale
  const hScale = (SEGMENT_SIZE * CHUNK_SEGMENTS) / (CHUNK_SEGMENTS - 1);
  heightFieldShape.setLocalScaling(new Ammo.btVector3(hScale, 1, hScale));

  heightFieldShape.setMargin(0.05);

  return heightFieldShape;
};

const createTerrainBody = (heightData, position) => {
  // TODO: move this somewhere more efficient?
  let minHeight = 9999999,
    maxHeight = -9999999;
  for (const height of heightData) {
    if (height < minHeight) minHeight = height;
    if (height > maxHeight) maxHeight = height;
  }

  const groundShape = createTerrainShape({
    heightData,
    minHeight,
    maxHeight,
  });

  const groundTransform = new Ammo.btTransform();
  groundTransform.setIdentity();
  // Shifts the terrain, since bullet re-centers it on its bounding box.
  groundTransform.setOrigin(
    new Ammo.btVector3(position.x, (maxHeight + minHeight) / 2, position.z),
  );

  const groundMass = 0;
  const groundMotionState = new Ammo.btDefaultMotionState(groundTransform);
  const groundLocalInertia = new Ammo.btVector3(0, 0, 0);

  const groundBody = new Ammo.btRigidBody(
    new Ammo.btRigidBodyConstructionInfo(
      groundMass,
      groundMotionState,
      groundShape,
      groundLocalInertia,
    ),
  );

  return groundBody;
};

export default (heightData, position) => {
  const groundBody = createTerrainBody(heightData, position);

  getWorld().addRigidBody(groundBody);

  if (debug.isEnabled()) debug.update();

  return {
    dispose() {
      getWorld().removeRigidBody(groundBody);
    },
  };
};

// export const destroyTerrainBody = () => {
//   getWorld().removeBody(groundBody);
// }
