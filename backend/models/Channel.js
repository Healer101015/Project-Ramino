import mongoose from "mongoose";

const ChannelSchema = new mongoose.Schema({
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    name: { type: String, required: true },
    // Se for privado, apenas os membros listados podem ver/entrar
    isPrivate: { type: Boolean, default: false },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

export default mongoose.model("Channel", ChannelSchema);