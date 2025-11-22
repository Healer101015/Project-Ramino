import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarUrl: { type: String, default: "" },
  coverPhotoUrl: { type: String, default: "" },
  bio: { type: String, default: "" },
  // Mudança aqui: Sistema de seguidores
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  profileViews: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);