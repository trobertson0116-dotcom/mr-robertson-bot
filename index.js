import express from "express";
import axios from "axios";
import chrono from "chrono-node"; // para entender fechas naturales en español

const app = express();
app.use(express.json());

const TOKEN = "8253735174:AAFvgYV9pjbO4JBvH1hLA-vBkjutcpTDIdk";
const API_URL = `https://api.telegram.org/bot${TOKEN}`;
let eventos = [];

// === FUNCIÓN PRINCIPAL ===
app.post("/", async (req, res) => {
  try {
    const update = req.body;
    if (!update.message) return res.sendStatus(200);

    const chatId = update.message.chat.id;
    const text = (update.message.text || "").toLowerCase().trim();

    // === SALUDO ===
    if (text.includes("hola") || text.startsWith("/start")) {
      await sendMessage(
        chatId,
        "👋 ¡Hola! Soy *Mr. Robertson*, tu asistente personal.\n\nComandos:\n• `eventos` → ver tus recordatorios\n• `crear` o `agendar` seguido de la info del evento\n• `eliminar [nombre]`"
      );
    }

    // === VER EVENTOS ===
    else if (text.includes("evento") || text === "eventos") {
      if (eventos.length === 0) {
        await sendMessage(chatId, "📅 No tienes eventos guardados.");
      } else {
        const lista = eventos
          .map(
            (e, i) => `${i + 1}. ${e.nombre} → ${e.fecha.toLocaleString("es-CL")}`
          )
          .join("\n");
        await sendMessage(chatId, `📆 *Tus eventos:*\n${lista}`);
      }
    }

    // === CREAR EVENTO (interpretando lenguaje natural) ===
    else if (
      text.startsWith("crear") ||
      text.startsWith("agendar") ||
      text.startsWith("añadir") ||
      text.startsWith("poner") ||
      text.startsWith("recordar")
    ) {
      const frase = text
        .replace(/crear|agendar|añadir|poner|recordar|evento|recordatorio/gi, "")
        .trim();

      const fecha = chrono.es.parseDate(frase);
      if (!fecha) {
        await sendMessage(
          chatId,
          "⏰ No entendí la fecha/hora. Prueba con:\n`crear reunión lunes 21 a las 19`\n`agendar Manu 25 octubre 10am`"
        );
        return;
      }

      // Extraer nombre quitando las partes de fecha
      const nombre = frase
        .replace(
          /\b(\d{1,2}|\d{1,2}:\d{2}|[a-záéíóú]+|\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b|hrs?|a las|mañana|tarde|noche)\b/gi,
          ""
        )
        .replace(/\s+/g, " ")
        .trim();

      const evento = {
        nombre: nombre || "Evento sin nombre",
        fecha,
      };
      eventos.push(evento);

      await sendMessage(
        chatId,
        `✅ *${evento.nombre}* agendado para ${fecha.toLocaleString("es-CL")}.`
      );
    }

    // === ELIMINAR EVENTO ===
    else if (text.startsWith("eliminar") || text.startsWith("borrar")) {
      const nombre = text.replace(/eliminar|borrar/gi, "").trim();
      const antes = eventos.length;
      eventos = eventos.filter((e) => !e.nombre.includes(nombre));

      if (eventos.length < antes)
        await sendMessage(chatId, `🗑️ Evento "${nombre}" eliminado.`);
      else
        await sendMessage(chatId, `⚠️ No encontré ningún evento llamado "${nombre}".`);
    }

    // === MENSAJE POR DEFECTO ===
    else {
      await sendMessage(chatId, "🤔 No entendí. Escribe `hola` o `eventos`.");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err.message);
    res.sendStatus(200);
  }
});

// === FUNCIÓN DE ENVÍO A TELEGRAM ===
async function sendMessage(chatId, text) {
  await axios.post(`${API_URL}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  });
}

// === SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Mr. Robertson online en puerto ${PORT}`));
