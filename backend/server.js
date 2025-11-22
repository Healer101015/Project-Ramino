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

import Message from "./models/Message.js";
import Notification from "./models/Notification.js";

import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/users.js";
import notificationRoutes from "./routes/notifications.js";
import messagesRoutes from "./routes/messages.js";

dotenv.config();

const allowedOrigins = [
  "https://healer.japoneix.com",
  "http://healer.japoneix.com",
  "https://apihealer.japoneix.com",
  "https://apihealer.japoneix.com",
  "http://localhost:5173"
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

// Garantir que o diretório de uploads existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do Multer
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
    cb(new Error('Tipo de arquivo não suportado. Use imagem, vídeo ou áudio.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 10 * 1024 * 1024 }, // 100MB (nota: 10*10*1024*1024 é 100MB, ajuste conforme necessidade)
  fileFilter
});

// Middlewares
app.use(cors(corsSettings));
app.options("*", cors(corsSettings));

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(uploadsDir));

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messagesRoutes);

// Lista de usuários ativos (para status online, se necessário)
const activeUsers = new Map();

// Middleware JWT para Socket.IO
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

// Eventos Socket.IO
io.on("connection", (socket) => {
  console.log(`[Socket.io] Conexão: Socket ID=${socket.id}, User ID=${socket.userId}`);

  activeUsers.set(socket.userId, socket.id);

  // Entrar na sala exclusiva do usuário para receber mensagens em qualquer aba/dispositivo
  socket.join(`user_${socket.userId}`);

  // Envio de mensagem
  socket.on("sendMessage", async (data) => {
    const { recipientId, content, attachment, attachmentType, mimeType, fileName, fileSize, tempId } = data;

    if (!content?.trim() && !attachment) {
      socket.emit("messageError", { error: "Mensagem vazia", tempId });
      return;
    }

    try {
      const newMessage = await Message.create({
        sender: socket.userId,
        recipient: recipientId,
        content: content?.trim() || "",
        attachment,
        attachmentType,
        mimeType,
        fileName,
        fileSize
      });

      await newMessage.populate('sender', 'name avatarUrl');
      await newMessage.populate('recipient', 'name avatarUrl');

      const messageData = newMessage.toObject();
      if (tempId) messageData.tempId = tempId;

      // Enviar para a SALA do destinatário (todos os dispositivos dele)
      io.to(`user_${recipientId}`).emit("receiveMessage", messageData);

      // Opcional: Enviar também para a sala do remetente (para sincronizar outras abas do remetente)
      // io.to(`user_${socket.userId}`).emit("receiveMessage", messageData);

      // Criar e emitir notificação
      const notification = await Notification.create({
        recipient: recipientId,
        sender: socket.userId,
        type: 'NEW_MESSAGE'
      });
      await notification.populate('sender', 'name avatarUrl');

      io.to(`user_${recipientId}`).emit("new_notification", notification);

      socket.emit("messageSent", messageData);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error.message);
      socket.emit("messageError", { error: "Failed to send message", tempId });
    }
  });

  // Evento typing
  socket.on('typing', (data) => {
    const { recipientId, isTyping } = data;
    // Enviar para a sala do destinatário
    io.to(`user_${recipientId}`).emit(isTyping ? 'userTyping' : 'userStopTyping', {
      userId: socket.userId,
      isTyping: isTyping || undefined
    });
  });

  // Desconexão
  socket.on("disconnect", (reason) => {
    // Apenas remove do map se for o socket atual (embora map não suporte array de sockets por padrão aqui)
    if (activeUsers.get(socket.userId) === socket.id) {
      activeUsers.delete(socket.userId);
    }
  });

  // Ping
  socket.on("ping", (callback) => { if (typeof callback === 'function') callback("pong"); });
});

const handleUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    let attachmentType;

    if (req.file.mimetype.startsWith('image/')) attachmentType = 'image';
    else if (req.file.mimetype.startsWith('audio/')) attachmentType = 'audio';
    else if (req.file.mimetype.startsWith('video/')) attachmentType = 'video';
    else {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
      return res.status(400).json({ error: "Tipo de arquivo não suportado" });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = fileBuffer.toString('base64');

    // Se for muito grande para o serviço externo, usar fallback ou erro (aqui mantendo sua lógica de fallback URL)
    if (req.file.size > 10 * 1024 * 1024) {
      res.json({
        fileUrl: "https://cdn.discordapp.com/attachments/1411263605415874590/1411270271423217735/image.png?ex=68b40b5c&is=68b2b9dc&hm=bc2bb17168470e6e96af9f498752c978266995171bb4f1e38a1787c9a483437d&",
        attachmentType,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        fileSize: req.file.size
      });
      try { fs.unlinkSync(req.file.path); } catch (e) { }
      return;
    }

    const fetchResponse = await fetch(process.env.IMAGE_UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, contentType: req.file.mimetype })
    });

    if (!fetchResponse.ok) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
      return res.status(500).json({ error: "Falha ao enviar para o serviço externo" });
    }

    const responseData = await fetchResponse.json();

    try { fs.unlinkSync(req.file.path); } catch (e) { }

    res.json({
      fileUrl: responseData.url,
      attachmentType,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

app.post("/api/upload-media", upload.single('media'), handleUpload);
app.post("/upload-media", upload.single('media'), handleUpload);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: "Arquivo muito grande. Máx 100MB." });
  }
  res.status(400).json({ error: error.message });
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
  version: "1.0.0",
  socketIo: true
}));

mongoose.connect(MONGO_URI).then(() => {
  console.log("MongoDB conectado");
  server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
}).catch(err => {
  console.error("Erro MongoDB:", err.message);
  process.exit(1);
});