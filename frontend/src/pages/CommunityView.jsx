import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Componente de Barra de XP
const XPBar = ({ xp, level }) => {
    // Cálculo reverso simples para visualização (apenas demo)
    // Próximo nível em: (level * 100) * level (exponencial simples ou linear)
    // Usando a lógica do backend: xp / 50 raiz
    // Nivel 1 = 0-50xp | Nivel 2 = 50-200xp

    // Simplificação visual: % do progresso para o próximo nível
    // Vamos assumir que cada nível precisa de +100 XP base progressiva para facilitar a barra
    const nextLevelXp = Math.pow(level, 2) * 50;
    const prevLevelXp = Math.pow(level - 1, 2) * 50;
    const currentLevelProgress = xp - prevLevelXp;
    const levelRange = nextLevelXp - prevLevelXp;
    const percent = Math.min(100, Math.max(0, (currentLevelProgress / levelRange) * 100));

    return (
        <div className="bg-gray-800 text-white p-3 rounded-lg mb-2 shadow-inner">
            <div className="flex justify-between items-center mb-1 text-xs font-bold uppercase tracking-wider">
                <span>Nível {level}</span>
                <span className="text-yellow-400">{Math.floor(xp)} XP</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
            </div>
            <div className="text-[10px] text-center mt-1 text-gray-400">Próx. nível em {Math.floor(nextLevelXp - xp)} XP</div>
        </div>
    );
};

const RankingModal = ({ members, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">🏆 Ranking da Comunidade</h3>
                <button onClick={onClose} className="text-white/80 hover:text-white">&times;</button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
                {members.map((m, i) => (
                    <div key={m._id} className={`flex items-center gap-3 p-3 rounded-lg border-b border-gray-50 ${i < 3 ? 'bg-yellow-50/50' : ''}`}>
                        <div className={`font-bold text-lg w-8 text-center ${i === 0 ? 'text-yellow-500 text-2xl' : i === 1 ? 'text-gray-400 text-xl' : i === 2 ? 'text-orange-400 text-xl' : 'text-gray-500'}`}>
                            {i + 1}
                        </div>
                        <img src={m.user?.avatarUrl ? (m.user.avatarUrl.startsWith('http') ? m.user.avatarUrl : `${API_URL}${m.user.avatarUrl}`) : "https://ui-avatars.com/api/?background=random"} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                        <div className="flex-1">
                            <div className="font-bold text-gray-800">{m.user?.name || "Usuário"}</div>
                            <div className="text-xs text-gray-500 font-mono">{Math.floor(m.xp)} XP</div>
                        </div>
                        <div className="bg-sky-100 text-sky-700 text-xs font-bold px-2 py-1 rounded-full">
                            Lvl {m.level}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default function CommunityView() {
    const { id } = useParams();
    const { user } = useAuth();
    const { socket } = useChat();
    const [community, setCommunity] = useState(null);
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    // Estados XP/Rank
    const [myStatus, setMyStatus] = useState({ xp: 0, level: 1 });
    const [ranking, setRanking] = useState([]);
    const [showRanking, setShowRanking] = useState(false);

    // Estados admin
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);

    const messagesEndRef = useRef(null);

    const fetchMyStatus = async () => {
        try {
            const { data } = await api.get(`/communities/${id}/my-status`);
            setMyStatus(data);
        } catch (e) { }
    };

    const fetchRanking = async () => {
        try {
            const { data } = await api.get(`/communities/${id}/ranking`);
            setRanking(data);
            setShowRanking(true);
        } catch (e) { }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                await api.post(`/communities/${id}/join`);
                const { data } = await api.get(`/communities/${id}`);
                setCommunity(data.community);
                setChannels(data.channels);
                if (data.channels.length > 0) setActiveChannel(data.channels[0]);
                fetchMyStatus();
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
        return () => { if (socket) socket.emit("leaveChannel", activeChannel._id); }
    }, [activeChannel, socket]);

    useEffect(() => {
        if (!socket) return;
        const handleMsg = (msg) => {
            if (msg.channel === activeChannel?._id) {
                setMessages(prev => [...prev, msg]);
                // Atualiza status de XP se fui eu quem mandou (otimista ou fetch)
                if (msg.sender._id === (user._id || user.id)) {
                    fetchMyStatus(); // Recarrega XP
                }
            }
        };
        socket.on("receiveMessage", handleMsg);
        return () => socket.off("receiveMessage", handleMsg);
    }, [socket, activeChannel, user]);

    useEffect(() => messagesEndRef.current?.scrollIntoView(), [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !activeChannel) return;
        socket.emit("sendMessage", { channelId: activeChannel._id, content: input });
        setInput("");
    };

    // Função createChannel omitida para brevidade (mesma do anterior)
    // ...

    if (!community) return <div className="bg-gray-50 h-screen flex items-center justify-center">Carregando...</div>;

    return (
        <div className="bg-gray-50 h-screen flex flex-col">
            <Navbar />
            <div className="flex flex-1 overflow-hidden container-healer md:mt-4 md:mb-4 card md:rounded-xl md:shadow-lg">

                {/* Sidebar */}
                <div className="w-72 bg-gray-100 border-r flex flex-col">
                    <div className="p-4 border-b bg-white shadow-sm z-10">
                        <h2 className="font-bold text-lg truncate text-gray-800">{community.name}</h2>

                        {/* Barra de XP */}
                        <div className="mt-3">
                            <XPBar xp={myStatus.xp} level={myStatus.level} />
                        </div>

                        <button onClick={fetchRanking} className="w-full text-xs font-bold text-sky-600 bg-sky-50 py-2 rounded hover:bg-sky-100 transition flex items-center justify-center gap-2">
                            🏆 Ver Ranking
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        <div className="px-2 py-2 text-xs font-bold text-gray-400 uppercase">Canais</div>
                        {channels.map(c => (
                            <button
                                key={c._id}
                                onClick={() => setActiveChannel(c)}
                                className={`w-full text-left px-3 py-2 rounded-lg flex justify-between items-center transition-colors ${activeChannel?._id === c._id ? 'bg-white shadow text-sky-600 font-medium' : 'hover:bg-gray-200 text-gray-600'}`}
                            >
                                <span className="truncate"># {c.name}</span>
                                {c.isPrivate && <span>🔒</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat */}
                <div className="flex-1 flex flex-col bg-white relative">
                    {/* Header Chat */}
                    <div className="p-3 border-b font-bold flex items-center gap-2 bg-white shadow-sm z-10">
                        <span className="text-2xl text-gray-400">#</span>
                        <span className="text-gray-800">{activeChannel?.name}</span>
                    </div>

                    {/* Lista de Mensagens */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                        {messages.map((msg, i) => (
                            <div key={i} className="flex gap-3 group animate-fade-in">
                                <img src={msg.sender.avatarUrl ? `${API_URL}${msg.sender.avatarUrl}` : "https://ui-avatars.com/api/?background=random"} className="w-10 h-10 rounded-full object-cover mt-1" />
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-sm text-gray-900">{msg.sender.name}</span>
                                        <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-gray-800 leading-relaxed">{msg.content}</p>
                                    {/* Anexos omitidos para brevidade */}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-gray-50 border-t">
                        <div className="relative">
                            <input
                                className="w-full border border-gray-300 rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-sm"
                                placeholder={`Conversar em #${activeChannel?.name}`}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-sky-500 hover:text-sky-600 p-2">➤</button>
                        </div>
                    </form>
                </div>
            </div>

            {showRanking && <RankingModal members={ranking} onClose={() => setShowRanking(false)} />}
        </div>
    );
}