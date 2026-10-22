// ~/scripts/motion.ts — reveals [data-reveal] elements as they enter the viewport.
// Styling lives in ~/styles/motion.css. Without JS, with reduced motion, or without
// IntersectionObserver, everything is shown immediately.

const MAX_STAGGER_STEPS = 4;

const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (items.length) {
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-revealed'));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        // Stagger elements that arrive in the same batch, top to bottom.
        entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .forEach((entry, i) => {
            const el = entry.target as HTMLElement;
            el.style.setProperty('--reveal-i', String(Math.min(i, MAX_STAGGER_STEPS)));
            el.classList.add('is-revealed');
            observer.unobserve(el);
          });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    items.forEach((el) => observer.observe(el));
  }
}
