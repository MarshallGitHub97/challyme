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

  const { username, challengeId } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    }

    let userStreak = challenge.streaks.find((s) => s.user === username);
    if (!userStreak) {
      challenge.streaks.push({ user: username, days: 0, lastConfirmed: [] });
      userStreak = challenge.streaks.find((s) => s.user === username);
    }

    const today = new Date().toISOString().split("T")[0];
    const confirmedDates = Array.isArray(userStreak.lastConfirmed)
      ? userStreak.lastConfirmed.map(
          (date) => new Date(date).toISOString().split("T")[0]
        )
      : [];
    if (confirmedDates.includes(today)) {
      return res
        .status(400)
        .json({ error: "Du hast heute bereits bestätigt!" });
    }

    userStreak.lastConfirmed = userStreak.lastConfirmed || [];
    userStreak.lastConfirmed.push(new Date());
    userStreak.days = (userStreak.days || 0) + 1;

    const startDate = new Date(challenge.startDate);
    const currentDay =
      Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (currentDay >= challenge.duration) {
      challenge.completed = true;
    }

    await challenge.save();

    const points = userStreak.days * 10;
    res.status(200).json({
      message: "Heute bestätigt!",
      days: userStreak.days,
      points,
      completed: challenge.completed,
    });
  } catch (err) {
    console.error("Fehler beim Bestätigen:", err);
    res.status(500).json({ error: "Serverfehler beim Bestätigen" });
  }
}
