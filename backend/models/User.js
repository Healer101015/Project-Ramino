import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarUrl: { type: String, default: "" },
  coverPhotoUrl: { type: String, default: "" },
  bio: { type: String, default: "" },

  // --- NOVOS CAMPOS PARA O SISTEMA DE ADMINISTRAÇÃO ---
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  isBanned: { type: Boolean, default: false },
  // ----------------------------------------------------

  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  profileViews: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);