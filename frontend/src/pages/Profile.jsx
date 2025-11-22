// ... imports (mantenha os mesmos do código anterior)
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PostCard from "../components/PostCard.jsx";
import CreatePost from "../components/CreatePost.jsx";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { useChat } from "../context/ChatContext.jsx";

// ... (Ícones e Helpers mantidos iguais)
const UsersIcon = () => <span>👥</span>;
const EyeIcon = () => <span>👁️</span>;
const CalendarIcon = () => <span>📅</span>;
const MessageIcon = () => <span>💬</span>;

const getApiBase = () => import.meta.env.VITE_API_URL || "http://localhost:4000";
const getFullUrl = (path) => !path ? "" : (path.startsWith('http') ? path : `${getApiBase()}${path}`);
const getImageUrl = (path, name) => path ? getFullUrl(path) : `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&background=random`;

const THEMES = {
  light: "bg-gray-50 text-gray-900",
  dark: "bg-gray-900 text-gray-100",
  ocean: "bg-blue-50 text-blue-900",
  sunset: "bg-orange-50 text-orange-900",
  cyberpunk: "bg-black text-green-400 font-mono",
};

// ... (UserListModal mantido igual)
const UserListModal = ({ title, users, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
    <div className="bg-white rounded-lg w-full max-w-md p-4 max-h-[80vh] overflow-y-auto text-gray-900" onClick={e => e.stopPropagation()}>
      <h3 className="font-bold mb-4 border-b pb-2">{title}</h3>
      {users.map(u => (
        <Link key={u._id} to={`/profile/${u._id}`} onClick={onClose} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded">
          <img src={getImageUrl(u.avatarUrl, u.name)} className="w-10 h-10 rounded-full object-cover" />
          <span>{u.name}</span>
        </Link>
      ))}
      {users.length === 0 && <p>Vazio.</p>}
    </div>
  </div>
);

export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  const [modalType, setModalType] = useState(null);
  const [modalUsers, setModalUsers] = useState([]);

  const { openChat } = useChat();

  const fetchData = useCallback(async () => {
    if (!id || id === 'undefined') return;
    setLoading(true);
    try {
      const res = await api.get(`/users/${id}`);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFollow = async () => {
    try {
      if (data.followStatus === 'following') {
        await api.post(`/users/${id}/unfollow`);
        setData(prev => ({ ...prev, followStatus: 'none', followersCount: prev.followersCount - 1 }));
      } else {
        await api.post(`/users/${id}/follow`);
        setData(prev => ({ ...prev, followStatus: 'following', followersCount: prev.followersCount + 1 }));
      }
    } catch (e) { alert("Erro ao seguir"); }
  };

  const openList = async (type) => {
    const res = await api.get(`/users/${id}/${type}`);
    setModalUsers(res.data);
    setModalType(type === 'followers' ? 'Seguidores' : 'Seguindo');
  };

  // Handlers
  const onWallPostCreated = (newPost) => {
    // Adiciona o post criado imediatamente ao topo da lista do mural
    setData(p => ({ ...p, wallPosts: [newPost, ...p.wallPosts] }));
  };

  const onPostChange = (updated) => {
    setData(p => ({
      ...p,
      posts: p.posts.map(x => x._id === updated._id ? updated : x),
      wallPosts: p.wallPosts.map(x => x._id === updated._id ? updated : x)
    }));
  };

  const onPostDelete = (pid) => {
    setData(p => ({
      ...p,
      posts: p.posts.filter(x => x._id !== pid),
      wallPosts: p.wallPosts.filter(x => x._id !== pid)
    }));
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  if (!data?.user) return <div className="min-h-screen bg-gray-50 p-10 text-center">Usuário não encontrado</div>;

  const { user, posts, wallPosts, followStatus, canChat, followersCount, followingCount } = data;
  const themeClass = THEMES[user.theme] || THEMES.light;
  const isMe = me?._id === user._id;

  const pageStyle = user.pageBackgroundUrl ? {
    backgroundImage: `url(${getFullUrl(user.pageBackgroundUrl)})`,
    backgroundSize: 'cover',
    backgroundAttachment: 'fixed',
    backgroundPosition: 'center'
  } : {};

  const overlayClass = user.pageBackgroundUrl ? "bg-white/90 backdrop-blur-sm shadow-xl" : "";

  return (
    <div className={`min-h-screen ${themeClass} transition-colors duration-300`} style={pageStyle}>
      <Navbar />

      <div className={`container-healer mt-6 pb-10 ${overlayClass} rounded-xl`}>
        {/* Header */}
        <div className="relative h-64 bg-gray-300 rounded-t-xl overflow-hidden group">
          {user.coverPhotoUrl && <img src={getFullUrl(user.coverPhotoUrl)} className="w-full h-full object-cover" />}
        </div>

        <div className="px-6 relative">
          <div className="-mt-20 mb-4 flex flex-col md:flex-row items-center md:items-end gap-4">
            <img src={getImageUrl(user.avatarUrl, user.name)} className="w-40 h-40 rounded-full border-4 border-white shadow-lg object-cover bg-white" />
            <div className="flex-1 text-center md:text-left mb-2">
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p className="opacity-80">{user.bio || "Sem biografia."}</p>
            </div>
            <div className="flex gap-3 mb-4">
              {!isMe && (
                <>
                  <button onClick={handleFollow} className={`px-6 py-2 rounded-full font-bold transition ${followStatus === 'following' ? 'bg-red-100 text-red-600' : 'bg-sky-500 text-white'}`}>
                    {followStatus === 'following' ? "Deixar de Seguir" : "Seguir"}
                  </button>
                  <button onClick={() => openChat(user)} disabled={!canChat} className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-50" title="Chat requer follow mútuo">
                    <MessageIcon />
                  </button>
                </>
              )}
              {isMe && <Link to="/settings" className="px-6 py-2 bg-gray-200 rounded-full font-bold text-gray-700">Editar Perfil</Link>}
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-center md:justify-start gap-6 py-4 border-b border-gray-200/50 text-sm font-medium">
            <button onClick={() => openList('followers')} className="hover:underline flex gap-1"><UsersIcon /> {followersCount} Seguidores</button>
            <button onClick={() => openList('following')} className="hover:underline flex gap-1"><UsersIcon /> {followingCount} Seguindo</button>
            <span className="flex gap-1 opacity-70"><EyeIcon /> {user.profileViews} Views</span>
          </div>

          {/* Tabs */}
          <div className="flex mt-6 gap-6 border-b border-gray-200/50 mb-6">
            {['posts', 'wall', 'gallery'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-2 font-bold uppercase tracking-wide text-sm transition border-b-2 ${activeTab === tab ? 'border-sky-500 text-sky-600' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                {tab === 'posts' ? 'Publicações' : tab === 'wall' ? 'Mural' : 'Galeria'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {/* ABA POSTS (Feed do usuário) */}
              {activeTab === 'posts' && (
                <div className="space-y-4">
                  {posts.length === 0 && <div className="text-center opacity-60 py-10 border-2 border-dashed rounded-xl">Este usuário ainda não publicou nada.</div>}
                  {posts.map(p => <PostCard key={p._id} post={p} onChanged={onPostChange} onDelete={() => onPostDelete(p._id)} />)}
                </div>
              )}

              {/* ABA MURAL (Posts feitos para este usuário) */}
              {activeTab === 'wall' && (
                <div className="space-y-4">
                  {/* Caixa de criação de post NO MURAL */}
                  <div className="bg-white/50 p-1 rounded-lg">
                    <CreatePost onCreated={onWallPostCreated} targetUserId={user._id} />
                  </div>

                  {wallPosts.length === 0 && <div className="text-center opacity-60 py-10 border-2 border-dashed rounded-xl">Mural vazio. Deixe uma mensagem!</div>}
                  {wallPosts.map(p => <PostCard key={p._id} post={p} onChanged={onPostChange} onDelete={() => onPostDelete(p._id)} />)}
                </div>
              )}

              {/* ABA GALERIA */}
              {activeTab === 'gallery' && (
                <div>
                  {user.gallery && user.gallery.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {user.gallery.map((img, i) => (
                        <div key={i} className="group relative aspect-square overflow-hidden rounded-xl shadow-sm cursor-pointer">
                          <img src={getFullUrl(img)} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition"></div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-center opacity-60 py-10 border-2 border-dashed rounded-xl">Galeria vazia.</div>}
                </div>
              )}
            </div>

            {/* Sidebar Direita */}
            <div className="hidden md:block space-y-4">
              <div className="bg-white/50 p-5 rounded-xl border border-gray-200/50 shadow-sm">
                <h4 className="font-bold mb-3 border-b border-gray-200/50 pb-2">Sobre</h4>
                <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{user.bio || "O usuário não escreveu uma biografia."}</p>
              </div>
              <div className="bg-white/50 p-5 rounded-xl border border-gray-200/50 shadow-sm">
                <h4 className="font-bold mb-3 border-b border-gray-200/50 pb-2">Informações</h4>
                <div className="text-sm opacity-70 space-y-2">
                  <div className="flex items-center gap-2"><CalendarIcon /> Entrou em {new Date(user.createdAt).toLocaleDateString()}</div>
                  {/* Aqui poderia ter mais infos como Localização, Link externo, etc */}
                </div>
              </div>
            </div>
          </div>
        </div>

        {modalType && <UserListModal title={modalType} users={modalUsers} onClose={() => setModalType(null)} />}
      </div>
    </div>
  );
}
