import mongoose from "mongoose";

const CommunityMemberSchema = new mongoose.Schema({
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Sistema de Nível (V8.0)
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },

    // Sistema de Liderança (V2.0)
    role: { type: String, enum: ['leader', 'curator', 'member'], default: 'member' },

    titles: [{ type: String }] // Títulos personalizados (ex: "Veterano")
}, { timestamps: true });

// Garante unicidade
CommunityMemberSchema.index({ community: 1, user: 1 }, { unique: true });
// Índice para ranking
CommunityMemberSchema.index({ community: 1, xp: -1 });

export default mongoose.model("CommunityMember", CommunityMemberSchema);