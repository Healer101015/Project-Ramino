import express from "express";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// Listar feed
router.get("/", authRequired, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name avatarUrl _id")
      .populate("comments.user", "name avatarUrl _id")
      .populate("reactions.user", "name avatarUrl _id")
      .populate("pollOptions.votes", "_id") // Popular votos para contagem (se necessário)
      .populate({
        path: 'repostOf',
        populate: [
          { path: 'user', select: 'name avatarUrl _id' },
          { path: 'reactions.user', select: 'name avatarUrl _id' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar posts" });
  }
});

// Criar Post (Genérico para todos os tipos)
router.post("/", authRequired, upload.single("media"), handleUpload, async (req, res) => {
  try {
    // Recebe os dados como string JSON se vierem de FormData complexo, ou direto do body
    const { type, title, category, text, linkUrl, pollOptions, quizQuestions } = req.body;

    // Parsear arrays se vierem como string (devido ao FormData do frontend)
    let parsedPollOptions = [];
    let parsedQuizQuestions = [];

    if (pollOptions) {
      try { parsedPollOptions = JSON.parse(pollOptions); } catch (e) { parsedPollOptions = []; }
    }
    if (quizQuestions) {
      try { parsedQuizQuestions = JSON.parse(quizQuestions); } catch (e) { parsedQuizQuestions = []; }
    }

    const postData = {
      user: req.userId,
      type: type || 'blog',
      title: title || "",
      category: category || "Geral",
      text: text || "",
      mediaUrl: req.file?.fileUrl || null,
      mediaType: req.file?.attachmentType || null,
      linkUrl: linkUrl || "",
      pollOptions: parsedPollOptions,
      quizQuestions: parsedQuizQuestions
    };

    const post = await Post.create(postData);
    res.json(await post.populate("user", "name avatarUrl _id"));
  } catch (error) {
    console.error("Erro ao criar post:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Votar em Enquete
router.post("/:id/vote", authRequired, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post || post.type !== 'poll') return res.status(400).json({ error: "Enquete inválida" });

    // Remove voto anterior se existir em qualquer opção
    post.pollOptions.forEach(opt => {
      opt.votes = opt.votes.filter(uid => uid.toString() !== req.userId);
    });

    // Adiciona novo voto
    if (post.pollOptions[optionIndex]) {
      post.pollOptions[optionIndex].votes.push(req.userId);
    }

    await post.save();
    res.json(post); // Retorna o post atualizado
  } catch (e) {
    res.status(500).json({ error: "Erro ao votar" });
  }
});

// Editar post
router.put("/:id", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });
    if (post.user.toString() !== req.userId) return res.status(403).json({ error: "Não autorizado" });

    post.text = req.body.text || post.text;
    post.title = req.body.title || post.title;
    post.category = req.body.category || post.category;
    post.isEdited = true;
    await post.save();

    const populated = await Post.findById(post._id)
      .populate("user", "name avatarUrl _id")
      .populate("comments.user", "name avatarUrl _id")
      .populate("reactions.user", "name avatarUrl _id");
    res.json(populated);
  } catch (e) {
    res.status(500).json({ error: "Falha ao editar." });
  }
});

// Reagir
router.post("/:id/react", authRequired, async (req, res) => {
  const { reactionType } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    const existingIdx = post.reactions.findIndex(r => r.user.toString() === req.userId);
    if (existingIdx > -1) {
      if (post.reactions[existingIdx].type === reactionType) post.reactions.splice(existingIdx, 1);
      else post.reactions[existingIdx].type = reactionType;
    } else {
      post.reactions.push({ user: req.userId, type: reactionType });
      // Notificar
      if (post.user.toString() !== req.userId) {
        await Notification.create({ recipient: post.user, sender: req.userId, type: 'LIKE', postId: post._id });
      }
    }
    await post.save();

    const populated = await Post.findById(post._id)
      .populate("user", "name avatarUrl _id")
      .populate("comments.user", "name avatarUrl _id")
      .populate("reactions.user", "name avatarUrl _id")
      .populate("repostOf");
    res.json(populated);
  } catch (e) { res.status(500).json({ error: "Erro ao reagir" }); }
});

// Comentar
router.post("/:id/comment", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    post.comments.push({ user: req.userId, text: req.body.text });
    await post.save();

    if (post.user.toString() !== req.userId) {
      await Notification.create({ recipient: post.user, sender: req.userId, type: 'COMMENT', postId: post._id });
    }

    const populated = await Post.findById(post._id)
      .populate("user", "name avatarUrl _id")
      .populate("comments.user", "name avatarUrl _id")
      .populate("reactions.user", "name avatarUrl _id")
      .populate("repostOf");
    res.json(populated);
  } catch (e) { res.status(500).json({ error: "Erro ao comentar" }); }
});

// Apagar
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });
    if (post.user.toString() !== req.userId) return res.status(403).json({ error: "Não autorizado" });
    await post.deleteOne();
    res.json({ message: "Deletado" });
  } catch (e) { res.status(500).json({ error: "Erro ao deletar" }); }
});

// Partilhar
router.post("/:id/share", authRequired, async (req, res) => {
  try {
    const original = await Post.findById(req.params.id);
    if (!original) return res.status(404).json({ error: "Original não encontrado" });
    const share = await Post.create({ user: req.userId, text: req.body.text || "", repostOf: original._id, type: 'blog' }); // Reposts geralmente são blogs simples
    const pop = await share.populate([{ path: 'user', select: 'name avatarUrl _id' }, { path: 'repostOf', populate: { path: 'user', select: 'name avatarUrl _id' } }]);
    res.status(201).json(pop);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;