import express from "express";
import Post from "../models/Post.js";
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// LISTAR FEED (FILTRAGEM RIGOROSA)
router.get("/", authRequired, async (req, res) => {
  try {
    const filter = {};

    if (req.query.community) {
      // CENÁRIO 1: Feed da Comunidade (Apenas posts DESTA comunidade)
      filter.community = req.query.community;
    } else {
      // CENÁRIO 2: Feed Geral / Descobrir (Home)
      // OBRIGATÓRIO: Excluir posts de comunidades e murais
      filter.community = null;
      filter.postedTo = null;
    }

    const posts = await Post.find(filter)
      .populate("user", "name avatarUrl _id")
      .populate("community", "name _id")
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
    res.status(500).json({ error: e.message });
  }
});

// CRIAR POST (GERAL, COMUNIDADE OU MURAL)
router.post("/", authRequired, upload.single("media"), handleUpload, async (req, res) => {
  try {
    const { text, communityId, title, type, postedTo, pollOptions, linkUrl } = req.body;

    let parsedPollOptions = [];
    if (pollOptions) {
      try { parsedPollOptions = JSON.parse(pollOptions); } catch (e) { }
    }

    const post = await Post.create({
      user: req.userId,

      // Definição de Destino (CRÍTICO)
      community: communityId || null,
      postedTo: postedTo || null,

      // Conteúdo
      title: title || "",
      text: text || "",
      type: type || 'blog',
      linkUrl: linkUrl || "",
      pollOptions: parsedPollOptions,
      mediaUrl: req.file?.fileUrl || null,
      mediaType: req.file?.attachmentType || null
    });

    const populatedPost = await Post.findById(post._id)
      .populate("user", "name avatarUrl _id")
      .populate("community", "name _id");

    res.json(populatedPost);
  } catch (error) {
    console.error("Erro ao criar post:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// VOTAR EM ENQUETE
router.post("/:id/vote", authRequired, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post || post.type !== 'poll') return res.status(400).json({ error: "Enquete inválida" });

    post.pollOptions.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.toString() !== req.userId);
    });

    if (post.pollOptions[optionIndex]) {
      post.pollOptions[optionIndex].votes.push(req.userId);
    }

    await post.save();
    const updated = await Post.findById(post._id).populate("user", "name avatarUrl _id");
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// EDITAR, DELETAR, REAGIR, COMENTAR, SHARE (Padrão)
router.put("/:id", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.user.toString() !== req.userId) return res.status(403).json({ error: "Erro" });
    post.text = req.body.text || post.text;
    if (req.body.title) post.title = req.body.title;
    post.isEdited = true;
    await post.save();
    res.json(await Post.findById(post._id).populate("user", "name avatarUrl _id"));
  } catch (e) { res.status(500).json({ error: "Erro" }); }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.user.toString() !== req.userId) return res.status(403).json({ error: "Erro" });
    await post.deleteOne();
    res.json({ message: "Deletado" });
  } catch (e) { res.status(500).json({ error: "Erro" }); }
});

router.post("/:id/react", authRequired, async (req, res) => {
  try {
    const { reactionType } = req.body;
    const post = await Post.findById(req.params.id);
    const idx = post.reactions.findIndex(r => r.user.toString() === req.userId);
    if (idx > -1) {
      if (post.reactions[idx].type === reactionType) post.reactions.splice(idx, 1);
      else post.reactions[idx].type = reactionType;
    } else {
      post.reactions.push({ user: req.userId, type: reactionType });
    }
    await post.save();
    res.json(await Post.findById(post._id).populate("user", "name avatarUrl _id").populate("reactions.user", "name avatarUrl _id"));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/comment", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    post.comments.push({ user: req.userId, text: req.body.text });
    await post.save();
    res.json(await Post.findById(post._id).populate("user", "name avatarUrl _id").populate("comments.user", "name avatarUrl _id"));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;