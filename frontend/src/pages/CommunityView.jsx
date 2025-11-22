import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// --- ÍCONES ---
const PinIcon = () => <span>📌</span>;
const TrashIcon = () => <span>🗑️</span>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" /><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" /></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" /></svg>;

// --- HELPERS ---
const XPBar = ({ xp, level }) => (
    <div className="bg-gray-800 text-white p-3 rounded-lg mb-2 shadow-inner">
        <div className="flex justify-between items-center mb-1 text-xs font-bold uppercase tracking-wider">
            <span>Nível {level}</span><span className="text-yellow-400">{Math.floor(xp)} XP</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (xp % 100))}%` }}></div>
        </div>
    </div>
);

const RankingModal = ({ members, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">Ranking</h3><button onClick={onClose}>&times;</button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
                {members.map((m, i) => (
                    <div key={m._id} className="flex items-center gap-3 p-3 border-b border-gray-50">
                        <div className="font-bold text-lg w-8 text-center">{i + 1}</div>
                        <img src={m.user?.avatarUrl ? `${API_URL}${m.user.avatarUrl}` : "https://ui-avatars.com/api/?background=random"} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1 font-bold text-gray-800">{m.user?.name}</div>
                        <div className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full">Lvl {m.level}</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// --- RENDERIZADOR DA HOME (V11.0) ---
const HomeRenderer = ({ layout, communityId }) => {
    const [featuredPosts, setFeaturedPosts] = useState([]);

    useEffect(() => {
        // Se houver blocos de destaque, carregar posts
        if (layout.some(b => b.type === 'featured_posts')) {
            api.get(`/communities/${communityId}/posts?featured=true`).then(res => setFeaturedPosts(res.data));
        }
    }, [communityId, layout]);

    return (
        <div className="space-y-6 animate-fade-in">
            {layout.sort((a, b) => a.order - b.order).map((block, idx) => {
                switch (block.type) {
                    case 'banner':
                        return (
                            <a key={idx} href={block.linkUrl || '#'} className="block rounded-xl overflow-hidden shadow-md hover:opacity-95 transition">
                                <img src={block.imageUrl} alt={block.title} className="w-full h-32 md:h-48 object-cover" />
                                {block.title && <div className="bg-black/50 text-white p-2 text-center font-bold">{block.title}</div>}
                            </a>
                        );
                    case 'rich_text':
                        return (
                            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                {block.title && <h3 className="font-bold text-lg mb-2 text-gray-800">{block.title}</h3>}
                                <p className="text-gray-600 whitespace-pre-wrap">{block.content}</p>
                            </div>
                        );
                    case 'featured_posts':
                        return (
                            <div key={idx}>
                                <h3 className="font-bold text-gray-700 mb-3 text-lg flex items-center gap-2">⭐ {block.title || "Destaques"}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {featuredPosts.slice(0, 4).map(p => (
                                        <div key={p._id} className="bg-white p-3 rounded-xl shadow-sm border flex gap-3 overflow-hidden h-28">
                                            {p.mediaUrl && (p.mediaType === 'image' || p.mediaType === 'video') && (
                                                <img src={`${API_URL}${p.mediaUrl}`} className="w-24 h-full object-cover rounded-lg bg-gray-200" />
                                            )}
                                            <div className="flex-1 overflow-hidden">
                                                <div className="font-bold text-gray-800 truncate">{p.title || "Sem título"}</div>
                                                <div className="text-xs text-gray-500 line-clamp-2 mb-2">{p.text}</div>
                                                <div className="text-[10px] text-gray-400">Por {p.user?.name}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    default: return null;
                }
            })}
        </div>
    );
};

// --- PAINEL DE CONFIGURAÇÃO (ADMIN) ---
const SettingsTab = ({ community, onUpdate, members, onRoleChange, onBan }) => {
    const [name, setName] = useState(community.name);
    const [desc, setDesc] = useState(community.description);
    const [rules, setRules] = useState(community.rules || "");

    // Customização Visual
    const [primaryColor, setPrimaryColor] = useState(community.appearance?.primaryColor || "#0ea5e9");
    const [bgFile, setBgFile] = useState(null);
    const [allowMemberChats, setAllowMemberChats] = useState(community.chatSettings?.allowMemberCreatedChats ?? true);

    // Editor de Layout
    const [layout, setLayout] = useState(community.homeLayout || []);

    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("name", name);
            fd.append("description", desc);
            fd.append("rules", rules);
            fd.append("primaryColor", primaryColor);
            fd.append("allowMemberCreatedChats", allowMemberChats);
            fd.append("homeLayout", JSON.stringify(layout));

            if (bgFile) fd.append("background", bgFile);

            const { data } = await api.put(`/communities/${community._id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
            onUpdate(data);
            alert("Configurações salvas!");
        } catch (e) { alert("Erro ao salvar"); } finally { setLoading(false); }
    };

    // Funções do Editor de Layout
    const addBlock = (type) => setLayout([...layout, { type, title: "", content: "", imageUrl: "", order: layout.length }]);
    const removeBlock = (idx) => setLayout(layout.filter((_, i) => i !== idx));
    const moveBlock = (idx, dir) => {
        if ((idx === 0 && dir === -1) || (idx === layout.length - 1 && dir === 1)) return;
        const newLayout = [...layout];
        const temp = newLayout[idx];
        newLayout[idx] = newLayout[idx + dir];
        newLayout[idx + dir] = temp;
        // Reajustar ordem
        newLayout.forEach((b, i) => b.order = i);
        setLayout(newLayout);
    };
    const updateBlock = (idx, field, val) => {
        const newLayout = [...layout];
        newLayout[idx][field] = val;
        setLayout(newLayout);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            {/* GERAL */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Informações Básicas</h3>
                <div className="space-y-4">
                    <input className="w-full border p-2 rounded" value={name} onChange={e => setName(e.target.value)} placeholder="Nome" />
                    <input className="w-full border p-2 rounded" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição Curta" />
                    <textarea className="w-full border p-2 rounded h-24" value={rules} onChange={e => setRules(e.target.value)} placeholder="Regras da Comunidade" />
                </div>
            </div>

            {/* APARÊNCIA */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Personalização Visual</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Cor Principal</label>
                        <div className="flex gap-2 items-center">
                            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-none" />
                            <span className="text-gray-500 text-sm">{primaryColor}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Imagem de Fundo (Geral)</label>
                        <input type="file" onChange={e => setBgFile(e.target.files[0])} className="text-sm" />
                        {community.appearance?.backgroundImage && <div className="text-xs text-green-600 mt-1">Imagem atual definida.</div>}
                    </div>
                </div>
            </div>

            {/* CHATS */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Configurações de Chat (V8.0)</h3>
                <div className="flex items-center gap-3">
                    <input type="checkbox" checked={allowMemberChats} onChange={e => setAllowMemberChats(e.target.checked)} className="w-5 h-5" />
                    <label className="font-medium text-gray-700">Permitir que membros criem chats públicos</label>
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-8">Se desativado, apenas Líderes e Curadores podem criar canais.</p>
            </div>

            {/* EDITOR DE HOME (V11.0) */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">Editor da Página Inicial</h3>
                    <div className="space-x-2">
                        <button type="button" onClick={() => addBlock('banner')} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">+ Banner</button>
                        <button type="button" onClick={() => addBlock('rich_text')} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">+ Texto</button>
                        <button type="button" onClick={() => addBlock('featured_posts')} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">+ Destaques</button>
                    </div>
                </div>

                <div className="space-y-3 bg-gray-50 p-4 rounded-lg min-h-[200px]">
                    {layout.length === 0 && <div className="text-center text-gray-400 py-10">A página inicial está vazia. Adicione blocos acima.</div>}
                    {layout.map((block, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border shadow-sm flex gap-3 items-start">
                            <div className="flex flex-col gap-1">
                                <button onClick={() => moveBlock(idx, -1)} className="text-gray-400 hover:text-blue-500">▲</button>
                                <button onClick={() => moveBlock(idx, 1)} className="text-gray-400 hover:text-blue-500">▼</button>
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{block.type}</span>
                                    <button onClick={() => removeBlock(idx)} className="text-red-500 text-xs hover:underline">Remover</button>
                                </div>

                                {/* Campos específicos por tipo */}
                                <input className="w-full border p-1 rounded text-sm" placeholder="Título do Bloco" value={block.title} onChange={e => updateBlock(idx, 'title', e.target.value)} />

                                {block.type === 'rich_text' && (
                                    <textarea className="w-full border p-1 rounded text-sm h-20" placeholder="Conteúdo de texto..." value={block.content} onChange={e => updateBlock(idx, 'content', e.target.value)} />
                                )}
                                {block.type === 'banner' && (
                                    <>
                                        <input className="w-full border p-1 rounded text-sm" placeholder="URL da Imagem (ex: https://...)" value={block.imageUrl} onChange={e => updateBlock(idx, 'imageUrl', e.target.value)} />
                                        <input className="w-full border p-1 rounded text-sm" placeholder="Link de destino (opcional)" value={block.linkUrl} onChange={e => updateBlock(idx, 'linkUrl', e.target.value)} />
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* BOTÃO SALVAR */}
            <div className="sticky bottom-4 flex justify-end">
                <button onClick={handleSave} disabled={loading} className="bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-green-700 transition transform active:scale-95">
                    {loading ? "Salvando..." : "Salvar Todas as Alterações"}
                </button>
            </div>

            {/* MEMBROS */}
            <div className="bg-white p-6 rounded-xl shadow border mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Gerenciar Membros</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {members.map(m => (
                        <div key={m._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border-b">
                            <div className="flex items-center gap-3">
                                <img src={m.user?.avatarUrl ? `${API_URL}${m.user.avatarUrl}` : `https://ui-avatars.com/api/?name=${m.user?.name}`} className="w-10 h-10 rounded-full" />
                                <div><div className="font-bold text-gray-800">{m.user?.name}</div><div className="text-xs uppercase font-bold text-gray-500">{m.role}</div></div>
                            </div>
                            <div className="flex gap-2">
                                {m.role !== 'leader' && <button onClick={() => onRoleChange(m.user._id, 'leader')} className="text-xs bg-purple-500 text-white px-2 py-1 rounded">Líder</button>}
                                {m.role === 'member' && <button onClick={() => onRoleChange(m.user._id, 'curator')} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Curador</button>}
                                {m.role !== 'member' && <button onClick={() => onRoleChange(m.user._id, 'member')} className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded">Rebaixar</button>}
                                {m.role !== 'leader' && <button onClick={() => onBan(m.user._id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded">Banir</button>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function CommunityView() {
    const { id } = useParams();
    const { user: me } = useAuth();
    const { socket } = useChat();

    const [community, setCommunity] = useState(null);
    const [myRole, setMyRole] = useState('guest');
    const [activeTab, setActiveTab] = useState('home');
    const [membersList, setMembersList] = useState([]);

    const [posts, setPosts] = useState([]);

    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [newChannelType, setNewChannelType] = useState("general"); // V8.0
    const [isPrivate, setIsPrivate] = useState(false);

    const [myStatus, setMyStatus] = useState({ xp: 0, level: 1 });
    const [ranking, setRanking] = useState([]);
    const [showRanking, setShowRanking] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const loadData = async () => {
        try {
            await api.post(`/communities/${id}/join`).catch(() => { });
            const { data } = await api.get(`/communities/${id}`);
            setCommunity(data.community);
            setChannels(data.channels);
            setMyRole(data.myRole);

            if (!data.community.homeLayout || data.community.homeLayout.length === 0) {
                if (activeTab === 'home') setActiveTab('feed');
            }

            if (data.channels.length > 0 && !activeChannel) setActiveChannel(data.channels[0]);

            const pRes = await api.get(`/communities/${id}/posts`);
            setPosts(pRes.data);

            const statusRes = await api.get(`/communities/${id}/my-status`);
            setMyStatus(statusRes.data);

            if (data.myRole === 'leader') {
                const mRes = await api.get(`/communities/${id}/members_list`);
                setMembersList(mRes.data);
            }
        } catch (e) { if (e.response?.status === 403) alert("Banido."); }
    };

    useEffect(() => { loadData(); }, [id]);

    // --- CHAT LOGIC ---
    useEffect(() => {
        if (!activeChannel || activeTab !== 'chats') return;
        api.get(`/communities/channels/${activeChannel._id}/messages`).then(res => setMessages(res.data)).catch(() => { });
        if (socket) socket.emit("joinChannel", activeChannel._id);
        return () => { if (socket) socket.emit("leaveChannel", activeChannel._id); }
    }, [activeChannel, activeTab, socket]);

    useEffect(() => {
        if (!socket) return;
        const h = (msg) => {
            if (msg.channel === activeChannel?._id) {
                setMessages(p => [...p, msg]);
                if (msg.sender._id === (me._id || me.id)) fetchMyStatus();
            }
        };
        socket.on("receiveMessage", h);
        return () => socket.off("receiveMessage", h);
    }, [socket, activeChannel, me]);

    useEffect(() => messagesEndRef.current?.scrollIntoView(), [messages]);

    const fetchMyStatus = async () => { try { const { data } = await api.get(`/communities/${id}/my-status`); setMyStatus(data); } catch (e) { } };

    const uploadFile = async (file) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('media', file);
            const { data } = await api.post('/upload-media', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            socket.emit('sendMessage', { channelId: activeChannel._id, content: "", attachment: data.fileUrl, attachmentType: data.attachmentType, mimeType: data.mimeType, fileName: data.fileName });
        } catch (error) { alert("Erro upload"); }
        finally { setIsUploading(false); }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], "voice.webm", { type: 'audio/webm' });
                uploadFile(audioFile);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) { alert("Permita o microfone."); }
    };

    const stopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

    const sendChat = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        socket.emit("sendMessage", { channelId: activeChannel._id, content: chatInput });
        setChatInput("");
    };

    const createChannel = async () => {
        if (!newChannelName.trim()) return alert("Digite um nome.");
        try {
            const { data } = await api.post(`/communities/${id}/channels`, { name: newChannelName, isPrivate, type: newChannelType });
            setChannels([...channels, data]); setShowCreateChannel(false); setNewChannelName(""); setIsPrivate(false); setNewChannelType("general");
        } catch (e) { alert(e.response?.data?.error || "Erro ao criar canal."); }
    };

    const fetchRanking = async () => { const { data } = await api.get(`/communities/${id}/ranking`); setRanking(data); setShowRanking(true); };
    const handlePostCreated = (p) => { setPosts([p, ...posts]); setActiveTab('feed'); };
    const handlePostChange = (u) => setPosts(posts.map(p => p._id === u._id ? u : p));
    const handleDeletePost = async (pid) => { if (!window.confirm("Apagar?")) return; await api.delete(`/communities/${id}/posts/${pid}`); setPosts(posts.filter(p => p._id !== pid)); };
    const handlePinPost = async (pid) => { const { data } = await api.post(`/communities/${id}/posts/${pid}/pin`); handlePostChange(data); loadData(); };
    const handleRoleChange = async (uid, r) => { if (!window.confirm("Confirma?")) return; try { await api.post(`/communities/${id}/role`, { targetUserId: uid, role: r }); loadData(); } catch (e) { alert("Erro"); } };
    const handleBan = async (uid) => { if (!window.confirm("Banir?")) return; try { await api.post(`/communities/${id}/ban`, { targetUserId: uid }); loadData(); } catch (e) { alert("Erro"); } };

    if (!community) return <div>Carregando...</div>;
    const isLeader = myRole === 'leader';
    const isMod = myRole === 'leader' || myRole === 'curator';

    const primaryColor = community.appearance?.primaryColor || "#0ea5e9";
    const pageStyle = community.appearance?.backgroundImage
        ? { backgroundImage: `url(${API_URL}${community.appearance.backgroundImage})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }
        : {};
    const containerClass = community.appearance?.backgroundImage ? "bg-white/95 backdrop-blur-sm shadow-2xl rounded-xl my-4" : "";

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col transition-colors" style={pageStyle}>
            <Navbar />

            <div className={`container-healer flex-1 flex flex-col ${containerClass}`}>
                <div className="bg-white shadow-sm border-b rounded-t-xl p-4">
                    <div className="flex items-center gap-4">
                        <img src={community.avatarUrl ? `${API_URL}${community.avatarUrl}` : `https://ui-avatars.com/api/?name=${community.name}`} className="w-16 h-16 rounded-xl shadow" />
                        <div><h1 className="text-2xl font-bold text-gray-900">{community.name}</h1><p className="text-sm text-gray-500">{community.description}</p></div>
                        <div className="ml-auto flex gap-2">
                            {['home', 'feed', 'chats', 'rules'].map(t => (
                                <button key={t} onClick={() => setActiveTab(t)}
                                    className={`px-4 py-2 rounded-lg font-bold transition capitalize ${activeTab === t ? 'text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'}`}
                                    style={activeTab === t ? { backgroundColor: primaryColor } : {}}
                                >
                                    {t === 'home' ? '🏠 Home' : t === 'feed' ? '📰 Feed' : t === 'chats' ? '💬 Chats' : '📜 Regras'}
                                </button>
                            ))}
                            {isLeader && (
                                <button onClick={() => setActiveTab('admin')} className="px-4 py-2 rounded-lg font-bold transition hover:bg-gray-100 text-gray-600 border border-dashed border-gray-300">
                                    ⚙️ Admin
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex gap-6 overflow-hidden p-6">
                    <div className="w-64 hidden md:block space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <h3 className="font-bold mb-2 text-gray-700 text-sm">Meu Status</h3>
                            <XPBar xp={myStatus.xp} level={myStatus.level} />
                            <button onClick={fetchRanking} className="w-full mt-2 text-xs font-bold hover:underline" style={{ color: primaryColor }}>🏆 Ranking Global</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pb-10 no-scrollbar h-full rounded-xl">
                        {activeTab === 'home' && (
                            community.homeLayout && community.homeLayout.length > 0
                                ? <HomeRenderer layout={community.homeLayout} communityId={id} />
                                : <div className="text-center py-10 text-gray-500">A página inicial ainda não foi configurada. Vá para a aba Feed.</div>
                        )}

                        {activeTab === 'feed' && (
                            <div className="space-y-4 max-w-2xl mx-auto">
                                <CreatePost onCreated={handlePostCreated} communityId={id} />
                                {posts.map(p => (
                                    <div key={p._id} className="relative group">
                                        {isMod && <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => handlePinPost(p._id)} className="p-2 bg-white shadow rounded-full hover:bg-yellow-50"><PinIcon /></button><button onClick={() => handleDeletePost(p._id)} className="p-2 bg-white shadow rounded-full hover:bg-red-50 text-red-500"><TrashIcon /></button></div>}
                                        {p.isPinned && <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-t-lg w-fit ml-4 flex items-center gap-1"><PinIcon /> Post Afixado</div>}
                                        <PostCard post={p} onChanged={handlePostChange} onDelete={() => handleDeletePost(p._id)} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'chats' && (
                            <div className="flex h-[600px] bg-white rounded-xl shadow border overflow-hidden">
                                <div className="w-64 bg-gray-50 border-r flex flex-col">
                                    <div className="p-3 font-bold text-xs text-gray-500 uppercase border-b">Canais Públicos</div>
                                    <div className="overflow-y-auto flex-1">
                                        {channels.map(c => (
                                            <button key={c._id} onClick={() => setActiveChannel(c)}
                                                className={`w-full px-4 py-2 text-left hover:bg-gray-200 flex items-center justify-between group ${activeChannel?._id === c._id ? 'bg-white font-bold shadow-sm' : ''}`}
                                                style={activeChannel?._id === c._id ? { color: primaryColor } : {}}
                                            >
                                                <span className="truncate"># {c.name}</span>
                                                <div className="flex gap-1">
                                                    {c.type === 'official' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded" title="Oficial">✓</span>}
                                                    {c.type === 'event' && <span className="text-[10px] bg-yellow-100 text-yellow-600 px-1 rounded" title="Evento">🎉</span>}
                                                    {c.isPrivate && <span>🔒</span>}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {(isLeader || community.chatSettings?.allowMemberCreatedChats) && (
                                        <div className="p-3 border-t bg-gray-100">
                                            <button onClick={() => setShowCreateChannel(!showCreateChannel)} className="text-sm font-bold w-full" style={{ color: primaryColor }}>+ Novo Canal</button>
                                            {showCreateChannel && (
                                                <div className="mt-2 space-y-2 bg-white p-2 rounded shadow-sm">
                                                    <input className="border w-full p-1 text-sm rounded" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="Nome" />

                                                    {isLeader && (
                                                        <select className="w-full border p-1 text-xs rounded" value={newChannelType} onChange={e => setNewChannelType(e.target.value)}>
                                                            <option value="general">Geral</option>
                                                            <option value="official">Oficial</option>
                                                            <option value="event">Evento</option>
                                                        </select>
                                                    )}

                                                    <button onClick={createChannel} className="text-white w-full py-1 text-xs rounded font-bold" style={{ backgroundColor: primaryColor }}>Criar</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col relative">
                                    <div className="p-3 border-b font-bold flex items-center gap-2 bg-white shadow-sm z-10">
                                        <span className="text-gray-400 text-xl">#</span>
                                        {activeChannel?.name}
                                        {activeChannel?.type === 'official' && <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Oficial</span>}
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                                        {messages.map((msg, i) => {
                                            const isMe = msg.sender._id === (me._id || me.id);
                                            return (
                                                <div key={i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                    <img src={msg.sender.avatarUrl ? `${API_URL}${msg.sender.avatarUrl}` : `https://ui-avatars.com/api/?name=${msg.sender.name}`} className="w-8 h-8 rounded-full object-cover shadow-sm mt-1" />
                                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                                        {!isMe && <span className="text-xs text-gray-500 ml-1 mb-0.5 font-medium">{msg.sender.name}</span>}
                                                        <div className={`p-3 rounded-2xl text-sm shadow-sm relative ${isMe ? 'text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'}`}
                                                            style={isMe ? { backgroundColor: primaryColor } : {}}
                                                        >
                                                            {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                                                            {msg.attachment && (
                                                                <div className="mt-2 rounded-lg overflow-hidden">
                                                                    {msg.attachmentType === 'image' && <img src={`${API_URL}${msg.attachment}`} className="max-w-full max-h-60 object-cover" />}
                                                                    {msg.attachmentType === 'video' && <video src={`${API_URL}${msg.attachment}`} controls className="max-w-full max-h-60" />}
                                                                    {msg.attachmentType === 'audio' && <audio src={`${API_URL}${msg.attachment}`} controls className="h-8 w-60" />}
                                                                </div>
                                                            )}
                                                            <div className={`text-[9px] mt-1 text-right opacity-70 ${isMe ? 'text-white' : 'text-gray-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <div className="p-3 bg-white border-t">
                                        {isRecording ? (
                                            <div className="flex justify-between items-center bg-red-50 text-red-600 px-4 py-2 rounded-full border border-red-100 animate-pulse"><span className="font-bold text-sm">Gravando...</span><button onClick={stopRecording}><StopIcon /></button></div>
                                        ) : (
                                            <form onSubmit={sendChat} className="flex items-center gap-2">
                                                <input type="file" ref={fileInputRef} onChange={e => { uploadFile(e.target.files[0]); e.target.value = null; }} className="hidden" accept="image/*,video/*" />
                                                <button type="button" onClick={() => fileInputRef.current.click()} disabled={isUploading} className="text-gray-400 hover:text-blue-500 p-2 hover:bg-gray-100 rounded-full transition"><ImageIcon /></button>
                                                <input className="flex-1 bg-gray-100 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all text-sm" placeholder={`Mensagem em #${activeChannel?.name}`} value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={isUploading} />
                                                {chatInput.trim() ? <button type="submit" style={{ color: primaryColor }} className="p-2 font-bold"><SendIcon /></button> : <button type="button" onClick={startRecording} disabled={isUploading} className="text-gray-400 hover:text-red-500 p-2"><MicIcon /></button>}
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'rules' && <div className="bg-white p-8 rounded-xl shadow border max-w-3xl mx-auto"><h2 className="text-2xl font-bold mb-4">Diretrizes</h2><div className="prose text-gray-700 whitespace-pre-wrap">{community.rules || "Sem regras."}</div></div>}

                        {activeTab === 'admin' && isLeader && (
                            <SettingsTab
                                community={community}
                                onUpdate={setCommunity}
                                members={membersList}
                                onRoleChange={handleRoleChange}
                                onBan={handleBan}
                            />
                        )}
                    </div>
                </div>
                {showRanking && <RankingModal members={ranking} onClose={() => setShowRanking(false)} />}
            </div>
        </div>
    );
}