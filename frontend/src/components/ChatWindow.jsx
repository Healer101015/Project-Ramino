import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

// --- Ícones ---
const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
);

const ChatWindow = ({ recipient }) => {
    const { user: me } = useAuth();
    const { closeChat, socket } = useChat();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false); // Estado de gravação
    const [isTyping, setIsTyping] = useState(false);
    const [recipientTyping, setRecipientTyping] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const mediaRecorderRef = useRef(null); // Ref para o gravador
    const audioChunksRef = useRef([]);     // Ref para os pedaços de áudio

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    // Fetch mensagens iniciais
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await api.get(`/messages/${recipient._id}`);
                setMessages(response.data);
            } catch (error) {
                console.error("Erro ao buscar mensagens:", error);
            }
        };
        if (recipient._id) fetchMessages();
    }, [recipient._id]);

    // Listeners do Socket
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (message) => {
            if (message.sender === recipient._id || message.sender._id === recipient._id ||
                (message.sender === me._id && message.recipient === recipient._id)) {

                setMessages(prev => {
                    const exists = prev.some(msg => msg._id === message._id || (msg.tempId && msg.tempId === message.tempId));
                    if (exists) return prev;
                    return [...prev, message];
                });

                if (message.sender === recipient._id || message.sender._id === recipient._id) {
                    setRecipientTyping(false);
                }
            }
        };

        const handleMessageSent = (officialMessage) => {
            if (officialMessage.recipient === recipient._id || officialMessage.recipient._id === recipient._id) {
                setMessages(prev => prev.map(msg =>
                    msg.tempId && msg.tempId === officialMessage.tempId
                        ? { ...officialMessage, isSending: false }
                        : msg
                ));
            }
        };

        const handleTyping = (data) => {
            if (data.userId === recipient._id) {
                setRecipientTyping(data.isTyping);
            }
        };

        const handleStopTyping = (data) => {
            if (data.userId === recipient._id) {
                setRecipientTyping(false);
            }
        };

        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('messageSent', handleMessageSent);
        socket.on('userTyping', handleTyping);
        socket.on('userStopTyping', handleStopTyping);

        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
            socket.off('messageSent', handleMessageSent);
            socket.off('userTyping', handleTyping);
            socket.off('userStopTyping', handleStopTyping);
        };
    }, [socket, recipient._id, me._id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, recipientTyping, isRecording]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInput(value);

        if (!socket) return;

        if (value.length > 0 && !isTyping) {
            setIsTyping(true);
            socket.emit('typing', { recipientId: recipient._id, isTyping: true });
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            if (isTyping) {
                setIsTyping(false);
                socket.emit('typing', { recipientId: recipient._id, isTyping: false });
            }
        }, 1000);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (isTyping) {
            setIsTyping(false);
            socket?.emit('typing', { recipientId: recipient._id, isTyping: false });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        if (input.trim() && socket) {
            const tempId = Date.now().toString();
            const tempMessage = {
                _id: tempId,
                tempId,
                sender: me,
                recipient: recipient,
                content: input,
                createdAt: new Date(),
                isSending: true
            };

            setMessages(prev => [...prev, tempMessage]);
            socket.emit('sendMessage', {
                recipientId: recipient._id,
                content: input,
                tempId,
            });
            setInput('');
        }
    };

    // Função genérica para upload de arquivo (imagem, vídeo ou áudio gravado)
    const uploadFile = async (file) => {
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('media', file);

            const response = await api.post('/upload-media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { fileUrl, attachmentType, mimeType, fileName, fileSize } = response.data;
            const tempId = Date.now().toString();

            const tempMessage = {
                _id: tempId,
                tempId,
                sender: me,
                recipient: recipient,
                content: "", // Mensagens de áudio/mídia podem não ter texto
                attachment: fileUrl,
                attachmentType,
                mimeType,
                fileName,
                fileSize,
                createdAt: new Date(),
                isSending: true
            };

            setMessages(prev => [...prev, tempMessage]);

            socket?.emit('sendMessage', {
                recipientId: recipient._id,
                content: "",
                attachment: fileUrl,
                attachmentType,
                mimeType,
                fileName,
                fileSize,
                tempId
            });
        } catch (error) {
            console.error("Erro upload:", error);
            alert("Falha ao enviar arquivo.");
        } finally {
            setIsUploading(false);
        }
    };

    // Handler para o input de arquivo (imagens/vídeos)
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        uploadFile(file);
        e.target.value = null; // Reset input
    };

    // --- Lógica de Gravação de Áudio ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });

                // Envia o arquivo de áudio
                uploadFile(audioFile);

                // Para todas as faixas de áudio para liberar o microfone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Erro ao acessar microfone:", err);
            alert("Não foi possível acessar o microfone. Verifique as permissões.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isMyMessage = (msg) => (msg.sender?._id === me._id || msg.sender === me._id);

    return (
        <div className={`fixed bottom-0 right-4 md:right-24 bg-white shadow-2xl rounded-t-lg w-full md:w-96 h-[80vh] md:h-[40rem] flex flex-col transition-all duration-300 ${isMinimized ? 'translate-y-[calc(100%-48px)]' : ''} z-50`}>
            {/* Cabeçalho */}
            <div className="flex items-center justify-between p-2 bg-gray-100 rounded-t-lg cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                <div className="flex items-center gap-2">
                    <img src={recipient.avatarUrl?.includes('/uploads/') ? `${API_URL}${recipient.avatarUrl}` : (recipient.avatarUrl || `https://ui-avatars.com/api/?name=${recipient.name}`)} className="w-8 h-8 rounded-full object-cover" alt="" />
                    <div className="flex flex-col">
                        <span className="font-bold text-sm">{recipient.name}</span>
                        {recipientTyping && <span className="text-xs text-gray-500 italic">digitando...</span>}
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); closeChat(recipient._id); }} className="p-1 hover:bg-gray-200 rounded-full">&times;</button>
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {messages.map(msg => (
                    <div key={msg._id || msg.tempId} className={`flex ${isMyMessage(msg) ? 'justify-end' : 'justify-start'} mb-3`}>
                        <div className={`p-3 rounded-lg max-w-[80%] break-words ${isMyMessage(msg) ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'} ${msg.isSending ? 'opacity-70' : ''}`}>
                            {msg.content && <p className="mb-1">{msg.content}</p>}
                            {msg.attachment && msg.attachmentType === 'image' && <img src={`${API_URL}${msg.attachment}`} className="max-w-full rounded-lg" />}
                            {msg.attachment && msg.attachmentType === 'video' && <video src={`${API_URL}${msg.attachment}`} controls className="max-w-full rounded-lg" />}
                            {msg.attachment && msg.attachmentType === 'audio' && (
                                <div className="flex items-center gap-2 min-w-[200px]">
                                    <audio src={`${API_URL}${msg.attachment}`} controls className="w-full h-8" />
                                </div>
                            )}
                            <div className="text-xs mt-1 opacity-70 text-right">{formatTime(msg.createdAt)}</div>
                        </div>
                    </div>
                ))}
                {recipientTyping && <div className="text-xs text-gray-500 italic ml-2">digitando...</div>}
                <div ref={messagesEndRef} />
            </div>

            {/* Área de Input */}
            <div className="p-3 border-t bg-white">
                {isRecording ? (
                    <div className="flex items-center justify-between bg-red-50 text-red-600 p-2 rounded-full animate-pulse">
                        <span className="font-bold ml-2">Gravando áudio...</span>
                        <button onClick={stopRecording} className="p-2 bg-red-100 rounded-full hover:bg-red-200 transition-colors">
                            <StopIcon />
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                        <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" disabled={isUploading} title="Enviar arquivo">
                            📎
                        </button>

                        <button type="button" onClick={startRecording} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" disabled={isUploading} title="Gravar áudio">
                            <MicIcon />
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Mensagem..."
                            className="flex-1 p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isUploading}
                        />

                        <button type="submit" className="text-blue-500 font-bold p-2 hover:bg-blue-50 rounded-full" disabled={(!input.trim() && !isUploading) || isUploading}>
                            ➤
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;