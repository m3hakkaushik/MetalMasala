import assert from 'node:assert/strict';
import { errorMonitor } from 'node:events';
import { test } from 'node:test';
import { AppEvents } from '../src/events/bus.js';

test('[L38] listener failures are isolated and logged, including async rejections', async () => {
  const bus = new AppEvents();
  const seen = [];
  const onEvent = () => seen.push('on');
  bus.on(errorMonitor, (error, event) =>
    seen.push(`${event}: ${error.message}`)
  );
  bus.once('saved', () => {
    throw new Error('sync');
  });
  bus.once('saved', async () => {
    throw new Error('async');
  });
  bus.on('saved', onEvent);
  assert.equal(bus.emit('saved'), true);
  bus.off('saved', onEvent);
  assert.equal(bus.emit('saved'), false);
  await new Promise(setImmediate);
  assert.deepEqual(seen, ['saved: sync', 'on', 'saved: async']);
});
