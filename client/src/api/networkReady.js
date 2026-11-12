// The storefront can paint while the development worker is starting.
let ready = Promise.resolve();

export function waitForApiSetup() {
  return ready;
}

export function setApiSetup(task) {
  ready = task;
}
