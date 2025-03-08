import mongoose from "mongoose";
import { connectToDatabase } from "../../lib/db";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friends: [{ type: String }],
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

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

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username } = req.query;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    const invites = await Invite.find({
      invitedUser: username,
      status: "pending",
    });
    const friendRequests = invites
      .filter((invite) => !invite.challengeId)
      .map((invite) => invite.invitedBy);

    res.status(200).json({ friends: user.friends, friendRequests });
  } catch (err) {
    console.error("Fehler beim Abrufen der Freunde:", err);
    res.status(500).json({ error: "Serverfehler beim Abrufen der Freunde" });
  }
}
