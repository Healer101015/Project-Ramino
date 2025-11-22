// backend/routes/users.js
import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// get my profile
router.get("/me", authRequired, async (req, res) => {
  const me = await User.findById(req.userId).select("-password").lean();
  res.json(me);
});

// update profile
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

// search users
router.get("/search", authRequired, async (req, res) => {
  const q = req.query.q || "";
  const re = new RegExp(q, "i");
  const users = await User.find({ $or: [{ name: re }, { email: re }] }).select("name avatarUrl _id followers");
  res.json(users);
});

// --- LÓGICA DE SEGUIR ---

// Follow user
router.post("/:id/follow", authRequired, async (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: "Não pode seguir a si mesmo" });

  const target = await User.findById(req.params.id);
  const me = await User.findById(req.userId);

  if (!target || !me) return res.status(404).json({ error: "Usuário não encontrado" });

  if (me.following.includes(target._id)) return res.json({ ok: true });

  me.following.push(target._id);
  target.followers.push(me._id);

  await me.save();
  await target.save();

  await Notification.create({
    recipient: target._id,
    sender: me._id,
    type: 'FOLLOW'
  });

  res.json({ ok: true });
});

// Unfollow user
router.post("/:id/unfollow", authRequired, async (req, res) => {
  const target = await User.findById(req.params.id);
  const me = await User.findById(req.userId);

  if (!target || !me) return res.status(404).json({ error: "Usuário não encontrado" });

  me.following = me.following.filter(id => id.toString() !== target._id.toString());
  target.followers = target.followers.filter(id => id.toString() !== me._id.toString());

  await me.save();
  await target.save();

  res.json({ ok: true });
});

// --- NOVAS ROTAS: LISTAR SEGUIDORES/SEGUINDO ---

router.get("/:id/followers", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("followers", "name avatarUrl _id");
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(user.followers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id/following", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("following", "name avatarUrl _id");
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(user.following);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ------------------------------------------------

// Get Profile
router.get("/:id", authRequired, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  if (req.params.id !== req.userId) {
    await User.findByIdAndUpdate(req.params.id, { $inc: { profileViews: 1 } });
  }

  const user = await User.findById(req.params.id).select("-password");
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  let followStatus = 'none';
  const me = await User.findById(req.userId);

  const iFollowThem = me.following.includes(user._id);
  const theyFollowMe = me.followers.includes(user._id);

  if (iFollowThem) followStatus = 'following';

  const canChat = iFollowThem && theyFollowMe;

  const posts = await Post.find({ user: user._id })
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
    .sort({ createdAt: -1 });

  res.json({
    user,
    posts,
    followStatus,
    canChat,
    followersCount: user.followers.length,
    followingCount: user.following.length
  });
});

export default router;