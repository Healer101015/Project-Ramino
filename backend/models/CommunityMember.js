import mongoose from "mongoose";

const CommunityMemberSchema = new mongoose.Schema({
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    role: { type: String, enum: ['member', 'moderator', 'admin'], default: 'member' },
    // Vantagens sociais (ex: títulos desbloqueados)
    titles: [{ type: String }]
}, { timestamps: true });

// Garante que um usuário só tenha um registro por comunidade
CommunityMemberSchema.index({ community: 1, user: 1 }, { unique: true });
// Índice para ranking rápido
CommunityMemberSchema.index({ community: 1, xp: -1 });

export default mongoose.model("CommunityMember", CommunityMemberSchema);