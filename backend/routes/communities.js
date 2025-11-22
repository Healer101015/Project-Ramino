import express from "express";
import Community from "../models/Community.js";
import Channel from "../models/Channel.js";
import Message from "../models/Message.js";
import CommunityMember from "../models/CommunityMember.js"; // Modelo de XP/Membro
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// Listar todas as comunidades
router.get("/", authRequired, async (req, res) => {
    try {
        const communities = await Community.find().select("name description avatarUrl members");
        res.json(communities);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Criar Comunidade
router.post("/", authRequired, upload.single("avatar"), handleUpload, async (req, res) => {
    try {
        const { name, description } = req.body;
        const community = await Community.create({
            name,
            description,
            owner: req.userId,
            members: [req.userId],
            avatarUrl: req.file?.fileUrl || ""
        });

        // Inicializar o criador como membro Admin com Nível 1 e um pouco de XP inicial
        await CommunityMember.create({
            community: community._id,
            user: req.userId,
            role: 'admin',
            xp: 100, // Bônus por criar
            level: 1
        });

        // Canal Padrão
        await Channel.create({
            community: community._id,
            name: "Geral",
            isPrivate: false
        });

        res.json(community);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Entrar na comunidade
router.post("/:id/join", authRequired, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) return res.status(404).json({ error: "Comunidade não encontrada" });

        if (!community.members.includes(req.userId)) {
            community.members.push(req.userId);
            await community.save();

            // Inicializar registro de membro (XP 0, Level 1)
            await CommunityMember.create({
                community: community._id,
                user: req.userId,
                role: 'member'
            });
        }
        res.json(community);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obter detalhes da comunidade e canais
router.get("/:id", authRequired, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id).populate("members", "name avatarUrl _id");
        if (!community) return res.status(404).json({ error: "Comunidade não encontrada" });

        const channels = await Channel.find({
            community: community._id,
            $or: [
                { isPrivate: false },
                { isPrivate: true, allowedUsers: req.userId }
            ]
        });

        res.json({ community, channels });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Criar Canal
router.post("/:id/channels", authRequired, async (req, res) => {
    try {
        const { name, isPrivate, allowedUsers } = req.body;
        const community = await Community.findById(req.params.id);

        if (!community) return res.status(404).json({ error: "Comunidade não encontrada" });
        if (community.owner.toString() !== req.userId) return res.status(403).json({ error: "Apenas o dono pode criar canais" });

        let users = [];
        if (isPrivate && Array.isArray(allowedUsers)) {
            users = [...allowedUsers, req.userId];
        }

        const channel = await Channel.create({
            community: community._id,
            name,
            isPrivate: !!isPrivate,
            allowedUsers: users
        });

        res.json(channel);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Buscar mensagens do canal
router.get("/channels/:channelId/messages", authRequired, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) return res.status(404).json({ error: "Canal não encontrado" });

        if (channel.isPrivate && !channel.allowedUsers.includes(req.userId)) {
            return res.status(403).json({ error: "Acesso negado a este canal privado" });
        }

        const messages = await Message.find({ channel: channel._id })
            .populate("sender", "name avatarUrl")
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ROTAS DE XP E RANKING (VERSÃO 8.0) ---

// Obter status do membro logado na comunidade
router.get("/:id/my-status", authRequired, async (req, res) => {
    try {
        // Tenta achar o membro
        let member = await CommunityMember.findOne({ community: req.params.id, user: req.userId });

        // Se não existir (ex: usuário antigo entrou antes da V8.0), cria agora
        if (!member) {
            const comm = await Community.findById(req.params.id);
            // Só cria se ele realmente for membro no array da comunidade
            if (comm && comm.members.includes(req.userId)) {
                member = await CommunityMember.create({ community: req.params.id, user: req.userId });
            }
        }

        // Retorna default se ainda não for membro
        res.json(member || { xp: 0, level: 1, titles: [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obter Ranking (Top 10 por XP)
router.get("/:id/ranking", authRequired, async (req, res) => {
    try {
        const ranking = await CommunityMember.find({ community: req.params.id })
            .sort({ xp: -1 }) // Maior XP primeiro
            .limit(10)
            .populate("user", "name avatarUrl");
        res.json(ranking);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;