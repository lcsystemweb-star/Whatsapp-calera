/**
 * ============================================================
 *  LA CALERA AMAZÓNICA — Agente WhatsApp con IA (OpenAI)
 * ============================================================
 */

const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const CONFIG = {
  WA_TOKEN: process.env.WA_TOKEN,
  WA_PHONE_ID: process.env.WA_PHONE_ID,
  WA_VERIFY_TOKEN: process.env.WA_VERIFY_TOKEN,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  PORT: process.env.PORT || 3000,
};

// ─── OPENAI ──────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: CONFIG.OPENAI_API_KEY,
});

// ─── PROMPT COMPLETO ─────────────────────────────────────────
const LA_CALERA_KNOWLEDGE = `
Eres Cali 🐒, el asistente virtual de LA CALERA AMAZÓNICA — restaurante, estadero, eco-parque y hostal en Florencia, Caquetá. Respondes siempre en español, con tono amigable, cálido y emojis de naturaleza/selva.
 
REGLA MÁS IMPORTANTE:
- Preséntate como Cali 🐒 ÚNICAMENTE en el PRIMER mensaje de la conversación
- Del segundo mensaje en adelante responde DIRECTAMENTE sin ninguna presentación
- Sé siempre conciso
 
=== DATOS DEL LUGAR ===
- Ubicación: Kilómetro 4 vía Sebastopol, antigua vía Florencia - Neiva, Florencia - Caquetá
- Teléfono: 310 288 9948
- Redes: @lacaleraamazonica (Instagram y Facebook)
- RNT: 83088
- Check-in: 3:00 pm | Check-out: 12:00 m
- Llegada máxima: 6:00 pm (si no llega, se pierde el depósito)
- Reserva: depósito del 100% anticipado
- Alimentación adicional: debe solicitarse con anticipación
 
=== MENÚ ===
 
ENTRADAS:
- Chicharrón de pirarucú: $28.000
- Ceviche de pirarucú: $28.000
- Aros de cebolla: $12.000
 
DESAYUNOS:
- Huevos al gusto + patacón + jugo + chocolate + pan + queso: $15.000
- Caldo + patacón + chocolate + jugo + pan + queso: $15.000
- Desayuno completo: $20.000
 
CARNES AHUMADAS:
- Costilla de cerdo 400 gr: $53.000
- Carne de cerdo 400 gr: $50.000
- Carne de res 400 gr: $53.000
- Carne mixta 400 gr: $55.000
- Media porción (cerdo, res o ubre): $33.000
- Ubre asada 500 gr: $50.000
 
PESCADOS:
- Cachama ahumada 400 gr: $30.000
- Cachama ahumada 600 gr: $35.000
- Cachama ahumada 750 gr: $45.000
- Cachama ahumada 1000 gr: $50.000
- Cachama rellena 500 gr: $50.000
- Cachama al vapor 500 gr: $48.000
- Mojarra frita 500 gr: $30.000
- Mojarra frita 750 gr: $48.000
- Mojarra al vapor 500 gr: $49.900
- Costilla de cachama: $38.000
- Pirarucu asado: $58.000
- Pirarucu en salsa: $55.000
- Bagre en salsa: $38.000
- Sábalo a la criolla 400 gr: $38.000
- Tostone de pirarucu: $58.000
 
OTRAS CARNES:
- Punta de anca: $58.000
- Lomo salteado: $52.000
- Lomo fino: $58.000
- Lomo al trapo: $60.000
- Solomito: $58.000
- New York: $58.000
- Picada La Calera 750 gr: $60.000
- Picada criolla 4 personas: $120.000
- Parrilla mixta 500 gr: $53.000
- Chuleta de cerdo 250 gr: $38.000
- Chuleta de pescado: $38.000
- Pechuga a la plancha: $30.000
- Sancocho de gallina: $48.000
- Sancocho de gallina completa (6 porciones, fines de semana): $230.000
- Sopa con ala: $18.000
- Sopa con pescuezo: $15.000
- Frijolada (solo viernes): $28.000
 
COMIDAS RÁPIDAS:
- Salchipapa: $18.000
- Papa a la francesa: $9.000
- Choripapa: $18.000
- Chorizo ahumado: $15.000
- Rellena 250 gr: $19.900
- Pincho a La Calera: $19.900
- Alipapa: $19.900
- Maduro con queso: $9.000
- Cascos papas crispers: $12.000
- Alas en salsa BBQ: $23.000
 
POSTRES:
- Leche asada, limón y arazá: $5.000
 
BEBIDAS:
- Jarra limonada o masato: $18.000 | Vaso: $4.000
- Limonada de coco/cereza/yerbabuena/sandía: $10.000
- Jarra jugo en agua: $22.000 | Media: $11.000
- Jarra jugo en leche: $32.000 | Media: $16.000
- Gaseosa personal: $4.000 | 1.5 Lt: $8.000
- Musilago de cacao sin licor: $10.000 | con licor: $12.000
- Granizado: $10.000
- Cerveza: $5.000 | Corona: $9.000
- Aguardiente: $55.000
 
=== ALOJAMIENTO ===
 
CABAÑA BELÉN - máx. 2 personas
- $280.000/noche (desayuno incluido)
- $380.000/noche (desayuno + almuerzo incluidos)
Incluye: cama doble, baño privado, balcón, jacuzzi, AC, TV, parqueadero
 
CABAÑA ALBANIA - máx. 3 personas
- $200.000/noche (desayuno incluido)
- $40.000 adicional por litera extra
Incluye: cama doble, baño privado, balcón, AC, TV, parqueadero
 
CABAÑA PAUJIL - máx. 2 personas
- $180.000/noche (desayuno incluido)
Incluye: cama doble, baño privado, balcón con malla catamarán, AC, TV, parqueadero
 
HABITACIÓN FAMILIAR - máx. 6 personas
- $45.000/noche por persona
Incluye: cama doble + 2 camarotes, desayuno americano, baños compartidos, AC, TV
 
HABITACIÓN AMIGOS - máx. 12 personas
- $30.000/noche por persona
Incluye: 6 camarotes, baños compartidos, TV, eco-parque
 
CHOZA SOLITA - máx. 2 personas
- $70.000/noche
Incluye: cama doble, baño compartido, acceso al río
 
ZONA CAMPING - 2 carpas
- $20.000/noche por persona
Incluye: baños compartidos, acceso al río, eco-parque
 
=== ACTIVIDADES ===
- Senderos naturales y avistamiento de fauna
- Zona BBQ
- Acceso al río
- Sala de hamacas
- Parque infantil
 
=== INSTRUCCIONES ===
1. SOLO en el primer mensaje saluda y preséntate como Cali 🐒
2. Del segundo mensaje en adelante responde directamente SIN presentarte
3. Si el cliente quiere hospedarse pregunta: ¿cuántas personas? ¿qué fechas?
4. Reserva requiere depósito del 100% y alimentación con anticipación
5. Para reservar: 310 288 9948 o @lacaleraamazonica
6. Nunca inventes precios ni información
7. Usa emojis con moderación: 🌿🐒🐟🔥🍃🌊
8. Sé siempre conciso
`;

