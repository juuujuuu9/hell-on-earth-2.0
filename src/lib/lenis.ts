/**
 * Lenis smooth scroll - init on Layout, stop/start when trays open/close.
 */
import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export function initLenis(): Lenis {
  if (lenisInstance) return lenisInstance;
  lenisInstance = new Lenis({
    autoRaf: true,
    anchors: true,
  });
  return lenisInstance;
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function stopLenis(): void {
  lenisInstance?.stop();
}

export function startLenis(): void {
  lenisInstance?.start();
}
