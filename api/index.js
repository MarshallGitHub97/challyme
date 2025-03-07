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
  friendRequests: [String],
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
  isPublic: { type: Boolean, default: false },
});
const Challenge = mongoose.model("Challenge", ChallengeSchema);

// Invite Schema
const InviteSchema = new mongoose.Schema({
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Challenge",
    required: true,
  },
  invitedBy: { type: String, required: true },
  invitedUser: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});
const Invite = mongoose.model("Invite", InviteSchema);

// Neue Route: /get-invite-id
app.post("/get-invite-id", async (req, res) => {
  const { invitedBy, invitedUser, challengeTitle } = req.body;
  console.log("Get invite ID request:", {
    invitedBy,
    invitedUser,
    challengeTitle,
  });
  try {
    const challenge = await Challenge.findOne({ title: challengeTitle });
    if (!challenge) {
      console.log("Challenge not found:", challengeTitle);
      return res.status(404).json({ error: "Challenge not found" });
    }

    const invite = await Invite.findOne({
      invitedBy,
      invitedUser,
      challengeId: challenge._id,
      status: "pending",
    });
    if (!invite) {
      console.log("Invite not found:", {
        invitedBy,
        invitedUser,
        challengeId: challenge._id,
      });
      return res.status(404).json({ error: "Invite not found" });
    }

    console.log("Invite ID found:", invite._id);
    res.json({ inviteId: invite._id });
  } catch (err) {
    console.error("Error getting invite ID:", err.message, err.stack);
    res
      .status(500)
      .json({ error: "Server error getting invite ID", details: err.message });
  }
});

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
      friendRequests: [],
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
  console.log("Fetching challenges request received");
  try {
    const challenges = await Challenge.find();
    console.log("Challenges fetched:", challenges.length);
    if (!challenges) {
      return res.status(404).json({ error: "No challenges found" });
    }
    res.json(challenges);
  } catch (err) {
    console.error("Error fetching challenges:", err.message, err.stack);
    res
      .status(500)
      .json({
        error: "Server error fetching challenges",
        details: err.message,
      });
  }
});

app.post("/challenges", async (req, res) => {
  console.log("Creating challenge:", req.body);
  try {
    const challenge = new Challenge(req.body);
    await challenge.save();
    console.log("Challenge created:", challenge._id);
    res.json(challenge);
  } catch (err) {
    console.error("Error creating challenge:", err.message, err.stack);
    res
      .status(500)
      .json({ error: "Server error creating challenge", details: err.message });
  }
});

app.post("/confirm", async (req, res) => {
  const { username, challengeId } = req.body;
  console.log("Confirm attempt:", { username, challengeId });
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      console.log("Challenge not found:", challengeId);
      return res.status(404).json({ error: "Challenge not found" });
    }

    const today = new Date().toISOString().split("T")[0];
    let streak = challenge.streaks.find((s) => s.user === username);
    if (!streak) {
      console.log("Streak not found for user:", username);
      challenge.streaks.push({ user: username, days: 0, lastConfirmed: null });
      streak = challenge.streaks.find((s) => s.user === username);
    }

    if (
      streak.lastConfirmed &&
      streak.lastConfirmed.toISOString().split("T")[0] === today
    ) {
      return res.json({ message: "Already confirmed today" });
    }

    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];
    streak.days =
      streak.lastConfirmed &&
      streak.lastConfirmed.toISOString().split("T")[0] === yesterday
        ? streak.days + 1
        : 1;
    streak.lastConfirmed = new Date();
    if (streak.days >= challenge.duration) challenge.completed = true;
    await challenge.save();
    console.log("Confirm successful:", { username, days: streak.days });
    res.json({ days: streak.days, completed: challenge.completed });
  } catch (err) {
    console.error("Confirm error:", err.message, err.stack);
    res
      .status(500)
      .json({ error: "Server error during confirm", details: err.message });
  }
});

app.get("/friends/:username", async (req, res) => {
  const { username } = req.params;
  console.log("Fetching friends for:", username);
  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.log("User not found:", username);
      return res.status(404).json({ error: "User not found" });
    }
    console.log("User found, returning data:", {
      friends: user.friends,
      notifications: user.notifications,
    });
    res.json({
      friends: user.friends || [],
      friendRequests: user.friendRequests || [],
      notifications: user.notifications || [],
    });
  } catch (err) {
    console.error("Fetch friends error:", err.message, err.stack);
    res
      .status(500)
      .json({ error: "Error fetching friends", details: err.message });
  }
});

app.post("/send-friend-request", async (req, res) => {
  const { fromUser, toUser } = req.body;
  console.log("Send friend request:", { fromUser, toUser });
  try {
    const recipient = await User.findOne({ username: toUser });
    if (!recipient) return res.status(404).json({ error: "User not found" });

    if (
      recipient.friendRequests.includes(fromUser) ||
      recipient.friends.includes(fromUser)
    ) {
      return res
        .status(400)
        .json({
          error: "Friend request already sent or user is already a friend",
        });
    }

    recipient.friendRequests.push(fromUser);
    recipient.notifications.push(
      `${fromUser} hat dir eine Freundschaftsanfrage geschickt!`,
    );
    await recipient.save();
    res.json({ message: `Friend request sent to ${toUser}` });
  } catch (err) {
    console.error("Send friend request error:", err.message, err.stack);
    res.status(500).json({ error: "Error sending friend request" });
  }
});

