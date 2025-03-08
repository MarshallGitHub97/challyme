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

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { challengeId, username } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    }

    if (challenge.creator === username) {
      await Challenge.deleteOne({ _id: challengeId });
      res.status(200).json({ message: "Challenge erfolgreich gelöscht" });
    } else {
      challenge.participants = challenge.participants.filter(
        (p) => p !== username
      );
      challenge.streaks = challenge.streaks.filter((s) => s.user !== username);
      challenge.pokes = challenge.pokes?.filter(
        (poke) => poke.poker !== username && poke.poked !== username
      );
      challenge.messages = challenge.messages?.filter(
        (msg) => msg.user !== username
      );
      challenge.images = challenge.images?.filter(
        (img) => img.user !== username
      );

      if (challenge.participants.length === 0) {
        await Challenge.deleteOne({ _id: challengeId });
        res.status(200).json({
          message:
            "Challenge gelöscht, da keine Teilnehmer mehr vorhanden sind",
        });
      } else {
        await challenge.save();
        res.status(200).json({ message: "Du hast die Challenge verlassen" });
      }
    }
  } catch (err) {
    console.error("Fehler beim Löschen der Challenge:", err);
    res.status(500).json({ error: "Serverfehler beim Löschen der Challenge" });
  }
}
