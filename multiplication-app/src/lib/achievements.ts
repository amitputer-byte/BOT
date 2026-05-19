import type { Progress } from '../types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (progress: Progress) => boolean;
}

function tableAccuracy(progress: Progress, table: number, minAttempts = 5): boolean {
  const t = progress.byTable[table];
  if (!t || t.attempted < minAttempts) return false;
  return t.correct / t.attempted >= 0.9;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-answer',
    title: 'הצעד הראשון',
    description: 'ענית על השאלה הראשונה שלך!',
    icon: '🌟',
    condition: (p) => p.totalAttempted >= 1,
  },
  {
    id: 'streak-5',
    title: 'רצף של 5',
    description: 'ענית נכון על 5 שאלות ברצף!',
    icon: '🔥',
    condition: (p) => Object.values(p.byTable).some((t) => t.bestStreak >= 5),
  },
  {
    id: 'streak-10',
    title: 'מכונת כפל!',
    description: 'ענית נכון על 10 שאלות ברצף!',
    icon: '💥',
    condition: (p) => Object.values(p.byTable).some((t) => t.bestStreak >= 10),
  },
  {
    id: 'streak-20',
    title: 'אלוף הרצפים!',
    description: 'ענית נכון על 20 שאלות ברצף!',
    icon: '⚡',
    condition: (p) => Object.values(p.byTable).some((t) => t.bestStreak >= 20),
  },
  {
    id: 'master-table-2',
    title: 'אלוף לוח 2',
    description: 'שלטת בלוח הכפל של 2!',
    icon: '2️⃣',
    condition: (p) => tableAccuracy(p, 2),
  },
  {
    id: 'master-table-3',
    title: 'אלוף לוח 3',
    description: 'שלטת בלוח הכפל של 3!',
    icon: '3️⃣',
    condition: (p) => tableAccuracy(p, 3),
  },
  {
    id: 'master-table-4',
    title: 'אלוף לוח 4',
    description: 'שלטת בלוח הכפל של 4!',
    icon: '4️⃣',
    condition: (p) => tableAccuracy(p, 4),
  },
  {
    id: 'master-table-5',
    title: 'אלוף לוח 5',
    description: 'שלטת בלוח הכפל של 5!',
    icon: '5️⃣',
    condition: (p) => tableAccuracy(p, 5),
  },
  {
    id: 'master-table-6',
    title: 'אלוף לוח 6',
    description: 'שלטת בלוח הכפל של 6!',
    icon: '6️⃣',
    condition: (p) => tableAccuracy(p, 6),
  },
  {
    id: 'master-table-7',
    title: 'אלוף לוח 7',
    description: 'שלטת בלוח הכפל של 7!',
    icon: '7️⃣',
    condition: (p) => tableAccuracy(p, 7),
  },
  {
    id: 'master-table-8',
    title: 'אלוף לוח 8',
    description: 'שלטת בלוח הכפל של 8!',
    icon: '8️⃣',
    condition: (p) => tableAccuracy(p, 8),
  },
  {
    id: 'master-table-9',
    title: 'אלוף לוח 9',
    description: 'שלטת בלוח הכפל של 9!',
    icon: '9️⃣',
    condition: (p) => tableAccuracy(p, 9),
  },
  {
    id: 'master-table-10',
    title: 'אלוף לוח 10',
    description: 'שלטת בלוח הכפל של 10!',
    icon: '🔟',
    condition: (p) => tableAccuracy(p, 10),
  },
  {
    id: 'lightning-speed',
    title: 'ברק!',
    description: 'ענית על 5 שאלות בפחות מ-3 שניות כל אחת!',
    icon: '⚡',
    condition: (p) => p.totalCorrect >= 5 && p.totalAttempted > 0,
  },
  {
    id: 'dedicated',
    title: 'מסור לכפל',
    description: 'שיחקת 7 ימים ברצף!',
    icon: '📅',
    condition: (p) => p.dailyStreak >= 7,
  },
  {
    id: 'perfect-20',
    title: 'מושלם!',
    description: 'ענית נכון על 20 שאלות ברצף ללא שגיאות!',
    icon: '💎',
    condition: (p) => Object.values(p.byTable).some((t) => t.bestStreak >= 20),
  },
  {
    id: 'explorer',
    title: 'חוקר',
    description: 'תרגלת 5 לוחות כפל שונים!',
    icon: '🗺️',
    condition: (p) => Object.keys(p.byTable).filter((k) => (p.byTable[Number(k)]?.attempted ?? 0) >= 3).length >= 5,
  },
  {
    id: 'champion',
    title: 'אלוף הכפל',
    description: 'שלטת בכל לוחות הכפל מ-2 עד 10!',
    icon: '👑',
    condition: (p) => [2, 3, 4, 5, 6, 7, 8, 9, 10].every((t) => tableAccuracy(p, t)),
  },
  {
    id: 'quick-learner',
    title: 'לומד מהיר',
    description: 'הצלחת 80% מהשאלות ב-20 הניסיונות הראשונים!',
    icon: '🚀',
    condition: (p) => p.totalAttempted >= 20 && p.totalCorrect / p.totalAttempted >= 0.8,
  },
  {
    id: 'century',
    title: 'מאה נכונות!',
    description: 'ענית נכון על 100 שאלות!',
    icon: '💯',
    condition: (p) => p.totalCorrect >= 100,
  },
  {
    id: 'two-hundred',
    title: 'אחד-שתיים-מאתיים!',
    description: 'ענית נכון על 200 שאלות!',
    icon: '🎯',
    condition: (p) => p.totalCorrect >= 200,
  },
  {
    id: 'five-hundred',
    title: 'גיבור הכפל',
    description: 'ענית נכון על 500 שאלות!',
    icon: '🦸',
    condition: (p) => p.totalCorrect >= 500,
  },
  {
    id: 'adventure-start',
    title: 'הרפתקן',
    description: 'התחלת את מסע ההרפתקה!',
    icon: '🗡️',
    condition: (p) => p.adventureProgress.currentLevel >= 1,
  },
  {
    id: 'adventure-level-5',
    title: 'לוחם אמיץ',
    description: 'הגעת לרמה 5 בהרפתקה!',
    icon: '⚔️',
    condition: (p) => p.adventureProgress.currentLevel >= 5,
  },
  {
    id: 'adventure-level-10',
    title: 'גיבור מתמטיקה',
    description: 'הגעת לרמה 10 בהרפתקה!',
    icon: '🏆',
    condition: (p) => p.adventureProgress.currentLevel >= 10,
  },
  {
    id: 'three-stars',
    title: 'שלושה כוכבים',
    description: 'קיבלת 3 כוכבים ברמה אחת בהרפתקה!',
    icon: '⭐',
    condition: (p) => Object.values(p.adventureProgress.stars).some((s) => s === 3),
  },
  {
    id: 'all-three-stars',
    title: 'מושלם לחלוטין!',
    description: 'קיבלת 3 כוכבים בכל הרמות!',
    icon: '🌠',
    condition: (p) =>
      Object.keys(p.adventureProgress.stars).length >= 10 &&
      Object.values(p.adventureProgress.stars).every((s) => s === 3),
  },
  {
    id: 'ten-attempts',
    title: 'מנסה ומנסה',
    description: 'ניסית 10 שאלות!',
    icon: '💪',
    condition: (p) => p.totalAttempted >= 10,
  },
  {
    id: 'fifty-correct',
    title: 'חמישים נכונות!',
    description: 'ענית נכון על 50 שאלות!',
    icon: '🎉',
    condition: (p) => p.totalCorrect >= 50,
  },
  {
    id: 'streak-3',
    title: 'רצף של 3',
    description: 'ענית נכון על 3 שאלות ברצף!',
    icon: '✨',
    condition: (p) => Object.values(p.byTable).some((t) => t.bestStreak >= 3),
  },
];

export function checkAchievements(progress: Progress): string[] {
  return ACHIEVEMENTS.filter(
    (a) => !progress.achievements.includes(a.id) && a.condition(progress)
  ).map((a) => a.id);
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
