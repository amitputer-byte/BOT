/**
 * Tutorial + onboarding narrative lines (Hebrew), concept-first.
 * The tutorial guarantees one early success (see onboarding flow).
 */
import { ltr } from '@/lib/rtl';

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  /** Optional concrete demo fact to render alongside the text. */
  demo?: { a: number; b: number };
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'concept_groups',
    title: 'כפל זה קבוצות שוות',
    body: `כשיש כמה קבוצות עם אותו מספר, אפשר לכפול במקום לספור הכול.`,
    demo: { a: 3, b: 2 },
  },
  {
    id: 'concept_array',
    title: 'מערך זה לוח מסודר',
    body: `שורות ועמודות עוזרות לראות את הכפל. ${ltr('2 × 3')} זה לוח של שתי שורות ושלוש משבצות בכל אחת.`,
    demo: { a: 2, b: 3 },
  },
  {
    id: 'first_win',
    title: 'תורכם!',
    body: `נסו את זה: ${ltr('2 × 2')}. אתם יכולים!`,
    demo: { a: 2, b: 2 },
  },
];

/** A single line celebrating the guaranteed first success. */
export const FIRST_WIN_LINE = 'מעולה! הבנת איך זה עובד. בואו נתחיל לשחק!';
