import mongoose from "mongoose";

const CommunitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    avatarUrl: { type: String, default: "" },
    coverUrl: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("Community", CommunitySchema);