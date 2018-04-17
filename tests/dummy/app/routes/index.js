import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';

export default Route.extend({
  store: service(),
  debug: debugLogger(),

  async model() {
    const store = this.get('store');
    await store.query('galaxy', { });
    this.debug('on index route %o', { });
  },
});
