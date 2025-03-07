const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friends: { type: [String], default: [] },
});
const User = mongoose.model("User", userSchema);

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: Number, required: true },
  startDate: { type: Date, required: true },
  participants: { type: [String], default: [] },
  streaks: [
    {
      user: String,
      days: { type: Number, default: 0 },
      lastConfirmed: { type: [String], default: [] },
    },
  ],
  completed: { type: Boolean, default: false },
});
const Challenge = mongoose.model("Challenge", challengeSchema);

const inviteSchema = new mongoose.Schema({
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Challenge",
    required: false,
  },
  invitedBy: { type: String, required: true },
  invitedUser: { type: String, required: true },
  status: { type: String, default: "pending" },
});
const Invite = mongoose.model("Invite", inviteSchema);

// API-Routen
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "Benutzer erstellt" });
  } catch (err) {
    res.status(400).json({ error: "Benutzername bereits vergeben" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ error: "Benutzer nicht gefunden" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Falsches Passwort" });
    res.json({ message: "Login erfolgreich", username });
  } catch (err) {
    console.error("Fehler beim Login:", err);
    res.status(500).json({ error: "Serverfehler beim Login" });
  }
});

app.post("/add-friend", async (req, res) => {
  const { username, friend } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    if (user.friends.includes(friend))
      return res.status(400).json({ error: "Freund bereits hinzugefügt" });
    user.friends.push(friend);
    await user.save();
    res.json({ message: "Freund hinzugefügt" });
  } catch (err) {
    console.error("Fehler beim Hinzufügen eines Freundes:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Hinzufügen eines Freundes" });
  }
});

app.get("/friends", async (req, res) => {
  const { username } = req.query;
  try {
    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    // Simuliere Freundesanfragen (ersetze dies mit deiner Logik)
    const friendRequests = await Invite.find({
      invitedUser: username,
      status: "pending",
    }).distinct("invitedBy");
    res.json({
      friends: user.friends,
      friendRequests: friendRequests || [],
    });
  } catch (err) {
    console.error("Fehler beim Abrufen der Freunde:", err);
    res.status(500).json({ error: "Serverfehler beim Abrufen der Freunde" });
  }
});

app.post("/create-challenge", async (req, res) => {
  const { title, duration, startDate, username } = req.body;
  try {
    const challenge = new Challenge({
      title,
      duration,
      startDate,
      participants: [username],
      streaks: [{ user: username, days: 0, lastConfirmed: [] }],
    });
    await challenge.save();
    res.status(201).json({ message: "Challenge erstellt", challenge });
  } catch (err) {
    console.error("Fehler beim Erstellen der Challenge:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Erstellen der Challenge" });
  }
});

app.get("/challenges", async (req, res) => {
  const { username } = req.query;
  try {
    const challenges = await Challenge.find({ participants: username });
    res.json(challenges);
  } catch (err) {
    console.error("Fehler beim Abrufen der Challenges:", err);
    res.status(500).json({ error: "Serverfehler beim Abrufen der Challenges" });
  }
});

app.post("/confirm", async (req, res) => {
  const { username, challengeId } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });

    const userStreak = challenge.streaks.find((s) => s.user === username) || {
      days: 0,
      lastConfirmed: [],
    };
    const today = new Date().toISOString().split("T")[0];
    if (!userStreak.lastConfirmed.includes(today)) {
      userStreak.lastConfirmed.push(today);
      userStreak.days += 1;
    }
    await challenge.save();
    res.json({
      message: "Challenge bestätigt!",
      days: userStreak.days,
      completed: challenge.completed,
    });
  } catch (err) {
    console.error("Fehler beim Bestätigen der Challenge:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Bestätigen der Challenge" });
  }
});

