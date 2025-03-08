import mongoose from "mongoose";
import { connectToDatabase } from "../../lib/db";

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: Number, required: true },
  startDate: { type: Date, required: true },
  participants: [{ type: String }],
  creator: { type: String },
  streaks: [
    {
      user: String,
      days: Number,
      lastConfirmed: [Date],
    },
  ],
  messages: [
    {
      user: String,
      content: String,
      timestamp: Date,
    },
  ],
  images: [
    {
      user: String,
      fileId: mongoose.Schema.Types.ObjectId,
      timestamp: Date,
      day: Number,
    },
  ],
  completed: { type: Boolean, default: false },
  pokes: [
    {
      poker: String,
      poked: String,
      timestamp: Date,
    },
  ],
});

const Challenge =
  mongoose.models.Challenge || mongoose.model("Challenge", challengeSchema);

export default async function handler(req, res) {
  await connectToDatabase();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { challengeId, user, content } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    }

    challenge.messages = challenge.messages || [];
    challenge.messages.push({
      user,
      content,
      timestamp: new Date(),
    });
    await challenge.save();

    res.status(200).json({ message: "Nachricht gesendet!" });
  } catch (err) {
    console.error("Fehler beim Senden der Nachricht:", err);
    res.status(500).json({ error: "Serverfehler beim Senden der Nachricht" });
  }
}
