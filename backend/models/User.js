import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarUrl: { type: String, default: "" },
  coverPhotoUrl: { type: String, default: "" },
  bio: { type: String, default: "" },

  // Sistema Antigo (Mantido para compatibilidade se necessário)
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // NOVO: Sistema Amino (Seguidores/Seguindo)
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // NOVO: Customização Visual do Perfil
  gallery: [{ type: String }], // Slider de imagens no topo
  pageBackgroundUrl: { type: String, default: "" }, // Imagem de fundo do perfil inteiro
  theme: { type: String, default: "light" }, // Cor base do perfil

  profileViews: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);