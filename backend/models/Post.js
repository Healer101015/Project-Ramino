import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true }
}, { timestamps: true });

const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'love', 'haha', 'sad'], required: true }
}, { _id: false });

// Schemas auxiliares (Poll, Quiz)...
const PollOptionSchema = new mongoose.Schema({ text: { type: String, required: true }, votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] }, { _id: false });
const QuizQuestionSchema = new mongoose.Schema({ question: { type: String, required: true }, options: [{ type: String, required: true }], correctIndex: { type: Number, required: true } }, { _id: false });

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", default: null },
  postedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  // V7.0 - Sistema de Destaque
  featured: {
    isFeatured: { type: Boolean, default: false },
    priority: { type: Number, default: 0 }, // 1: Simples, 2: Estendido/Topo
    featuredAt: { type: Date }
  },
  isPinned: { type: Boolean, default: false }, // Pin clássico (mantido)

  type: { type: String, enum: ['blog', 'image', 'video', 'link', 'poll', 'quiz', 'question', 'wiki'], default: 'blog' },

  title: { type: String, default: "" },

  // V6.0 - Categorias e Tags
  category: { type: String, default: "Geral" },
  tags: [{ type: String }], // Ex: ["#art", "#review"]

  text: { type: String, default: "" },
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, default: "" },
  linkUrl: { type: String, default: "" },

  pollOptions: [PollOptionSchema],
  quizQuestions: [QuizQuestionSchema],

  reactions: [ReactionSchema],
  comments: [CommentSchema],
  repostOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  isEdited: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Post", PostSchema);