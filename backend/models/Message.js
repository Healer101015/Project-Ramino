import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Recipient é opcional se for mensagem de canal
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    // Novo campo para vincular a um canal de comunidade
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Channel",
        default: null
    },
    content: {
        type: String,
        default: ""
    },
    attachment: { type: String, default: null },
    attachmentType: { type: String, default: null },
    mimeType: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null }
}, {
    timestamps: true
});

// Índices
MessageSchema.index({ sender: 1, recipient: 1 });
MessageSchema.index({ recipient: 1, sender: 1 });
MessageSchema.index({ channel: 1, createdAt: 1 }); // Índice para buscar mensagens do canal

export default mongoose.model("Message", MessageSchema);