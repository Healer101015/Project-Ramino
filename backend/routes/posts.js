import express from "express";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// Listar Feed (Posts Gerais)
router.get("/", authRequired, async (req, res) => {
  try {
    // Retorna posts que NÃO são de mural específico (feed geral)
    // Em um sistema real, você filtraria por "quem eu sigo" aqui.
    const posts = await Post.find({ postedTo: null })
      .populate("user", "name avatarUrl _id")
      .populate("comments.user", "name avatarUrl _id")
      .populate("reactions.user", "name avatarUrl _id")
      .populate({
        path: 'repostOf',
        populate: [
          { path: 'user', select: 'name avatarUrl _id' },
          { path: 'reactions.user', select: 'name avatarUrl _id' },
          { path: 'comments.user', select: 'name avatarUrl _id' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar posts" });
  }
});

// Criar Post (Suporta todos os tipos e Mural)
router.post("/", authRequired, upload.single("media"), handleUpload, async (req, res) => {
  try {
    const { type, title, category, text, linkUrl, pollOptions, quizQuestions, postedTo } = req.body;

    // Parsear JSONs que vêm como string no FormData
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
      postedTo: postedTo || null, // Se tiver ID, é um post no mural
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

    // Notificar o dono do mural se alguém postou lá
    if (postedTo && postedTo !== req.userId) {
      // Usando tipo 'COMMENT' como genérico para "interação" se não houver tipo WALL_POST específico
      await Notification.create({
        recipient: postedTo,
        sender: req.userId,
        type: 'COMMENT', // Ou crie um tipo 'WALL_POST' no enum do Notification
        postId: post._id
      });
    }

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

    // Remove voto anterior do usuário (se houver)
    post.pollOptions.forEach(opt => {
      opt.votes = opt.votes.filter(uid => uid.toString() !== req.userId);
    });

    // Adiciona novo voto
    if (post.pollOptions[optionIndex]) {
      post.pollOptions[optionIndex].votes.push(req.userId);
    }

    await post.save();
    res.json(post);
  } catch (e) {
    res.status(500).json({ error: "Erro ao votar" });
  }
});

// Editar Post
router.put("/:id", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ error: "Não autorizado" });
    }

    // Atualiza campos editáveis
    post.text = req.body.text || post.text;
    post.title = req.body.title || post.title;
    post.category = req.body.category || post.category;
    post.isEdited = true;

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate("user", "name avatarUrl _id")
      .populate("comments.user", "name avatarUrl _id")
      .populate("reactions.user", "name avatarUrl _id");
    res.json(populatedPost);
  } catch (e) {
    res.status(500).json({ error: "Falha ao editar o post." });
  }
});

// Reagir (Like, Love, etc.)
router.post("/:id/react", authRequired, async (req, res) => {
  const { reactionType } = req.body;
  if (!['like', 'love', 'haha', 'sad'].includes(reactionType)) {
    return res.status(400).json({ error: "Reação inválida" });
  }

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    const existingIdx = post.reactions.findIndex(r => r.user.toString() === req.userId);
    let added = false;

    if (existingIdx > -1) {
      if (post.reactions[existingIdx].type === reactionType) {
        post.reactions.splice(existingIdx, 1); // Remove (toggle)
      } else {
        post.reactions[existingIdx].type = reactionType; // Atualiza
      }
    } else {
      post.reactions.push({ user: req.userId, type: reactionType }); // Adiciona
      added = true;
    }

    await post.save();

    if (added && post.user.toString() !== req.userId) {
      await Notification.create({
        recipient: post.user,
        sender: req.userId,
        type: 'LIKE',
        postId: post._id
      });
    }

    const populated = await Post.findById(post._id)
      .populate("user", "name avatarUrl _id")
      .populate("comments.user", "name avatarUrl _id")
      .populate("reactions.user", "name avatarUrl _id")
      .populate("repostOf");

    res.json(populated);
  } catch (e) {
    res.status(500).json({ error: "Erro ao reagir" });
  }
});

// Comentar
router.post("/:id/comment", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    post.comments.push({ user: req.userId, text: req.body.text });
    await post.save();

    if (post.user.toString() !== req.userId) {
      await Notification.create({
        recipient: post.user,
        sender: req.userId,
        type: 'COMMENT',
        postId: post._id
      });
    }

    const populated = await Post.findById(post._id)
      .populate("user", "name avatarUrl _id")
      .populate("comments.user", "name avatarUrl _id")
      .populate("reactions.user", "name avatarUrl _id")
      .populate("repostOf");

    res.json(populated);
  } catch (e) {
    res.status(500).json({ error: "Erro ao comentar" });
  }
});

// Apagar Post
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    // Permite apagar se for dono do post OU dono do mural onde foi postado
    const isOwner = post.user.toString() === req.userId;
    const isWallOwner = post.postedTo && post.postedTo.toString() === req.userId;

    if (!isOwner && !isWallOwner) {
      return res.status(403).json({ error: "Não autorizado" });
    }

    await post.deleteOne();

    res.json({ message: "Post deletado com sucesso" });
  } catch (e) {
    console.error("Erro ao deletar post:", e);
    res.status(500).json({ error: "Falha ao deletar o post." });
  }
});

// Compartilhar Post
router.post("/:id/share", authRequired, async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);
    if (!originalPost) return res.status(404).json({ error: "Post original não encontrado" });

    const sharePost = await Post.create({
      user: req.userId,
      text: req.body.text || "",
      repostOf: originalPost._id,
      type: 'blog' // Reposts são tratados como blogs simples com referência
    });

    const populatedShare = await sharePost.populate([
      { path: 'user', select: 'name avatarUrl _id' },
      {
        path: 'repostOf',
        populate: { path: 'user', select: 'name avatarUrl _id' }
      }
    ]);
    res.status(201).json(populatedShare);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;