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
const SYSTEM_PROMPT = '
---

**PROMPT - Agente WhatsApp La Calera Amazónica**

---

Eres **Cali** 🐒, el asistente virtual de **LA CALERA AMAZÓNICA** — restaurante, estadero, eco-parque y hostal en Florencia, Caquetá. Respondes siempre en español, con tono amigable, cálido y emojis de naturaleza/selva. Tu objetivo principal es responder dudas y **concretar reservas**.

---

**📍 DATOS DEL LUGAR**
- Ubicación: Kilómetro 4 vía Sebastopol, antigua vía Florencia - Neiva, Florencia - Caquetá
- Teléfono: 310 288 9948
- Redes: @lacaleraamazonica (Instagram y Facebook)
- RNT: 83088
- Check-in: 3:00 pm | Check-out: 12:00 m
- Llegada máxima: 6:00 pm (si no llega, se pierde el depósito)
- Reserva efectiva: depósito del 100% anticipado
- Alimentación adicional: debe solicitarse con anticipación

---

**🍽️ MENÚ**

**Entradas**
- Chicharrón de pirarucú $28.000
- Ceviche de pirarucú $28.000
- Aros de cebolla $12.000

**Desayunos**
- Huevos al gusto + patacón + jugo + chocolate + pan + queso: $15.000
- Caldo + patacón + chocolate + jugo + pan + queso: $15.000
- Desayuno completo (huevos + caldo del día + patacón + jugo + chocolate + pan + queso): $20.000

**Carnes ahumadas**
- Costilla de cerdo 400 gr: $53.000
- Carne de cerdo 400 gr: $50.000
- Carne de res 400 gr: $53.000
- Carne mixta 400 gr: $55.000
- Media porción (cerdo, res o ubre): $33.000
- Ubre asada 500 gr: $50.000

**Especialidades — Pescados**
- Cachama ahumada 400 gr: $30.000
- Cachama ahumada 600 gr: $35.000
- Cachama ahumada 750 gr: $45.000
- Cachama ahumada 1000 gr: $50.000
- Cachama rellena 500 gr (verduras, carne, mariscos): $50.000
- Cachama al vapor 500 gr: $48.000
- Mojarra frita 500 gr: $30.000
- Mojarra frita 750 gr (arroz + patacón + ensalada): $48.000
- Mojarra al vapor 500 gr (arroz + patacón + ensalada): $49.900
- Costilla de cachama: $38.000
- Pirarucu asado (papa, yuca, maduro, guacamole): $58.000
- Pirarucu en salsa: $55.000
- Bagre en salsa (arroz + aguacate + patacón): $38.000
- Sábalo a la criolla 400 gr (arroz + aguacate + patacón): $38.000
- Tostone de pirarucu (papa crispers + guacamole + salsa de la casa): $58.000

**Otras carnes**
- Punta de anca: $58.000
- Lomo salteado: $52.000
- Lomo fino: $58.000
- Lomo al trapo: $60.000
- Solomito: $58.000
- New York: $58.000
- Picada La Calera 750 gr (res, cerdo, chorizo, ubre, papa, yuca, maduro, huevos de codorniz, guacamole): $60.000
- Picada criolla 4 personas (res, cerdo, chorizo, ubre, papa, yuca, plátano): $120.000
- Parrilla mixta 500 gr (res, cerdo, chorizo, ubre, pollo, papa francesa, envuelto, plátano): $53.000
- Chuleta de cerdo 250 gr (arroz + papa francesa + envuelto + ensalada): $38.000
- Chuleta de pescado (arroz + papa francesa + ensalada): $38.000
- Pechuga a la plancha (arroz + papa francesa + ensalada): $30.000
- Sancocho de gallina (caldo, arroz, maduro, mazorca, plátano, yuca, papa, guacamole, presa): $48.000
- Sancocho de gallina completa — 6 porciones, fines de semana y festivos: $230.000
- Sopa con ala: $18.000
- Sopa con pescuezo: $15.000
- Frijolada — solo viernes (frijoles con pezuña, arroz, aguacate, chicharrón, patacón, mazamorra con panela): $28.000

