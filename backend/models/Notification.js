import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Tipos atualizados para o novo sistema
    type: { type: String, enum: ["FOLLOW", "LIKE", "COMMENT", "NEW_MESSAGE"], required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

export default mongoose.model("Notification", NotificationSchema);