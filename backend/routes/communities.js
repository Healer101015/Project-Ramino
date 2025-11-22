import express from "express";
import Community from "../models/Community.js";
import Channel from "../models/Channel.js";
import Message from "../models/Message.js";
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
            members: [req.userId], // Dono é o primeiro membro
            avatarUrl: req.file?.fileUrl || ""
        });

        // Cria um canal padrão "Geral"
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
        }
        res.json(community);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obter detalhes da comunidade e canais
router.get("/:id", authRequired, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id).populate("members", "name avatarUrl _id");
        if (!community) return res.status(404).json({ error: "Comunidade não encontrada" });

        // Buscar canais que o usuário tem permissão para ver
        // 1. Canais públicos
        // 2. Canais privados onde o usuário está na lista allowedUsers
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

// Criar Canal (Público ou Privado)
router.post("/:id/channels", authRequired, async (req, res) => {
    try {
        const { name, isPrivate, allowedUsers } = req.body; // allowedUsers deve ser array de IDs
        const community = await Community.findById(req.params.id);

        if (!community) return res.status(404).json({ error: "Comunidade não encontrada" });
        // Apenas dono pode criar canais (ou adicione lógica de admin)
        if (community.owner.toString() !== req.userId) return res.status(403).json({ error: "Apenas o dono pode criar canais" });

        let users = [];
        if (isPrivate && Array.isArray(allowedUsers)) {
            users = [...allowedUsers, req.userId]; // Inclui o criador
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

// Buscar mensagens de um canal
router.get("/channels/:channelId/messages", authRequired, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) return res.status(404).json({ error: "Canal não encontrado" });

        // Verificar acesso
        if (channel.isPrivate && !channel.allowedUsers.includes(req.userId)) {
            return res.status(403).json({ error: "Acesso negado a este canal privado" });
        }

        const messages = await Message.find({ channel: channel._id })
            .populate("sender", "name avatarUrl")
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;