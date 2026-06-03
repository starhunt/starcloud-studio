const schedule = (callback: (...args: unknown[]) => void, ...args: unknown[]) => {
  return window.setTimeout(() => callback(...args), 0);
};

const clearSchedule = (handle: number) => window.clearTimeout(handle);
const globalWithTimers = globalThis as any;

if (typeof globalWithTimers.setImmediate !== 'function') {
  globalWithTimers.setImmediate = schedule;
}

if (typeof globalWithTimers.clearImmediate !== 'function') {
  globalWithTimers.clearImmediate = clearSchedule;
}

export {};
