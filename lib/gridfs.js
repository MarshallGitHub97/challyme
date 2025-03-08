import mongoose from "mongoose";
import Grid from "gridfs-stream";

let gfs;
const conn = mongoose.connection;

conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

export const getGfs = () => gfs;
