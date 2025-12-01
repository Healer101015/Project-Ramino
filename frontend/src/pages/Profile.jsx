import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PostCard from "../components/PostCard.jsx";
import CreatePost from "../components/CreatePost.jsx";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { useChat } from "../context/ChatContext.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Helper para imagens seguras
const getSafeImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.includes('/uploads/')) return `${API_URL}${url}`;
  return url;
};

// --- Componente de Header do Perfil ---
const ProfileHeader = ({ user, stats }) => {
  const avatar = user.avatarUrl && !user.avatarUrl.includes("undefined")
    ? getSafeImageUrl(user.avatarUrl)
    : `https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff&size=256`;

  const cover = user.coverPhotoUrl ? getSafeImageUrl(user.coverPhotoUrl) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
      {/* Capa */}
      <div className="h-40 md:h-64 bg-gray-200 relative">
        {cover ? (
          <img src={cover} className="w-full h-full object-cover" alt="Capa" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
        )}
      </div>

      {/* Dados do Usuário */}
      <div className="px-4 pb-6 relative">
        <div className="flex flex-col items-center md:flex-row md:items-end -mt-16 md:-mt-20 gap-4">

          {/* Avatar Centralizado no Mobile */}
          <div className="relative z-10">
            <img
              src={avatar}
              className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white object-cover shadow-lg bg-white"
              alt={user.name}
            />
          </div>

          {/* Nome e Bio */}
          <div className="flex-1 text-center md:text-left mt-2 md:mt-0 md:mb-2 w-full">
            <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
            <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto md:mx-0">{user.bio || "Nenhuma biografia."}</p>
          </div>

          {/* Estatísticas (Card Flutuante no Desktop, Bloco no Mobile) */}
          <div className="flex gap-6 bg-gray-50 px-6 py-3 rounded-xl border border-gray-100 shadow-sm mt-2 md:mt-0">
            <div className="text-center">
              <span className="block font-black text-lg text-gray-800">{stats.followers}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Seguidores</span>
            </div>
            <div className="text-center">
              <span className="block font-black text-lg text-gray-800">{stats.following}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Seguindo</span>
            </div>
            <div className="text-center">
              <span className="block font-black text-lg text-yellow-500 flex items-center justify-center gap-1">
                {stats.reputation} <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Reputação</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { openChat } = useChat();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get(`/users/${id}`);
      setProfileData(data);
      if (me) setIsFollowing(data.user.followers.some(f => f._id === me._id));
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, [id, me]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleFollow = async () => {
    try {
      await api.post(`/users/${id}/${isFollowing ? 'unfollow' : 'follow'}`);
      setIsFollowing(!isFollowing);
      fetchProfile();
    } catch (e) { console.error(e); }
  };

  const handlePostToWall = (newPost) => {
    setProfileData(prev => ({ ...prev, wallPosts: [newPost, ...prev.wallPosts] }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!profileData) return <div className="text-center mt-10">Perfil não encontrado.</div>;

  const { user, posts, wallPosts } = profileData;
  const isMe = me?._id === user._id;

  return (
    <div className="bg-[#f0f2f5] min-h-screen pb-20">
      <Navbar />
      <div className="container-healer mt-4 px-3 md:px-0">

        <ProfileHeader user={user} stats={{ followers: user.followers.length, following: user.following.length, reputation: user.reputation }} />

        {/* Botões de Ação */}
        <div className="bg-white rounded-xl p-3 mb-4 shadow-sm flex gap-3">
          {isMe ? (
            <button onClick={() => navigate('/settings')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-bold transition">Editar Perfil</button>
          ) : (
            <>
              <button onClick={handleFollow} className={`flex-1 py-2.5 rounded-lg font-bold text-white transition ${isFollowing ? 'bg-gray-400' : 'bg-purple-600'}`}>{isFollowing ? 'Deixar de Seguir' : 'Seguir'}</button>
              <button onClick={() => openChat(user)} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg font-bold transition">Mensagem</button>
            </>
          )}
        </div>

        {/* Abas */}
        <div className="flex bg-white rounded-t-xl px-2 border-b sticky top-16 z-10 shadow-sm">
          {['posts', 'mural', 'about'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 font-bold text-sm border-b-4 transition uppercase ${activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {tab === 'posts' ? 'Posts' : tab === 'mural' ? 'Mural' : 'Sobre'}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="bg-[#f0f2f5] pt-4 space-y-4">
          {activeTab === 'posts' && (
            <>
              {isMe && <CreatePost onCreated={p => setProfileData(prev => ({ ...prev, posts: [p, ...prev.posts] }))} placeholder="O que está acontecendo?" />}
              {posts.length > 0 ? posts.map(p => <PostCard key={p._id} post={p} />) : <div className="text-center py-10 text-gray-500 bg-white rounded-xl">Nenhum post.</div>}
            </>
          )}

          {activeTab === 'mural' && (
            <>
              <CreatePost onCreated={handlePostToWall} postedTo={user._id} placeholder={`Escreva no mural de ${user.name}...`} />
              {wallPosts.length > 0 ? wallPosts.map(p => <PostCard key={p._id} post={p} />) : <div className="text-center py-10 text-gray-500 bg-white rounded-xl">Mural vazio.</div>}
            </>
          )}

          {activeTab === 'about' && (
            <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
              <div><h3 className="font-bold text-gray-900">Bio</h3><p className="text-gray-600">{user.bio || "Sem bio."}</p></div>
              <div><h3 className="font-bold text-gray-900">Entrou em</h3><p className="text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}