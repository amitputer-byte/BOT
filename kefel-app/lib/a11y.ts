import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Subscribe to the OS "reduce motion" setting so we can soften animations. */
export function useReducedMotionPref(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

/** Build a consistent accessibility label for a multiplication fact (Hebrew). */
export function factA11yLabel(a: number, b: number, product?: number): string {
  const base = `${a} כפול ${b}`;
  return product === undefined ? base : `${base} שווה ${product}`;
}
