import rsvp from 'rsvp';

export function timeout(amt = 100) {
  const { resolve, promise } = rsvp.defer();
  setTimeout(resolve, amt);
  return promise;
}
