import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const TOKEN = "8253735174:AAFvgYV9pjbO4JBvH1hLA-vBkjutcpTDIdk";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// 📬 Ruta principal solo para comprobar que el servidor corre
app.get("/", (req, res) => {
  res.send("✅ Mr. Robertson Bot está activo y escuchando el webhook.");
});

// 📩 Webhook principal (donde Telegram envía los mensajes)
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const text = message.text.toLowerCase().trim();

    // --- RESPUESTAS BÁSICAS ---
    if (text.includes("hola")) {
      await enviarMensaje(
        chatId,
        "👋 ¡Hola! Soy *Mr. Robertson*, tu asistente personal.\n\n" +
        "Comandos disponibles:\n" +
        "• *eventos* → ver próximos recordatorios\n" +
        "• *crear [nombre] [dd/mm hh:mm]* → crear nuevo evento\n" +
        "• *eliminar [nombre]* → borrar un evento"
      );
    }

    else if (text === "eventos") {
      await enviarMensaje(chatId, "📅 Aún no hay eventos registrados (pronto se sincronizarán desde la nube).");
    }

    // --- CREAR EVENTO DE FORMA FLEXIBLE ---
    else if (text.startsWith("crear")) {
      const match = text.match(/crear\s+(.+)\s+(\d{1,2}\/\d{1,2})\s+(\d{1,2}[:.]\d{2})/);
      if (match) {
        const [, nombre, fecha, hora] = match;
        await enviarMensaje(chatId, `✅ Evento creado:\n📌 *${nombre}*\n🗓️ ${fecha} a las ${hora}`);
      } else {
        await enviarMensaje(chatId, "🕓 Formato inválido. Usa por ejemplo:\n_crear reunión 21/10 19:00_");
      }
    }

    // --- RESPUESTA GENÉRICA SI NO ENTIENDE ---
    else {
      await enviarMensaje(chatId, "🤔 No entendí. Escribe *hola* o *eventos* para comenzar.");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error en /webhook:", err);
    res.sendStatus(500);
  }
});

// 📤 Función para enviar mensajes al chat
async function enviarMensaje(chatId, texto) {
  const url = `${TELEGRAM_API}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "Markdown" }),
  });
}

// 🚀 Iniciar servidor local (Render usa PORT automáticamente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mr. Robertson Bot escuchando en puerto ${PORT}`));
