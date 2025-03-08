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

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friends: [{ type: String }],
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default async function handler(req, res) {
  await connectToDatabase();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { challengeId, invitedBy, invitedUser } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    }

    const invitedUserExists = await User.findOne({ username: invitedUser });
    if (!invitedUserExists) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    if (challenge.participants.includes(invitedUser)) {
      return res.status(400).json({ error: "Benutzer ist bereits Teilnehmer" });
    }

    const existingInvite = await Invite.findOne({
      invitedUser,
      challengeId,
      status: "pending",
    });
    if (existingInvite) {
      return res.status(400).json({ error: "Einladung bereits gesendet" });
    }

    const invite = new Invite({
      invitedUser,
      challengeId,
      status: "pending",
      token: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      invitedBy,
    });
    await invite.save();

    res.status(200).json({ message: `Einladung an ${invitedUser} gesendet!` });
  } catch (err) {
    console.error("Fehler beim Senden der Einladung:", err);
    res.status(500).json({ error: "Serverfehler beim Senden der Einladung" });
  }
}
