'use strict';

const Funnel = require('broccoli-funnel');
const Rollup = require('broccoli-rollup');
const Babel = require('broccoli-babel-transpiler');

const path = require('path');
const dig = require('object-dig');
const writeFile = require('broccoli-file-creator');
const merge = require('broccoli-merge-trees');
const exists = require('exists-sync');
const glob = require('glob');
const debug = require('debug')('ember-data-background-adapter');

const OPTION_KEY = 'ember-data-background-adapter';
const PLUGIN_KEY = 'ember-data-background-adapter-plugin';
const WORKERS_LOCATION = 'workers/background-adapters';

module.exports = {
  name: '@dadleyy/ember-data-background-adapter',

  included(app) {
    if (this._super.included) {
      this._super.included.apply(this, arguments);
    }

    const options = dig(app, 'options', OPTION_KEY) || { };
    app.options[OPTION_KEY] = options;

    debug('was included, options %o', options);
    this.app = app;
  },

  postprocessTree(type, application) {
    const options = this.app.options[OPTION_KEY];

    if (type !== 'all' || options.enabled === false) {
      return application;
    }

    const plugins = (this.project.addons || []).filter(keywords).concat([
      this,
      this.project,
    ]);
    const trees = [];
    const imports = [];

    for (let i = 0, c = plugins.length; i < c; i++) {
      const plugin = plugins[i];
      const root = path.resolve(plugin.root, WORKERS_LOCATION);
      const index = glob.sync('**/index.js', { cwd: root });

      // only add worker sources that have an importable file defined in the correct location (WORKERS_LOCATION).
      if (!index || index.length !== 1) {
        debug('skipping "%s" for background worker, index.js at "%s" not found', plugin.pkg.name, root);
        continue;
      }

      debug('found plugin "%s", adding local workers to worker funnel', plugin.root);

      // re-direct the files stored in the plugin's worker location to the worker location, namespaced under the pkg.
      const out = path.join(WORKERS_LOCATION, plugin.pkg.name);
      const tree = new Funnel(root, { destDir: out });

      // add an import line - this will be dumped into the worker file that we're generating.
      imports.push(`import "./${plugin.pkg.name}/index";`);
      trees.push(tree);
    }

    const main = path.join(WORKERS_LOCATION, 'index.js');
    const importer = writeFile(main, imports.join('\n'));
    const worker = merge(trees.concat([importer]), { overwrite: true });
    const compiler = transpiler(worker, this.app);
    const rollup = new Rollup(compiler, {
      rollup: {
        input: main,
        output: {
          file: path.join(WORKERS_LOCATION, 'worker.js'),
          format: 'iife',
        },
      },
    });

    debug('preprocessing %s (options %o) (plugins %d)', type, options, plugins.length);
    return merge([application, rollup]);
  },
};

function transpiler(tree, project) {
  const options = Object.assign({ }, (project.options || { }).babel);
  delete options.includePolyfill;
  debug('loading babel compiler opts for %s', project.name);
  return new Babel(tree, options);
}

function keywords(addon, keyword) {
  keyword = keyword || PLUGIN_KEY;
  return (addon.pkg && addon.pkg.keywords) && addon.pkg.keywords.indexOf(keyword) > -1;
}
