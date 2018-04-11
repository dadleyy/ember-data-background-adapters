import Route from '@ember/routing/route';
import debugLogger from 'ember-debug-logger';

export default Route.extend({
  debug: debugLogger(),
  beforeModel() {
    this.debug('made it to the not-found route, redirecting');
    return this.transitionTo('index');
  },
});
