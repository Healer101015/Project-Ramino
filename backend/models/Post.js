import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true }
}, { timestamps: true });

const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'love', 'haha', 'sad'], required: true }
}, { _id: false });

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, default: "" }, // NOVO: Título do post
  category: { type: String, default: "Geral" }, // NOVO: Categoria/Tópico
  text: { type: String, default: "" },
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, enum: ["image", "video", ""], default: "" },
  reactions: [ReactionSchema],
  comments: [CommentSchema],
  repostOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  isEdited: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("Post", PostSchema);