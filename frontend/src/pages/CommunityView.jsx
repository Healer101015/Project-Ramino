import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function CommunityView() {
    const { id } = useParams();
    const { user } = useAuth();
    const { socket } = useChat();
    const [community, setCommunity] = useState(null);
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Tenta entrar automaticamente se não for membro
                await api.post(`/communities/${id}/join`);

                const { data } = await api.get(`/communities/${id}`);
                setCommunity(data.community);
                setChannels(data.channels);
                if (data.channels.length > 0) setActiveChannel(data.channels[0]);
            } catch (e) { console.error(e); }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        if (!activeChannel) return;
        api.get(`/communities/channels/${activeChannel._id}/messages`)
            .then(res => setMessages(res.data))
            .catch(console.error);

        if (socket) socket.emit("joinChannel", activeChannel._id);

        return () => {
            if (socket) socket.emit("leaveChannel", activeChannel._id);
        }
    }, [activeChannel, socket]);

    useEffect(() => {
        if (!socket) return;
        const handleMsg = (msg) => {
            if (msg.channel === activeChannel?._id) {
                setMessages(prev => [...prev, msg]);
            }
        };
        socket.on("receiveMessage", handleMsg);
        return () => socket.off("receiveMessage", handleMsg);
    }, [socket, activeChannel]);

    useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !activeChannel) return;

        socket.emit("sendMessage", {
            channelId: activeChannel._id,
            content: input
        });
        setInput("");
    };

    const createChannel = async () => {
        try {
            const { data } = await api.post(`/communities/${id}/channels`, {
                name: newChannelName,
                isPrivate: isPrivate,
                allowedUsers: [] // Em um app real, aqui você abriria um modal para selecionar usuários
            });
            setChannels([...channels, data]);
            setShowCreateChannel(false);
            setNewChannelName("");
        } catch (e) { alert("Erro ao criar canal"); }
    };

    if (!community) return <div className="bg-gray-50 h-screen flex items-center justify-center">Carregando...</div>;

    const isOwner = community.owner === (user._id || user.id);

    return (
        <div className="bg-gray-50 h-screen flex flex-col">
            <Navbar />
            {/* Layout Principal: Sidebar de Canais + Chat */}
            <div className="flex flex-1 overflow-hidden container-healer md:mt-4 md:mb-4 card md:rounded-xl md:shadow-lg">

                {/* Sidebar da Comunidade */}
                <div className="w-64 bg-gray-100 border-r flex flex-col">
                    <div className="p-4 border-b bg-white shadow-sm z-10">
                        <h2 className="font-bold text-lg truncate text-gray-800">{community.name}</h2>
                        <div className="text-xs text-gray-500 font-medium mt-1">{community.members.length} membros</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        <div className="px-2 py-2 text-xs font-bold text-gray-400 uppercase">Canais de Texto</div>
                        {channels.map(c => (
                            <button
                                key={c._id}
                                onClick={() => setActiveChannel(c)}
                                className={`w-full text-left px-3 py-2 rounded-lg flex justify-between items-center transition-colors ${activeChannel?._id === c._id ? 'bg-white shadow text-sky-600 font-medium' : 'hover:bg-gray-200 text-gray-600'}`}
                            >
                                <span className="truncate"># {c.name}</span>
                                {c.isPrivate && <span className="text-[10px] bg-gray-300 text-gray-600 px-1.5 rounded">🔒</span>}
                            </button>
                        ))}
                    </div>

                    {isOwner && (
                        <div className="p-3 border-t bg-gray-50">
                            <button onClick={() => setShowCreateChannel(!showCreateChannel)} className="w-full text-sm text-sky-600 hover:text-sky-700 font-medium py-1">+ Novo Canal</button>
                            {showCreateChannel && (
                                <div className="mt-2 bg-white p-3 rounded shadow-lg border text-sm animate-fade-in">
                                    <input className="border w-full mb-2 p-1.5 rounded focus:ring-2 focus:ring-sky-500 outline-none" placeholder="Nome do canal" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
                                    <label className="flex items-center gap-2 mb-3 text-gray-600 cursor-pointer">
                                        <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="accent-sky-500" />
                                        Canal Privado (Apenas Admin)
                                    </label>
                                    <button onClick={createChannel} className="bg-sky-500 hover:bg-sky-600 text-white w-full py-1.5 rounded font-medium transition-colors">Criar</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Área de Chat */}
                <div className="flex-1 flex flex-col bg-white relative">
                    <div className="p-3 border-b font-bold flex items-center gap-2 bg-white shadow-sm z-10">
                        <span className="text-2xl text-gray-400">#</span>
                        <span className="text-gray-800">{activeChannel?.name}</span>
                        {activeChannel?.isPrivate && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full border border-yellow-200">Privado</span>}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
                        {messages.map((msg, i) => {
                            const isMe = msg.sender._id === (user._id || user.id);
                            return (
                                <div key={i} className="flex gap-3 group">
                                    <img src={msg.sender.avatarUrl ? `${API_URL}${msg.sender.avatarUrl}` : `https://ui-avatars.com/api/?name=${msg.sender.name}&background=random`} className="w-10 h-10 rounded-full object-cover mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className={`font-bold text-sm ${isMe ? 'text-sky-600' : 'text-gray-900'}`}>{msg.sender.name}</span>
                                            <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-gray-800 leading-relaxed">{msg.content}</p>
                                        {msg.attachment && (
                                            msg.attachmentType === 'image' ?
                                                <img src={`${API_URL}${msg.attachment}`} className="max-w-sm rounded-lg mt-2 border border-gray-100 shadow-sm" /> :
                                                <div className="mt-2">
                                                    <a href={`${API_URL}${msg.attachment}`} target="_blank" className="bg-gray-100 px-3 py-2 rounded flex items-center gap-2 w-fit hover:bg-gray-200 text-blue-600 text-sm">
                                                        📎 Baixar Anexo
                                                    </a>
                                                </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 bg-gray-50 border-t">
                        <div className="relative">
                            <input
                                className="w-full border border-gray-300 rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-sm"
                                placeholder={`Conversar em #${activeChannel?.name}`}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-sky-500 hover:text-sky-600 p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}