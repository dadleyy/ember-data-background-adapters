import Service from '@ember/service';
import { defer } from 'rsvp';
import EmberObject, { get, computed } from '@ember/object';
import { getOwner } from '@ember/application';
import debugLogger from 'ember-debug-logger';

const WORKER_KEY = Symbol('worker');

function initialize() {
  const { resolve, promise } = defer();
  const config = this.get('config');
  const url = get(config, 'location');
  const instance = new Worker(url);

  instance.addEventListener('message', function launched(msg) {
    instance.removeEventListener('message', launched);
    const id = get(msg, 'data.id');
    resolve(WorkerProxy.create({ worker: instance, id }));
  });

  instance.postMessage({ config });

  return promise;
}

export default Service.extend({
  debug: debugLogger(),
  config: computed({
    get() {
      const owner = getOwner(this);
      const env = owner.resolveRegistration('config:environment');
      return get(env, 'backgroundAdapters');
    },
  }),

  async chunk(url) {
    const { resolve, promise } = defer();
    const worker = this[WORKER_KEY] || await initialize.call(this);

    if (!this[WORKER_KEY]) {
      this[WORKER_KEY] = worker;
    }

    worker.on('message', function receive(message) {
      worker.off('message', receive);
      worker.terminate();
      resolve({ });
    });

    worker.send({ url });

    this[WORKER_KEY] = null;

    return promise;
  },

});

const WorkerProxy = EmberObject.extend({
  terminate() {
    const worker = this.get('worker');
    worker.terminate();
  },

  on(event, handler) {
    const worker = this.get('worker');
    worker.addEventListener(event, handler);
  },

  off(event, handler) {
    const worker = this.get('worker');
    worker.removeEventListener(event, handler);
  },

  send(message) {
    const worker = this.get('worker');
    worker.postMessage(message);
  },
});
