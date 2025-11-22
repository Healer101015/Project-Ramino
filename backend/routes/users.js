import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// Get My Profile
router.get("/me", authRequired, async (req, res) => {
  const me = await User.findById(req.userId).select("-password").lean();
  res.json(me);
});

// Update Profile (Com suporte a Galeria e Temas)
// Agora aceita 'gallery' (múltiplos) e 'pageBackground'
router.post("/me", authRequired, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 },
  { name: 'pageBackground', maxCount: 1 },
  { name: 'gallery', maxCount: 5 } // Adicionar até 5 fotos por vez na galeria
]), handleUpload, async (req, res) => {
  try {
    const updates = {
      bio: req.body.bio || "",
      theme: req.body.theme || "light"
    };

    if (req.files?.avatar?.[0]?.fileUrl) updates.avatarUrl = req.files.avatar[0].fileUrl;
    if (req.files?.coverPhoto?.[0]?.fileUrl) updates.coverPhotoUrl = req.files.coverPhoto[0].fileUrl;
    if (req.files?.pageBackground?.[0]?.fileUrl) updates.pageBackgroundUrl = req.files.pageBackground[0].fileUrl;

    // Lógica para adicionar imagens à galeria (sem substituir as antigas, a menos que queira)
    // Aqui vamos fazer push se houver novas
    if (req.files?.gallery) {
      const newImages = req.files.gallery.map(f => f.fileUrl);
      // Push no array existente
      await User.findByIdAndUpdate(req.userId, { $push: { gallery: { $each: newImages } } });
    }

    // Remover imagens da galeria se solicitado (array de urls)
    if (req.body.removeGalleryImages) {
      const imagesToRemove = JSON.parse(req.body.removeGalleryImages);
      if (Array.isArray(imagesToRemove)) {
        await User.findByIdAndUpdate(req.userId, { $pull: { gallery: { $in: imagesToRemove } } });
      }
    }

    const me = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-password");
    res.json(me);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Falha ao atualizar o perfil." });
  }
});

// ... (Search, Follow, Unfollow - Mantidos iguais, omitidos por brevidade se não mudaram) ...
// (Mantenha as rotas follow/unfollow/search do código anterior aqui)
// SEARCH
router.get("/search", authRequired, async (req, res) => {
  const q = req.query.q || "";
  const re = new RegExp(q, "i");
  const users = await User.find({ $or: [{ name: re }, { email: re }] }).select("name avatarUrl _id followers");
  res.json(users);
});

// FOLLOW
router.post("/:id/follow", authRequired, async (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: "Não pode seguir a si mesmo" });
  const target = await User.findById(req.params.id);
  const me = await User.findById(req.userId);
  if (!target || !me) return res.status(404).json({ error: "Usuário não encontrado" });
  if (me.following.includes(target._id)) return res.json({ ok: true });
  me.following.push(target._id);
  target.followers.push(me._id);
  await me.save(); await target.save();
  await Notification.create({ recipient: target._id, sender: me._id, type: 'FOLLOW' });
  res.json({ ok: true });
});

// UNFOLLOW
router.post("/:id/unfollow", authRequired, async (req, res) => {
  const target = await User.findById(req.params.id);
  const me = await User.findById(req.userId);
  if (!target || !me) return res.status(404).json({ error: "Usuário não encontrado" });
  me.following = me.following.filter(id => id.toString() !== target._id.toString());
  target.followers = target.followers.filter(id => id.toString() !== me._id.toString());
  await me.save(); await target.save();
  res.json({ ok: true });
});

// Get Followers/Following Lists
router.get("/:id/followers", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("followers", "name avatarUrl _id");
    res.json(user?.followers || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get("/:id/following", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("following", "name avatarUrl _id");
    res.json(user?.following || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// GET PROFILE (Com Mural e Galeria)
router.get("/:id", authRequired, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: "Usuário inválido" });

  if (req.params.id !== req.userId) {
    await User.findByIdAndUpdate(req.params.id, { $inc: { profileViews: 1 } });
  }

  const user = await User.findById(req.params.id).select("-password");
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  const me = await User.findById(req.userId);
  const followStatus = me.following.includes(user._id) ? 'following' : 'none';
  const canChat = me.following.includes(user._id) && me.followers.includes(user._id);

  // Buscar Posts do Usuário (Feed Pessoal)
  const posts = await Post.find({ user: user._id, postedTo: null }) // Apenas posts que ele fez no próprio feed
    .populate("user", "name avatarUrl _id")
    .populate("comments.user", "name avatarUrl _id")
    .populate("reactions.user", "name avatarUrl _id")
    .populate("repostOf")
    .sort({ createdAt: -1 });

  // Buscar Mural (Posts feitos PARA este usuário)
  const wallPosts = await Post.find({ postedTo: user._id })
    .populate("user", "name avatarUrl _id")
    .populate("comments.user", "name avatarUrl _id")
    .populate("reactions.user", "name avatarUrl _id")
    .sort({ createdAt: -1 });

  res.json({
    user,
    posts,
    wallPosts, // Novo
    followStatus,
    canChat,
    followersCount: user.followers.length,
    followingCount: user.following.length
  });
});

export default router;