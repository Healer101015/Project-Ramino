import mongoose from "mongoose";

const ChannelSchema = new mongoose.Schema({
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    name: { type: String, required: true },
    isPrivate: { type: Boolean, default: false },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // V8.0 - Tipos de Chat
    type: { type: String, enum: ['general', 'official', 'event'], default: 'general' },
    expiresAt: { type: Date, default: null } // Para chats temporários de eventos
}, { timestamps: true });

export default mongoose.model("Channel", ChannelSchema);