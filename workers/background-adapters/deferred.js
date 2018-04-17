export function defer() {
}

export function timeout(amt = 100) {
  const { resolve, promise } = defer();
  setTimeout(resolve, amt);
  return promise;
}
