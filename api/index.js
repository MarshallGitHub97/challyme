const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // Hinzufügen des fs-Moduls
require("dotenv").config();

// Vorbereitung auf Mongoose 7
mongoose.set("strictQuery", false);

const app = express();
app.use(cors());
app.use(express.json());

// Sicherstellen, dass das uploads-Verzeichnis existiert
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Uploads-Verzeichnis erstellt:", uploadsDir);
}

// Multer-Konfiguration für den Datei-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });

// Statischer Ordner für hochgeladene Dateien
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB-Verbindung
const MONGODB_URI = process.env.MONGODB_URI;
console.log("MONGODB_URI:", MONGODB_URI);
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Mongoose-Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friends: [{ type: String }],
});

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: Number, required: true },
  startDate: { type: Date, required: true },
  participants: [{ type: String }],
  creator: { type: String }, // Temporär ohne required, bis Datenbank bereinigt ist
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
      path: String,
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

const inviteSchema = new mongoose.Schema({
  invitedUser: { type: String, required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId },
  status: { type: String, required: true },
  token: { type: String, required: true },
  invitedBy: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);
const Challenge = mongoose.model("Challenge", challengeSchema);
const Invite = mongoose.model("Invite", inviteSchema);

// Middleware für statische Dateien (React Build)
app.use(express.static(path.join(__dirname, "../build")));

// API-Routen
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: "Benutzername existiert bereits" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, friends: [] });
    await user.save();
    res.json({ message: "Registrierung erfolgreich" });
  } catch (err) {
    console.error("Fehler bei der Registrierung:", err);
    res.status(500).json({ error: "Serverfehler bei der Registrierung" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Ungültige Anmeldedaten" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ error: "Ungültige Anmeldedaten" });

    res.json({ message: "Anmeldung erfolgreich" });
  } catch (err) {
    console.error("Fehler bei der Anmeldung:", err);
    res.status(500).json({ error: "Serverfehler bei der Anmeldung" });
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
      creator: username,
      streaks: [{ user: username, days: 0, lastConfirmed: [] }],
    });
    await challenge.save();
    res.json({ message: "Challenge erfolgreich erstellt", challenge });
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

    let userStreak = challenge.streaks.find((s) => s.user === username);
    if (!userStreak) {
      challenge.streaks.push({ user: username, days: 0, lastConfirmed: [] });
      userStreak = challenge.streaks.find((s) => s.user === username);
    }

    const today = new Date().toISOString().split("T")[0];
    const confirmedDates = Array.isArray(userStreak.lastConfirmed)
      ? userStreak.lastConfirmed.map(
          (date) => new Date(date).toISOString().split("T")[0]
        )
      : [];
    if (confirmedDates.includes(today)) {
      return res
        .status(400)
        .json({ error: "Du hast heute bereits bestätigt!" });
    }

    userStreak.lastConfirmed = userStreak.lastConfirmed || [];
    userStreak.lastConfirmed.push(new Date());
    userStreak.days = (userStreak.days || 0) + 1;

    const startDate = new Date(challenge.startDate);
    const currentDay =
      Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (currentDay >= challenge.duration) {
      challenge.completed = true;
    }

    await challenge.save();

    const points = userStreak.days * 10;
    res.json({
      message: "Heute bestätigt!",
      days: userStreak.days,
      points,
      completed: challenge.completed,
    });
  } catch (err) {
    console.error("Fehler beim Bestätigen:", err);
    res.status(500).json({ error: "Serverfehler beim Bestätigen" });
  }
});

app.delete("/delete-challenge", async (req, res) => {
  const { challengeId, username } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });

    if (challenge.creator === username) {
      await Challenge.deleteOne({ _id: challengeId });
      res.json({ message: "Challenge erfolgreich gelöscht" });
    } else {
      challenge.participants = challenge.participants.filter(
        (p) => p !== username
      );
      challenge.streaks = challenge.streaks.filter((s) => s.user !== username);
      challenge.pokes = challenge.pokes?.filter(
        (poke) => poke.poker !== username && poke.poked !== username
      );
      challenge.messages = challenge.messages?.filter(
        (msg) => msg.user !== username
      );
      challenge.images = challenge.images?.filter(
        (img) => img.user !== username
      );

      if (challenge.participants.length === 0) {
        await Challenge.deleteOne({ _id: challengeId });
        res.json({
          message:
            "Challenge gelöscht, da keine Teilnehmer mehr vorhanden sind",
        });
      } else {
        await challenge.save();
        res.json({ message: "Du hast die Challenge verlassen" });
      }
    }
  } catch (err) {
    console.error("Fehler beim Löschen der Challenge:", err);
    res.status(500).json({ error: "Serverfehler beim Löschen der Challenge" });
  }
});

app.post("/send-friend-request", async (req, res) => {
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

    res.json({ message: `Freundschaftsanfrage an ${toUser} gesendet!` });
  } catch (err) {
    console.error("Fehler beim Senden der Freundschaftsanfrage:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Senden der Freundschaftsanfrage" });
  }
});

