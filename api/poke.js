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

  const { username, friend, challengeId } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    }

    if (!challenge.creator) {
      challenge.creator = challenge.participants[0] || username;
    }

    const userStreak = challenge.streaks.find((s) => s.user === username) || {
      days: 0,
      lastConfirmed: [],
    };
    const friendStreak = challenge.streaks.find((s) => s.user === friend) || {
      days: 0,
      lastConfirmed: [],
    };
    const today = new Date().toISOString().split("T")[0];
    const userConfirmedDates = Array.isArray(userStreak.lastConfirmed)
      ? userStreak.lastConfirmed.map(
          (date) => new Date(date).toISOString().split("T")[0]
        )
      : [];
    const friendConfirmedDates = Array.isArray(friendStreak.lastConfirmed)
      ? friendStreak.lastConfirmed.map(
          (date) => new Date(date).toISOString().split("T")[0]
        )
      : [];
    const userHasConfirmedToday = userConfirmedDates.includes(today);
    const friendHasConfirmedToday = friendConfirmedDates.includes(today);

    if (!userHasConfirmedToday) {
      return res
        .status(403)
        .json({ error: "Du musst heute bestätigen, um zu anstupsen!" });
    }
    if (friendHasConfirmedToday) {
      return res
        .status(403)
        .json({ error: "Der Freund hat heute bereits bestätigt!" });
    }

    challenge.pokes = challenge.pokes || [];
    challenge.pokes.push({
      poker: username,
      poked: friend,
      timestamp: new Date(),
    });
    await challenge.save();

    res.status(200).json({ message: `${friend} wurde angestupst!` });
  } catch (err) {
    console.error("Fehler beim Anstupsen:", err);
    res.status(500).json({ error: "Serverfehler beim Anstupsen" });
  }
}
