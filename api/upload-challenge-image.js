import mongoose from "mongoose";
import multer from "multer";
import { connectToDatabase, getGfs } from "../../lib/db";
import { GridFSBucket } from "mongodb";

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: Number, required: true },
  startDate: { type: Date, required: true },
  participants: [{ type: String }],
  creator: { type: String },
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
      fileId: mongoose.Schema.Types.ObjectId,
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

const Challenge =
  mongoose.models.Challenge || mongoose.model("Challenge", challengeSchema);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  await connectToDatabase();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { challengeId, username, day } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Keine Datei hochgeladen" });
    }

    try {
      const challenge = await Challenge.findById(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge nicht gefunden" });
      }
      if (!challenge.participants.includes(username)) {
        return res.status(403).json({ error: "Nicht autorisiert" });
      }

      const gfs = getGfs();
      const bucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: "uploads",
      });

      const uploadStream = bucket.openUploadStream(file.originalname);
      uploadStream.end(file.buffer);

      uploadStream.on("error", () => {
        return res
          .status(500)
          .json({ error: "Fehler beim Speichern der Datei" });
      });

      uploadStream.on("finish", async (file) => {
        challenge.images = challenge.images || [];
        challenge.images.push({
          user: username,
          fileId: file._id,
          timestamp: Date.now(),
          day: parseInt(day) || 1,
        });
        await challenge.save();
        res
          .status(200)
          .json({ message: "Bild erfolgreich hochgeladen", fileId: file._id });
      });
    } catch (err) {
      console.error("Fehler beim Hochladen des Bildes:", err);
      res.status(500).json({ error: "Serverfehler beim Hochladen des Bildes" });
    }
  });
}
