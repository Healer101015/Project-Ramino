import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";

// --- Modelos ---
import Message from "./models/Message.js";
import Notification from "./models/Notification.js";
import User from "./models/User.js";
import Channel from "./models/Channel.js";
import CommunityMember from "./models/CommunityMember.js"; // Necessário para lógica de XP se precisar acessar direto

// --- Utilitários ---
import { addXP } from "./utils/xp.js"; // Importar função de adicionar XP

// --- Rotas ---
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/users.js";
import notificationRoutes from "./routes/notifications.js";
import messagesRoutes from "./routes/messages.js";
import communityRoutes from "./routes/communities.js";

dotenv.config();

const allowedOrigins = [
  "https://healer.japoneix.com",
  "http://healer.japoneix.com",
  "https://apihealer.japoneix.com",
  "https://apihealer.japoneix.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

const corsSettings = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsSettings
});

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/healer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração de Uploads Locais ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter
});

// --- Middlewares Globais ---
app.use(cors(corsSettings));
app.options("*", cors(corsSettings));
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Servir arquivos estáticos
app.use("/uploads", express.static(uploadsDir));

// --- Registro de Rotas ---
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/communities", communityRoutes);

// --- Socket.IO ---
const activeUsers = new Map();

const authenticateToken = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) return next(new Error("Authentication error: Token not provided"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
};

io.use(authenticateToken);

io.on("connection", (socket) => {
  console.log(`[Socket.io] Conexão: Socket ID=${socket.id}, User ID=${socket.userId}`);
  activeUsers.set(socket.userId, socket.id);

  // Sala pessoal
  socket.join(`user_${socket.userId}`);

  // Eventos de Canais de Comunidade
  socket.on("joinChannel", (channelId) => {
    socket.join(`channel_${channelId}`);
    console.log(`User ${socket.userId} entrou no canal ${channelId}`);
  });

  socket.on("leaveChannel", (channelId) => {
    socket.leave(`channel_${channelId}`);
  });

  // Envio de Mensagem (Unificado)
  socket.on("sendMessage", async (data) => {
    const { recipientId, channelId, content, attachment, attachmentType, mimeType, fileName, fileSize, tempId } = data;

    if (!content?.trim() && !attachment) {
      socket.emit("messageError", { error: "Mensagem vazia", tempId });
      return;
    }

    try {
      // CASO 1: Mensagem de Canal (Comunidade)
      if (channelId) {
        const channel = await Channel.findById(channelId);
        if (!channel) {
          socket.emit("messageError", { error: "Canal não encontrado", tempId });
          return;
        }

        if (channel.isPrivate && !channel.allowedUsers.includes(socket.userId)) {
          socket.emit("messageError", { error: "Sem permissão neste canal.", tempId });
          return;
        }

        // --- SISTEMA DE XP (Versão 8.0) ---
        // Adiciona XP ao enviar mensagem. Texto = 10 XP, Mídia = 20 XP.
        const xpAmount = attachment ? 20 : 10;
        // Não usamos await para não bloquear o envio da mensagem (background task)
        addXP(socket.userId, channel.community, xpAmount);
        // ----------------------------------

        const newMessage = await Message.create({
          sender: socket.userId,
          channel: channelId,
          content: content?.trim() || "",
          attachment, attachmentType, mimeType, fileName, fileSize
        });

        await newMessage.populate('sender', 'name avatarUrl');

        const messageData = newMessage.toObject();
        if (tempId) messageData.tempId = tempId;

        io.to(`channel_${channelId}`).emit("receiveMessage", messageData);
        socket.emit("messageSent", messageData);
        return;
      }

      // CASO 2: Mensagem Direta (DM) - Sem XP
      if (recipientId) {
        const sender = await User.findById(socket.userId);
        const recipient = await User.findById(recipientId);

        if (!sender || !recipient) {
          socket.emit("messageError", { error: "Usuário não encontrado", tempId });
          return;
        }

        // Check seguidores mútuos
        const iFollowThem = sender.following.includes(recipientId);
        const theyFollowMe = recipient.following.includes(socket.userId);

        if (!iFollowThem || !theyFollowMe) {
          socket.emit("messageError", { error: "Vocês precisam seguir um ao outro.", tempId });
          return;
        }

        const newMessage = await Message.create({
          sender: socket.userId,
          recipient: recipientId,
          content: content?.trim() || "",
          attachment, attachmentType, mimeType, fileName, fileSize
        });

        await newMessage.populate('sender', 'name avatarUrl');
        await newMessage.populate('recipient', 'name avatarUrl');

        const messageData = newMessage.toObject();
        if (tempId) messageData.tempId = tempId;

        io.to(`user_${recipientId}`).emit("receiveMessage", messageData);

        const notification = await Notification.create({
          recipient: recipientId,
          sender: socket.userId,
          type: 'NEW_MESSAGE'
        });
        await notification.populate('sender', 'name avatarUrl');
        io.to(`user_${recipientId}`).emit("new_notification", notification);

        socket.emit("messageSent", messageData);
      }

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error.message);
      socket.emit("messageError", { error: "Falha ao enviar mensagem", tempId });
    }
  });

  // Typing
  socket.on('typing', (data) => {
    const { recipientId, channelId, isTyping } = data;
    if (channelId) {
      socket.to(`channel_${channelId}`).emit('userTyping', {
        userId: socket.userId, channelId, isTyping
      });
    } else if (recipientId) {
      io.to(`user_${recipientId}`).emit(isTyping ? 'userTyping' : 'userStopTyping', {
        userId: socket.userId, isTyping
      });
    }
  });

  socket.on("disconnect", () => {
    if (activeUsers.get(socket.userId) === socket.id) {
      activeUsers.delete(socket.userId);
    }
  });

  socket.on("ping", (cb) => { if (typeof cb === 'function') cb("pong"); });
});

// --- Upload Handler ---
const handleUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    let attachmentType = 'file';
    if (req.file.mimetype.startsWith('image/')) attachmentType = 'image';
    else if (req.file.mimetype.startsWith('audio/')) attachmentType = 'audio';
    else if (req.file.mimetype.startsWith('video/')) attachmentType = 'video';

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      fileUrl,
      attachmentType,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    try { if (req.file) fs.unlinkSync(req.file.path); } catch (e) { }
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

app.post("/api/upload-media", upload.single('media'), handleUpload);
app.post("/upload-media", upload.single('media'), handleUpload);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "Arquivo muito grande. Máx 50MB." });
    }
  }
  if (error) return res.status(400).json({ error: error.message });
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    activeUsersCount: activeUsers.size,
    timestamp: new Date().toISOString()
  });
});

app.get("/", (_req, res) => res.json({
  ok: true,
  name: "Healer API",
  version: "1.3.0",
  features: ["communities", "channels", "followers", "xp-system"]
}));

mongoose.connect(MONGO_URI).then(() => {
  console.log("MongoDB conectado");
  server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
}).catch(err => {
  console.error("Erro MongoDB:", err.message);
  process.exit(1);
});