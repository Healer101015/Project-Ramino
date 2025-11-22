import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import Navbar from '../components/Navbar';

export default function ChatPage() {
    const { userId } = useParams();
    const { user: me } = useAuth();
    const { socket } = useChat(); // Usa socket global
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [recipient, setRecipient] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    useEffect(() => {
        const fetchRecipient = async () => {
            try {
                const res = await api.get(`/users/${userId}`);
                setRecipient(res.data.user);
            } catch (err) {
                navigate('/profile/me');
            }
        };
        const fetchMessages = async () => {
            try {
                const { data } = await api.get(`/messages/${userId}`);
                setMessages(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchRecipient();
        fetchMessages();
    }, [userId, navigate]);

    useEffect(() => {
        if (!socket) return;

        const handleReceive = (message) => {
            if (message.sender === userId || message.sender._id === userId ||
                (message.sender === me._id && message.recipient === userId)) {
                setMessages(prev => {
                    if (prev.some(m => m._id === message._id || m.tempId === message.tempId)) return prev;
                    return [...prev, message];
                });
            }
        };

        const handleSent = (msg) => {
            if (msg.recipient === userId || msg.recipient._id === userId) {
                setMessages(prev => prev.map(m => m.tempId === msg.tempId ? { ...msg, isSending: false } : m));
            }
        };

        socket.on('receiveMessage', handleReceive);
        socket.on('messageSent', handleSent);

        return () => {
            socket.off('receiveMessage', handleReceive);
            socket.off('messageSent', handleSent);
        };
    }, [socket, userId, me._id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && socket) {
            const tempId = Date.now().toString();
            const msg = {
                _id: tempId, tempId, sender: me._id, recipient: userId,
                content: input, createdAt: new Date(), isSending: true
            };
            setMessages(p => [...p, msg]);
            socket.emit('sendMessage', { recipientId: userId, content: input, tempId });
            setInput('');
        }
    };

    // (Lógica de upload simplificada para brevidade, similar ao ChatWindow)
    // ...

    if (!recipient) return <div className="bg-gray-50 min-h-screen"><Navbar /><div className="container-healer mt-6 text-center">Carregando...</div></div>;

    const isMyMsg = (m) => (m.sender === me._id || m.sender?._id === me._id);

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col">
            <Navbar />
            <div className="container-healer flex-1 flex flex-col py-6">
                <div className="bg-white rounded-t-lg shadow p-4 border-b font-bold text-lg">{recipient.name}</div>
                <div className="flex-1 bg-white p-4 overflow-y-auto space-y-4">
                    {messages.map(msg => (
                        <div key={msg._id || msg.tempId} className={`flex ${isMyMsg(msg) ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-lg max-w-md ${isMyMsg(msg) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} ${msg.isSending ? 'opacity-70' : ''}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="bg-white p-4 rounded-b-lg shadow">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input className="flex-1 border p-2 rounded" value={input} onChange={e => setInput(e.target.value)} placeholder="Digite..." />
                        <button className="bg-blue-500 text-white px-4 rounded">Enviar</button>
                    </form>
                </div>
            </div>
        </div>
    );
}