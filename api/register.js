import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { connectToDatabase } from "../../lib/db";

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

  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Benutzername existiert bereits" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, friends: [] });
    await user.save();
    res.status(200).json({ message: "Registrierung erfolgreich" });
  } catch (err) {
    console.error("Fehler bei der Registrierung:", err);
    res.status(500).json({ error: "Serverfehler bei der Registrierung" });
  }
}
