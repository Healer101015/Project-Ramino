import express from "express";
import Community from "../models/Community.js";
import Channel from "../models/Channel.js";
import CommunityMember from "../models/CommunityMember.js";
import Post from "../models/Post.js";
import Message from "../models/Message.js";
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// --- MIDDLEWARES DE PERMISSÃO ---
const requireMod = async (req, res, next) => {
    try {
        const member = await CommunityMember.findOne({ community: req.params.id, user: req.userId });
        if (!member || (member.role !== 'leader' && member.role !== 'curator')) {
            return res.status(403).json({ error: "Permissão negada. Requer Curador ou Líder." });
        }
        req.memberRole = member.role;
        next();
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const requireLeader = async (req, res, next) => {
    try {
        const member = await CommunityMember.findOne({ community: req.params.id, user: req.userId });
        if (!member || member.role !== 'leader') {
            return res.status(403).json({ error: "Permissão negada. Requer Líder." });
        }
        next();
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- ROTAS PÚBLICAS/GERAIS ---

// Listar Comunidades
router.get("/", authRequired, async (req, res) => {
    try {
        const communities = await Community.find().select("name description avatarUrl members");
        res.json(communities);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Criar Comunidade (com Admins Iniciais e Regras)
router.post("/", authRequired, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), handleUpload, async (req, res) => {
    try {
        const { name, description, rules, initialAdmins } = req.body;
        let admins = [];
        if (initialAdmins) try { admins = JSON.parse(initialAdmins); } catch (e) { }

        const allMembers = [req.userId, ...admins];

        const community = await Community.create({
            name, description, rules: rules || "",
            owner: req.userId,
            members: [...new Set(allMembers)],
            avatarUrl: req.files?.avatar?.[0]?.fileUrl || "",
            coverUrl: req.files?.cover?.[0]?.fileUrl || ""
        });

        // Criar registro do Dono (Líder)
        await CommunityMember.create({ community: community._id, user: req.userId, role: 'leader', xp: 500, level: 5, titles: ['Criador'] });

        // Criar registros dos Admins convidados
        for (const adminId of admins) {
            if (adminId !== req.userId) {
                await CommunityMember.create({ community: community._id, user: adminId, role: 'leader', xp: 100, level: 1, titles: ['Admin'] });
            }
        }

        await Channel.create({ community: community._id, name: "Geral", isPrivate: false });
        res.json(community);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Detalhes da Comunidade
router.get("/:id", authRequired, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id).populate("members", "name avatarUrl _id");
        if (!community) return res.status(404).json({ error: "Não encontrada" });
        if (community.bannedUsers?.includes(req.userId)) return res.status(403).json({ error: "Banido." });

        const channels = await Channel.find({
            community: community._id,
            $or: [{ isPrivate: false }, { isPrivate: true, allowedUsers: req.userId }]
        });

        const myMember = await CommunityMember.findOne({ community: community._id, user: req.userId });

        res.json({ community, channels, myRole: myMember?.role || 'guest', isMember: !!myMember });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Entrar
router.post("/:id/join", authRequired, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (community.bannedUsers?.includes(req.userId)) return res.status(403).json({ error: "Banido." });

        if (!community.members.includes(req.userId)) {
            community.members.push(req.userId);
            await community.save();
            const exists = await CommunityMember.findOne({ community: community._id, user: req.userId });
            if (!exists) await CommunityMember.create({ community: community._id, user: req.userId, role: 'member' });
        }
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- FEED ---

router.get("/:id/posts", authRequired, async (req, res) => {
    try {
        const posts = await Post.find({ community: req.params.id })
            .populate("user", "name avatarUrl _id")
            .populate("comments.user", "name avatarUrl _id")
            .populate("reactions.user", "name avatarUrl _id")
            .sort({ isPinned: -1, createdAt: -1 }) // Afixados primeiro
            .limit(50);
        res.json(posts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Criar Post (Complexo)
router.post("/:id/posts", authRequired, upload.single("media"), handleUpload, async (req, res) => {
    try {
        const { type, title, category, text, linkUrl, pollOptions, quizQuestions } = req.body;
        const community = await Community.findById(req.params.id);
        if (community.bannedUsers?.includes(req.userId)) return res.status(403).json({ error: "Banido." });

        let parsedPollOptions = [], parsedQuizQuestions = [];
        if (pollOptions) try { parsedPollOptions = JSON.parse(pollOptions); } catch (e) { }
        if (quizQuestions) try { parsedQuizQuestions = JSON.parse(quizQuestions); } catch (e) { }

        const post = await Post.create({
            user: req.userId,
            community: req.params.id,
            type: type || 'blog',
            title: title || "",
            category: category || "Geral",
            text: text || "",
            mediaUrl: req.file?.fileUrl,
            mediaType: req.file?.attachmentType,
            linkUrl: linkUrl || "",
            pollOptions: parsedPollOptions,
            quizQuestions: parsedQuizQuestions
        });

        res.json(await post.populate("user", "name avatarUrl _id"));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- MODERAÇÃO (V2.0) ---

router.put("/:id/rules", authRequired, requireLeader, async (req, res) => {
    try {
        await Community.findByIdAndUpdate(req.params.id, { rules: req.body.rules });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/posts/:postId/pin", authRequired, requireMod, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        post.isPinned = !post.isPinned;
        await post.save();
        res.json(post);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id/posts/:postId", authRequired, requireMod, async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.postId);
        res.json({ message: "Removido." });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/ban", authRequired, requireLeader, async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const community = await Community.findById(req.params.id);
        if (targetUserId === req.userId) return res.status(400).json({ error: "Erro." });

        if (!community.bannedUsers.includes(targetUserId)) {
            community.bannedUsers.push(targetUserId);
            community.members = community.members.filter(id => id.toString() !== targetUserId);
            await community.save();
            await CommunityMember.findOneAndDelete({ community: community._id, user: targetUserId });
        }
        res.json({ message: "Banido." });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- GESTÃO DE MEMBROS ---

router.get("/:id/members_list", authRequired, async (req, res) => {
    try {
        const members = await CommunityMember.find({ community: req.params.id }).populate("user", "name avatarUrl email");
        res.json(members);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/role", authRequired, requireLeader, async (req, res) => {
    try {
        const { targetUserId, role } = req.body;
        if (!['leader', 'curator', 'member'].includes(role)) return res.status(400).json({ error: "Inválido" });
        await CommunityMember.findOneAndUpdate({ community: req.params.id, user: targetUserId }, { role });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- XP & CANAIS (V8.0) ---

router.get("/:id/my-status", authRequired, async (req, res) => {
    const m = await CommunityMember.findOne({ community: req.params.id, user: req.userId });
    res.json(m || { xp: 0, level: 1 });
});

router.get("/:id/ranking", authRequired, async (req, res) => {
    const r = await CommunityMember.find({ community: req.params.id }).sort({ xp: -1 }).limit(10).populate("user", "name avatarUrl");
    res.json(r);
});

router.post("/:id/channels", authRequired, requireLeader, async (req, res) => {
    const ch = await Channel.create({
        community: req.params.id, name: req.body.name,
        isPrivate: req.body.isPrivate, allowedUsers: req.body.allowedUsers ? [...req.body.allowedUsers, req.userId] : [req.userId]
    });
    res.json(ch);
});

router.get("/channels/:channelId/messages", authRequired, async (req, res) => {
    const ch = await Channel.findById(req.params.channelId);
    if (ch.isPrivate && !ch.allowedUsers.includes(req.userId)) return res.status(403).json({ error: "Privado" });
    const msgs = await Message.find({ channel: req.params.channelId }).populate("sender", "name avatarUrl").sort({ createdAt: 1 });
    res.json(msgs);
});

export default router;