import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true }
}, { timestamps: true });

const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'love', 'haha', 'sad'], required: true }
}, { _id: false });

// Schema para Opções de Enquete
const PollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

// Schema para Perguntas de Quiz
const QuizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }], // Array de 4 opções
  correctIndex: { type: Number, required: true } // 0, 1, 2 ou 3
}, { _id: false });

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Tipos do Amino
  type: {
    type: String,
    enum: ['blog', 'image', 'video', 'link', 'poll', 'quiz', 'question', 'wiki'],
    default: 'blog'
  },

  title: { type: String, default: "" },
  category: { type: String, default: "Geral" },
  text: { type: String, default: "" }, // Conteúdo principal ou descrição

  // Mídia (para Blog, Imagem, Vídeo, Stories)
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, default: "" }, // 'image', 'video'

  // Campos específicos por tipo
  linkUrl: { type: String, default: "" }, // Para tipo 'link'
  pollOptions: [PollOptionSchema], // Para tipo 'poll'
  quizQuestions: [QuizQuestionSchema], // Para tipo 'quiz'

  reactions: [ReactionSchema],
  comments: [CommentSchema],
  repostOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  isEdited: { type: Boolean, default: false },

}, { timestamps: true });

export default mongoose.model("Post", PostSchema);