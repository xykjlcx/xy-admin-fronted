import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'scrollTo', {
  value: () => undefined,
  writable: true,
});

const domMethodMocks: Record<string, (...args: unknown[]) => unknown> = {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
};

for (const [key, value] of Object.entries(domMethodMocks)) {
  if (!(key in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, key, {
      value,
      writable: true,
    });
  }
}
