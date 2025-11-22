import multer from "multer";
import path from "path";
import fs from "fs";

// Garantir que o diretório de uploads existe
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do Storage (Disco Local)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Preserva extensão original
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

export const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        // Aceitar imagens, vídeos e áudios
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não suportado.'), false);
        }
    }
});

// Middleware para processar o arquivo após o upload do Multer
export const handleUpload = (req, res, next) => {
    if (!req.file && !req.files) return next();

    // Função auxiliar para formatar o objeto do arquivo
    const processFile = (file) => {
        let attachmentType = 'file';

        if (file.mimetype.startsWith('image/')) attachmentType = 'image';
        else if (file.mimetype.startsWith('video/')) attachmentType = 'video';
        else if (file.mimetype.startsWith('audio/')) attachmentType = 'audio';

        return {
            ...file,
            attachmentType,
            // Retorna o caminho relativo para ser salvo no banco
            fileUrl: `/uploads/${file.filename}`
        };
    };

    // Processar único arquivo
    if (req.file) {
        req.file = processFile(req.file);
    }

    // Processar múltiplos arquivos (campos ou array)
    if (req.files) {
        if (Array.isArray(req.files)) {
            req.files = req.files.map(processFile);
        } else {
            for (const field in req.files) {
                req.files[field] = req.files[field].map(processFile);
            }
        }
    }

    next();
};