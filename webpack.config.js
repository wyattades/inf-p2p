
module.exports = require('webpack-boiler')({
  pages: [{
    title: 'P2P Test',
    template: './src/index.pug',
    meta: [{
      name: 'description', content: '<Temporary description>',
    }],
  }],
  basename: 'inf-p2p',
});
