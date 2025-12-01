import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true }
}, { timestamps: true });

const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'love', 'haha', 'sad'], required: true }
}, { _id: false });

// Schemas auxiliares
const PollOptionSchema = new mongoose.Schema({ text: { type: String, required: true }, votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] }, { _id: false });
const QuizQuestionSchema = new mongoose.Schema({ question: { type: String, required: true }, options: [{ type: String, required: true }], correctIndex: { type: Number, required: true } }, { _id: false });

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // --- CAMPOS DE FILTRAGEM (CRÍTICO) ---
  community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", default: null }, // Se for null, não é de comunidade
  postedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },       // Se for null, não é mural
  // -------------------------------------

  // Campos de Conteúdo
  type: { type: String, enum: ['blog', 'image', 'video', 'link', 'poll', 'quiz', 'question', 'wiki'], default: 'blog' },
  title: { type: String, default: "" },
  text: { type: String, default: "" },

  // Mídia
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, enum: ["image", "video", "audio", ""], default: "" },
  linkUrl: { type: String, default: "" },

  // Interatividade
  pollOptions: [PollOptionSchema],
  quizQuestions: [QuizQuestionSchema],
  reactions: [ReactionSchema],
  comments: [CommentSchema],

  // Metadados
  repostOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  isEdited: { type: Boolean, default: false },

  // Destaque (Amino Style)
  featured: {
    isFeatured: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    featuredAt: { type: Date }
  },
}, { timestamps: true });

export default mongoose.model("Post", PostSchema);