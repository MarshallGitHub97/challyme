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
    const invite = await Invite.findOne({
      invitedUser: username,
      challengeId,
      status: "pending",
    });
    if (!invite) {
      return res.status(404).json({ error: "Einladung nicht gefunden" });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    }

    challenge.participants.push(username);
    challenge.streaks.push({ user: username, days: 0, lastConfirmed: [] });
    await challenge.save();

    invite.status = "accepted";
    await invite.save();

    res.status(200).json({ message: "Einladung angenommen!" });
  } catch (err) {
    console.error("Fehler beim Akzeptieren der Einladung:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Akzeptieren der Einladung" });
  }
}
