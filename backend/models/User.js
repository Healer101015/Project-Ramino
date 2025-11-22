import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Perfil Básico
  avatarUrl: { type: String, default: "" },
  coverPhotoUrl: { type: String, default: "" },
  bio: { type: String, default: "" },

  // Social
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  profileViews: { type: Number, default: 0 },

  // Versão 7.0 - Personalização Avançada
  theme: { type: String, default: "light" }, // light, dark, ocean, sunset, cyberpunk
  pageBackgroundUrl: { type: String, default: "" }, // Imagem de fundo da página inteira
  gallery: [{ type: String }], // Array de URLs de imagens
}, { timestamps: true });

export default mongoose.model("User", UserSchema);