app.post("/accept-friend-request", async (req, res) => {
  const { username, friend } = req.body;
  console.log("Accept friend request:", { username, friend });
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const friendUser = await User.findOne({ username: friend });
    if (!friendUser) return res.status(404).json({ error: "Friend not found" });

    if (!user.friendRequests.includes(friend)) {
      return res.status(400).json({ error: "No friend request found" });
    }

    user.friends.push(friend);
    user.friendRequests = user.friendRequests.filter((req) => req !== friend);
    user.notifications.push(`Du bist jetzt mit ${friend} befreundet!`);
    await user.save();

    friendUser.friends.push(username);
    friendUser.notifications.push(`Du bist jetzt mit ${username} befreundet!`);
    await friendUser.save();

    res.json({ message: `You are now friends with ${friend}` });
  } catch (err) {
    console.error("Accept friend request error:", err.message, err.stack);
    res.status(500).json({ error: "Error accepting friend request" });
  }
});

app.post("/send-invite", async (req, res) => {
  const { challengeId, invitedBy, invitedUser } = req.body;
  console.log("Send invite:", { challengeId, invitedBy, invitedUser });
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ error: "Challenge not found" });

    const user = await User.findOne({ username: invitedUser });
    if (!user) return res.status(404).json({ error: "User not found" });

    const existingInvite = await Invite.findOne({
      challengeId,
      invitedUser,
      status: "pending",
    });
    if (existingInvite)
      return res.status(400).json({ error: "Invite already sent" });

    const invite = new Invite({ challengeId, invitedBy, invitedUser });
    await invite.save();

    user.notifications.push(
      `${invitedBy} hat dich zu "${challenge.title}" eingeladen!`,
    );
    await user.save();

    res.json({ message: `Invited ${invitedUser} to ${challenge.title}` });
  } catch (err) {
    console.error("Send invite error:", err.message, err.stack);
    res.status(500).json({ error: "Error sending invite" });
  }
});

app.post("/accept-invite", async (req, res) => {
  const { inviteId, username } = req.body;
  console.log("Accept invite request:", { inviteId, username });
  try {
    const invite = await Invite.findById(inviteId);
    if (!invite) {
      console.log("Invite not found:", inviteId);
      return res.status(404).json({ error: "Invite not found" });
    }

    if (invite.invitedUser !== username) {
      console.log("Unauthorized access attempt:", {
        invitedUser: invite.invitedUser,
        requestedUser: username,
      });
      return res.status(403).json({ error: "Not authorized" });
    }

    const challenge = await Challenge.findById(invite.challengeId);
    if (!challenge) {
      console.log("Challenge not found:", invite.challengeId);
      return res.status(404).json({ error: "Challenge not found" });
    }

    if (!challenge.participants.includes(username)) {
      console.log("Adding user to participants:", username);
      challenge.participants.push(username);
      challenge.streaks.push({ user: username, days: 0, lastConfirmed: null });
      await challenge.save();
    }

    invite.status = "accepted";
    await invite.save();

    const user = await User.findOne({ username });
    user.notifications.push(`Du hast "${challenge.title}" beigetreten!`);
    await user.save();

    console.log("Accept invite successful:", {
      challengeId: challenge._id,
      username,
    });
    res.status(200).json({ message: `Joined challenge: ${challenge.title}` });
  } catch (err) {
    console.error("Accept invite error:", err.message, err.stack);
    res
      .status(500)
      .json({ error: "Server error accepting invite", details: err.message });
  }
});

app.post("/reject-invite", async (req, res) => {
  const { inviteId, username } = req.body;
  console.log("Reject invite:", { inviteId, username });
  try {
    const invite = await Invite.findById(inviteId);
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    if (invite.invitedUser !== username)
      return res.status(403).json({ error: "Not authorized" });

    invite.status = "rejected";
    await invite.save();

    const user = await User.findOne({ username });
    user.notifications.push(
      `Du hast die Einladung zu "${(await Challenge.findById(invite.challengeId)).title}" abgelehnt.`,
    );
    await user.save();

    res.json({ message: "Invite rejected" });
  } catch (err) {
    console.error("Reject invite error:", err.message, err.stack);
    res.status(500).json({ error: "Error rejecting invite" });
  }
});

app.post("/poke", async (req, res) => {
  const { username, friend, challengeId } = req.body;
  console.log("Poke attempt:", { username, friend, challengeId });
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
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) =>
    console.error("MongoDB connection error:", err.message, err.stack),
  );

// Server starten
app.listen(3000, () => console.log("Server läuft auf Port 3000"));