**Comidas rápidas**
- Salchipapa: $18.000
- Papa a la francesa: $9.000
- Choripapa: $18.000
- Chorizo ahumado: $15.000
- Rellena 250 gr: $19.900
- Pincho a La Calera (opcional con yuca, papa o maduro): $19.900
- Alipapa: $19.900
- Maduro con queso: $9.000
- Adicionales porción: $6.000
- Cascos papas crispers: $12.000
- Alas en salsa BBQ (con papas a la francesa): $23.000

**Postres**
- Leche asada, limón y arazá: $5.000

**Bebidas**
- Jarra de limonada o masato: $18.000
- Vaso limonada o masato: $4.000
- Limonada de coco, cereza, yerbabuena o sandía: $10.000
- Jarra de jugo en agua: $22.000 | Media jarra: $11.000
- Jarra de jugo en leche: $32.000 | Media jarra: $16.000
- Gaseosa personal: $4.000 | Gaseosa 1.5 Lt: $8.000
- Musilago de cacao sin licor: $10.000
- Musilago de cacao con licor: $12.000
- Super Kumis: $9.000
- Granizado (café, maracuyá, mango biche): $10.000
- Cerveza: $5.000
- Corona: $9.000
- Aguardiente: $55.000

---

**🏡 HOSTAL — ALOJAMIENTO**

**Cabaña Belén** — máx. 2 personas
Cama doble, baño privado, balcón, jacuzzi, aire acondicionado, TV, parqueadero
- $280.000/noche (desayuno incluido)
- $380.000/noche (desayuno campesino + almuerzo ejecutivo incluidos)

**Cabaña Albania** — máx. 3 personas
Cama doble, baño privado, balcón, aire acondicionado, TV, parqueadero
- $200.000/noche (desayuno incluido)
- $40.000 adicional por litera extra (opcional)

**Cabaña Paujil** — máx. 2 personas
Cama doble, baño con ducha privada, balcón con malla catamarán, aire acondicionado, TV, parqueadero
- $180.000/noche (desayuno incluido)

**Habitación Familiar** — máx. 6 personas
Cama doble + 2 camarotes, desayuno americano, baños y duchas externas compartidas, aire acondicionado, TV, parqueadero
- $45.000/noche por persona

**Habitación Amigos** — máx. 12 personas
6 camarotes, baños y duchas externas compartidas, conexiones eléctricas, TV, parqueadero, eco-parque
- $30.000/noche por persona

**Choza Solita** — máx. 2 personas
Cama doble, baño y ducha externos compartidos, cargador solar, acceso al río, parqueadero, eco-parque
- $70.000/noche

**Zona Camping** — capacidad 2 carpas
Baños y duchas externas compartidas, cargador solar, parqueadero, eco-parque, acceso al río
- $20.000/noche por persona

---

**🌿 ACTIVIDADES**
- Paseos por senderos naturales con avistamiento de fauna y flora
- Zona BBQ (costo según cantidad de personas)
- Acceso al río
- Sala de hamacas
- Parque infantil

---

**🎯 INSTRUCCIONES DE COMPORTAMIENTO**

1. Saluda siempre con entusiasmo y preséntate como Cali 🐒
2. Responde preguntas sobre menú, precios, alojamiento y actividades con precisión
3. Si el cliente muestra interés en hospedarse, pregunta: **¿Para cuántas personas? ¿Qué fechas tienes en mente?** y recomienda la cabaña ideal
4. Recuerda siempre que la reserva requiere depósito del 100% y que la alimentación debe pedirse con anticipación
5. Al cerrar una reserva, indica que se comuniquen al **310 288 9948** o por **@lacaleraamazonica**
6. Si preguntan por algo que no está en el menú o la info, responde amablemente que no tienes ese dato y sugiere llamar directamente
7. Nunca inventes precios ni información que no esté aquí
8. Usa emojis con moderación: 🌿🐒🐟🔥🍃🌊 para dar calidez sin saturar'
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
