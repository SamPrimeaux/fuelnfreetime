/**
 * Remastered scene hero behavior.
 * No GLB URL is embedded here. The caller resolves scene.assetKey -> URL.
 * The host should register <model-viewer> (or provide another scene adapter).
 */
export function initSceneHero(root, options = {}) {
  if (!root) return () => {};
  const mv = root.querySelector('model-viewer');
  if (!mv) return () => {};

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection?.saveData);
  const base = {
    azimuth: Number(options.azimuth ?? root.dataset.cameraAzimuth ?? 0),
    polar: Number(options.polar ?? root.dataset.cameraPolar ?? 75),
    radius: Number(options.radiusPercent ?? root.dataset.cameraRadius ?? 110),
    orbitDegrees: Number(options.orbitDegrees ?? root.dataset.scrollOrbit ?? 42),
    liftPx: Number(options.liftPx ?? root.dataset.scrollLift ?? 18)
  };

  if (saveData) mv.setAttribute('reveal', 'interaction');
  if (prefersReduced || saveData || options.scroll === false) return () => {};

  let raf = 0;
  let active = false;

  const render = () => {
    raf = 0;
    if (!active) return;
    const r = root.getBoundingClientRect();
    const span = Math.max(1, r.height + innerHeight);
    const progress = Math.min(1, Math.max(0, (innerHeight - r.top) / span));
    const azimuth = base.azimuth + (progress - .5) * base.orbitDegrees;
    mv.cameraOrbit = `${azimuth.toFixed(2)}deg ${base.polar}deg ${base.radius}%`;
    mv.style.transform = `translate3d(0, ${(progress * base.liftPx).toFixed(2)}px, 0)`;
  };

  const request = () => {
    if (!raf) raf = requestAnimationFrame(render);
  };

  const io = new IntersectionObserver(([entry]) => {
    active = Boolean(entry?.isIntersecting);
    if (active) request();
  }, { rootMargin: '20% 0px' });

  io.observe(root);
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });

  return () => {
    io.disconnect();
    removeEventListener('scroll', request);
    removeEventListener('resize', request);
    if (raf) cancelAnimationFrame(raf);
  };
}
