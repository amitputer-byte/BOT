require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Conversation history per user (phone number → messages array)
const conversations = new Map();

const SYSTEM_PROMPT = `אתה עוזר אישי חכם ומועיל בוואטסאפ.
ענה תמיד בעברית אלא אם המשתמש כותב בשפה אחרת — אז ענה באותה שפה.
היה קצר וישיר בתשובות. אתה יכול לעזור עם:
- מידע כללי ושאלות
- כתיבת טקסטים, מיילים, סיכומים
- חישובים ולוגיקה
- עצות ורעיונות
- תזכורות ורשימות (במסגרת השיחה)`;

const MAX_HISTORY = 20; // מקסימום הודעות בהיסטוריה לכל שיחה

const HELP_TEXT = `*🤖 עוזר אישי - פקודות זמינות:*

!עזרה — הצג הודעה זו
!נקה — נקה היסטוריית השיחה
!סטטוס — בדוק שהבוט פעיל

פשוט כתוב לי כל שאלה או בקשה ואני אעזור 😊`;

const whatsapp = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

whatsapp.on('qr', (qr) => {
  console.log('\nסרוק את קוד ה-QR כדי להתחבר לוואטסאפ:\n');
  qrcode.generate(qr, { small: true });
});

whatsapp.on('authenticated', () => {
  console.log('✅ מחובר בהצלחה לוואטסאפ');
});

whatsapp.on('ready', () => {
  console.log('🚀 הבוט מוכן ופעיל!');
});

whatsapp.on('auth_failure', (msg) => {
  console.error('❌ שגיאת אימות:', msg);
});

whatsapp.on('disconnected', (reason) => {
  console.log('🔌 הבוט התנתק:', reason);
});

whatsapp.on('message', async (message) => {
  // התעלם מהודעות קבוצה, סטטוסים ומהודעות מהבוט עצמו
  if (message.isGroupMsg || message.from === 'status@broadcast' || message.fromMe) return;

  const userId = message.from;
  const text = message.body.trim();

  if (!text) return;

  // פקודות מיוחדות
  if (text === '!עזרה' || text === '!help') {
    await message.reply(HELP_TEXT);
    return;
  }

  if (text === '!נקה' || text === '!clear') {
    conversations.delete(userId);
    await message.reply('🗑️ היסטוריית השיחה נוקתה.');
    return;
  }

  if (text === '!סטטוס' || text === '!status') {
    await message.reply('✅ הבוט פעיל ומוכן לשירותך!');
    return;
  }

  // הכנת היסטוריית שיחה
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  const history = conversations.get(userId);
  history.push({ role: 'user', content: text });

  // שמור על מגבלת ההיסטוריה
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    const reply = response.content[0].text;
    history.push({ role: 'assistant', content: reply });

    await message.reply(reply);
  } catch (error) {
    console.error('שגיאה בקריאה ל-Claude:', error.message);
    await message.reply('❌ אירעה שגיאה. אנא נסה שוב.');
  }
});

whatsapp.initialize();
