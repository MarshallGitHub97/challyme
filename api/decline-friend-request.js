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

export default async function handler(req, res) {
  await connectToDatabase();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, friend } = req.body;
  try {
    const invite = await Invite.findOne({
      invitedUser: username,
      invitedBy: friend,
      status: "pending",
    });
    if (!invite) {
      return res.status(404).json({ error: "Einladung nicht gefunden" });
    }

    invite.status = "declined";
    await invite.save();

    res
      .status(200)
      .json({ message: `Freundschaftsanfrage von ${friend} abgelehnt` });
  } catch (err) {
    console.error("Fehler beim Ablehnen der Freundschaftsanfrage:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Ablehnen der Freundschaftsanfrage" });
  }
}