app.post("/accept-friend-request", async (req, res) => {
  const { username, friend } = req.body;
  try {
    const invite = await Invite.findOne({
      invitedUser: username,
      invitedBy: friend,
      status: "pending",
    });
    if (!invite)
      return res.status(404).json({ error: "Einladung nicht gefunden" });

    invite.status = "accepted";
    await invite.save();

    await User.updateOne({ username }, { $addToSet: { friends: friend } });
    await User.updateOne(
      { username: friend },
      { $addToSet: { friends: username } }
    );

    res.json({ message: `Freundschaft mit ${friend} akzeptiert!` });
  } catch (err) {
    console.error("Fehler beim Akzeptieren der Freundschaftsanfrage:", err);
    res
      .status(500)
      .json({
        error: "Serverfehler beim Akzeptieren der Freundschaftsanfrage",
      });
  }
});

app.post("/decline-friend-request", async (req, res) => {
  const { username, friend } = req.body;
  try {
    const invite = await Invite.findOne({
      invitedUser: username,
      invitedBy: friend,
      status: "pending",
    });
    if (!invite)
      return res.status(404).json({ error: "Einladung nicht gefunden" });

    invite.status = "declined";
    await invite.save();

    res.json({ message: `Freundschaftsanfrage von ${friend} abgelehnt` });
  } catch (err) {
    console.error("Fehler beim Ablehnen der Freundschaftsanfrage:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Ablehnen der Freundschaftsanfrage" });
  }
});

app.get("/friends", async (req, res) => {
  const { username } = req.query;
  try {
    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });

    const invites = await Invite.find({
      invitedUser: username,
      status: "pending",
    });
    const friendRequests = invites
      .filter((invite) => !invite.challengeId)
      .map((invite) => invite.invitedBy);

    res.json({ friends: user.friends, friendRequests });
  } catch (err) {
    console.error("Fehler beim Abrufen der Freunde:", err);
    res.status(500).json({ error: "Serverfehler beim Abrufen der Freunde" });
  }
});

app.post("/send-invite", async (req, res) => {
  const { challengeId, invitedBy, invitedUser } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });

    const invitedUserExists = await User.findOne({ username: invitedUser });
    if (!invitedUserExists)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });

    if (challenge.participants.includes(invitedUser)) {
      return res.status(400).json({ error: "Benutzer ist bereits Teilnehmer" });
    }

    const existingInvite = await Invite.findOne({
      invitedUser,
      challengeId,
      status: "pending",
    });
    if (existingInvite) {
      return res.status(400).json({ error: "Einladung bereits gesendet" });
    }

    const invite = new Invite({
      invitedUser,
      challengeId,
      status: "pending",
      token: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      invitedBy,
    });
    await invite.save();

    res.json({ message: `Einladung an ${invitedUser} gesendet!` });
  } catch (err) {
    console.error("Fehler beim Senden der Einladung:", err);
    res.status(500).json({ error: "Serverfehler beim Senden der Einladung" });
  }
});

app.post("/accept-invite", async (req, res) => {
  const { username, challengeId } = req.body;
  try {
    const invite = await Invite.findOne({
      invitedUser: username,
      challengeId,
      status: "pending",
    });
    if (!invite)
      return res.status(404).json({ error: "Einladung nicht gefunden" });

    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });

    challenge.participants.push(username);
    challenge.streaks.push({ user: username, days: 0, lastConfirmed: [] });
    await challenge.save();

    invite.status = "accepted";
    await invite.save();

    res.json({ message: "Einladung angenommen!" });
  } catch (err) {
    console.error("Fehler beim Akzeptieren der Einladung:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Akzeptieren der Einladung" });
  }
});

app.post("/decline-invite", async (req, res) => {
  const { username, challengeId } = req.body;
  try {
    const invite = await Invite.findOne({
      invitedUser: username,
      challengeId,
      status: "pending",
    });
    if (!invite)
      return res.status(404).json({ error: "Einladung nicht gefunden" });

    invite.status = "declined";
    await invite.save();

    res.json({ message: "Einladung abgelehnt" });
  } catch (err) {
    console.error("Fehler beim Ablehnen der Einladung:", err);
    res.status(500).json({ error: "Serverfehler beim Ablehnen der Einladung" });
  }
});

