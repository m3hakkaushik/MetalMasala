import { EventEmitter, errorMonitor } from 'node:events';
import { debugData } from '../utils/logger.js';

// [L38] A subscriber can fail without unwinding the request or stopping the other subscribers.
export class AppEvents extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
    this.on(errorMonitor, (error, event) =>
      debugData('Listener for %s failed (%s)', event, error?.name)
    );
    this.on('error', () => {});
  }

  emit(event, ...args) {
    if (event === 'error') return super.emit(event, ...args);
    const listeners = this.rawListeners(event);
    for (const listener of listeners) {
      try {
        Promise.resolve(listener.apply(this, args)).catch((error) =>
          this.emit('error', error, event)
        );
      } catch (error) {
        this.emit('error', error, event);
      }
    }
    return listeners.length > 0;
  }
}

export const bus = new AppEvents();
