import mongoose from "mongoose";

const CommunitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    bannedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Mídia Básica
    avatarUrl: { type: String, default: "" },
    coverUrl: { type: String, default: "" },

    // V5.0 - Personalização Visual
    appearance: {
        primaryColor: { type: String, default: "#0ea5e9" }, // Cor principal (botões, links)
        headerImage: { type: String, default: "" }, // Header personalizado
        backgroundImage: { type: String, default: "" }, // Fundo da página
        icon: { type: String, default: "" } // Ícone principal (pode ser diferente do avatar)
    },

    // V5.0 - Ordem do Menu
    sidebarModules: { type: [String], default: ['about', 'channels', 'categories', 'members'] },

    // V2.0 & V6.0 - Regras e Categorias
    rules: { type: String, default: "" },
    categories: [{ type: String }], // Ex: ["Fanart", "Teorias", "Notícias"]

    // V8.0 - Configurações de Chat
    chatSettings: {
        allowMemberCreatedChats: { type: Boolean, default: true },
        officialChatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', default: null }
    }

}, { timestamps: true });

export default mongoose.model("Community", CommunitySchema);