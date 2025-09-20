// src/utils/daily.js
export function runOncePerDay(fn) {
  const key = 'lastRunDate';
  const today = new Date().toISOString().slice(0,10);
  const lastRun = localStorage.getItem(key);
  if (lastRun !== today) {
    const maybe = fn();
    if (maybe && typeof maybe.then === 'function') maybe.catch(e => console.error('Daily job failed', e));
    localStorage.setItem(key, today);
  }
}

