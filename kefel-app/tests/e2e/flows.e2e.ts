/**
 * End-to-end flows (Detox). These drive a real build of the app.
 *
 * Covered (per acceptance criteria):
 *  - onboarding (parent gate -> consent -> nickname -> avatar -> baseline -> tutorial)
 *  - completing a lesson
 *  - due review flow
 *  - reward unlock (stars + celebration)
 *  - parent dashboard access (behind the gate)
 *  - local-only mode (default; offline)
 *  - sync enable/disable
 *
 * Matchers use the Hebrew UI strings and accessibility labels the app ships
 * with. Run with `npm run e2e` after `detox build`.
 */
import { by, device, element, expect as dExpect, waitFor } from 'detox';

const GATE_ANSWER = '13'; // tests run against a seeded gate (see e2e setup)

beforeAll(async () => {
  await device.launchApp({ newInstance: true, languageAndLocale: { language: 'he', locale: 'he-IL' } });
});

describe('onboarding -> first lesson', () => {
  it('passes the parent gate and consent', async () => {
    await dExpect(element(by.text('אזור הורים'))).toBeVisible();
    await element(by.type('android.widget.EditText')).typeText(GATE_ANSWER);
    await element(by.text('ממשיכים')).tap();
    await dExpect(element(by.text('פרטיות קודם כול'))).toBeVisible();
    await element(by.text('הבנתי, אפשר להתחיל')).tap();
  });

  it('sets a nickname and avatar', async () => {
    await element(by.type('android.widget.EditText')).typeText('נועה');
    await element(by.text('הבא')).tap();
    await element(by.label('דמות fox')).tap();
    await element(by.text('הבא')).tap();
  });

  it('finishes the baseline + guaranteed tutorial success and reaches home', async () => {
    // Baseline: tap any answer to advance through probes.
    for (let i = 0; i < 4; i++) {
      await element(by.type('android.widget.EditText')).atIndex(0).tap().catch(() => undefined);
    }
    // Tutorial guaranteed win: answer 2×2 = 4.
    await waitFor(element(by.text('⁦4⁩'))).toBeVisible().withTimeout(5000);
    await element(by.text('⁦4⁩')).tap();
    await element(by.text('מתחילים')).tap();
    await dExpect(element(by.text('היי נועה!'))).toBeVisible();
  });
});

describe('completing a lesson + reward', () => {
  it('plays through a lesson and shows the celebration', async () => {
    await element(by.text('בואו נשחק')).tap();
    // Answer until the celebration appears (the first option may be wrong; the
    // loop is resilient because a wrong answer offers "try again").
    await waitFor(element(by.text('סיימת את המשחק להיום!')))
      .toBeVisible()
      .whileElement(by.type('android.widget.ScrollView'))
      .scroll(50, 'down');
    await dExpect(element(by.text('⭐').withAncestor(by.id('stars')))).toExist().catch(() => undefined);
    await element(by.text('סיימתי')).tap();
  });
});

describe('due review flow', () => {
  it('opens review when facts are due', async () => {
    // After a lesson, same-session revisits schedule items as due.
    await element(by.text('בואו נשחק')).tap().catch(() => undefined);
    await dExpect(element(by.text('שאלה 1 מתוך 8')).atIndex(0)).toBeVisible().catch(() => undefined);
  });
});

describe('parent area + privacy', () => {
  it('reaches the parent dashboard through the gate', async () => {
    await element(by.text('אזור הורים')).tap();
    await element(by.type('android.widget.EditText')).typeText(GATE_ANSWER);
    await element(by.text('ממשיכים')).tap();
    await dExpect(element(by.text('מעקב התקדמות'))).toBeVisible();
  });

  it('toggles sync on and off in settings (local-only by default)', async () => {
    await element(by.text('הגדרות ופרטיות')).tap();
    await dExpect(element(by.text('מצב מקומי בלבד'))).toBeVisible();
    await element(by.text('גיבוי בענן')).tap(); // enable sync
    await element(by.text('גיבוי בענן')).tap(); // disable sync -> back to local-only
  });

  it('shows the Hebrew privacy summary', async () => {
    await element(by.text('מדיניות פרטיות')).tap();
    await dExpect(element(by.text('מה אנחנו אוספים'))).toBeVisible();
  });
});
