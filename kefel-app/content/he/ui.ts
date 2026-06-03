/**
 * Hebrew UI strings — the structured localization layer.
 *
 * Keys are namespaced by area. Tone: warm, clear, encouraging, short, and
 * never babyish. Numbers are interpolated via {var} and isolated by the i18n
 * resolver so mixed-direction text renders correctly. No niqqud.
 */
export const he: Record<string, string> = {
  // --- App-wide ---
  'app.name': 'כפל קסם',
  'common.next': 'הבא',
  'common.continue': 'ממשיכים',
  'common.start': 'מתחילים',
  'common.back': 'חזרה',
  'common.done': 'סיימתי',
  'common.skip': 'דלגו',
  'common.yes': 'כן',
  'common.no': 'לא',
  'common.close': 'סגירה',
  'common.replayAudio': 'השמיעו שוב',
  'common.stars': 'כוכבים',

  // --- Onboarding (parent) ---
  'onb.gate.title': 'אזור הורים',
  'onb.gate.subtitle': 'כדי להמשיך, פתרו את התרגיל',
  'onb.gate.error': 'כמעט! נסו שוב',
  'onb.consent.title': 'פרטיות קודם כול',
  'onb.consent.body':
    'כפל קסם עובד על המכשיר בלבד. לא נדרשת הרשמה, לא נאסף מידע אישי, ואין פרסומות. אתם שולטים בכול.',
  'onb.consent.localOnly': 'מצב מקומי בלבד מופעל',
  'onb.consent.accept': 'הבנתי, אפשר להתחיל',
  'onb.consent.readPrivacy': 'קראו את מדיניות הפרטיות',

  // --- Onboarding (child) ---
  'onb.nick.title': 'איך נקרא לך?',
  'onb.nick.hint': 'בחרו כינוי כיף, בלי שם אמיתי',
  'onb.nick.placeholder': 'הכינוי שלי',
  'onb.avatar.title': 'בחרו דמות',
  'onb.baseline.title': 'בואו נכיר אותך',
  'onb.baseline.subtitle': 'כמה שאלות קצרות, בלי לחץ',
  'onb.tutorial.title': 'ככה משחקים',
  'onb.tutorial.win': 'כל הכבוד! הצלחת!',
  'onb.done.title': 'מוכנים להתחיל!',

  // --- Child home / map ---
  'home.greeting': 'היי {nick}!',
  'home.todayGoal': 'המטרה היום: {count} פעילויות',
  'home.startSession': 'בואו נשחק',
  'home.continueSession': 'ממשיכים מאיפה שעצרנו',
  'home.review.due': 'יש {count} תרגילים לחזרה',
  'home.allCaughtUp': 'סיימת הכול להיום, מהמם!',
  'home.streak': 'רצף השבוע: {count} ימים',
  'home.parentArea': 'אזור הורים',

  // --- Lesson / activity ---
  'lesson.prompt.product': 'כמה זה {expr}?',
  'lesson.prompt.choose': 'בחרו את התשובה',
  'lesson.prompt.missing': 'איזה מספר חסר?',
  'lesson.hint.button': 'רמז',
  'lesson.hint.title': 'בואו נחשוב יחד',
  'lesson.progress': 'שאלה {current} מתוך {total}',

  // --- Feedback ---
  'fb.correct.generic': 'יפה מאוד!',
  'fb.wrong.generic': 'לא נורא, ננסה שוב',
  'fb.tryAgain': 'נסו עוד פעם',
  'fb.showMe': 'הראו לי',

  // --- Celebration / rewards ---
  'reward.starsEarned': 'הרווחת {count} כוכבים!',
  'reward.badgeEarned': 'תג חדש: {badge}',
  'reward.sessionDone': 'סיימת את המשחק להיום!',
  'reward.keepGoing': 'נתראה מחר',
  'reward.shop.title': 'חנות הקסמים',
  'reward.shop.unlock': 'פתחו ב-{cost} כוכבים',
  'reward.shop.owned': 'יש לך כבר',
  'reward.shop.equip': 'הלבישו',

  // --- Games ---
  'game.garden.title': 'גינת המערכים',
  'game.garden.instruction': 'בנו מערך שמתאים ל-{expr}',
  'game.train.title': 'רכבת הכפל',
  'game.train.instruction': 'חברו כל תרגיל לקרון הנכון',
  'game.balloons.title': 'פיצוץ בלונים',
  'game.balloons.instruction': 'פוצצו רק בלונים עם התשובה ל-{expr}',
  'game.lab.title': 'מעבדת הקסמים',
  'game.lab.instruction': 'פרקו את התרגיל לחלקים קלים',

  // --- Parent gate / dashboard ---
  'parent.gate.prompt': 'כמה זה {expr}?',
  'parent.dash.title': 'מעקב התקדמות',
  'parent.dash.mastered': 'עובדות שנשלטו',
  'parent.dash.fragile': 'עובדות לחיזוק',
  'parent.dash.dueToday': 'לחזרה היום',
  'parent.dash.retention': 'שימור ידע',
  'parent.dash.hintDependence': 'תלות ברמזים',
  'parent.dash.timeSpent': 'זמן למידה',
  'parent.dash.transfer': 'יישום והעברה',
  'parent.dash.heatmap': 'מפת שליטה',
  'parent.dash.recommend': 'ההמלצה שלנו',
  'parent.dash.export': 'ייצוא נתונים',
  'parent.dash.retention7': 'שימור ל-7 ימים',
  'parent.dash.retention30': 'שימור ל-30 יום',

  // --- Settings / privacy ---
  'settings.title': 'הגדרות ופרטיות',
  'settings.localOnly': 'מצב מקומי בלבד',
  'settings.localOnly.desc': 'כל המידע נשמר רק במכשיר',
  'settings.sync': 'גיבוי בענן',
  'settings.sync.desc': 'דורש כניסת הורה בקישור למייל',
  'settings.analytics': 'שיתוף נתוני שימוש אנונימיים',
  'settings.analytics.desc': 'עוזר לנו לשפר. כבוי כברירת מחדל',
  'settings.audio': 'הקראת הוראות',
  'settings.reducedMotion': 'הפחתת אנימציות',
  'settings.deleteData': 'מחיקת נתוני הילד/ה',
  'settings.deleteData.confirm': 'למחוק את כל ההתקדמות? אי אפשר לבטל',
  'settings.resetProgress': 'איפוס התקדמות',
  'settings.privacyPolicy': 'מדיניות פרטיות',

  // --- Badges (learning outcomes) ---
  'badge.master_x5': 'אלוף הכפולות של 5',
  'badge.master_x10': 'אלוף הכפולות של 10',
  'badge.array_expert': 'מומחה מערכים',
  'badge.commutative_hero': 'גיבור הקומוטטיביות',
  'badge.doubling_star': 'כוכב ההכפלה',
  'badge.transfer_champ': 'אלוף היישום',

  // --- Validation ---
  'valid.nick.required': 'צריך לבחור כינוי',
  'valid.nick.tooLong': 'הכינוי ארוך מדי',
  'valid.number.required': 'הקלידו מספר',

  // --- A11y labels ---
  'a11y.starCount': '{count} כוכבים',
  'a11y.hintButton': 'בקשת רמז',
  'a11y.answerOption': 'תשובה: {value}',
  'a11y.arrayCell': 'תא במערך',
  'a11y.replayAudio': 'השמעת ההוראה שוב',
};
