import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { google } from "googleapis";
import fs from "fs";
import chrono from "chrono-node";

// === CONFIG ===
const TOKEN = "TU_TOKEN_TELEGRAM_AQUI"; // ⚠️ reemplaza con tu token
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const PORT = process.env.PORT || 3000;

// === GOOGLE AUTH ===
const credentials = JSON.parse(fs.readFileSync("credentials.json"));
const { client_secret, client_id, redirect_uris } = credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

let tokens = null;
try {
  tokens = JSON.parse(fs.readFileSync("token.json"));
  oAuth2Client.setCredentials(tokens);
} catch {
  console.log("No se encontró token.json. Ve a /auth para autorizar.");
}

const app = express();
app.use(bodyParser.json());

app.get("/auth", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });
  res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync("token.json", JSON.stringify(tokens));
  res.send("✅ Autenticación completada. Ya puedes usar el bot en Telegram.");
});

// === CALENDAR ===
const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

async function listarEventos() {
  const res = await calendar.events.list({
    calendarId: "primary",
    maxResults: 5,
    singleEvents: true,
    orderBy: "startTime",
  });
  if (!res.data.items.length) return "📭 No tienes eventos próximos.";
  return res.data.items
    .map(e => {
      const fecha = e.start.dateTime || e.start.date;
      return `📅 ${e.summary} — ${new Date(fecha).toLocaleString("es-CL")}`;
    })
    .join("\n");
}

async function crearEvento(texto) {
  const fecha = chrono.parseDate(texto, new Date(), { forwardDate: true });
  if (!fecha) return "❌ No entendí la fecha u hora del evento.";

  const titulo = texto
    .replace(/crear|agrega|añade|reunión|recordatorio|evento|mañana|hoy|pasado mañana|a las|el|próximo/gi, "")
    .trim();

  if (!titulo) return "Por favor indica el nombre del evento.";

  const event = {
    summary: titulo,
    start: { dateTime: fecha.toISOString() },
    end: { dateTime: new Date(fecha.getTime() + 60 * 60 * 1000).toISOString() },
  };

  await calendar.events.insert({ calendarId: "primary", resource: event });
  return `✅ Evento creado: ${titulo} (${fecha.toLocaleString("es-CL")})`;
}

async function eliminarEvento(texto) {
  const res = await calendar.events.list({ calendarId: "primary" });
  const eventos = res.data.items;
  const palabraClave = texto
    .replace(/eliminar|borra|quita|evento|reunión/gi, "")
    .trim()
    .toLowerCase();

  const encontrado = eventos.find(e =>
    e.summary.toLowerCase().includes(palabraClave)
  );
  if (!encontrado) return "❌ No encontré ese evento.";

  await calendar.events.delete({
    calendarId: "primary",
    eventId: encontrado.id,
  });
  return `🗑️ Evento eliminado: ${encontrado.summary}`;
}

// === TELEGRAM WEBHOOK ===
app.post(`/webhook`, async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text.toLowerCase();

  let reply = "🤖 No entendí. Puedes decir: 'crear reunión mañana 19 hrs' o 'eventos'.";

  if (text.includes("hola")) {
    reply = "👋 ¡Hola! Soy Mr. Robertson.\nPuedo crear, listar o eliminar eventos.\nEjemplo: 'crear reunión con Diego mañana 18 hrs'.";
  } else if (text.includes("eventos") || text.includes("agenda") || text.includes("calendario")) {
    reply = await listarEventos();
  } else if (text.match(/crear|agrega|añade|recordatorio|reunión/)) {
    reply = await crearEvento(text);
  } else if (text.match(/eliminar|borra|quita/)) {
    reply = await eliminarEvento(text);
  }

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: reply }),
  });

  res.sendStatus(200);
});

// === SERVIDOR ===
app.listen(PORT, () => console.log(`🚀 Bot activo en puerto ${PORT}`));
