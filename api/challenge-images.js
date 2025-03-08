import mongoose from "mongoose";
import { connectToDatabase, getGfs } from "../../lib/db";
import { GridFSBucket } from "mongodb";

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

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { challengeId } = req.query;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    }
    res.status(200).json(challenge.images || []);
  } catch (err) {
    console.error("Fehler beim Abrufen der Bilder:", err);
    res.status(500).json({ error: "Serverfehler beim Abrufen der Bilder" });
  }
}
