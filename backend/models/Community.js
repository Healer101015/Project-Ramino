import mongoose from "mongoose";

const LayoutBlockSchema = new mongoose.Schema({
    type: { type: String, enum: ['banner', 'featured_posts', 'rich_text'], required: true },
    title: { type: String, default: "" },
    content: { type: String, default: "" }, // Texto para rich_text
    imageUrl: { type: String, default: "" }, // Para banners
    linkUrl: { type: String, default: "" }, // Link do banner
    order: { type: Number, default: 0 }
}, { _id: false });

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
        primaryColor: { type: String, default: "#0ea5e9" }, // Cor principal (Hex)
        backgroundImage: { type: String, default: "" }, // Fundo da página
        theme: { type: String, enum: ['light', 'dark'], default: 'light' }
    },

    // V11.0 - Página Inicial Customizável
    homeLayout: [LayoutBlockSchema],

    // V5.0 - Ordem do Menu
    sidebarModules: { type: [String], default: ['about', 'channels', 'categories', 'members'] },

    // V2.0 & V6.0 - Regras e Categorias
    rules: { type: String, default: "" },
    categories: [{ type: String }],

    // V8.0 - Configurações de Chat
    chatSettings: {
        allowMemberCreatedChats: { type: Boolean, default: true },
        officialChatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', default: null }
    }

}, { timestamps: true });

export default mongoose.model("Community", CommunitySchema);