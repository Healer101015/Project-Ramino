import mongoose from "mongoose";

const CommunitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Líder Criador
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    bannedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Lista negra
    avatarUrl: { type: String, default: "" },
    coverUrl: { type: String, default: "" },
    rules: { type: String, default: "" }, // Regras da comunidade
    themeColor: { type: String, default: "#3b82f6" }
}, { timestamps: true });

export default mongoose.model("Community", CommunitySchema);