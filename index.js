const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");

const app = express();
app.use(express.json());

// === Telegram Webhook sozlamalari ===
const bot = new TelegramBot(process.env.BOT_TOKEN);
const SERVER_URL = process.env.RENDER_EXTERNAL_URL; // Masalan: https://ishbot.onrender.com
const WEBHOOK_PATH = `/webhook/${process.env.BOT_TOKEN}`;
const WEBHOOK_URL = `${SERVER_URL}${WEBHOOK_PATH}`;

// Webhook endpoint
app.post(WEBHOOK_PATH, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Webhook o‘rnatish (faqat server ishga tushganda bir marta)
bot.setWebHook(WEBHOOK_URL)
  .then(() => console.log("✅ Webhook o‘rnatildi:", WEBHOOK_URL))
  .catch((err) => console.error("❌ Webhookda xato:", err.message));

// === MongoDB ulanish ===
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB muvaffaqiyatli ulandi"))
  .catch((err) => console.error("❌ MongoDB ulanishida xato:", err));

// === Asosiy menyu ===
const mainMenu = {
  reply_markup: {
    keyboard: [
      ["🟢 Ishga keldim"],
      ["🍽️ Abetga chiqdim", "🔙 Abetdan qaytdim"],
      ["🔴 Ishdan ketdim"],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

// === /start komandasi ===
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  let user = await User.findOne({ chatId });

  if (!user) {
    user = new User({ chatId, registered: false });
    await user.save();
    return bot.sendMessage(
      chatId,
      "Assalomu alaykum! 😊 Iltimos, ism familiyangizni kiriting:"
    );
  }

  bot.sendMessage(chatId, `Salom, ${user.name}! 👋`, mainMenu);
});

// === Asosiy xabarlar ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (text.startsWith("/")) return; // boshqa komandalarni inkor qilish

  let user = await User.findOne({ chatId });
  if (!user) return;

  if (!user.registered) {
    user.name = text;
    user.registered = true;
    await user.save();
    return bot.sendMessage(chatId, `Xush kelibsiz, ${text}! ✅`, mainMenu);
  }

  const now = new Date().toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (text === "🟢 Ishga keldim") {
    user.actions.start = now;
  } else if (text === "🍽️ Abetga chiqdim") {
    user.actions.lunchOut = now;
  } else if (text === "🔙 Abetdan qaytdim") {
    user.actions.lunchIn = now;
  } else if (text === "🔴 Ishdan ketdim") {
    user.waitingForReport = true;
    await user.save();
    return bot.sendMessage(chatId, "Bugun nechta uspeshniy qildingiz?");
  } else if (user.waitingForReport) {
    user.actions.success = text;
    user.actions.end = now;
    user.waitingForReport = false;

    const report = `
📋 *Kunlik hisobot*
👤 ${user.name}
🟢 Ishga keldi: ${user.actions.start || "-"}
🍽️ Abet chiqdi: ${user.actions.lunchOut || "-"}
🔙 Abet qaytdi: ${user.actions.lunchIn || "-"}
🔴 Ishdan ketdi: ${user.actions.end || "-"}
✅ Uspeshniy soni: ${user.actions.success || "0"}
    `;

    await bot.sendMessage(chatId, "Hisobotingiz qabul qilindi ✅");
    await bot.sendMessage(process.env.GROUP_CHAT_ID, report, { parse_mode: "Markdown" });
  }

  await user.save();
});

// === Root endpoint (sog‘lomlik testi) ===
app.get("/", (req, res) => {
  res.send("🤖 Telegram bot ishlayapti!");
});

// === Serverni ishga tushirish ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT}-portda ishlayapti`));