// ─── GENERAR RESPUESTA ───────────────────────────────────────
async function generarRespuesta(telefono, mensajeUsuario) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: LA_CALERA_KNOWLEDGE },
        { role: "user", content: mensajeUsuario },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    return (
      completion.choices?.[0]?.message?.content ||
      "Lo siento, ocurrió un error 😔"
    );
  } catch (error) {
    console.error("❌ Error OpenAI:", error.response?.data || error.message);
    return "Estoy teniendo problemas técnicos 😔 intenta nuevamente.";
  }
}

// ─── ENVIAR MENSAJE WHATSAPP ─────────────────────────────────
async function enviarMensaje(telefono, texto) {
  try {
    const url = `https://graph.facebook.com/v22.0/${CONFIG.WA_PHONE_ID}/messages`;

    await axios.post(
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

    console.log("✅ Mensaje enviado");
  } catch (error) {
    console.error(
      "❌ Error WhatsApp:",
      error.response?.data || error.message
    );
  }
}

// ─── WEBHOOK VERIFICACIÓN ────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === CONFIG.WA_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// ─── WEBHOOK MENSAJES ────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const mensaje =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!mensaje) return;

    const telefono = mensaje.from;

    if (mensaje.type !== "text") {
      await enviarMensaje(
        telefono,
        "🌿 Solo puedo responder mensajes de texto por ahora."
      );
      return;
    }

    const textoUsuario = mensaje.text.body;

    console.log(`📨 ${telefono}: ${textoUsuario}`);

    const respuesta = await generarRespuesta(telefono, textoUsuario);

    console.log(`🤖 ${respuesta}`);

    await enviarMensaje(telefono, respuesta);
  } catch (error) {
    console.error("❌ Error general:", error.message);
  }
});

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// ─── START ───────────────────────────────────────────────────
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Servidor en puerto ${CONFIG.PORT}`);
});
