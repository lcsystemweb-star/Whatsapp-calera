/**
 * ============================================================
 *  HOSTAL LA CABAÑA VERDE — Agente WhatsApp con IA
 *  Backend Node.js + WhatsApp Business API (Meta) + Gemini AI
 * ============================================================
 */

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const CONFIG = {
  WA_TOKEN: process.env.WA_TOKEN,
  WA_PHONE_ID: process.env.WA_PHONE_ID,
  WA_VERIFY_TOKEN: process.env.WA_VERIFY_TOKEN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  PORT: process.env.PORT || 3000,
};

// ─── HISTORIAL POR USUARIO ───────────────────────────────────
const conversaciones = new Map();

function getHistorial(telefono) {
  if (!conversaciones.has(telefono)) {
    conversaciones.set(telefono, []);
  }
  return conversaciones.get(telefono);
}

function agregarMensaje(telefono, role, content) {
  const historial = getHistorial(telefono);
  // Gemini usa "user" y "model" (no "assistant")
  historial.push({ role, parts: [{ text: content }] });
  if (historial.length > 30) historial.splice(0, historial.length - 30);
}

// ─── SISTEMA DEL AGENTE ──────────────────────────────────────
const SYSTEM_PROMPT = `Eres "Verde", el asistente virtual del Hostal La Cabaña Verde, un hostal ecológico en Colombia. Eres amable, cálido y usas emojis con moderación. Respondes SOLO en español.

Tu trabajo es ayudar a los huéspedes a reservar una de estas 5 cabañas:
1. Cabaña Belén 🏡 — 2 a 4 personas — $180.000/noche
2. Cabaña Paujil 🦜 — 2 a 6 personas — $210.000/noche
3. Cabaña Albania 🌿 — 4 a 8 personas — $260.000/noche
4. Cabaña Amigos 🎉 — 6 a 10 personas — $320.000/noche
5. Cabaña Mirador 🌄 — 2 a 3 personas — $195.000/noche

Todas las cabañas incluyen: WiFi, agua caliente, parqueadero, cocina equipada y desayuno continental.

FLUJO DE RESERVA:
1. Saluda cordialmente si es el primer mensaje
2. Si mencionan una cabaña, confírmala con sus detalles (capacidad, precio, descripción breve)
3. Si no saben cuál quieren, pregunta cuántas personas son y recomienda la más adecuada
4. Pregunta las fechas: fecha de llegada y fecha de salida (o número de noches)
5. Muestra el resumen completo: Cabaña + Fechas + Noches + Precio total
6. Pide confirmación: "¿Confirmas esta reserva? Responde SÍ para confirmar o NO para modificar algo"
7. Si el usuario confirma, genera un código de reserva aleatorio de 6 caracteres alfanuméricos y da las instrucciones de pago

DETECCIÓN DE CABAÑAS (acepta variaciones):
- "belen", "belén", "la belen", "la belén" → Cabaña Belén
- "paujil", "el paujil", "pajuil" → Cabaña Paujil  
- "albania", "la albania" → Cabaña Albania
- "amigos", "la de amigos", "la amigos" → Cabaña Amigos
- "mirador", "el mirador", "la del mirador" → Cabaña Mirador

INSTRUCCIONES DE PAGO (solo mostrar al confirmar reserva):
- Anticipo del 50% para garantizar la reserva
- Cuenta Bancolombia: 123-456789-00 a nombre de Hostal La Cabaña Verde
- Nequi: 310 000 0000
- Enviar comprobante a este mismo chat

REGLAS IMPORTANTES:
- Sé conciso, WhatsApp no es para textos largos
- Si preguntan disponibilidad, siempre hay disponibilidad (sistema demo)
- No inventes información que no esté en este prompt
- Al confirmar reserva incluye exactamente el texto: RESERVA_CONFIRMADA:[código de 6 caracteres]
- Si el usuario escribe solo números (posible comprobante de pago), agradece y di que se verificará en 24 horas`;

// ─── GENERAR RESPUESTA CON GEMINI ────────────────────────────
async function generarRespuesta(telefono, mensajeUsuario) {
  try {
    agregarMensaje(telefono, "user", mensajeUsuario);
    const historial = getHistorial(telefono);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: historial,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    };

    const response = await axios.post(url, body, { timeout: 8000 });

    const texto =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Lo siento, tuve un problema generando la respuesta 😔";

    agregarMensaje(telefono, "model", texto);

    const match = texto.match(/RESERVA_CONFIRMADA:([A-Z0-9]{6})/);
    if (match) {
      return texto.replace(
        `RESERVA_CONFIRMADA:${match[1]}`,
        `*Código de reserva: ${match[1]}*`
      );
    }

    return texto;
  } catch (error) {
    console.error("❌ Error Gemini:", error.response?.data || error.message);
    return "Lo siento, estoy teniendo problemas técnicos. Intenta nuevamente en unos minutos 🙏";
  }
}

// ─── ENVIAR MENSAJE POR WHATSAPP ─────────────────────────────
async function enviarMensaje(telefono, texto) {
  try {
    const url = `https://graph.facebook.com/v22.0/${CONFIG.WA_PHONE_ID}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: telefono,
        type: "text",
        text: { body: texto },
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.WA_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Mensaje enviado:", response.data);
  } catch (error) {
    console.error("❌ Error enviando WhatsApp:", error.response?.data || error.message);
  }
}

// ─── WEBHOOK VERIFICACIÓN (Meta requiere esto) ────────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === CONFIG.WA_VERIFY_TOKEN) {
    console.log("✅ Webhook verificado por Meta");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// ─── WEBHOOK MENSAJES ENTRANTES ───────────────────────────────
app.post("/webhook", async (req, res) => {
  // Responder inmediatamente a Meta (evitar reenvíos)
  res.sendStatus(200);

  try {
    const body = req.body;

    // Validar estructura del mensaje
    if (
      !body.object ||
      !body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    ) {
      return;
    }

    const mensaje = body.entry[0].changes[0].value.messages[0];
    const telefono = mensaje.from;

    // Solo procesar mensajes de texto
    if (mensaje.type !== "text") {
      await enviarMensaje(
        telefono,
        "Por el momento solo puedo procesar mensajes de texto. ¿En qué puedo ayudarte? 🌿"
      );
      return;
    }

    const textoUsuario = mensaje.text.body;
    console.log(`📨 Mensaje de ${telefono}: ${textoUsuario}`);

    // Generar respuesta con IA
    const respuesta = await generarRespuesta(telefono, textoUsuario);
    console.log(`🤖 Respuesta: ${respuesta}`);

    // Enviar respuesta al usuario
    await enviarMensaje(telefono, respuesta);
  } catch (error) {
    console.error("❌ Error procesando mensaje:", error.message);
  }
});

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "✅ online",
    agente: "Hostal La Cabaña Verde",
    version: "1.0.0",
  });
});

// ─── INICIAR SERVIDOR ─────────────────────────────────────────
app.listen(CONFIG.PORT, () => {
  console.log(`\n🌿 Agente Hostal La Cabaña Verde corriendo en puerto ${CONFIG.PORT}`);
  console.log(`📡 Webhook URL: https://TU_DOMINIO/webhook\n`);
});
