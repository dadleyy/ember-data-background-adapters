import DS from 'ember-data';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';

export default DS.JSONAPIAdapter.extend({
  workers: service('adapter-workers'),

  async query(store, modelClass, query) {
    const workers = this.get('workers');
    const modelName = get(modelClass, 'modelName');
    const serializer = store.serializerFor(modelClass.modelName);
    const url = this.urlForQuery(query, modelName);
    const data = await workers.chunk(url, { serializer });

    return { data };
  },
});
