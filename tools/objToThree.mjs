import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import fs from 'fs';
import path from 'path';
import https from 'https';
import vm from 'vm';

const LOADERS = {
  STL: STLLoader,
  OBJ: OBJLoader,
  MTL: MTLLoader,
};

const PRECISION = 6;
const parseNumber = (key, value) =>
  typeof value === 'number'
    ? Number.parseFloat(value.toFixed(PRECISION))
    : value;

(async () => {
  const args = process.argv.splice(2);

  if (args.length < 1) throw 'Usage: node convertObj.js <filename>';

  const input = path.resolve(args[0]);
  const output = input.replace(/\.\w+$/, '.json');
  const loader = path.parse(input).ext.substring(1).toUpperCase();

  if (!LOADERS[loader]) throw `Invalid loader: ${loader}`;

  let obj;

  const inputData = fs.readFileSync(input, { encoding: 'utf8' });
  if (loader === 'OBJ') {
    const match = inputData.match(/\bmtllib\s+([\w./-]+)\b/);

    if (match && match[1]) {
      const mtlPath = path.resolve(path.parse(input).dir, match[1]);
      const mtlData = fs.readFileSync(mtlPath, { encoding: 'utf8' });

      const materials = new MTLLoader().parse(mtlData);
      materials.preload();
      obj = new OBJLoader().setMaterials(materials).parse(inputData);
    } else {
      obj = new OBJLoader().parse(inputData);
    }
  } else if (loader === 'STL') {
    obj = new STLLoader().parse(inputData);
  }

  fs.writeFileSync(output, JSON.stringify(obj.toJSON(), parseNumber), 'utf8');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
