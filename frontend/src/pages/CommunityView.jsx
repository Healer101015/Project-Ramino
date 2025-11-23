import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// --- ÍCONES (SVG Otimizados) ---
const Icons = {
    Pin: () => <span className="text-lg">📌</span>,
    Trash: () => <span className="text-lg">🗑️</span>,
    Send: () => <svg className="w-6 h-6 transform rotate-45 relative -top-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>,
    Mic: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
    Image: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    Stop: () => <div className="w-4 h-4 bg-red-500 rounded-sm animate-pulse"></div>,
    Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Info: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> // <--- FALTAVA ESTE AQUI
};

// --- COMPONENTES WIDGETS ---
const XPBar = ({ xp, level, primaryColor }) => (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Nível {level}</span>
            <span className="text-xs font-bold" style={{ color: primaryColor }}>{Math.floor(xp)} XP</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,0,0,0.1)]"
                style={{ width: `${Math.min(100, (xp % 100))}%`, background: primaryColor }}></div>
        </div>
    </div>
);

const RankingModal = ({ members, onClose, primaryColor }) => (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 text-white flex justify-between items-center relative overflow-hidden" style={{ background: primaryColor }}>
                <div className="absolute inset-0 bg-black/10"></div>
                <h3 className="font-bold text-xl relative z-10">🏆 Ranking da Comunidade</h3>
                <button onClick={onClose} className="relative z-10 bg-white/20 p-1 rounded-full hover:bg-white/30 transition">✕</button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 bg-gray-50 flex-1">
                {members.map((m, i) => (
                    <div key={m._id} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className={`font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full ${i < 3 ? 'bg-yellow-100 text-yellow-700' : 'text-gray-400'}`}>
                            {i + 1}
                        </div>
                        <img src={m.user?.avatarUrl ? `${API_URL}${m.user.avatarUrl}` : "https://ui-avatars.com/api/?background=random"} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
                        <div className="flex-1">
                            <div className="font-bold text-gray-800">{m.user?.name}</div>
                            <div className="text-xs text-gray-500 font-medium uppercase">{m.titles?.[0] || m.role}</div>
                        </div>
                        <div className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600">Lvl {m.level}</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// --- RENDERIZADOR DA HOME ---
const HomeRenderer = ({ layout, communityId }) => {
    const [featuredPosts, setFeaturedPosts] = useState([]);
    useEffect(() => {
        if (layout.some(b => b.type === 'featured_posts')) {
            api.get(`/communities/${communityId}/posts?featured=true`).then(res => setFeaturedPosts(res.data));
        }
    }, [communityId, layout]);

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {layout.sort((a, b) => a.order - b.order).map((block, idx) => {
                switch (block.type) {
                    case 'banner':
                        return (
                            <a key={idx} href={block.linkUrl || '#'} className="block rounded-2xl overflow-hidden shadow-lg relative group transform transition hover:scale-[1.01]">
                                <img src={block.imageUrl} alt={block.title} className="w-full h-48 md:h-80 object-cover" />
                                {block.title && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6">
                                        <h3 className="text-white font-bold text-2xl md:text-3xl shadow-sm">{block.title}</h3>
                                    </div>
                                )}
                            </a>
                        );
                    case 'rich_text':
                        return (
                            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                {block.title && <h3 className="font-bold text-xl mb-3 text-gray-800 border-b pb-2 border-gray-50">{block.title}</h3>}
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{block.content}</p>
                            </div>
                        );
                    case 'featured_posts':
                        return (
                            <div key={idx}>
                                <h3 className="font-bold text-gray-800 mb-4 text-lg px-1 flex items-center gap-2"><span className="bg-yellow-400 w-2 h-6 rounded-full block"></span>{block.title || "Destaques"}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {featuredPosts.slice(0, 4).map(p => (
                                        <div key={p._id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition">
                                            {p.mediaUrl && (p.mediaType === 'image' || p.mediaType === 'video') && (
                                                <img src={`${API_URL}${p.mediaUrl}`} className="w-28 h-28 object-cover rounded-xl bg-gray-100" />
                                            )}
                                            <div className="flex-1 flex flex-col justify-center py-1 overflow-hidden">
                                                <div className="font-bold text-gray-800 text-base truncate mb-1">{p.title || "Sem título"}</div>
                                                <div className="text-xs text-gray-500 line-clamp-2 mb-auto leading-relaxed">{p.text}</div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <img src={p.user?.avatarUrl ? `${API_URL}${p.user.avatarUrl}` : ''} className="w-5 h-5 rounded-full bg-gray-200" />
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{p.user?.name}</span>
                                                </div>
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

// --- ADMIN PANEL ---
const SettingsTab = ({ community, onUpdate, members, onRoleChange, onBan }) => {
    const [name, setName] = useState(community.name);
    const [desc, setDesc] = useState(community.description);
    const [rules, setRules] = useState(community.rules || "");
    const [primaryColor, setPrimaryColor] = useState(community.appearance?.primaryColor || "#0ea5e9");
    const [bgFile, setBgFile] = useState(null);
    const [allowMemberChats, setAllowMemberChats] = useState(community.chatSettings?.allowMemberCreatedChats ?? true);
    const [layout, setLayout] = useState(community.homeLayout || []);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("name", name); fd.append("description", desc); fd.append("rules", rules);
            fd.append("primaryColor", primaryColor); fd.append("allowMemberCreatedChats", allowMemberChats);
            fd.append("homeLayout", JSON.stringify(layout));
            if (bgFile) fd.append("background", bgFile);

            const { data } = await api.put(`/communities/${community._id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
            onUpdate(data); alert("Salvo com sucesso!");
        } catch (e) { alert("Erro ao salvar."); } finally { setLoading(false); }
    };

    // Layout helpers
    const addBlock = (type) => setLayout([...layout, { type, title: "", content: "", imageUrl: "", order: layout.length }]);
    const removeBlock = (idx) => setLayout(layout.filter((_, i) => i !== idx));
    const updateBlock = (idx, field, val) => { const n = [...layout]; n[idx][field] = val; setLayout(n); };
    const moveBlock = (idx, dir) => {
        if ((idx === 0 && dir === -1) || (idx === layout.length - 1 && dir === 1)) return;
        const n = [...layout]; const temp = n[idx]; n[idx] = n[idx + dir]; n[idx + dir] = temp;
        n.forEach((b, i) => b.order = i); setLayout(n);
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header do Admin */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6 rounded-3xl shadow-lg">
                <h2 className="text-2xl font-bold mb-2">Painel de Controle</h2>
                <p className="opacity-80 text-sm">Gerencie aparência, layout e membros da comunidade.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span className="bg-blue-100 text-blue-600 p-1 rounded">🎨</span> Aparência</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-bold text-gray-600 block mb-2">Cor Principal</label>
                        <div className="flex items-center gap-3">
                            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-12 w-12 rounded-xl cursor-pointer border-0 bg-transparent" />
                            <div className="text-xs bg-gray-100 px-3 py-2 rounded-lg font-mono">{primaryColor}</div>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-600 block mb-2">Background (Imagem)</label>
                        <input type="file" onChange={e => setBgFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span className="bg-purple-100 text-purple-600 p-1 rounded">🏠</span> Layout da Home</h3>
                    <div className="flex gap-2">
                        <button onClick={() => addBlock('banner')} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-bold transition">+ Banner</button>
                        <button onClick={() => addBlock('rich_text')} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-bold transition">+ Texto</button>
                        <button onClick={() => addBlock('featured_posts')} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-bold transition">+ Posts</button>
                    </div>
                </div>
                <div className="space-y-4">
                    {layout.length === 0 && <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">Sem blocos. Adicione um acima.</div>}
                    {layout.map((block, i) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 relative group">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white px-2 py-1 rounded border">{block.type}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => moveBlock(i, -1)} className="p-1 hover:bg-white rounded">⬆️</button>
                                    <button onClick={() => moveBlock(i, 1)} className="p-1 hover:bg-white rounded">⬇️</button>
                                    <button onClick={() => removeBlock(i)} className="p-1 hover:bg-red-100 rounded text-red-500">🗑️</button>
                                </div>
                            </div>
                            <input className="w-full mb-2 p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-200 outline-none" placeholder="Título do Bloco" value={block.title} onChange={e => updateBlock(i, 'title', e.target.value)} />
                            {block.type === 'rich_text' && <textarea className="w-full p-2 rounded-lg border border-gray-300 text-sm h-24 focus:ring-2 focus:ring-blue-200 outline-none" placeholder="Conteúdo..." value={block.content} onChange={e => updateBlock(i, 'content', e.target.value)} />}
                            {block.type === 'banner' && <input className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-200 outline-none" placeholder="URL da Imagem" value={block.imageUrl} onChange={e => updateBlock(i, 'imageUrl', e.target.value)} />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-4 right-4 left-4 md:left-auto z-30">
                <button onClick={handleSave} disabled={loading} className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-full font-bold shadow-2xl hover:scale-105 transition transform disabled:opacity-50 disabled:scale-100">
                    {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
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
    const [activeTab, setActiveTab] = useState('feed');
    const [membersList, setMembersList] = useState([]);
    const [posts, setPosts] = useState([]);
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [myStatus, setMyStatus] = useState({ xp: 0, level: 1 });
    const [ranking, setRanking] = useState([]);
    const [showRanking, setShowRanking] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false); // Mobile Info Modal

    // Chat states
    const [isMobileChatList, setIsMobileChatList] = useState(true);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [newChannelType, setNewChannelType] = useState("general");

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Load Data
    const loadData = async () => {
        try {
            await api.post(`/communities/${id}/join`).catch(() => { });
            const { data } = await api.get(`/communities/${id}`);
            setCommunity(data.community);
            setChannels(data.channels);
            setMyRole(data.myRole);

            // Smart Tab Init
            if (data.community.homeLayout?.length > 0) setActiveTab('home');

            if (data.channels.length > 0) setActiveChannel(data.channels[0]);

            const pRes = await api.get(`/communities/${id}/posts`);
            setPosts(pRes.data);

            api.get(`/communities/${id}/my-status`).then(r => setMyStatus(r.data));
            if (data.myRole === 'leader') api.get(`/communities/${id}/members_list`).then(r => setMembersList(r.data));

        } catch (e) { console.error(e); }
    };

    useEffect(() => { loadData(); }, [id]);

    // Chat Logic
    useEffect(() => {
        if (activeTab === 'chats' && activeChannel) {
            api.get(`/communities/channels/${activeChannel._id}/messages`).then(r => setMessages(r.data));
            if (socket) {
                socket.emit("joinChannel", activeChannel._id);
                const h = (msg) => { if (msg.channel === activeChannel._id) setMessages(p => [...p, msg]); };
                socket.on("receiveMessage", h);
                return () => { socket.emit("leaveChannel", activeChannel._id); socket.off("receiveMessage", h); };
            }
        }
    }, [activeChannel, activeTab, socket]);

    useEffect(() => messagesEndRef.current?.scrollIntoView(), [messages]);

    const sendChat = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        socket.emit("sendMessage", { channelId: activeChannel._id, content: chatInput });
        setChatInput("");
    };

    const createChannel = async () => {
        if (!newChannelName.trim()) return;
        try {
            const { data } = await api.post(`/communities/${id}/channels`, { name: newChannelName, type: newChannelType });
            setChannels([...channels, data]); setShowCreateChannel(false); setNewChannelName("");
        } catch (e) { alert("Erro ao criar canal."); }
    };

    const fetchRanking = async () => { const { data } = await api.get(`/communities/${id}/ranking`); setRanking(data); setShowRanking(true); };
    const handlePostCreated = (p) => { setPosts([p, ...posts]); setActiveTab('feed'); };
    const handlePostChange = (u) => setPosts(posts.map(p => p._id === u._id ? u : p));
    const handleDeletePost = async (pid) => { if (!window.confirm("Apagar?")) return; await api.delete(`/communities/${id}/posts/${pid}`); setPosts(posts.filter(p => p._id !== pid)); };
    const handlePinPost = async (pid) => { const { data } = await api.post(`/communities/${id}/posts/${pid}/pin`); handlePostChange(data); loadData(); };
    const handleRoleChange = async (uid, r) => { if (!window.confirm("Confirma?")) return; try { await api.post(`/communities/${id}/role`, { targetUserId: uid, role: r }); loadData(); } catch (e) { alert("Erro"); } };
    const handleBan = async (uid) => { if (!window.confirm("Banir?")) return; try { await api.post(`/communities/${id}/ban`, { targetUserId: uid }); loadData(); } catch (e) { alert("Erro"); } };

    if (!community) return <div className="min-h-screen flex justify-center items-center"><div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;

    const isLeader = myRole === 'leader';
    const isMod = myRole === 'leader' || myRole === 'curator';

    const primaryColor = community.appearance?.primaryColor || "#0ea5e9";
    const pageStyle = community.appearance?.backgroundImage ? { backgroundImage: `url(${API_URL}${community.appearance.backgroundImage})` } : {};

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Background Overlay */}
            <div className="fixed inset-0 z-0 bg-cover bg-center opacity-5 pointer-events-none" style={pageStyle}></div>

            <Navbar />

            {/* Main Container */}
            <div className="flex-1 container-healer relative z-10 flex flex-col md:pb-10">

                {/* HERO HEADER (Mobile & Desktop) */}
                <div className="relative bg-white md:rounded-b-3xl shadow-sm border-b border-gray-100 overflow-hidden">
                    {/* Cover Image */}
                    <div className="h-40 md:h-64 w-full bg-gray-200 relative group">
                        {community.coverUrl ? (
                            <img src={`${API_URL}${community.coverUrl}`} className="w-full h-full object-cover transition duration-700 group-hover:scale-105" />
                        ) : <div className="w-full h-full bg-gradient-to-r from-gray-300 to-gray-400"></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                        {/* Mobile Info Button (Top Right) */}
                        <button onClick={() => setShowInfoModal(true)} className="md:hidden absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white p-2 rounded-full shadow-lg border border-white/30 active:scale-90 transition">
                            <Icons.Info />
                        </button>
                    </div>

                    {/* Header Content */}
                    <div className="px-4 md:px-8 pb-0 -mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6">
                        <img src={community.avatarUrl ? `${API_URL}${community.avatarUrl}` : `https://ui-avatars.com/api/?name=${community.name}`}
                            className="w-28 h-28 md:w-36 md:h-36 rounded-3xl border-[6px] border-white shadow-xl bg-white object-cover" />

                        <div className="flex-1 text-center md:text-left mb-4 md:mb-6">
                            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 tracking-tight">{community.name}</h1>
                            <p className="text-sm md:text-base text-gray-600 mt-1 max-w-2xl leading-relaxed">{community.description}</p>
                        </div>
                    </div>

                    {/* TABS NAVIGATION (Sticky & Scrollable) */}
                    <div className="sticky top-[64px] z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
                        <div className="flex overflow-x-auto px-4 md:px-8 no-scrollbar gap-6 md:gap-8">
                            {['home', 'feed', 'chats', 'rules'].map(t => (
                                <button key={t} onClick={() => setActiveTab(t)}
                                    className={`py-4 px-2 text-sm md:text-base font-bold capitalize whitespace-nowrap border-b-[3px] transition-all duration-300 ${activeTab === t ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                                    style={activeTab === t ? { borderColor: primaryColor, color: primaryColor } : {}}
                                >
                                    {t === 'home' ? '🏠 Início' : t === 'feed' ? '📰 Feed' : t === 'chats' ? '💬 Chats' : '📜 Regras'}
                                </button>
                            ))}

                            {/* ADMIN TAB (Acessível para Líder) */}
                            {isLeader && (
                                <button onClick={() => setActiveTab('admin')}
                                    className={`py-4 px-2 text-sm md:text-base font-bold whitespace-nowrap border-b-[3px] transition-all flex items-center gap-2 ${activeTab === 'admin' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                                    <Icons.Settings /> Admin
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* LAYOUT CONTENT */}
                <div className="flex items-start gap-8 px-4 md:px-0 mt-6">

                    {/* Desktop Sidebar */}
                    <div className="hidden md:block w-80 shrink-0 sticky top-44 space-y-6">
                        <XPBar xp={myStatus.xp} level={myStatus.level} primaryColor={primaryColor} />
                        <button onClick={() => { fetchRanking(); setShowRanking(true); }} className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm font-bold text-gray-700 hover:bg-gray-50 transition flex justify-between items-center">
                            <span>🏆 Ranking</span> <span>→</span>
                        </button>
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="font-bold text-gray-900 mb-2">Sobre</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">{community.description}</p>
                        </div>
                    </div>

                    {/* MAIN AREA */}
                    <div className="flex-1 min-w-0">

                        {activeTab === 'home' && (
                            <HomeRenderer layout={community.homeLayout} communityId={id} />
                        )}

                        {activeTab === 'feed' && (
                            <div className="space-y-6 max-w-3xl mx-auto pb-20">
                                <CreatePost onCreated={p => setPosts([p, ...posts])} communityId={id} />
                                {posts.map(p => (
                                    <div key={p._id} className="relative group">
                                        {isMod && <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => handlePinPost(p._id)} className="p-2 bg-white shadow rounded-full hover:bg-yellow-50"><Icons.Pin /></button><button onClick={() => handleDeletePost(p._id)} className="p-2 bg-white shadow rounded-full hover:bg-red-50 text-red-500"><Icons.Trash /></button></div>}
                                        {p.isPinned && <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-t-lg w-fit ml-4 flex items-center gap-1"><Icons.Pin /> Post Afixado</div>}
                                        <PostCard post={p} onChanged={handlePostChange} onDelete={() => handleDeletePost(p._id)} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'chats' && (
                            <div className="bg-white md:rounded-3xl shadow-xl border border-gray-100 overflow-hidden h-[calc(100vh-240px)] md:h-[600px] flex relative mx-[-16px] md:mx-0">
                                {/* Lista de Canais (Mobile First: Alterna visibilidade) */}
                                <div className={`${isMobileChatList ? 'flex' : 'hidden'} md:flex w-full md:w-80 flex-col border-r border-gray-100 bg-gray-50/50`}>
                                    <div className="p-4 border-b bg-white font-bold text-gray-800 flex justify-between items-center sticky top-0">
                                        <span>Canais</span>
                                        {(isLeader || community.chatSettings?.allowMemberCreatedChats) && (
                                            <button onClick={() => setShowCreateChannel(!showCreateChannel)} className="text-sky-600 p-1 bg-sky-50 rounded-lg hover:bg-sky-100"><Icons.Plus /></button>
                                        )}
                                    </div>

                                    {/* Formulário Novo Canal */}
                                    {showCreateChannel && (
                                        <div className="p-3 bg-gray-100 border-b animate-fade-in">
                                            <input className="w-full p-2 rounded-lg border text-sm mb-2" placeholder="Nome do canal..." value={newChannelName} onChange={e => setNewChannelName(e.target.value)} autoFocus />
                                            <div className="flex gap-2">
                                                <button onClick={createChannel} className="flex-1 bg-black text-white rounded-lg py-1 text-xs font-bold">Criar</button>
                                                <button onClick={() => setShowCreateChannel(false)} className="flex-1 bg-gray-200 text-gray-600 rounded-lg py-1 text-xs font-bold">Cancelar</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {channels.map(c => (
                                            <button key={c._id} onClick={() => { setActiveChannel(c); setIsMobileChatList(false); }}
                                                className={`w-full px-4 py-3 text-left rounded-xl text-sm font-medium transition flex items-center justify-between group ${activeChannel?._id === c._id ? 'bg-white shadow-md text-sky-600 ring-1 ring-gray-100' : 'text-gray-600 hover:bg-gray-200/50'}`}>
                                                <span className="truncate"># {c.name}</span>
                                                {c.type === 'official' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-bold">OFICIAL</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Área de Mensagens */}
                                <div className={`${!isMobileChatList ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white relative h-full`}>
                                    {/* Chat Header Mobile */}
                                    <div className="p-3 border-b flex items-center gap-3 bg-white/90 backdrop-blur sticky top-0 z-20 shadow-sm">
                                        <button onClick={() => setIsMobileChatList(true)} className="md:hidden p-2 bg-gray-100 rounded-full hover:bg-gray-200">←</button>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 text-sm md:text-base"># {activeChannel?.name || 'Selecione um canal'}</span>
                                            <span className="text-[10px] text-green-500 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                                        {messages.map((msg, i) => {
                                            const isMe = msg.sender._id === (me._id || me.id);
                                            return (
                                                <div key={i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} animate-fade-in`}>
                                                    <img src={msg.sender.avatarUrl ? `${API_URL}${msg.sender.avatarUrl}` : `https://ui-avatars.com/api/?name=${msg.sender.name}`} className="w-8 h-8 rounded-full object-cover shadow-sm self-end mb-1" />
                                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}
                                                        style={isMe ? { backgroundColor: primaryColor } : {}}>
                                                        {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                                                        {/* Attachments logic simplified for brevity */}
                                                        {msg.attachment && <div className="mt-2"><img src={`${API_URL}${msg.attachment}`} className="rounded-lg max-h-48 object-cover" /></div>}
                                                        <div className={`text-[9px] mt-1 text-right opacity-70 ${isMe ? 'text-white' : 'text-gray-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-3 bg-white border-t safe-area-bottom">
                                        <form onSubmit={sendChat} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-full border border-gray-200 focus-within:ring-2 focus-within:ring-sky-100 focus-within:border-sky-300 transition-all shadow-sm">
                                            <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-gray-400 hover:text-sky-500 transition rounded-full hover:bg-white"><Icons.Image /></button>
                                            <input className="flex-1 bg-transparent px-2 text-sm outline-none text-gray-700 placeholder-gray-400" placeholder={`Mensagem em #${activeChannel?.name}...`} value={chatInput} onChange={e => setChatInput(e.target.value)} />
                                            <button type="submit" disabled={!chatInput.trim()} className="p-2 bg-sky-500 text-white rounded-full shadow-md hover:scale-105 active:scale-95 transition disabled:opacity-50 disabled:shadow-none" style={{ backgroundColor: primaryColor }}>
                                                <Icons.Send />
                                            </button>
                                        </form>
                                        <input type="file" ref={fileInputRef} className="hidden" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'rules' && (
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mx-auto max-w-3xl animate-fade-in">
                                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">📜 Diretrizes da Comunidade</h2>
                                <div className="prose text-gray-600 whitespace-pre-wrap leading-loose">{community.rules || "Sem regras definidas."}</div>
                            </div>
                        )}

                        {activeTab === 'admin' && isLeader && (
                            <SettingsTab
                                community={community} onUpdate={setCommunity}
                                members={membersList} onRoleChange={handleRoleChange} onBan={handleBan}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* MOBILE INFO MODAL (XP & About) */}
            {showInfoModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:hidden animate-fade-in" onClick={() => setShowInfoModal(false)}>
                    <div className="bg-white w-full rounded-t-3xl p-6 shadow-2xl animate-slide-in-up" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
                        <h3 className="font-bold text-lg mb-4 text-gray-800">Meu Progresso</h3>
                        <XPBar xp={myStatus.xp} level={myStatus.level} primaryColor={primaryColor} />
                        <button onClick={() => { fetchRanking(); setShowRanking(true); setShowInfoModal(false); }} className="w-full mt-4 py-3 bg-gray-100 rounded-xl font-bold text-gray-700">Ver Ranking Global</button>
                        <div className="mt-6 pt-6 border-t">
                            <h4 className="font-bold text-gray-800 mb-2">Sobre a Comunidade</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">{community.description}</p>
                        </div>
                    </div>
                </div>
            )}

            {showRanking && <RankingModal members={ranking} onClose={() => setShowRanking(false)} primaryColor={primaryColor} />}
        </div>
    );
}