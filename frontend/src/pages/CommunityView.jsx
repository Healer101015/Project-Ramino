import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const PinIcon = () => <span>📌</span>;
const TrashIcon = () => <span>🗑️</span>;

const SettingsTab = ({ community, onUpdate, members, onRoleChange, onBan }) => {
    const [name, setName] = useState(community.name);
    const [desc, setDesc] = useState(community.description);
    const [rules, setRules] = useState(community.rules || "");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put(`/communities/${community._id}`, { name, description: desc, rules });
            onUpdate({ ...community, name, description: desc, rules });
            alert("Salvo!");
        } catch (e) { alert("Erro"); } finally { setLoading(false); }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Editar</h3>
                <div className="space-y-4">
                    <input className="w-full border p-2 rounded" value={name} onChange={e => setName(e.target.value)} placeholder="Nome" />
                    <input className="w-full border p-2 rounded" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição" />
                    <textarea className="w-full border p-2 rounded h-32" value={rules} onChange={e => setRules(e.target.value)} placeholder="Regras" />
                    <button onClick={handleSave} disabled={loading} className="bg-green-500 text-white px-4 py-2 rounded font-bold">Salvar</button>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Membros & Equipe</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {members.map(m => (
                        <div key={m._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border-b">
                            <div className="flex items-center gap-3">
                                <img src={m.user?.avatarUrl ? `${API_URL}${m.user.avatarUrl}` : `https://ui-avatars.com/api/?name=${m.user?.name}`} className="w-10 h-10 rounded-full" />
                                <div>
                                    <div className="font-bold text-gray-800">{m.user?.name}</div>
                                    <div className="text-xs uppercase font-bold text-gray-500">{m.role}</div>
                                </div>
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
    const { user } = useAuth();
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

    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");

    const messagesEndRef = useRef(null);

    const loadData = async () => {
        try {
            await api.post(`/communities/${id}/join`).catch(() => { });
            const { data } = await api.get(`/communities/${id}`);
            setCommunity(data.community);
            setChannels(data.channels);
            setMyRole(data.myRole);
            if (data.channels.length > 0 && !activeChannel) setActiveChannel(data.channels[0]);
            const pRes = await api.get(`/communities/${id}/posts`);
            setPosts(pRes.data);
            if (data.myRole === 'leader') {
                const mRes = await api.get(`/communities/${id}/members_list`);
                setMembersList(mRes.data);
            }
        } catch (e) { if (e.response?.status === 403) alert("Banido."); }
    };

    useEffect(() => { loadData(); }, [id]);

    const handleRoleChange = async (userId, role) => {
        if (!window.confirm("Confirmar?")) return;
        try {
            await api.post(`/communities/${id}/role`, { targetUserId: userId, role });
            setMembersList(membersList.map(m => m.user._id === userId ? { ...m, role } : m));
        } catch (e) { alert("Erro"); }
    };

    const handleBan = async (userId) => {
        if (!window.confirm("Banir usuário?")) return;
        try {
            await api.post(`/communities/${id}/ban`, { targetUserId: userId });
            setMembersList(membersList.filter(m => m.user._id !== userId));
        } catch (e) { alert("Erro"); }
    };

    // ... (Lógica de Feed/Chat mantida igual ao anterior para brevidade)
    const handlePostCreated = (p) => { setPosts([p, ...posts]); setActiveTab('feed'); };
    const handlePostChange = (u) => setPosts(posts.map(p => p._id === u._id ? u : p));
    const handleDeletePost = async (pid) => { await api.delete(`/communities/${id}/posts/${pid}`); setPosts(posts.filter(p => p._id !== pid)); };
    const handlePinPost = async (pid) => { const { data } = await api.post(`/communities/${id}/posts/${pid}/pin`); handlePostChange(data); loadData(); };

    useEffect(() => {
        if (!activeChannel || activeTab !== 'chats') return;
        api.get(`/communities/channels/${activeChannel._id}/messages`).then(res => setMessages(res.data)).catch(() => { });
        if (socket) socket.emit("joinChannel", activeChannel._id);
        return () => { if (socket) socket.emit("leaveChannel", activeChannel._id); }
    }, [activeChannel, activeTab, socket]);

    useEffect(() => {
        if (!socket) return;
        const h = (msg) => { if (msg.channel === activeChannel?._id) setMessages(p => [...p, msg]); };
        socket.on("receiveMessage", h);
        return () => socket.off("receiveMessage", h);
    }, [socket, activeChannel]);

    useEffect(() => messagesEndRef.current?.scrollIntoView(), [messages]);
    const sendChat = (e) => { e.preventDefault(); if (chatInput.trim()) { socket.emit("sendMessage", { channelId: activeChannel._id, content: chatInput }); setChatInput(""); } };

    const createChannel = async () => {
        try {
            const { data } = await api.post(`/communities/${id}/channels`, { name: newChannelName });
            setChannels([...channels, data]); setShowCreateChannel(false); setNewChannelName("");
        } catch (e) { alert("Erro"); }
    };

    if (!community) return <div>Carregando...</div>;
    const isMod = myRole === 'leader' || myRole === 'curator';
    const isLeader = myRole === 'leader';

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col">
            <Navbar />
            <div className="bg-white shadow-sm border-b">
                <div className="container-healer py-4 flex items-center gap-4">
                    <img src={community.avatarUrl ? `${API_URL}${community.avatarUrl}` : `https://ui-avatars.com/api/?name=${community.name}`} className="w-16 h-16 rounded-xl shadow" />
                    <div>
                        <h1 className="text-2xl font-bold">{community.name}</h1>
                        <p className="text-sm text-gray-500">{community.description}</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                        {['feed', 'chats', 'rules'].map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === t ? 'bg-sky-100 text-sky-700' : 'hover:bg-gray-100 text-gray-600'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                        ))}
                        {isLeader && <button onClick={() => setActiveTab('admin')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'admin' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100 text-gray-600'}`}>⚙️ Admin</button>}
                    </div>
                </div>
            </div>

            <div className="container-healer mt-6 flex-1 overflow-hidden">
                {activeTab === 'feed' && (
                    <div className="space-y-4 max-w-2xl mx-auto overflow-y-auto pb-10 h-full no-scrollbar">
                        <CreatePost onCreated={handlePostCreated} communityId={id} />
                        {posts.map(p => (
                            <div key={p._id} className="relative group">
                                {isMod && (
                                    <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => handlePinPost(p._id)} className={`p-2 rounded-full bg-white shadow hover:bg-yellow-50 ${p.isPinned ? 'text-yellow-500' : 'text-gray-400'}`}><PinIcon /></button>
                                        <button onClick={() => handleDeletePost(p._id)} className="p-2 rounded-full bg-white shadow hover:bg-red-50 text-red-400"><TrashIcon /></button>
                                    </div>
                                )}
                                {p.isPinned && <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-t-lg w-fit ml-4 flex items-center gap-1"><PinIcon /> Post Afixado</div>}
                                <PostCard post={p} onChanged={handlePostChange} onDelete={() => handleDeletePost(p._id)} />
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'chats' && (
                    <div className="flex h-[600px] bg-white rounded-xl shadow overflow-hidden border">
                        <div className="w-64 bg-gray-50 border-r flex flex-col">
                            <div className="p-3 font-bold text-gray-500 uppercase text-xs">Canais</div>
                            {channels.map(c => <button key={c._id} onClick={() => setActiveChannel(c)} className={`px-4 py-2 text-left hover:bg-gray-200 ${activeChannel?._id === c._id ? 'bg-white text-sky-600 font-bold' : ''}`}># {c.name}</button>)}
                            {isLeader && (
                                <div className="p-2 mt-auto border-t">
                                    <button onClick={() => setShowCreateChannel(!showCreateChannel)} className="text-sky-600 text-sm font-bold w-full">+ Criar Canal</button>
                                    {showCreateChannel && <div className="mt-2 p-2 bg-white rounded shadow border"><input className="border w-full mb-1 text-sm p-1" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} /><button onClick={createChannel} className="bg-sky-500 text-white text-xs w-full py-1 rounded">Salvar</button></div>}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col">
                            <div className="p-3 border-b font-bold bg-gray-50"># {activeChannel?.name}</div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messages.map((msg, i) => (
                                    <div key={i} className="flex gap-3">
                                        <img src={msg.sender.avatarUrl ? `${API_URL}${msg.sender.avatarUrl}` : `https://ui-avatars.com/api/?name=${msg.sender.name}`} className="w-8 h-8 rounded-full" />
                                        <div><span className="font-bold text-sm">{msg.sender.name}</span> <p className="text-gray-800 text-sm">{msg.content}</p></div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={sendChat} className="p-3 border-t bg-gray-50"><input className="w-full border rounded-full px-4 py-2" value={chatInput} onChange={e => setChatInput(e.target.value)} /></form>
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && (
                    <div className="bg-white p-8 rounded-xl shadow border max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Diretrizes</h2>
                        <div className="prose text-gray-700 whitespace-pre-wrap">{community.rules || "Sem regras definidas."}</div>
                    </div>
                )}

                {activeTab === 'admin' && isLeader && (
                    <SettingsTab community={community} onUpdate={setCommunity} members={membersList} onRoleChange={handleRoleChange} onBan={handleBan} />
                )}
            </div>
        </div>
    );
}