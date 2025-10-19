import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const TOKEN = "8253735174:AAFvgYV9pjbO4JBvH1hLA-vBkjutcpTDIdk";
const API_URL = `https://api.telegram.org/bot${TOKEN}`;

app.post("/", async (req, res) => {
  try {
    const update = req.body;
    if (!update.message) return res.sendStatus(200);

    const chatId = update.message.chat.id;
    const text = (update.message.text || "").toLowerCase().trim();

    if (text.includes("hola") || text.startsWith("/start")) {
      await sendMessage(chatId,
        "👋 ¡Hola! Soy *Mr. Robertson*, tu asistente personal.\n\nComandos disponibles:\n• `eventos` → ver próximos recordatorios\n• `crear [nombre] [dd/mm hh:mm]`\n• `eliminar [nombre]`"
      );
    } else if (text.includes("evento")) {
      await sendMessage(chatId, "📅 No tienes eventos (modo demo).");
    } else {
      await sendMessage(chatId, "🤔 No entendí. Escribe `hola` o `eventos`.");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error en webhook:", err.message);
    res.sendStatus(200);
  }
});

async function sendMessage(chatId, text) {
  await axios.post(`${API_URL}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown"
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Mr. Robertson activo en puerto ${PORT}`));
