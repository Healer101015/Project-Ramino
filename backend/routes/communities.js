import express from "express";
import Community from "../models/Community.js";
import Channel from "../models/Channel.js";
import CommunityMember from "../models/CommunityMember.js";
import Post from "../models/Post.js";
import Message from "../models/Message.js";
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// --- MIDDLEWARES ---
const requireMod = async (req, res, next) => {
    try {
        const member = await CommunityMember.findOne({ community: req.params.id, user: req.userId });
        if (!member || (member.role !== 'leader' && member.role !== 'curator')) {
            return res.status(403).json({ error: "Permissão negada." });
        }
        req.memberRole = member.role;
        next();
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const requireLeader = async (req, res, next) => {
    try {
        const member = await CommunityMember.findOne({ community: req.params.id, user: req.userId });
        if (!member || member.role !== 'leader') {
            return res.status(403).json({ error: "Permissão negada." });
        }
        next();
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- ROTAS GERAIS ---

// Listar todas as comunidades
router.get("/", authRequired, async (req, res) => {
    try {
        const communities = await Community.find()
            .select("name description avatarUrl coverUrl members appearance themeColor");
        res.json(communities);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Criar Comunidade
router.post("/", authRequired, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), handleUpload, async (req, res) => {
    try {
        const { name, description, rules, initialAdmins } = req.body;
        if (!name) return res.status(400).json({ error: "Nome obrigatório" });

        let admins = [];
        if (initialAdmins) try { admins = JSON.parse(initialAdmins); } catch (e) { }

        const community = await Community.create({
            name, description, rules: rules || "",
            owner: req.userId,
            members: [...new Set([req.userId, ...admins])],
            avatarUrl: req.files?.avatar?.[0]?.fileUrl || "",
            coverUrl: req.files?.cover?.[0]?.fileUrl || "",
            // Layout padrão inicial da Home
            homeLayout: [{ type: 'rich_text', title: 'Bem-vindo!', content: 'Obrigado por entrar na comunidade.', order: 0 }]
        });

        await CommunityMember.create({ community: community._id, user: req.userId, role: 'leader', xp: 500, level: 5, titles: ['Criador'] });

        for (const adminId of admins) {
            if (adminId !== req.userId) await CommunityMember.create({ community: community._id, user: adminId, role: 'leader', xp: 100, level: 1 });
        }

        await Channel.create({ community: community._id, name: "Geral", isPrivate: false });
        res.json(community);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obter Detalhes
router.get("/:id", authRequired, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id).populate("members", "name avatarUrl _id");
        if (!community) return res.status(404).json({ error: "Não encontrada" });
        if (community.bannedUsers?.includes(req.userId)) return res.status(403).json({ error: "Banido." });

        const channels = await Channel.find({
            community: community._id,
            $or: [{ isPrivate: false }, { isPrivate: true, allowedUsers: req.userId }]
        }).sort({ type: 1, createdAt: 1 });

        const myMember = await CommunityMember.findOne({ community: community._id, user: req.userId });

        res.json({
            community,
            channels,
            myRole: myMember?.role || 'guest',
            isMember: !!myMember
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Editar Comunidade (Aparência, Configs e Layout)
router.put("/:id", authRequired, requireLeader, upload.fields([{ name: 'background', maxCount: 1 }]), handleUpload, async (req, res) => {
    try {
        const { name, description, rules, primaryColor, categories, allowMemberCreatedChats, homeLayout } = req.body;

        const updates = {};
        if (name) updates.name = name;
        if (description) updates.description = description;
        if (rules) updates.rules = rules;

        // Aparência (V5.0)
        if (primaryColor) updates["appearance.primaryColor"] = primaryColor;
        if (req.files?.background?.[0]?.fileUrl) updates["appearance.backgroundImage"] = req.files.background[0].fileUrl;

        if (categories) {
            try { updates.categories = JSON.parse(categories); } catch (e) { }
        }

        // Configurações de Chat (V8.0)
        if (allowMemberCreatedChats !== undefined) {
            updates["chatSettings.allowMemberCreatedChats"] = allowMemberCreatedChats === 'true';
        }

        // Layout da Home (V11.0)
        if (homeLayout) {
            try { updates.homeLayout = JSON.parse(homeLayout); } catch (e) { }
        }

        const updated = await Community.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
        res.json(updated);
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

// Posts
router.get("/:id/posts", authRequired, async (req, res) => {
    try {
        const { category, featured } = req.query;
        const filter = { community: req.params.id };
        if (category && category !== 'Todas') filter.category = category;

        // Filtro para widget de destaques da Home
        if (featured === 'true') filter["featured.isFeatured"] = true;

        const posts = await Post.find(filter).populate("user", "name avatarUrl _id").populate("comments.user", "name avatarUrl _id").populate("reactions.user", "name avatarUrl _id").sort({ "featured.isFeatured": -1, isPinned: -1, createdAt: -1 }).limit(50);
        res.json(posts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/posts", authRequired, upload.single("media"), handleUpload, async (req, res) => {
    try {
        const { type, title, category, text, linkUrl, pollOptions, quizQuestions, tags } = req.body;
        const community = await Community.findById(req.params.id);
        if (community.bannedUsers?.includes(req.userId)) return res.status(403).json({ error: "Banido." });

        let parsedPolls = [], parsedQuiz = [], parsedTags = [];
        try { if (pollOptions) parsedPolls = JSON.parse(pollOptions); } catch (e) { }
        try { if (quizQuestions) parsedQuiz = JSON.parse(quizQuestions); } catch (e) { }
        try { if (tags) parsedTags = JSON.parse(tags); } catch (e) { }

        const post = await Post.create({
            user: req.userId, community: req.params.id,
            type: type || 'blog', title: title || "",
            category: category || "Geral", tags: parsedTags,
            text: text || "",
            mediaUrl: req.file?.fileUrl, mediaType: req.file?.attachmentType,
            linkUrl, pollOptions: parsedPolls, quizQuestions: parsedQuiz
        });
        res.json(await post.populate("user", "name avatarUrl _id"));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin/Mod Actions
router.post("/:id/posts/:postId/feature", authRequired, requireMod, async (req, res) => {
    const p = await Post.findById(req.params.postId);
    p.featured = { isFeatured: !p.featured.isFeatured, priority: 2, featuredAt: new Date() };
    await p.save(); res.json(p);
});
router.post("/:id/posts/:postId/pin", authRequired, requireMod, async (req, res) => {
    const p = await Post.findById(req.params.postId); p.isPinned = !p.isPinned; await p.save(); res.json(p);
});
router.delete("/:id/posts/:postId", authRequired, requireMod, async (req, res) => { await Post.findByIdAndDelete(req.params.postId); res.json({ ok: true }); });

// Members
router.get("/:id/members_list", authRequired, async (req, res) => { const m = await CommunityMember.find({ community: req.params.id }).populate("user", "name avatarUrl"); res.json(m); });
router.post("/:id/role", authRequired, requireLeader, async (req, res) => { await CommunityMember.findOneAndUpdate({ community: req.params.id, user: req.body.targetUserId }, { role: req.body.role }); res.json({ ok: true }); });
router.post("/:id/ban", authRequired, requireLeader, async (req, res) => { /* logica ban... */ res.json({ ok: true }); });

// Channels (V8.0 - Tipos e Permissões)
router.post("/:id/channels", authRequired, async (req, res) => {
    const { name, isPrivate, type } = req.body;

    const community = await Community.findById(req.params.id);
    const member = await CommunityMember.findOne({ community: community._id, user: req.userId });

    const isLeader = member?.role === 'leader';
    const canCreate = isLeader || community.chatSettings.allowMemberCreatedChats;

    if (!canCreate) return res.status(403).json({ error: "Criação de chats desativada para membros." });
    if (!name) return res.status(400).json({ error: "Nome obrigatório" });

    let channelType = 'general';
    if (isLeader && (type === 'official' || type === 'event')) {
        channelType = type;
    }

    const ch = await Channel.create({
        community: req.params.id,
        name,
        isPrivate: !!isPrivate,
        type: channelType,
        allowedUsers: [req.userId]
    });
    res.json(ch);
});

router.get("/channels/:channelId/messages", authRequired, async (req, res) => {
    const m = await Message.find({ channel: req.params.channelId }).populate("sender", "name avatarUrl").sort({ createdAt: 1 });
    res.json(m);
});

// XP/Rank
router.get("/:id/my-status", authRequired, async (req, res) => { const m = await CommunityMember.findOne({ community: req.params.id, user: req.userId }); res.json(m || { xp: 0, level: 1 }); });
router.get("/:id/ranking", authRequired, async (req, res) => { const r = await CommunityMember.find({ community: req.params.id }).sort({ xp: -1 }).limit(10).populate("user", "name avatarUrl"); res.json(r); });

export default router;