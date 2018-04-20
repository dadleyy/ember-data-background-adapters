'use strict';

const Funnel = require('broccoli-funnel');
const Rollup = require('broccoli-rollup');
const Babel = require('broccoli-babel-transpiler');

const exists = require('exists-sync');
const path = require('path');
const dig = require('object-dig');
const writeFile = require('broccoli-file-creator');
const commonjs = require('rollup-plugin-commonjs');
const merge = require('broccoli-merge-trees');
const glob = require('glob');
const resolve = require('browser-resolve');
const debug = require('debug')('ember-data-background-adapter');
const uglify = require('broccoli-uglify-sourcemap');

const OPTION_KEY = 'ember-data-background-adapter';
const PLUGIN_KEY = 'ember-data-background-adapter-plugin';
const WORKERS_LOCATION = 'workers/background-adapters';
const WORKER_FILENAME = 'worker.js';

module.exports = {
  name: '@dadleyy/ember-data-background-adapter',

  included(app) {
    if (this._super.included) {
      this._super.included.apply(this, arguments);
    }

    const options = dig(app, 'options', OPTION_KEY) || { };
    app.options[OPTION_KEY] = options;

    this.app = app;
  },

  config(env, base) {
    const backgroundAdapters = {
      location: path.join(base.rootURL, WORKERS_LOCATION, WORKER_FILENAME),
    };

    return { backgroundAdapters }
  },

  serverMiddleware({ app, options }) {
    const { project } = options;

    if (project.pkg.name !== this.name) {
      debug('avoiding middleware (was incldued on external project %s)', project.pkg.name);
      return;
    }

    debug('detected server mode, checking to add dummy api %s', project.pkg.name);
  },

  /* During post processing we will construct the main worker file that imports all workers we've found from this
   * plugin and the other plugins that we've determined contribute files to our rollup.
   */
  postprocessTree(type, application) {
    const options = this.app.options[OPTION_KEY];

    if (type !== 'all' || options.enabled === false) {
      return application;
    }

    // get a list of all addons having worker code (including both this addon and the project we're installed on).
    const plugins = (this.project.addons || []).filter(keywords).concat([this, this.project]);

    // when building the dummy app, add it as a plugin to support dummy worker compilation.
    if (this.app.name === 'dummy') {
      const root = path.resolve(path.join(this.root, this.app.options.trees.app, '..'));
      const pkg = Object.assign({ }, this.project.pkg, { name: this.project.pkg.name + '-dummy' });
      const dummy = { pkg, root };

      plugins.push(dummy);
    }

    const trees = [];
    const imports = [];
    const roots = [];

    debug('assembling list of plugins');

    // loop over the set of plugins we're working with, copying their worker-related code into a namespaced directory
    // that will eventually be compiled down into a single file.
    for (let i = 0, c = plugins.length; i < c; i++) {
      const plugin = plugins[i];
      const root = path.resolve(plugin.root, WORKERS_LOCATION);
      const index = glob.sync('index.js', { cwd: root });

      // only add worker sources that have an importable file defined in the correct location (WORKERS_LOCATION).
      if (!index || index.length !== 1) {
        debug('skipping "%s" for background worker, index.js at "%s" not found', plugin.pkg.name, root);
        continue;
      }

      // re-direct the files stored in the plugin's worker location to the worker location, namespaced under the pkg.
      const out = path.join(WORKERS_LOCATION, plugin.pkg.name);
      const tree = new Funnel(root, { destDir: out });

      debug('found plugin "%s", adding local workers to worker funnel', plugin.pkg.name);

      // add an import line - this will be dumped into the worker file that we're generating.
      imports.push(`import "${plugin.pkg.name}";`);
      trees.push(tree);
    }

    // create the main worker import file - during rollup all associated files will be pulled into this one.
    const main = path.join(WORKERS_LOCATION, 'index.js');
    const importer = writeFile(main, imports.join('\n'));

    // assemble all source code into a single location.
    const worker = merge(trees.concat([importer]), { overwrite: true });

    // with all of our code compiled down to a single place, run the babel transpiler against the code.
    const compiler = transpiler(worker, this.app);

    const rollup = new Rollup(compiler, {
      rollup: {
        input: main,
        plugins: [resolver({ plugins, browser: true }), commonjs()],
        output: {
          file: main,
          format: 'iife',
        },
      },
    });

    const minconfig = dig(this.app, 'options.minifyJS');

    debug('tree complete');

    if (minconfig) {
      debug('minifying worker code');
      return merge([application, uglify(compiler)]);
    }

    return merge([application, rollup]);
  },
};

function transpiler(tree) {
  const options = { };

  return new Babel(tree, options);
}

function keywords(addon, keyword) {
  keyword = keyword || PLUGIN_KEY;
  return (addon.pkg && addon.pkg.keywords) && addon.pkg.keywords.indexOf(keyword) > -1;
}

function resolver({ plugins }) {
  const env = { resolutions: new Map() };

  return {
    resolveId(importee, importer) {
      if (/\0/.test(importee) || !importer) {
        return null;
      }

      const origin = path.dirname(importer);
      const workspace = dig(env, 'locations.workspace') || seek(origin, WORKERS_LOCATION);

      if (!env.locations) {
        const workers = path.join(workspace, WORKERS_LOCATION);
        env.locations = { workers, workspace };
        debug('worker resolver established workspace to %s', workspace);
      }

      const relative = path.relative(env.locations.workers, importer);
      const parts = relative.split(path.sep);

      for (const plugin of plugins) {
        const name = plugin.pkg.name;
        const workers = path.join(env.locations.workers, name);
        const index = name ? path.join(workers, 'index.js') : null;

        // if we're importing the plugin by name check for index and import it.
        if (name === importee && exists(index)) {
          return index;
        }

        const match = parts.some((bit, i) => path.join(relative, Array(i+1).fill('..').join(path.sep)) === name);

        if (!match) {
          continue;
        }

        if (exists(path.join(workers, importee + '.js'))) {
          return path.join(workers, importee + '.js');
        }


        const existing = env.resolutions.get(importee);

        if (existing && existing.owner !== name) {
          debug('%s is imported by both "%s" and "%s"', importee, existing.owner, name);
          return null;
        }

        if (existing) {
          return existing.location;
        }

        const location = resolve.sync(importee, { basedir: plugin.root }) || null;

        if (!location) {
          debug('"%" appeared to own %s but was not found in "%s"', name, importee, plugin.root);
          continue;
        }

        env.resolutions.set(importee, { owner: name, location });
        debug('%s is being imported by "%s"', importee, name);
        return location;
      }

      return sideload(env.resolutions, importer, importee);
    },
  };
}

function sideload(registrations, importer, importee) {
  for (const [name, resolution] of registrations.entries()) {
    const { location } = resolution;

    if (location !== importer) {
      continue;
    }

    const basedir = path.dirname(location);
    const resolved = resolve.sync(importee, { basedir });

    if (resolved) {
      registrations.set(importee, { location: resolved });
      return resolved;
    }
  }

  return null;
}

function seek(head, needle) {
  while (path.resolve(path.join(head, '..')) !== head && head !== path.sep && head) {
    head = path.resolve(path.join(head, '..'));

    if (exists(path.join(head, needle))) {
      return head;
    }
  }

  return null;
}
