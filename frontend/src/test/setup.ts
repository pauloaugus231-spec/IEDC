import '@testing-library/jest-dom/vitest';

// Stub window.matchMedia for jsdom (framer-motion / useReducedMotion)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// Stub ResizeObserver for EChartCanvas and responsive components
class ResizeObserverStub {
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// Stub IntersectionObserver for framer-motion's viewport/whileInView
class IntersectionObserverStub {
  constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) { /* noop */ }
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
  takeRecords(): IntersectionObserverEntry[] { return []; }
  get root() { return null; }
  get rootMargin() { return '0px'; }
  get thresholds() { return [0]; }
}
globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;
