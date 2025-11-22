import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext"; // Socket

export default function CommunityView() {
    const { id } = useParams();
    const { user } = useAuth();
    const { socket } = useChat();
    const [community, setCommunity] = useState(null);
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    // Estados para criação de canal
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Tenta entrar se não for membro (simples auto-join para demo)
                await api.post(`/communities/${id}/join`);

                const { data } = await api.get(`/communities/${id}`);
                setCommunity(data.community);
                setChannels(data.channels);
                if (data.channels.length > 0) setActiveChannel(data.channels[0]);
            } catch (e) { console.error(e); }
        };
        loadData();
    }, [id]);

    // Carregar mensagens ao trocar de canal
    useEffect(() => {
        if (!activeChannel) return;
        api.get(`/communities/channels/${activeChannel._id}/messages`)
            .then(res => setMessages(res.data))
            .catch(console.error);

        if (socket) {
            socket.emit("joinChannel", activeChannel._id);
        }

        return () => {
            if (socket) socket.emit("leaveChannel", activeChannel._id);
        }
    }, [activeChannel, socket]);

    // Ouvir mensagens em tempo real
    useEffect(() => {
        if (!socket) return;
        const handleMsg = (msg) => {
            // Verifica se a mensagem é para o canal atual
            if (msg.channel === activeChannel?._id) {
                setMessages(prev => [...prev, msg]);
            }
        };
        socket.on("receiveMessage", handleMsg);
        return () => socket.off("receiveMessage", handleMsg);
    }, [socket, activeChannel]);

    useEffect(() => messagesEndRef.current?.scrollIntoView(), [messages]);

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
                allowedUsers: [] // Para demo, cria privado apenas para mim e dono
            });
            setChannels([...channels, data]);
            setShowCreateChannel(false);
            setNewChannelName("");
        } catch (e) { alert("Erro ao criar canal"); }
    };

    if (!community) return <div>Carregando...</div>;

    const isOwner = community.owner === user._id;

    return (
        <div className="bg-gray-50 h-screen flex flex-col">
            <Navbar />
            <div className="flex flex-1 overflow-hidden container-healer mt-4 mb-4 card">
                {/* Sidebar de Canais */}
                <div className="w-64 bg-gray-100 border-r flex flex-col">
                    <div className="p-4 border-b bg-white">
                        <h2 className="font-bold text-lg truncate">{community.name}</h2>
                        <div className="text-xs text-gray-500">{community.members.length} membros</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {channels.map(c => (
                            <button
                                key={c._id}
                                onClick={() => setActiveChannel(c)}
                                className={`w-full text-left px-3 py-2 rounded flex justify-between items-center ${activeChannel?._id === c._id ? 'bg-white shadow text-sky-600' : 'hover:bg-gray-200 text-gray-700'}`}
                            >
                                <span># {c.name}</span>
                                {c.isPrivate && <span className="text-xs bg-gray-300 px-1 rounded">🔒</span>}
                            </button>
                        ))}
                    </div>

                    {isOwner && (
                        <div className="p-2 border-t">
                            <button onClick={() => setShowCreateChannel(!showCreateChannel)} className="w-full text-sm text-sky-600 hover:underline">+ Criar Canal</button>
                            {showCreateChannel && (
                                <div className="mt-2 bg-white p-2 rounded shadow border text-sm">
                                    <input className="border w-full mb-1 p-1" placeholder="Nome" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
                                    <label className="flex items-center gap-2 mb-2">
                                        <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} /> Privado
                                    </label>
                                    <button onClick={createChannel} className="bg-sky-500 text-white w-full py-1 rounded">Criar</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="p-3 border-b font-bold flex items-center gap-2">
                        <span className="text-gray-400">#</span> {activeChannel?.name}
                        {activeChannel?.isPrivate && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Privado</span>}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg, i) => (
                            <div key={i} className="flex gap-3">
                                <img src={msg.sender.avatarUrl ? `http://localhost:4000${msg.sender.avatarUrl}` : "https://ui-avatars.com/api/?background=random"} className="w-8 h-8 rounded-full" />
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-sm">{msg.sender.name}</span>
                                        <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-gray-800">{msg.content}</p>
                                    {msg.attachment && (
                                        msg.attachmentType === 'image' ? <img src={`http://localhost:4000${msg.attachment}`} className="max-w-xs rounded mt-1" /> :
                                            <a href={`http://localhost:4000${msg.attachment}`} target="_blank" className="text-blue-500 underline text-sm">Ver anexo</a>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-2">
                        <input
                            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            placeholder={`Conversar em #${activeChannel?.name}`}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                        />
                    </form>
                </div>
            </div>
        </div>
    );
}