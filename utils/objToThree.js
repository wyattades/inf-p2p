global.THREE = require('three');
const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');


const loadScript = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    if (res.statusCode === 200 && /javascript/.test(res.headers['content-type'])) {
      let rawData = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        const mod = vm.runInThisContext(rawData, url);
        resolve(mod);
      });
    } else {
      reject(res);
    }
  });
});
const loadLoader = (loader) => loadScript(
  `https://cdn.rawgit.com/mrdoob/three.js/ce501ae2/examples/js/loaders/${loader}Loader.js`,
);

const PRECISION = 6;
const parseNumber = (key, value) => (
  typeof value === 'number' ? Number.parseFloat(value.toFixed(PRECISION)) : value
);

(async () => {

  const args = process.argv.splice(2);

  if (args.length < 1) throw 'Usage: node convertObj.js <filename>';

  const input = path.resolve(args[0]);
  const output = input.replace(/\.\w+$/, '.json');
  const loader = path.parse(input).ext.substring(1).toUpperCase();

  if (!/^(STL|OBJ)$/.test(loader)) throw 'Invalid loader: ' + loader;

  await loadLoader(loader);

  let obj;

  const inputData = fs.readFileSync(input, { encoding: 'utf8' });
  if (loader === 'OBJ') {
    const match = inputData.match(/\bmtllib\s+([\w./-]+)\b/);

    if (match && match[1]) {
      const mtlPath = path.resolve(path.parse(input).dir, match[1]);
      const mtlData = fs.readFileSync(mtlPath, { encoding: 'utf8' });

      await loadLoader('MTL');

      const materials = new THREE.MTLLoader().parse(mtlData);
      materials.preload();
      obj = new THREE.OBJLoader()
      .setMaterials(materials)
      .parse(inputData);
    } else {
      obj = new THREE.OBJLoader().parse(inputData);
    }
  } else if (loader === 'STL') {
    obj = new THREE.STLLoader().parse(inputData);
  }

  fs.writeFileSync(output, JSON.stringify(obj.toJSON(), parseNumber), 'utf8');
})()
.catch((err) => {
  console.error(err);
  process.exit(1);
});
