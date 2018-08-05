
module.exports = require('webpack-boiler')({
  pages: [{
    title: 'P2P Test',
    description: '<Temporary description>',
    template: `${__dirname}/src/index.pug`,
  }],
  basename: 'inf-p2p',
});
