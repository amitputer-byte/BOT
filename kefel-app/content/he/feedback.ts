/**
 * Feedback content banks (Hebrew) with variations so repeated play feels fresh.
 * Tone: warm, specific, short. Error feedback never shames; it reframes the
 * mistake as a normal step and points to the next move.
 */

/** Shown on a correct answer. */
export const SUCCESS_LINES: string[] = [
  'יפה מאוד!',
  'בול בול!',
  'אלופה!',
  'מדויק!',
  'איזה כיף, צדקת!',
  'ככה עושים את זה!',
  'מהמם!',
  'הצלחת לבד!',
];

/** Shown on a correct answer that used a hint — celebrates effort, not luck. */
export const SUCCESS_WITH_HINT_LINES: string[] = [
  'עבדת על זה יפה!',
  'הרמז עזר, וזה בדיוק בשביל זה!',
  'כל הכבוד על ההתמדה!',
  'צעד אחרי צעד, הגעת!',
];

/** Shown on a wrong answer — supportive, growth-oriented. */
export const ERROR_LINES: string[] = [
  'לא נורא, ננסה שוב יחד.',
  'כמעט! בואו נחשוב רגע.',
  'טעויות עוזרות ללמוד. ננסה שוב.',
  'אין בעיה, יש לנו עוד ניסיון.',
  'בואו ננשום ונסתכל שוב.',
];

/** Shown when stepping down to a visual scaffold after repeated errors. */
export const SCAFFOLD_LINES: string[] = [
  'בואו נראה את זה בתמונה.',
  'נשתמש בעזרה ויזואלית.',
  'ננסה דרך אחרת, עם ציור.',
];

/** Encouragement between activities. */
export const ENCOURAGE_LINES: string[] = [
  'את ממש מתקדמת!',
  'עוד קצת ואת אלופה!',
  'המוח שלך מתחזק!',
  'ממשיכים בכיף!',
];
