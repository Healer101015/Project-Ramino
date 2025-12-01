import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const CommunityCard = ({ community, onJoin }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isMember = community.members.some(m => m._id === user?._id || m === user?._id);
    const [loading, setLoading] = useState(false);

    const handleJoin = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        setLoading(true);
        await onJoin(community._id);
        setLoading(false);
    };

    const handleEnter = () => {
        navigate(`/c/${community._id}`);
    };

    const imageSrc = community.coverUrl?.includes('/uploads/')
        ? `${API_URL}${community.coverUrl}`
        : (community.coverUrl || "https://via.placeholder.com/400x200");

    // Usa a cor primária definida na comunidade ou roxo padrão
    const primaryColor = community.appearance?.primaryColor || "#6200ea";

    return (
        <div onClick={handleEnter} className="relative group block h-48 rounded-2xl overflow-hidden shadow-lg transform transition active:scale-95 bg-gray-800 cursor-pointer">
            <img src={imageSrc} alt={community.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-500 opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

            {/* Conteúdo */}
            <div className="absolute bottom-0 left-0 p-4 flex flex-col w-full">
                <h3 className="text-white font-extrabold text-xl leading-tight shadow-black drop-shadow-md truncate mb-1">{community.name}</h3>
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                        {community.members.slice(0, 3).map((m, i) => (
                            <div key={i} className="w-5 h-5 rounded-full border border-gray-800 bg-gray-500 overflow-hidden">
                                <img src={m.avatarUrl || "https://via.placeholder.com/50"} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                    <p className="text-gray-300 text-xs font-medium">{community.members.length} membros</p>
                </div>
            </div>

            <button
                onClick={handleJoin}
                disabled={loading}
                style={{ backgroundColor: isMember ? '#22c55e' : primaryColor }}
                className={`absolute top-3 right-3 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase shadow-md transition-all hover:opacity-90`}
            >
                {loading ? '...' : (isMember ? 'Entrou' : 'Entrar')}
            </button>
        </div>
    );
};

export default function Communities() {
    const { user } = useAuth();
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCommunities = async () => {
        try {
            const { data } = await api.get("/communities");
            setCommunities(data);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => { fetchCommunities(); }, []);

    const handleJoinCommunity = async (id) => {
        try {
            const { data: updatedComm } = await api.post(`/communities/${id}/join`);
            setCommunities(prev => prev.map(c => c._id === updatedComm._id ? updatedComm : c));
        } catch (error) { console.error(error); }
    };

    return (
        <div className="min-h-screen bg-[#121214] pb-24 text-white">
            <div className="bg-[#121214] p-4 pt-6 sticky top-0 z-10 shadow-xl border-b border-white/5">
                <h1 className="text-2xl font-black tracking-wide text-white mb-1">Explorar</h1>
                <p className="text-gray-400 text-sm">Encontre sua tribo.</p>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? <p className="text-gray-500 text-center col-span-2 mt-10">Carregando...</p> : (
                    communities.map(comm => <CommunityCard key={comm._id} community={comm} onJoin={handleJoinCommunity} />)
                )}
            </div>
        </div>
    );
}