// backend/routes/posts.js

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

// Criar Post (Fórum)
router.post("/", authRequired, upload.single("media"), handleUpload, async (req, res) => {
  try {
    const { text, title, category } = req.body; // Recebe título e categoria

    const post = await Post.create({
      user: req.userId,
      title: title || "",
      category: category || "Geral",
      text: text || "",
      mediaUrl: req.file?.fileUrl || null,
      mediaType: req.file?.attachmentType || null
    });

    res.json(await post.populate("user", "name avatarUrl _id"));
  } catch (error) {
    console.error("Erro ao criar post:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Editar post
router.put("/:id", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ error: "Não autorizado" });
    }

    post.text = req.body.text || post.text;
    post.title = req.body.title || post.title; // Atualiza título
    post.category = req.body.category || post.category; // Atualiza categoria
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

// Reagir a um post
router.post("/:id/react", authRequired, async (req, res) => {
  const { reactionType } = req.body;
  if (!['like', 'love', 'haha', 'sad'].includes(reactionType)) {
    return res.status(400).json({ error: "Tipo de reação inválida" });
  }

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    const existingReactionIndex = post.reactions.findIndex(r => r.user.toString() === req.userId);

    let added = false;
    if (existingReactionIndex > -1) {
      if (post.reactions[existingReactionIndex].type === reactionType) {
        post.reactions.splice(existingReactionIndex, 1);
      } else {
        post.reactions[existingReactionIndex].type = reactionType;
      }
    } else {
      post.reactions.push({ user: req.userId, type: reactionType });
      added = true;
    }

    await post.save();

    // Notificar apenas se foi uma nova reação e não é o próprio dono
    if (added && post.user.toString() !== req.userId) {
      await Notification.create({
        recipient: post.user,
        sender: req.userId,
        type: 'LIKE',
        postId: post._id
      });
    }

    const populatedPost = await Post.findById(post._id)
      .populate("user", "name avatarUrl _id")
      .populate("comments.user", "name avatarUrl _id")
      .populate("reactions.user", "name avatarUrl _id")
      .populate("repostOf");

    res.json(populatedPost);
  } catch (e) {
    res.status(500).json({ error: "Erro ao reagir" });
  }
});

// Partilhar um post
router.post("/:id/share", authRequired, async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);
    if (!originalPost) return res.status(404).json({ error: "Post original não encontrado" });

    const sharePost = await Post.create({
      user: req.userId,
      text: req.body.text || "",
      repostOf: originalPost._id,
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

// Comentar
router.post("/:id/comment", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    const c = { user: req.userId, text: req.body.text };
    post.comments.push(c);
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

// Apagar post
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ error: "Não autorizado" });
    }

    await post.deleteOne();

    res.json({ message: "Post deletado com sucesso" });
  } catch (e) {
    console.error("Erro ao deletar post:", e);
    res.status(500).json({ error: "Falha ao deletar o post." });
  }
});

export default router;