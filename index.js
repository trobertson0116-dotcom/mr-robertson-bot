// mr-robertson-bot / index.js
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import chrono from 'chrono-node';

dotenv.config();

// Variables desde .env
const token = process.env.TOKEN;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!token) {
  console.error("❌ Falta el TOKEN del bot. Configura el archivo .env o las variables en Render.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("✅ Mr. Robertson Bot con Google Calendar está activo.");

// --- Configuración de Google Calendar ---
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// --- Funciones ---
async function addEvent(summary, date) {
  const event = {
    summary,
    start: { dateTime: date.toISOString(), timeZone: 'America/Santiago' },
    end: { dateTime: new Date(date.getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'America/Santiago' }
  };
  await calendar.events.insert({ calendarId: 'primary', resource: event });
}

async function deleteEvent(keyword) {
  const res = await calendar.events.list({
    calendarId: 'primary',
    q: keyword,
    maxResults: 5,
    orderBy: 'startTime',
    singleEvents: true
  });
  const events = res.data.items;
  if (!events || events.length === 0) return false;

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: events[0].id
  });
  return true;
}

// --- Mensajes del bot ---
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.toLowerCase() || '';

  try {
    // Añadir evento
    if (text.includes('agrega') || text.includes('añade') || text.includes('programa')) {
      const parsedDate = chrono.parseDate(text, new Date(), { forwardDate: true });
      if (!parsedDate) return bot.sendMessage(chatId, '❌ No pude entender la fecha/hora.');
      const eventTitle = text.replace(/(agrega|añade|programa|evento|reunión|recordatorio)/gi, '').trim();
      await addEvent(eventTitle || 'Evento sin título', parsedDate);
      return bot.sendMessage(chatId, `✅ Evento creado: "${eventTitle}" el ${parsedDate.toLocaleString()}`);
    }

    // Eliminar evento
    if (text.includes('borra') || text.includes('elimina')) {
      const keyword = text.replace(/(borra|elimina)/gi, '').trim();
      const deleted = await deleteEvent(keyword);
      if (deleted) return bot.sendMessage(chatId, `🗑️ Evento "${keyword}" eliminado.`);
      else return bot.sendMessage(chatId, '⚠️ No encontré ningún evento con ese nombre.');
    }

    // Ayuda
    if (text.includes('ayuda')) {
      return bot.sendMessage(chatId,
        "👋 Puedo ayudarte con tu calendario:\n\n" +
        "• Agrega reunión con Ana mañana a las 10\n" +
        "• Borra evento reunión de hoy\n\n" +
        "Habla naturalmente conmigo, no hace falta usar comandos."
      );
    }

    bot.sendMessage(chatId, 'No entendí bien. Prueba con algo como “Agrega reunión mañana a las 10”.');

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, '❌ Ocurrió un error al procesar tu solicitud.');
  }
});