app.get("/notifications", async (req, res) => {
  const { username } = req.query;
  try {
    const invites = await Invite.find({
      invitedUser: username,
      status: "pending",
    });
    const notifications = invites.map((invite) => {
      if (invite.challengeId) {
        return {
          type: "invite",
          message: `${invite.invitedBy} hat dich zu einer Challenge eingeladen!`,
          challengeId: invite.challengeId,
          seen: false,
        };
      } else {
        return {
          type: "friend_request",
          message: `${invite.invitedBy} möchte dein Freund sein!`,
          friend: invite.invitedBy,
          seen: false,
        };
      }
    });

    const challenges = await Challenge.find({ participants: username });
    const missedDayNotifications = [];
    for (const challenge of challenges) {
      const userStreak = challenge.streaks.find((s) => s.user === username) || {
        days: 0,
        lastConfirmed: [],
      };
      const today = new Date().toISOString().split("T")[0];
      const confirmedDates = Array.isArray(userStreak.lastConfirmed)
        ? userStreak.lastConfirmed.map(
            (date) => new Date(date).toISOString().split("T")[0]
          )
        : [];
      const hasConfirmedToday = confirmedDates.includes(today);

      if (!hasConfirmedToday && !challenge.completed) {
        const startDate = new Date(challenge.startDate);
        const currentDay =
          Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) + 1;
        if (currentDay <= challenge.duration) {
          missedDayNotifications.push({
            type: "missed_day",
            message: `Du hast Tag ${currentDay} in "${challenge.title}" verpasst!`,
            challengeId: challenge._id,
            seen: false,
          });
        }
      }
    }

    res.json([...notifications, ...missedDayNotifications]);
  } catch (err) {
    console.error("Fehler beim Abrufen der Benachrichtigungen:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Abrufen der Benachrichtigungen" });
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
            invitedUser: username,
            challengeId,
            status: "pending",
            token:
              Date.now().toString() + Math.random().toString(36).substr(2, 9),
            invitedBy: username,
          });
          await invite.save();
        }
        return res.json({ notification });
      }
    }
    res.json({ message: "Kein verpasster Tag" });
  } catch (err) {
    console.error("Fehler beim Überprüfen des verpassten Tages:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Überprüfen des verpassten Tages" });
  }
});

app.post("/poke", async (req, res) => {
  const { username, friend, challengeId } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });

    // Sicherstellen, dass `creator` gesetzt ist
    if (!challenge.creator) {
      challenge.creator = challenge.participants[0] || username; // Fallback auf den ersten Teilnehmer oder den aktuellen Benutzer
    }

    const userStreak = challenge.streaks.find((s) => s.user === username) || {
      days: 0,
      lastConfirmed: [],
    };
    const friendStreak = challenge.streaks.find((s) => s.user === friend) || {
      days: 0,
      lastConfirmed: [],
    };
    const today = new Date().toISOString().split("T")[0];
    const userConfirmedDates = Array.isArray(userStreak.lastConfirmed)
      ? userStreak.lastConfirmed.map(
          (date) => new Date(date).toISOString().split("T")[0]
        )
      : [];
    const friendConfirmedDates = Array.isArray(friendStreak.lastConfirmed)
      ? friendStreak.lastConfirmed.map(
          (date) => new Date(date).toISOString().split("T")[0]
        )
      : [];
    const userHasConfirmedToday = userConfirmedDates.includes(today);
    const friendHasConfirmedToday = friendConfirmedDates.includes(today);

    if (!userHasConfirmedToday) {
      return res
        .status(403)
        .json({ error: "Du musst heute bestätigen, um zu anstupsen!" });
    }
    if (friendHasConfirmedToday) {
      return res
        .status(403)
        .json({ error: "Der Freund hat heute bereits bestätigt!" });
    }

    challenge.pokes = challenge.pokes || [];
    challenge.pokes.push({
      poker: username,
      poked: friend,
      timestamp: new Date(),
    });
    await challenge.save();

    res.json({ message: `${friend} wurde angestupst!` });
  } catch (err) {
    console.error("Fehler beim Anstupsen:", err);
    res.status(500).json({ error: "Serverfehler beim Anstupsen" });
  }
});

app.post("/send-challenge-message", async (req, res) => {
  const { challengeId, user, content } = req.body;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });

    challenge.messages = challenge.messages || [];
    challenge.messages.push({
      user,
      content,
      timestamp: new Date(),
    });
    await challenge.save();

    res.json({ message: "Nachricht gesendet!" });
  } catch (err) {
    console.error("Fehler beim Senden der Nachricht:", err);
    res.status(500).json({ error: "Serverfehler beim Senden der Nachricht" });
  }
});

app.get("/challenge-messages", async (req, res) => {
  const { challengeId } = req.query;
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge nicht gefunden" });
    res.json(challenge.messages || []);
  } catch (err) {
    console.error("Fehler beim Abrufen der Nachrichten:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Abrufen der Nachrichten" });
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

      const imagePath = req.file.filename;
      const fullPath = path.join(__dirname, "uploads", imagePath);

      // Überprüfen, ob die Datei tatsächlich existiert
      if (!fs.existsSync(fullPath)) {
        return res
          .status(500)
          .json({ error: "Fehler beim Speichern der Datei" });
      }

      challenge.images = challenge.images || [];
      challenge.images.push({
        user: username,
        path: imagePath,
        timestamp: Date.now(),
        day: parseInt(day) || 1,
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

app.get("*", (req, res) => {
  console.log("Fallback route hit:", req.originalUrl);
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
