const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
const multer = require("multer"); // Für Bild-Uploads
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Multer-Konfiguration für Bild-Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friends: { type: [String], default: [] },
  points: { type: Number, default: 0 },
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
  messages: [
    {
      user: String,
      content: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  images: [
    {
      user: String,
      path: String,
      timestamp: { type: Date, default: Date.now },
      day: { type: Number, default: 1 },
    },
  ],
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
  token: { type: String, unique: true },
});
const Invite = mongoose.model("Invite", inviteSchema);

const messageSchema = new mongoose.Schema({
  fromUser: { type: String, required: true },
  toUser: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

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
    const friendRequests = await Invite.find({
      invitedUser: username,
      status: "pending",
      challengeId: { $exists: false },
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
      messages: [],
      images: [],
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

    const user = await User.findOne({ username });
    let pointsToAdd = 10;
    if (userStreak.days > 10) {
      pointsToAdd += (userStreak.days - 10) * 10;
    }
    user.points += pointsToAdd;
    await user.save();
    await challenge.save();

    res.json({
      message: "Challenge bestätigt!",
      days: userStreak.days,
      completed: challenge.completed,
      points: user.points,
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

    const invite = new Invite({
      challengeId,
      invitedBy,
      invitedUser,
      token: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    });
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
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    res.json({ message: `${friend} wurde angestupst!` });
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
      message: invite.challengeId
        ? `${invite.invitedBy} hat dich zu "${invite.challengeId.title}" eingeladen!`
        : `${invite.invitedBy} hat dir eine Freundschaftsanfrage gesendet!`,
      challengeId: invite.challengeId ? invite.challengeId._id : null,
      invitedBy: invite.invitedBy,
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
    console.log("Sending friend request from:", fromUser, "to:", toUser);
    const user = await User.findOne({ username: fromUser });
    if (!user) return res.json({ message: "Benutzer nicht gefunden" });
    const targetUser = await User.findOne({ username: toUser });
    if (!targetUser)
      return res.json({ message: "Ziel-Benutzer nicht gefunden" });
    if (user.friends.includes(toUser))
      return res.json({ message: "Dieser Benutzer ist bereits dein Freund!" });

    const existingInvite = await Invite.findOne({
      invitedBy: fromUser,
      invitedUser: toUser,
      status: "pending",
      challengeId: { $exists: false },
    });
    if (existingInvite)
      return res.json({ message: "Anfrage bereits gesendet" });

    const invite = new Invite({
      invitedBy: fromUser,
      invitedUser: toUser,
      token: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    });
    await invite.save();
    console.log("Friend request saved:", invite._id);
    res.json({ message: "Freundschaftsanfrage gesendet" });
  } catch (err) {
    console.error(
      "Fehler beim Senden der Freundschaftsanfrage:",
      err.message,
      err.stack
    );
    res
      .status(500)
      .json({ error: "Serverfehler beim Senden der Freundschaftsanfrage" });
  }
});

app.post("/accept-friend-request", async (req, res) => {
  const { username, friend } = req.body;
  try {
    const invite = await Invite.findOne({
      invitedBy: friend,
      invitedUser: username,
      status: "pending",
      challengeId: { $exists: false },
    });
    if (!invite)
      return res
        .status(404)
        .json({ error: "Freundschaftsanfrage nicht gefunden" });

    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    const friendUser = await User.findOne({ username: friend });
    if (!friendUser)
      return res.status(404).json({ error: "Freund nicht gefunden" });

    user.friends.push(friend);
    friendUser.friends.push(username);
    invite.status = "accepted";
    await user.save();
    await friendUser.save();
    await invite.save();

    res.json({ message: "Freundschaftsanfrage angenommen" });
  } catch (err) {
    console.error("Fehler beim Annehmen der Freundschaftsanfrage:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Annehmen der Freundschaftsanfrage" });
  }
});

app.post("/get-invite-id", async (req, res) => {
  const { invitedBy, invitedUser, challengeTitle } = req.body;
  try {
    let invite;
    if (challengeTitle) {
      const challenge = await Challenge.findOne({ title: challengeTitle });
      if (!challenge)
        return res.status(404).json({ error: "Challenge nicht gefunden" });
      invite = await Invite.findOne({
        invitedBy,
        invitedUser,
        challengeId: challenge._id,
        status: "pending",
      });
    } else {
      invite = await Invite.findOne({
        invitedBy,
        invitedUser,
        challengeId: { $exists: false },
        status: "pending",
      });
    }
    if (!invite)
      return res.status(404).json({ error: "Einladung nicht gefunden" });
    res.json({ inviteId: invite._id });
  } catch (err) {
    console.error("Fehler beim Abrufen der Einladungs-ID:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Abrufen der Einladungs-ID" });
  }
});

app.post("/reject-invite", async (req, res) => {
  const { inviteId, username } = req.body;
  try {
    const invite = await Invite.findById(inviteId);
    if (!invite)
      return res.status(404).json({ error: "Einladung nicht gefunden" });
    if (invite.invitedUser !== username)
      return res.status(403).json({ error: "Nicht autorisiert" });
    invite.status = "rejected";
    await invite.save();
    res.json({ message: "Einladung abgelehnt" });
  } catch (err) {
    console.error("Fehler beim Ablehnen der Einladung:", err);
    res.status(500).json({ error: "Serverfehler beim Ablehnen der Einladung" });
  }
});

app.post("/send-message", async (req, res) => {
  const { fromUser, toUser, content } = req.body;
  try {
    const message = new Message({ fromUser, toUser, content });
    await message.save();
    res.json({ message: "Nachricht gesendet", messageId: message._id });
  } catch (err) {
    console.error("Fehler beim Senden der Nachricht:", err);
    res.status(500).json({ error: "Serverfehler beim Senden der Nachricht" });
  }
});

app.get("/messages", async (req, res) => {
  const { user1, user2 } = req.query;
  try {
    const messages = await Message.find({
      $or: [
        { fromUser: user1, toUser: user2 },
        { fromUser: user2, toUser: user1 },
      ],
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    console.error("Fehler beim Abrufen der Nachrichten:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Abrufen der Nachrichten" });
  }
});

app.post("/send-challenge-message", async (req, res) => {
  const { challengeId, user, content } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    challenge.messages.push({ user, content });
    await challenge.save();
    res.json({ message: "Nachricht gesendet" });
  } catch (err) {
    console.error("Fehler beim Senden der Challenge-Nachricht:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Senden der Challenge-Nachricht" });
  }
});

