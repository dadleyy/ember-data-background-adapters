'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

module.exports = function(defaults) {
  let app = new EmberAddon(defaults, {
    fingerprint: {
      exclude: ['**/workers/background-adapters/**/*.js'],
    },
  });

  return app.toTree();
};
