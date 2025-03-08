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

    invite.status = "accepted";
    await invite.save();

    await User.updateOne({ username }, { $addToSet: { friends: friend } });
    await User.updateOne(
      { username: friend },
      { $addToSet: { friends: username } }
    );

    res.status(200).json({ message: `Freundschaft mit ${friend} akzeptiert!` });
  } catch (err) {
    console.error("Fehler beim Akzeptieren der Freundschaftsanfrage:", err);
    res
      .status(500)
      .json({
        error: "Serverfehler beim Akzeptieren der Freundschaftsanfrage",
      });
  }
}
