const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const GROUP_ID = process.env.GROUP_CHAT_ID;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB ulandi"))
  .catch((err) => console.error("❌ MongoDB ulanishida xato:", err));

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

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  let user = await User.findOne({ chatId });

  if (!user) {
    user = new User({ chatId, registered: false });
    await user.save();
    bot.sendMessage(
      chatId,
      "Assalomu alaykum! 😊 Iltimos, ism familiyangizni kiriting:"
    );
  } else {
    bot.sendMessage(chatId, `Salom, ${user.name}! 👋`, mainMenu);
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  let user = await User.findOne({ chatId });
  if (!user) return;

  if (!user.registered) {
    user.name = text;
    user.registered = true;
    await user.save();

    bot.sendMessage(chatId, `Xush kelibsiz, ${text}! ✅`, mainMenu);
    return;
  }

  const now = new Date().toLocaleTimeString();

  if (text === "🟢 Ishga keldim") {
    user.actions.start = now;
  } else if (text === "🍽️ Abetga chiqdim") {
    user.actions.lunchOut = now;
  } else if (text === "🔙 Abetdan qaytdim") {
    user.actions.lunchIn = now;
  } else if (text === "🔴 Ishdan ketdim") {
    bot.sendMessage(chatId, "Bugun nechta uspeshniy qildingiz?");
    user.waitingForReport = true;
    await user.save();
    return;
  } else if (user.waitingForReport) {
    user.actions.success = text;
    user.actions.end = now;
    user.waitingForReport = false;

    const report = `
📋 Kunlik hisobot
👤 ${user.name}
🟢 Ishga keldi: ${user.actions.start || "-"}
🍽️ Abet chiqdi: ${user.actions.lunchOut || "-"}
🔙 Abet qaytdi: ${user.actions.lunchIn || "-"}
🔴 Ishdan ketdi: ${user.actions.end || "-"}
✅ Uspeshniy soni: ${user.actions.success || "0"}
    `;

    bot.sendMessage(chatId, "Hisobotingiz qabul qilindi ✅");
    bot.sendMessage(GROUP_ID, report);
  }

  await user.save();
});
