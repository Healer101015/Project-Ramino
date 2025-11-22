import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// --- ÍCONES ---
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" /><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" /></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" /></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>;
const MinimizeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3.75 12a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;

const ChatWindow = ({ recipient }) => {
    const { user: me } = useAuth();
    const { closeChat, socket } = useChat();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [recipientTyping, setRecipientTyping] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Fetch inicial
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await api.get(`/messages/${recipient._id}`);
                setMessages(response.data);
            } catch (error) { console.error("Erro mensagens:", error); }
        };
        if (recipient._id) fetchMessages();
    }, [recipient._id]);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (msg) => {
            // Confirma se a mensagem pertence a esta conversa
            if ((msg.sender === recipient._id || msg.sender._id === recipient._id) ||
                (msg.sender === me._id && msg.recipient === recipient._id)) {

                setMessages(prev => {
                    if (prev.some(m => m._id === msg._id || (m.tempId && m.tempId === msg.tempId))) return prev;
                    return [...prev, msg];
                });

                if (msg.sender === recipient._id || msg.sender._id === recipient._id) {
                    setRecipientTyping(false);
                }
            }
        };

        const handleMessageSent = (officialMsg) => {
            if (officialMsg.recipient === recipient._id || officialMsg.recipient._id === recipient._id) {
                setMessages(prev => prev.map(msg =>
                    msg.tempId && msg.tempId === officialMsg.tempId
                        ? { ...officialMsg, isSending: false }
                        : msg
                ));
            }
        };

        const handleMessageError = (data) => {
            // Remove a mensagem temporária que falhou e mostra erro
            setMessages(prev => prev.filter(msg => msg.tempId !== data.tempId));
            setErrorMsg(data.error);
            setTimeout(() => setErrorMsg(null), 4000);
        };

        const handleTyping = (data) => {
            if (data.userId === recipient._id) setRecipientTyping(data.isTyping);
        };

        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('messageSent', handleMessageSent);
        socket.on('messageError', handleMessageError);
        socket.on('userTyping', handleTyping);
        socket.on('userStopTyping', () => setRecipientTyping(false));

        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
            socket.off('messageSent', handleMessageSent);
            socket.off('messageError', handleMessageError);
            socket.off('userTyping', handleTyping);
            socket.off('userStopTyping');
        };
    }, [socket, recipient._id, me._id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, recipientTyping, isRecording]);

    // --- FUNÇÕES DE ENVIO ---

    const uploadFile = async (file) => {
        if (!file) return;
        setIsUploading(true);

        // Cria mensagem otimista
        const tempId = Date.now().toString();
        const optimisticMsg = {
            _id: tempId, tempId, sender: me, recipient: recipient,
            content: "", attachment: URL.createObjectURL(file),
            attachmentType: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'audio',
            createdAt: new Date(), isSending: true
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const formData = new FormData();
            formData.append('media', file);

            const { data } = await api.post('/upload-media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            socket?.emit('sendMessage', {
                recipientId: recipient._id,
                content: "",
                attachment: data.fileUrl,
                attachmentType: data.attachmentType,
                mimeType: data.mimeType,
                fileName: data.fileName,
                fileSize: data.fileSize,
                tempId
            });
        } catch (error) {
            console.error("Erro upload:", error);
            setMessages(prev => prev.filter(m => m.tempId !== tempId));
            setErrorMsg("Falha ao enviar arquivo.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && socket) {
            const tempId = Date.now().toString();
            const msg = {
                _id: tempId, tempId, sender: me, recipient: recipient,
                content: input, createdAt: new Date(), isSending: true
            };
            setMessages(prev => [...prev, msg]);

            socket.emit('sendMessage', { recipientId: recipient._id, content: input, tempId });
            setInput('');

            socket.emit('typing', { recipientId: recipient._id, isTyping: false });
            setIsTyping(false);
        }
    };

    const handleTypingInput = (e) => {
        setInput(e.target.value);
        if (!isTyping) {
            setIsTyping(true);
            socket?.emit('typing', { recipientId: recipient._id, isTyping: true });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket?.emit('typing', { recipientId: recipient._id, isTyping: false });
        }, 1500);
    };

    // --- GRAVAÇÃO DE ÁUDIO ---

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], "voice_msg.webm", { type: 'audio/webm' });
                uploadFile(audioFile);
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microfone bloqueado", err);
            alert("Permita o acesso ao microfone para gravar áudio.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // --- RENDER ---

    const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isMyMsg = (msg) => (msg.sender?._id === me._id || msg.sender === me._id);

    return (
        <div className={`fixed bottom-0 right-4 md:right-10 bg-white shadow-2xl rounded-t-2xl w-full md:w-80 flex flex-col transition-transform duration-300 border border-gray-200 z-50 ${isMinimized ? 'translate-y-[calc(100%-56px)]' : 'h-[500px]'}`}>

            {/* Header */}
            <div
                className="flex items-center justify-between p-3 bg-white border-b rounded-t-2xl cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img
                            src={recipient.avatarUrl ? (recipient.avatarUrl.startsWith('http') ? recipient.avatarUrl : `${API_URL}${recipient.avatarUrl}`) : `https://ui-avatars.com/api/?name=${recipient.name}`}
                            className="w-10 h-10 rounded-full object-cover shadow-sm"
                        />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm leading-tight">{recipient.name}</span>
                        <span className="text-xs text-green-600 font-medium h-4">
                            {recipientTyping ? 'Digitando...' : 'Online'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                    <button className="p-1 hover:bg-gray-200 rounded-full transition"><MinimizeIcon /></button>
                    <button onClick={(e) => { e.stopPropagation(); closeChat(recipient._id); }} className="p-1 hover:bg-red-100 hover:text-red-500 rounded-full transition"><XIcon /></button>
                </div>
            </div>

            {/* Error Toast */}
            {errorMsg && (
                <div className="absolute top-16 left-4 right-4 bg-red-100 text-red-700 text-xs p-2 rounded-lg shadow-md z-10 text-center border border-red-200 animate-bounce">
                    {errorMsg}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3 scrollbar-thin scrollbar-thumb-gray-300">
                {messages.map(msg => (
                    <div key={msg._id || msg.tempId} className={`flex ${isMyMsg(msg) ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm relative group ${isMyMsg(msg) ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>

                            {/* Texto */}
                            {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                            {/* Mídia */}
                            {msg.attachment && (
                                <div className="mt-1">
                                    {msg.attachmentType === 'image' && (
                                        <img src={msg.attachment.startsWith('http') ? msg.attachment : `${API_URL}${msg.attachment}`} className="rounded-lg max-h-48 object-cover w-full" />
                                    )}
                                    {msg.attachmentType === 'video' && (
                                        <video src={msg.attachment.startsWith('http') ? msg.attachment : `${API_URL}${msg.attachment}`} controls className="rounded-lg max-h-48 w-full" />
                                    )}
                                    {msg.attachmentType === 'audio' && (
                                        <audio src={msg.attachment.startsWith('http') ? msg.attachment : `${API_URL}${msg.attachment}`} controls className="w-full h-8 min-w-[200px]" />
                                    )}
                                </div>
                            )}

                            {/* Meta */}
                            <div className={`text-[10px] mt-1 text-right ${isMyMsg(msg) ? 'text-sky-100' : 'text-gray-400'}`}>
                                {formatTime(msg.createdAt)}
                                {msg.isSending && <span className="ml-1 opacity-70">🕒</span>}
                            </div>
                        </div>
                    </div>
                ))}
                {recipientTyping && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-white text-gray-500 text-xs py-2 px-3 rounded-2xl rounded-bl-none border shadow-sm">
                            ...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t">
                {isRecording ? (
                    <div className="flex items-center justify-between bg-red-50 text-red-600 px-4 py-2 rounded-full animate-pulse border border-red-100">
                        <span className="font-bold text-sm">Gravando...</span>
                        <button onClick={stopRecording} className="p-1 bg-white rounded-full shadow-sm hover:bg-red-100 transition"><StopIcon /></button>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={(e) => { uploadFile(e.target.files[0]); e.target.value = null; }} className="hidden" accept="image/*,video/*" />

                        <button type="button" onClick={() => fileInputRef.current.click()} disabled={isUploading} className="text-gray-400 hover:text-sky-500 transition p-2 rounded-full hover:bg-gray-100">
                            <ImageIcon />
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={handleTypingInput}
                            placeholder="Digite uma mensagem..."
                            className="flex-1 bg-gray-100 text-gray-800 text-sm px-4 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all"
                            disabled={isUploading}
                        />

                        {input.trim() ? (
                            <button type="submit" className="text-sky-500 hover:text-sky-600 p-2 rounded-full hover:bg-sky-50 transition"><SendIcon /></button>
                        ) : (
                            <button type="button" onClick={startRecording} disabled={isUploading} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition"><MicIcon /></button>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;