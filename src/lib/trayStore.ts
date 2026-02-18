/**
 * Tray coordinator: ensures only one tray (Cart, Filter, Mobile Menu) is open at a time.
 * Each tray registers its close callback; opening any tray closes all others.
 */

const closeHandlers = new Map<string, () => void>();

export function registerTray(id: string, close: () => void): void {
  closeHandlers.set(id, close);
}

export function closeAllExcept(exceptId: string | null): void {
  for (const [id, close] of closeHandlers) {
    if (id !== exceptId) close();
  }
}
