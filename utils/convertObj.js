const THREE = require('three');
const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');


const args = process.argv.splice(2);

const input = path.resolve(args[0]);
const output = input.replace(/\.\w+$/, '.json');
const loader = path.parse(input).ext.toUpperCase();
if (!/STL|OBJ/.test(loader)) throw 'Invalid loader: ' + loader;

const loaderUrl = `https://cdn.rawgit.com/mrdoob/three.js/ce501ae2/examples/js/loaders/${loader}Loader.js`;
https.get(loaderUrl, (res) => {
  if (res.statusCode === 200 && /^text\/javascript/.test(res.headers['content-type'])) {
    let rawData = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      vm.runInThisContext(rawData, loaderUrl);

      let obj;

      const inputData = fs.readFileSync(input, { encoding: 'utf8' });
      if (loader === 'OBJ') {
        const match = inputData.match(/\bmtllib\s+([\w./-]+)\b/);
        const mtlPath = path.resolve(match[1]);
        const mtlData = fs.readFileSync(mtlPath, { encoding: 'utf8' });
        const materials = new THREE.MTLLoader().parse(mtlData);
        materials.preload();
        obj = new THREE.OBJLoader()
        .setMaterials(materials)
        .parse(inputData);
        
      } else if (loader === 'STL') {
        obj = new THREE.STLLoader().parse(inputData);
      }

      const json = obj.toJSON();

      fs.writeFileSync(output, JSON.stringify(json), 'utf8');
    });
  } else {
    console.error(res);
    process.exit(1);
  }
});
