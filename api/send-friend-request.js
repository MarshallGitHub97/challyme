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

  const { fromUser, toUser } = req.body;
  try {
    const fromUserExists = await User.findOne({ username: fromUser });
    const toUserExists = await User.findOne({ username: toUser });
    if (!fromUserExists || !toUserExists) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    if (fromUserExists.friends.includes(toUser)) {
      return res.status(400).json({ error: "Ihr seid bereits Freunde" });
    }

    const existingInvite = await Invite.findOne({
      invitedUser: toUser,
      invitedBy: fromUser,
      status: "pending",
    });
    if (existingInvite) {
      return res
        .status(400)
        .json({ error: "Freundschaftsanfrage bereits gesendet" });
    }

    const invite = new Invite({
      invitedUser: toUser,
      status: "pending",
      token: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      invitedBy: fromUser,
    });
    await invite.save();

    res
      .status(200)
      .json({ message: `Freundschaftsanfrage an ${toUser} gesendet!` });
  } catch (err) {
    console.error("Fehler beim Senden der Freundschaftsanfrage:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Senden der Freundschaftsanfrage" });
  }
}
