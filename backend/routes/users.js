import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// Get My Profile
router.get("/me", authRequired, async (req, res) => {
  const me = await User.findById(req.userId).select("-password").lean();
  res.json(me);
});

// Update Profile
router.post("/me", authRequired, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), handleUpload, async (req, res) => {
  try {
    const updates = { bio: req.body.bio || "" };
    if (req.files?.avatar?.[0]?.fileUrl) updates.avatarUrl = req.files.avatar[0].fileUrl;
    if (req.files?.coverPhoto?.[0]?.fileUrl) updates.coverPhotoUrl = req.files.coverPhoto[0].fileUrl;

    const me = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-password");
    res.json(me);
  } catch (error) {
    res.status(500).json({ error: "Falha ao atualizar o perfil." });
  }
});

// Search
router.get("/search", authRequired, async (req, res) => {
  const q = req.query.q || "";
  const re = new RegExp(q, "i");
  const users = await User.find({ $or: [{ name: re }, { email: re }] }).select("name avatarUrl _id");
  res.json(users);
});

// Follow User
router.post("/:id/follow", authRequired, async (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: "Não pode seguir a si mesmo" });

  const target = await User.findById(req.params.id);
  const me = await User.findById(req.userId);

  if (!target || !me) return res.status(404).json({ error: "Usuário não encontrado" });

  // Adiciona aos seguidores/seguindo se não existir
  if (!target.followers.includes(me._id)) {
    target.followers.push(me._id);
    target.reputation += 1; // Ganha reputação ao ser seguido
    await target.save();
  }

  if (!me.following.includes(target._id)) {
    me.following.push(target._id);
    await me.save();
  }

  res.json({ ok: true });
});

// Unfollow User
router.post("/:id/unfollow", authRequired, async (req, res) => {
  const target = await User.findById(req.params.id);
  const me = await User.findById(req.userId);

  if (target && me) {
    target.followers = target.followers.filter(id => id.toString() !== me._id.toString());
    target.reputation = Math.max(0, target.reputation - 1);
    await target.save();

    me.following = me.following.filter(id => id.toString() !== target._id.toString());
    await me.save();
  }
  res.json({ ok: true });
});

// Get Public Profile (Completo com Mural)
router.get("/:id", authRequired, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  if (req.params.id !== req.userId) {
    await User.findByIdAndUpdate(req.params.id, { $inc: { profileViews: 1 } });
  }

  const user = await User.findById(req.params.id)
    .select("-password")
    .populate("following", "name avatarUrl _id")
    .populate("followers", "name avatarUrl _id");

  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  // Posts criados pelo usuário (Blog/Feed Pessoal)
  const posts = await Post.find({ user: user._id, postedTo: null, community: null })
    .populate("user", "name avatarUrl _id")
    .populate("comments.user", "name avatarUrl _id")
    .populate("reactions.user", "name avatarUrl _id")
    .sort({ createdAt: -1 });

  // Posts no Mural (Postados PARA este usuário)
  const wallPosts = await Post.find({ postedTo: user._id })
    .populate("user", "name avatarUrl _id")
    .populate("comments.user", "name avatarUrl _id")
    .populate("reactions.user", "name avatarUrl _id")
    .sort({ createdAt: -1 });

  res.json({ user, posts, wallPosts });
});

export default router;