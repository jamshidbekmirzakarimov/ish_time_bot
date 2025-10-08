const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  name: { type: String },
  registered: { type: Boolean, default: false },
  actions: {
    start: String,
    lunchOut: String,
    lunchIn: String,
    end: String,
    success: String,
  },
  waitingForReport: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", userSchema);
