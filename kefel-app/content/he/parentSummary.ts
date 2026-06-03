/**
 * Parent-readable summary language (Hebrew) + the recommendation engine that
 * turns a ParentReportSnapshot into one clear next action. Deterministic, no AI.
 */
import type { ParentReportSnapshot } from '@/data/schemas';
import { ltr } from '@/lib/rtl';

export function masteryHeadline(s: ParentReportSnapshot): string {
  return `${ltr(s.masteredFacts)} מתוך ${ltr(s.totalFacts)} עובדות כפל נשלטו היטב.`;
}

export function retentionSentence(s: ParentReportSnapshot): string {
  const pct = Math.round(s.retention7d * 100);
  return `שימור הידע לאחר שבוע עומד על ${ltr(pct)}%.`;
}

export function hintSentence(s: ParentReportSnapshot): string {
  const pct = Math.round(s.hintDependence * 100);
  if (pct <= 15) return 'הילד/ה פותר/ת בעיקר באופן עצמאי. מצוין!';
  if (pct <= 35) return `שימוש מתון ברמזים (${ltr(pct)}%) — חלק טבעי מהלמידה.`;
  return `יש תלות גבוהה יחסית ברמזים (${ltr(pct)}%). כדאי לתרגל את האסטרטגיות.`;
}

/**
 * Pick the single most useful next action. Order of priority:
 * lapses/fragile > due reviews > introduce new > celebrate consistency.
 */
export function recommendNextAction(s: ParentReportSnapshot): string {
  if (s.fragileFacts >= 3) {
    return `מומלץ להתמקד בחיזוק ${ltr(s.fragileFacts)} עובדות מתערערות לפני הוספת חדשות.`;
  }
  if (s.dueToday >= 5) {
    return `יש ${ltr(s.dueToday)} עובדות לחזרה היום — תרגול קצר ישמר אותן.`;
  }
  if (s.transferAccuracy < 0.5 && s.masteredFacts > 5) {
    return 'כדאי לתרגל בעיות מילוליות כדי לחזק יישום בעולם האמיתי.';
  }
  if (s.streakParticipation < 0.5) {
    return 'תרגול יומי קצר וקבוע יעזור יותר מהכול. ננסה רצף קטן?';
  }
  if (s.masteredFacts >= s.totalFacts - 3) {
    return 'כמעט סיימתם את כל הלוח! נשארו רק כמה עובדות אחרונות.';
  }
  return 'ההתקדמות יציבה ויפה. אפשר להמשיך בקצב הנוכחי.';
}
