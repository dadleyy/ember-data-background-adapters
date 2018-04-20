import { timeout } from './deferred';
import cuid from './nested/index';


timeout(300).then(function() { console.log(cuid()); });

export function add(n) {
  return n;
}
