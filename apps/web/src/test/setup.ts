import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

/**
 * Stand-in for `Element.hasPointerCapture`, which jsdom lacks.
 * @returns Always `false`: nothing is ever captured in tests.
 */
function hasNoPointerCapture(): boolean {
  return false;
}

/** Stand-in for browser methods jsdom lacks; does nothing. */
function doNothing(): void {}

/** Radix Select needs pointer capture, `scrollIntoView` and `ResizeObserver`, which jsdom lacks. */
Element.prototype.hasPointerCapture ??= hasNoPointerCapture;
Element.prototype.releasePointerCapture ??= doNothing;
Element.prototype.scrollIntoView ??= doNothing;
globalThis.ResizeObserver ??= class {
  observe = doNothing;
  unobserve = doNothing;
  disconnect = doNothing;
};
