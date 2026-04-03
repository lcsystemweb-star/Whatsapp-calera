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
const SYSTEM_PROMPT = `Eres "lc-boot", el asistente virtual de SanchezCodeLc,una tienda virtual donde público las aplicaciones propias, mis servicios como integrador de tecnología y equipos electrónicos tales como equipos POS, seguridad, cctv. Respondes SOLO en español.

Tu trabajo es ayudar a los clientes a responder sus dudas sobre nuestro Emprendimiento y sobre mi app principal LcSqlBackup manager:
1. LcSqlBackup es una herramienta para escritorio creada para salva guardar copias de seguridad del motor de bases de datos SQL SERVER, permite programar copias, realizar compresión programar cuantas copias desea salvaguardar como también en versión Pro poder enviar a la nube de Google drive y OneDrive

contamos con una suscripción $40.000 en la versión Pro mensual

cómo también se maneja servicios de soporte remoto los servicios se agendan por la plataforma y manejamos tiempos de servicio desde media hora a 1 hora.
el pago se debe hacer por anticipado y contamos con todos los medios de pago (pse,Nequi, daviplata,tarjeta débito y crédito)

FLUJO DE RESERVA:
1. Saluda cordialmente si es el primer mensaje
2. Si mencionan un servicio de soporte,envía a seleccionar uno de los servicios en la siguiente url:https://lcsystem.cercia.co/servicios



INSTRUCCIONES DE PAGO (solo mostrar al confirmar reserva):

 el pago de Nequi o Daviplata se deben hacer a este número y enviar copia a dicho numero
- Nequi: 3107957939
- Enviar comprobante a este mismo chat

REGLAS IMPORTANTES:
- Sé conciso, WhatsApp no es para textos largos
- Si preguntan disponibilidad, siempre informar que la página brinda la disponibilidad 
- No inventes información que no esté en este prompt

- Si el usuario escribe solo números (posible comprobante de pago), agradece y di que se verificará en 24 horas`;

// ─── GENERAR RESPUESTA CON GEMINI ────────────────────────────
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generarRespuesta(telefono, mensajeUsuario) {
  try {
    const historial = getHistorial(telefono);

    // Adaptamos historial al formato OpenAI
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...historial.map((m) => ({
        role: m.role === "model" ? "assistant" : "user",
        content: m.parts[0].text,
      })),
      { role: "user", content: mensajeUsuario },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 🔥 recomendado costo/calidad
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const texto =
      completion.choices?.[0]?.message?.content ||
      "Lo siento, hubo un problema generando la respuesta 😔";

    // Guardar historial
    agregarMensaje(telefono, "user", mensajeUsuario);
    agregarMensaje(telefono, "model", texto);

    // Detectar confirmación de reserva
    const match = texto.match(/RESERVA_CONFIRMADA:([A-Z0-9]{6})/);
    if (match) {
      return texto.replace(
        `RESERVA_CONFIRMADA:${match[1]}`,
        `*Código de reserva: ${match[1]}*`
      );
    }

    return texto;
  } catch (error) {
    console.error("❌ Error OpenAI:", error.response?.data || error.message);
    return "Estoy teniendo problemas técnicos 😔 Intenta nuevamente en unos minutos.";
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
