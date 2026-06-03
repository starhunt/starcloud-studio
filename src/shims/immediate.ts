const queue: Array<() => void> = [];
let draining = false;

function drainQueue() {
  draining = true;
  while (queue.length > 0) {
    const task = queue.shift();
    if (task) task();
  }
  draining = false;
}

export default function immediate(task: () => void) {
  queue.push(task);
  if (!draining && queue.length === 1) {
    window.setTimeout(drainQueue, 0);
  }
}

module.exports = immediate;