app.get("/challenge-messages", async (req, res) => {
  const { challengeId } = req.query;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    res.json(challenge.messages);
  } catch (err) {
    console.error("Fehler beim Abrufen der Challenge-Nachrichten:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Abrufen der Challenge-Nachrichten" });
  }
});

app.post(
  "/upload-challenge-image",
  upload.single("image"),
  async (req, res) => {
    const { challengeId, username, day } = req.body;
    try {
      const challenge = await Challenge.findById(challengeId);
      if (!challenge)
        return res.status(404).json({ error: "Challenge nicht gefunden" });
      if (!challenge.participants.includes(username))
        return res.status(403).json({ error: "Nicht autorisiert" });

      const file = req.file;
      if (!file)
        return res.status(400).json({ error: "Keine Datei hochgeladen" });
      if (file.size > 5 * 1024 * 1024)
        return res
          .status(400)
          .json({ error: "Bildgröße darf maximal 5 MB betragen!" });

      const imagePath = req.file.path;
      challenge.images = challenge.images || [];
      challenge.images.push({
        user: username,
        path: imagePath,
        timestamp: Date.now(),
        day: parseInt(day) || 1, // Standard-Tag 1, falls kein Tag angegeben
      });
      await challenge.save();
      res.json({ message: "Bild erfolgreich hochgeladen", imagePath });
    } catch (err) {
      console.error("Fehler beim Hochladen des Bildes:", err);
      res.status(500).json({ error: "Serverfehler beim Hochladen des Bildes" });
    }
  }
);

app.get("/challenge-images", async (req, res) => {
  const { challengeId } = req.query;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    res.json(challenge.images || []);
  } catch (err) {
    console.error("Fehler beim Abrufen der Bilder:", err);
    res.status(500).json({ error: "Serverfehler beim Abrufen der Bilder" });
  }
});

app.post("/notify-missed-day", async (req, res) => {
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
    const confirmedDates = Array.isArray(userStreak.lastConfirmed)
      ? userStreak.lastConfirmed.map(
          (date) => new Date(date).toISOString().split("T")[0]
        )
      : userStreak.lastConfirmed
      ? [new Date(userStreak.lastConfirmed).toISOString().split("T")[0]]
      : [];
    const hasConfirmedToday = confirmedDates.includes(today);

    if (!hasConfirmedToday && !challenge.completed) {
      const startDate = new Date(challenge.startDate);
      const currentDay =
        Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) + 1;
      if (currentDay <= challenge.duration) {
        const notification = {
          id: new mongoose.Types.ObjectId(),
          type: "missed_day",
          message: `Du hast Tag ${currentDay} in "${challenge.title}" verpasst!`,
          challengeId,
        };
        const existingInvite = await Invite.findOne({
          invitedUser: username,
          challengeId,
          status: "pending",
        });
        if (!existingInvite) {
          const invite = new Invite({
            invitedUser: username, // Der Benutzer, der benachrichtigt wird
            challengeId,
            status: "pending",
            token:
              Date.now().toString() + Math.random().toString(36).substr(2, 9),
            invitedBy: username, // Füge den aktuellen Benutzer als invitedBy hinzu
          });
          await invite.save();
        }
        res.json({ notification });
      } else {
        res.json({ message: "Kein verpasster Tag" });
      }
    } else {
      res.json({ message: "Kein verpasster Tag" });
    }
  } catch (err) {
    console.error("Fehler beim Überprüfen des verpassten Tages:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Überprüfen des verpassten Tages" });
  }
});

// Statische Dateien und Fallback
app.use(express.static(path.join(__dirname, "../build")));
app.use("/uploads", express.static("uploads")); // Statischer Zugriff auf Uploads
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
