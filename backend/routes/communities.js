import express from "express";
import Community from "../models/Community.js";
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// Listar todas as comunidades
router.get("/", authRequired, async (req, res) => {
    try {
        let communities = await Community.find()
            .populate("members", "name avatarUrl _id")
            .select("name description avatarUrl coverUrl members appearance") // Otimização
            .sort({ "members.length": -1 });

        // SEED: Cria uma comunidade rica se não existir
        if (communities.length === 0) {
            const official = await Community.create({
                name: "Healer Official",
                description: "A comunidade oficial para novidades e suporte do Healer.",
                owner: req.userId,
                members: [req.userId],
                avatarUrl: "https://ui-avatars.com/api/?name=Healer&background=6200ea&color=fff&size=256",
                coverUrl: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80",
                appearance: {
                    primaryColor: "#7c3aed", // Violeta
                    theme: "light"
                },
                homeLayout: [
                    { type: "banner", title: "Bem-vindo!", imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80", order: 0 },
                    { type: "rich_text", title: "Sobre Nós", content: "Somos uma comunidade focada em bem-estar e tecnologia.", order: 1 },
                    { type: "featured_posts", title: "Destaques da Semana", order: 2 }
                ],
                categories: ["Geral", "Novidades", "Ajuda"]
            });
            communities = [official];
        }

        res.json(communities);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Obter detalhes completos de uma comunidade (para a Home da Comunidade)
router.get("/:id", authRequired, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id)
            .populate("members", "name avatarUrl _id")
            .populate("owner", "name avatarUrl _id");

        if (!community) return res.status(404).json({ error: "Comunidade não encontrada" });

        res.json(community);
    } catch (e) {
        res.status(500).json({ error: "Erro ao carregar comunidade" });
    }
});

// Entrar/Sair
router.post("/:id/join", authRequired, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) return res.status(404).json({ error: "Comunidade não encontrada" });

        const index = community.members.indexOf(req.userId);
        if (index > -1) {
            community.members.splice(index, 1);
        } else {
            community.members.push(req.userId);
        }
        await community.save();

        // Retorna dados atualizados
        const updated = await Community.findById(req.params.id)
            .select("name description avatarUrl coverUrl members appearance");

        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;