app.post("/send-invite", async (req, res) => {
  const { challengeId, invitedBy, invitedUser } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });

    const invite = new Invite({ challengeId, invitedBy, invitedUser });
    await invite.save();
    res.json({ message: "Einladung gesendet" });
  } catch (err) {
    console.error("Fehler beim Senden der Einladung:", err);
    res.status(500).json({ error: "Serverfehler beim Senden der Einladung" });
  }
});

app.get("/invites", async (req, res) => {
  const { username } = req.query;
  try {
    const invites = await Invite.find({
      invitedUser: username,
      status: "pending",
    }).populate("challengeId");
    res.json(invites);
  } catch (err) {
    console.error("Fehler beim Abrufen der Einladungen:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Abrufen der Einladungen" });
  }
});

app.post("/accept-invite", async (req, res) => {
  const { inviteId, username } = req.body;
  try {
    const invite = await Invite.findById(inviteId);
    if (!invite)
      return res.status(404).json({ error: "Einladung nicht gefunden" });

    const challenge = await Challenge.findById(invite.challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });

    challenge.participants.push(username);
    challenge.streaks.push({ user: username, days: 0, lastConfirmed: [] });
    invite.status = "accepted";
    await challenge.save();
    await invite.save();
    res.json({ message: "Einladung angenommen" });
  } catch (err) {
    console.error("Fehler beim Annehmen der Einladung:", err);
    res.status(500).json({ error: "Serverfehler beim Annehmen der Einladung" });
  }
});

app.post("/poke", async (req, res) => {
  const { username, friend, challengeId } = req.body;
  try {
    res.json({ message: `${friend} wurde angestupsen!` });
  } catch (err) {
    console.error("Fehler beim Anstupsen:", err);
    res.status(500).json({ error: "Serverfehler beim Anstupsen" });
  }
});

app.delete("/delete-challenge", async (req, res) => {
  const { challengeId, username } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    }
    if (!challenge.participants.includes(username)) {
      return res
        .status(403)
        .json({ error: "Du bist nicht Teilnehmer dieser Challenge" });
    }
    await Challenge.deleteOne({ _id: challengeId });
    res.json({ message: "Challenge erfolgreich gelöscht" });
  } catch (err) {
    console.error("Fehler beim Löschen der Challenge:", err);
    res.status(500).json({ error: "Serverfehler beim Löschen der Challenge" });
  }
});

app.get("/notifications", async (req, res) => {
  const { username } = req.query;
  try {
    const invites = await Invite.find({
      invitedUser: username,
      status: "pending",
    }).populate("challengeId");
    const notifications = invites.map((invite) => ({
      id: invite._id,
      type: "invite",
      message: `${invite.invitedBy} hat dich zu ${invite.challengeId.title} eingeladen!`,
      challengeId: invite.challengeId._id,
    }));
    res.json(notifications);
  } catch (err) {
    console.error("Fehler beim Abrufen der Benachrichtigungen:", err);
    res
      .status(500)
      .json({ error: "Fehler beim Abrufen der Benachrichtigungen" });
  }
});

app.post("/send-friend-request", async (req, res) => {
  const { fromUser, toUser } = req.body;
  try {
    const user = await User.findOne({ username: fromUser });
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    if (user.friends.includes(toUser))
      return res.status(400).json({ error: "Freund bereits hinzugefügt" });

    // Simuliere das Senden einer Freundschaftsanfrage (ersetze dies mit deiner Logik)
    const invite = new Invite({
      invitedBy: fromUser,
      invitedUser: toUser,
    });
    await invite.save();

    res.json({ message: "Freundschaftsanfrage gesendet" });
  } catch (err) {
    console.error("Fehler beim Senden der Freundschaftsanfrage:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Senden der Freundschaftsanfrage" });
  }
});

// Statische Dateien und Fallback MÜSSEN AM ENDE stehen
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
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) =>
    console.error("MongoDB connection error:", err.message, err.stack)
  );

// Server starten
app.listen(3000, "0.0.0.0", () => console.log("Server läuft auf Port 3000"));
