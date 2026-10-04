/**
 * targetAt must be an ISO-8601 date string, ideally with timezone/offset.
 * Example: 2027-03-20T17:00:00-05:00
 */
export function initCountdown(root, {
  targetAt = root?.dataset.targetAt,
  expiredMessage = root?.dataset.expiredMessage || "We're live."
} = {}) {
  if (!root || !targetAt) return () => {};

  const target = new Date(targetAt);
  if (Number.isNaN(target.getTime())) throw new Error(`Invalid countdown targetAt: ${targetAt}`);

  const out = {
    days: root.querySelector('[data-countdown-days]'),
    hours: root.querySelector('[data-countdown-hours]'),
    minutes: root.querySelector('[data-countdown-minutes]'),
    seconds: root.querySelector('[data-countdown-seconds]')
  };
  const status = root.querySelector('[data-countdown-status]');
  let timer = 0;

  const pad = n => String(Math.max(0, n)).padStart(2, '0');

  const tick = () => {
    const distance = Math.max(0, target.getTime() - Date.now());
    let t = distance;
    const days = Math.floor(t / 86400000); t -= days * 86400000;
    const hours = Math.floor(t / 3600000); t -= hours * 3600000;
    const minutes = Math.floor(t / 60000); t -= minutes * 60000;
    const seconds = Math.floor(t / 1000);

    if (out.days) out.days.textContent = pad(days);
    if (out.hours) out.hours.textContent = pad(hours);
    if (out.minutes) out.minutes.textContent = pad(minutes);
    if (out.seconds) out.seconds.textContent = pad(seconds);

    if (distance <= 0) {
      if (status) status.textContent = expiredMessage;
      root.dispatchEvent(new CustomEvent('countdown:expired', { bubbles: true }));
      return;
    }
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  };

  tick();
  return () => clearTimeout(timer);
}
