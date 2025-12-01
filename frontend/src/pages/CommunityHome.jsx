// frontend/src/pages/CommunityHome.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import CreatePost from "../components/CreatePost"; // Importando Criador
import PostCard from "../components/PostCard";     // Importando Card

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function CommunityHome() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [community, setCommunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('home'); // home, feed, chats, members

    // Estado para o Feed da Comunidade
    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(false);

    // Carregar dados da comunidade
    useEffect(() => {
        setLoading(true);
        api.get(`/communities/${id}`)
            .then(res => setCommunity(res.data))
            .catch((err) => {
                console.error(err);
                navigate('/communities');
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    // Carregar Posts quando entrar na aba 'feed'
    useEffect(() => {
        if (activeTab === 'feed') {
            setPostsLoading(true);
            // Aqui filtramos posts SOMENTE desta comunidade
            api.get(`/posts?community=${id}`)
                .then(res => setPosts(res.data))
                .catch(console.error)
                .finally(() => setPostsLoading(false));
        }
    }, [activeTab, id]);

    const handlePostCreated = (newPost) => {
        setPosts([newPost, ...posts]);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    if (!community) return null;

    const { appearance, homeLayout, name, description, members, coverUrl, avatarUrl } = community;
    const primaryColor = appearance?.primaryColor || "#6200ea";
    const membersCount = members?.length || 0;

    // Renderização das Abas
    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="space-y-4 text-center">
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <h2 className="font-bold text-lg mb-2">Sobre {name}</h2>
                            <p className="text-gray-600">{description}</p>
                            <button
                                onClick={() => setActiveTab('feed')}
                                className="mt-4 px-6 py-2 rounded-full text-white font-bold"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Ver Feed
                            </button>
                        </div>
                        {/* Se tiver layout customizado, renderiza aqui */}
                        {homeLayout?.map((block, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm">
                                <h3 className="font-bold">{block.title}</h3>
                                {block.imageUrl && <img src={block.imageUrl} className="w-full h-40 object-cover rounded-lg mt-2" />}
                                <p>{block.content}</p>
                            </div>
                        ))}
                    </div>
                );

            case 'feed':
                return (
                    <div>
                        {/* Passamos o ID da comunidade para o CreatePost */}
                        <CreatePost communityId={id} onCreated={handlePostCreated} />

                        <div className="space-y-4 mt-4">
                            {postsLoading ? <p className="text-center">Carregando posts...</p> : (
                                posts.length > 0 ? (
                                    posts.map(p => <PostCard key={p._id} post={p} />)
                                ) : (
                                    <p className="text-center text-gray-500 py-10">Nenhum post nesta comunidade ainda.</p>
                                )
                            )}
                        </div>
                    </div>
                );

            case 'chats':
                return (
                    <div className="space-y-2">
                        {/* Mock de Chats da Comunidade */}
                        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer hover:bg-gray-50">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl">📢</div>
                            <div>
                                <h4 className="font-bold">Chat Oficial</h4>
                                <p className="text-xs text-gray-500">Anúncios e avisos.</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer hover:bg-gray-50">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">💬</div>
                            <div>
                                <h4 className="font-bold">Chat Geral</h4>
                                <p className="text-xs text-gray-500">Converse com todos os membros.</p>
                            </div>
                        </div>
                    </div>
                );

            case 'members':
                return (
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <h3 className="font-bold mb-4">Membros ({membersCount})</h3>
                        <div className="space-y-4">
                            {members.map(m => (
                                <div key={m._id} className="flex items-center gap-3">
                                    <img src={m.avatarUrl || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                                    <span className="font-medium">{m.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 pb-20">
            {/* Header da Comunidade */}
            <div className="relative h-48 md:h-64">
                <img src={coverUrl?.includes('uploads') ? `${API_URL}${coverUrl}` : (coverUrl || "https://via.placeholder.com/800x400")} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40"></div>
                <button onClick={() => navigate('/communities')} className="absolute top-4 left-4 text-white p-2 bg-black/20 rounded-full">Voltar</button>

                <div className="absolute bottom-[-30px] left-4 flex items-end gap-3">
                    <img src={avatarUrl?.includes('uploads') ? `${API_URL}${avatarUrl}` : (avatarUrl || "https://via.placeholder.com/150")} className="w-20 h-20 rounded-xl border-4 border-white bg-white object-cover" />
                    <div className="pb-8 text-white">
                        <h1 className="text-2xl font-black">{name}</h1>
                        <p className="text-xs opacity-90">{membersCount} membros</p>
                    </div>
                </div>
            </div>

            {/* Navegação da Comunidade */}
            <div className="mt-10 px-4 border-b bg-white sticky top-0 z-10 overflow-x-auto no-scrollbar">
                <div className="flex gap-6 min-w-max">
                    {['home', 'feed', 'chats', 'members'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-2 font-bold text-sm border-b-2 capitalize transition-colors ${activeTab === tab ? '' : 'border-transparent text-gray-500'}`}
                            style={activeTab === tab ? { borderColor: primaryColor, color: primaryColor } : {}}
                        >
                            {tab === 'home' ? 'Início' : tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conteúdo da Aba Ativa */}
            <div className="p-4 container-healer">
                {renderContent()}
            </div>
        </div>
    );
}