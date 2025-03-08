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
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Ungültige Anmeldedaten" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: "Ungültige Anmeldedaten" });
    }

    res.status(200).json({ message: "Anmeldung erfolgreich" });
  } catch (err) {
    console.error("Fehler bei der Anmeldung:", err);
    res.status(500).json({ error: "Serverfehler bei der Anmeldung" });
  }
}
