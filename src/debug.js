/* eslint-disable func-names */
import * as THREE from 'three';

import { Ammo, getWorld } from './physics';

const AmmoDebugConstants = {
  NoDebug: 0,
  DrawWireframe: 1,
  DrawAabb: 2,
  DrawFeaturesText: 4,
  DrawContactPoints: 8,
  NoDeactivation: 16,
  NoHelpText: 32,
  DrawText: 64,
  ProfileTimings: 128,
  EnableSatComparison: 256,
  DisableBulletLCP: 512,
  EnableCCD: 1024,
  DrawConstraints: 1 << 11, // 2048
  DrawConstraintLimits: 1 << 12, // 4096
  FastWireframe: 1 << 13, // 8192
  DrawNormals: 1 << 14, // 16384
  DrawOnTop: 1 << 15, // 32768
  MAX_DEBUG_DRAW_MODE: 0xffffffff,
};

/**
 * An implementation of the btIDebugDraw interface in Ammo.js, for debug rendering of Ammo shapes
 * @class AmmoDebugDrawer
 * @param {THREE.Scene} scene
 * @param {Ammo.btCollisionWorld} world
 * @param {object} [options]
 */
const AmmoDebugDrawer = function (scene, world, options) {
  this.scene = scene;
  this.world = world;
  options = options || {};

  this.debugDrawMode =
    options.debugDrawMode || AmmoDebugConstants.DrawWireframe;
  const drawOnTop = this.debugDrawMode & AmmoDebugConstants.DrawOnTop || false;
  const maxBufferSize = options.maxBufferSize || 1000000;

  this.geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(maxBufferSize * 3);
  const colors = new Float32Array(maxBufferSize * 3);

  this.geometry.addAttribute(
    'position',
    new THREE.BufferAttribute(vertices, 3).setDynamic(true),
  );
  this.geometry.addAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3).setDynamic(true),
  );

  this.index = 0;

  const material = new THREE.LineBasicMaterial({
    vertexColors: THREE.VertexColors,
    depthTest: !drawOnTop,
  });

  this.mesh = new THREE.LineSegments(this.geometry, material);
  if (drawOnTop) this.mesh.renderOrder = 999;
  this.mesh.frustumCulled = false;

  this.enabled = false;

  this.debugDrawer = new Ammo.DebugDrawer();
  this.debugDrawer.drawLine = this.drawLine.bind(this);
  this.debugDrawer.drawContactPoint = this.drawContactPoint.bind(this);
  this.debugDrawer.reportErrorWarning = this.reportErrorWarning.bind(this);
  this.debugDrawer.draw3dText = this.draw3dText.bind(this);
  this.debugDrawer.setDebugMode = this.setDebugMode.bind(this);
  this.debugDrawer.getDebugMode = this.getDebugMode.bind(this);
  this.debugDrawer.enable = this.enable.bind(this);
  this.debugDrawer.disable = this.disable.bind(this);
  this.debugDrawer.update = this.update.bind(this);

  this.world.setDebugDrawer(this.debugDrawer);
};

AmmoDebugDrawer.prototype = function () {
  return this.debugDrawer;
};

AmmoDebugDrawer.prototype.enable = function () {
  this.enabled = true;
  this.scene.add(this.mesh);
};

AmmoDebugDrawer.prototype.disable = function () {
  this.enabled = false;
  this.scene.remove(this.mesh);
};

AmmoDebugDrawer.prototype.update = function () {
  if (!this.enabled) {
    return;
  }

  if (this.index !== 0) {
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  this.index = 0;
  this.world.debugDrawWorld();

  this.geometry.setDrawRange(0, this.index);
};

AmmoDebugDrawer.prototype.drawLine = function (from, to, color) {
  const heap = Ammo.HEAPF32;
  const r = heap[(color + 0) / 4];
  const g = heap[(color + 4) / 4];
  const b = heap[(color + 8) / 4];

  const fromX = heap[(from + 0) / 4];
  const fromY = heap[(from + 4) / 4];
  const fromZ = heap[(from + 8) / 4];
  this.geometry.attributes.position.setXYZ(this.index, fromX, fromY, fromZ);
  this.geometry.attributes.color.setXYZ(this.index++, r, g, b);

  const toX = heap[(to + 0) / 4];
  const toY = heap[(to + 4) / 4];
  const toZ = heap[(to + 8) / 4];
  this.geometry.attributes.position.setXYZ(this.index, toX, toY, toZ);
  this.geometry.attributes.color.setXYZ(this.index++, r, g, b);
};

// TODO: figure out how to make lifeTime work
AmmoDebugDrawer.prototype.drawContactPoint = function (
  pointOnB,
  normalOnB,
  distance,
  lifeTime,
  color,
) {
  const heap = Ammo.HEAPF32;
  const r = heap[(color + 0) / 4];
  const g = heap[(color + 4) / 4];
  const b = heap[(color + 8) / 4];

  const x = heap[(pointOnB + 0) / 4];
  const y = heap[(pointOnB + 4) / 4];
  const z = heap[(pointOnB + 8) / 4];
  this.geometry.attributes.position.setXYZ(this.index, x, y, z);
  this.geometry.attributes.color.setXYZ(this.index++, r, g, b);

  const dx = heap[(normalOnB + 0) / 4] * distance;
  const dy = heap[(normalOnB + 4) / 4] * distance;
  const dz = heap[(normalOnB + 8) / 4] * distance;
  this.geometry.attributes.position.setXYZ(this.index, x + dx, y + dy, z + dz);
  this.geometry.attributes.color.setXYZ(this.index++, r, g, b);
};

AmmoDebugDrawer.prototype.reportErrorWarning = function (warningString) {
  if (Ammo.hasOwnProperty('Pointer_stringify')) {
    console.warn(Ammo.Pointer_stringify(warningString));
  } else if (!this.warnedOnce) {
    this.warnedOnce = true;
    console.warn(
      "Cannot print warningString, please rebuild Ammo.js using 'debug' flag",
    );
  }
};

AmmoDebugDrawer.prototype.draw3dText = function (location, textString) {
  // TODO
  console.warn('TODO: draw3dText');
};

AmmoDebugDrawer.prototype.setDebugMode = function (debugMode) {
  this.debugDrawMode = debugMode;
};

AmmoDebugDrawer.prototype.getDebugMode = function () {
  return this.debugDrawMode;
};

let debugDrawer = null;

export let isEnabled = () => !!debugDrawer;

export const enable = (scene) => {
  debugDrawer = new AmmoDebugDrawer(scene, getWorld());
  debugDrawer.enable();

  // setInterval(() => {
  //   const mode = (debugDrawer.getDebugMode() + 1) % 3;
  //   debugDrawer.setDebugMode(mode);
  // }, 1000);
};

export const disable = () => {
  if (debugDrawer) {
    debugDrawer.disable();
    debugDrawer = null;
  }
};

export const update = () => {
  if (debugDrawer) debugDrawer.update();
};
