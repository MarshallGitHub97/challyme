const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  friends: [String],
  notifications: [String],
});
const User = mongoose.model("User", UserSchema);

// Challenge Schema
const ChallengeSchema = new mongoose.Schema({
  title: String,
  duration: Number,
  startDate: { type: Date, default: Date.now },
  participants: [String],
  streaks: [{ user: String, days: Number, lastConfirmed: Date }],
  completed: { type: Boolean, default: false },
});
const Challenge = mongoose.model("Challenge", ChallengeSchema);

// API-Routen
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  console.log("Register attempt:", { username, password });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed password:", hashedPassword);
    const user = new User({
      username,
      password: hashedPassword,
      friends: [],
      notifications: [],
    });
    await user.save();
    console.log("User saved:", username);
    res.status(200).json({ message: "User registered", username });
  } catch (err) {
    console.error("Registration error:", err.message, err.stack);
    if (err.code === 11000) {
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(400).json({ error: err.message || "Registration failed" });
    }
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt:", { username, password });
  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.log("User not found:", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.status(200).json({ message: "Logged in", username });
  } catch (err) {
    console.error("Login error:", err.message, err.stack);
    res.status(500).json({ error: "Server error during login" });
  }
});

app.get("/challenges", async (req, res) => {
  const challenges = await Challenge.find();
  res.json(challenges);
});

app.post("/challenges", async (req, res) => {
  const challenge = new Challenge(req.body);
  await challenge.save();
  res.json(challenge);
});

app.post("/invite", async (req, res) => {
  const { username, friend, challengeId } = req.body;
  const user = await User.findOne({ username });
  const friendUser = await User.findOne({ username: friend });
  const challenge = await Challenge.findById(challengeId);

  if (!friendUser || !challenge)
    return res.status(404).json({ error: "User or Challenge not found" });

  if (!user.friends.includes(friend)) {
    user.friends.push(friend);
    await user.save();
  }
  if (!challenge.participants.includes(friend)) {
    challenge.participants.push(friend);
    challenge.streaks.push({ user: friend, days: 0 });
    await challenge.save();
  }
  res.json({ message: `${friend} invited` });
});

app.post("/confirm", async (req, res) => {
  const { username, challengeId } = req.body;
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const today = new Date().toISOString().split("T")[0];
  const streak = challenge.streaks.find((s) => s.user === username);
  if (!streak) return res.status(404).json({ error: "User not in challenge" });

  if (
    streak.lastConfirmed &&
    streak.lastConfirmed.toISOString().split("T")[0] === today
  ) {
    return res.json({ message: "Already confirmed today" });
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  streak.days =
    streak.lastConfirmed &&
    streak.lastConfirmed.toISOString().split("T")[0] === yesterday
      ? streak.days + 1
      : 1;
  streak.lastConfirmed = new Date();
  if (streak.days >= challenge.duration) challenge.completed = true;
  await challenge.save();
  res.json(streak);
});

app.post("/poke", async (req, res) => {
  const { username, friend, challengeId } = req.body;
  const friendUser = await User.findOne({ username: friend });
  const challenge = await Challenge.findById(challengeId);
  if (!friendUser || !challenge)
    return res.status(404).json({ error: "User or Challenge not found" });

  friendUser.notifications.push(
    `${username} hat dich nach "${challenge.title}" angestupst!`,
  );
  await friendUser.save();
  res.json({ message: `${friend} poked` });
});

// Statische Dateien und Fallback NACH den API-Routen
app.use(express.static(path.join(__dirname, "../build")));
app.get("*", (req, res) => {
  console.log("Fallback route hit:", req.url);
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

// MongoDB-Verbindung
mongoose.set("strictQuery", false);
console.log("MONGODB_URI:", process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

// Server starten
app.listen(3000, () => console.log("Server läuft"));
