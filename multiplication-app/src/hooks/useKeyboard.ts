import { useEffect } from 'react';

/**
 * Attaches keydown listeners and calls the matching handler.
 * Only active when `active` is true (pass false to disable during modals etc.)
 */
export function useKeyboard(
  handlers: Record<string, () => void>,
  active = true,
): void {
  useEffect(() => {
    if (!active) return;

    const handleKey = (e: KeyboardEvent) => {
      const handler = handlers[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlers, active]);
}
