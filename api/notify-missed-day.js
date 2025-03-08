import mongoose from "mongoose";
import { connectToDatabase } from "../../lib/db";

const inviteSchema = new mongoose.Schema({
  invitedUser: { type: String, required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId },
  status: { type: String, required: true },
  token: { type: String, required: true },
  invitedBy: { type: String, required: true },
});

const Invite = mongoose.models.Invite || mongoose.model("Invite", inviteSchema);

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

    const userStreak = challenge.streaks.find((s) => s.user === username) || {
      days: 0,
      lastConfirmed: [],
    };
    const today = new Date().toISOString().split("T")[0];
    const confirmedDates = Array.isArray(userStreak.lastConfirmed)
      ? userStreak.lastConfirmed.map(
          (date) => new Date(date).toISOString().split("T")[0]
        )
      : [];
    const hasConfirmedToday = confirmedDates.includes(today);

    if (!hasConfirmedToday && !challenge.completed) {
      const startDate = new Date(challenge.startDate);
      const currentDay =
        Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) + 1;
      if (currentDay <= challenge.duration) {
        const notification = {
          type: "missed_day",
          message: `Du hast Tag ${currentDay} in "${challenge.title}" verpasst!`,
          challengeId,
        };
        const existingInvite = await Invite.findOne({
          invitedUser: username,
          challengeId,
          status: "pending",
        });
        if (!existingInvite) {
          const invite = new Invite({
            invitedUser: username,
            challengeId,
            status: "pending",
            token:
              Date.now().toString() + Math.random().toString(36).substr(2, 9),
            invitedBy: username,
          });
          await invite.save();
        }
        return res.status(200).json({ notification });
      }
    }
    res.status(200).json({ message: "Kein verpasster Tag" });
  } catch (err) {
    console.error("Fehler beim Überprüfen des verpassten Tages:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Überprüfen des verpassten Tages" });
  }
}
