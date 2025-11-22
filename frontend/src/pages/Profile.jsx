import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PostCard from "../components/PostCard.jsx";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { useChat } from "../context/ChatContext.jsx";

// Ícones
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.03 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 00-1.28.682L5 15v-3.586a1 1 0 00-.293-.707A2 2 0 012 9V5z" /></svg>;

const getApiBase = () => import.meta.env.VITE_API_URL || "http://localhost:4000";
const getFullUrl = (path) => !path ? "" : (path.startsWith('http') ? path : `${getApiBase()}${path}`);
const getImageUrl = (path, name = "user") => path ? getFullUrl(path) : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=256`;

// Modal de Lista de Usuários
const UserListModal = ({ title, users, onClose, loading }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto p-2 space-y-1 flex-1">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando lista...</div>
          ) : (
            users?.length > 0 ? users.map(u => (
              <Link key={u._id} to={`/profile/${u._id}`} onClick={onClose} className="flex items-center gap-3 p-3 hover:bg-sky-50 rounded-lg transition-colors group">
                <img src={getImageUrl(u.avatarUrl, u.name)} className="w-12 h-12 rounded-full object-cover bg-gray-200 border border-gray-100" />
                <span className="font-medium text-gray-800 group-hover:text-sky-600">{u.name}</span>
              </Link>
            )) : <div className="text-center py-12 text-gray-500">A lista está vazia.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const useUserProfile = (userId) => {
  const [state, setState] = useState({ user: null, posts: [], followStatus: 'none', canChat: false, followersCount: 0, followingCount: 0, loading: true, error: null });

  const fetchProfile = useCallback(async () => {
    if (!userId || userId === 'undefined') {
      setState(s => ({ ...s, loading: false, error: "Usuário inválido." }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await api.get(`/users/${userId}`);
      setState({ ...data, loading: false, error: null });
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.response?.status === 404 ? "Utilizador não encontrado." : "Falha ao carregar o perfil." }));
    }
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [userId]);
  useEffect(() => { if (state.user) document.title = `${state.user.name} - Healer`; }, [state.user]);

  return { ...state, setState, refetch: fetchProfile };
};

const ProfileHeader = ({ user, followersCount, followingCount, onShowFollowers, onShowFollowing }) => (
  <div className="card rounded-lg overflow-hidden shadow-md">
    <div className="h-48 md:h-64 bg-gray-200">
      {user.coverPhotoUrl && <img src={getImageUrl(user.coverPhotoUrl, user.name)} className="w-full h-full object-cover" />}
    </div>
    <div className="relative p-6">
      <div className="absolute -top-16 sm:-top-20 left-6">
        <img src={getImageUrl(user.avatarUrl, user.name)} className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-white shadow-lg" />
      </div>
      <div className="pt-16 sm:pt-20 sm:ml-44">
        <h2 className="text-3xl font-bold text-gray-800">{user.name}</h2>
        <p className="text-gray-500 mt-1">{user.bio || "Sem biografia."}</p>
        <div className="text-sm text-gray-600 mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Botões clicáveis para abrir o modal */}
          <button onClick={onShowFollowers} className="flex items-center gap-1.5 hover:text-sky-600 transition-colors group" title="Ver seguidores">
            <UsersIcon /> <span className="group-hover:underline"><strong>{followersCount}</strong> Seguidores</span>
          </button>
          <button onClick={onShowFollowing} className="flex items-center gap-1.5 hover:text-sky-600 transition-colors group" title="Ver quem segue">
            <UsersIcon /> <span className="group-hover:underline"><strong>{followingCount}</strong> Seguindo</span>
          </button>

          <span className="flex items-center gap-1.5"><EyeIcon /> <strong>{user.profileViews || 0}</strong> views</span>
          <span className="flex items-center gap-1.5"><CalendarIcon /> Entrou em {new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  </div>
);

const FollowActions = ({ user, followStatus, setFollowStatus, canChat, onUpdateCounts }) => {
  const { openChat } = useChat();
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    try {
      if (followStatus === 'following') {
        await api.post(`/users/${user._id}/unfollow`);
        setFollowStatus('none');
        onUpdateCounts(-1);
      } else {
        await api.post(`/users/${user._id}/follow`);
        setFollowStatus('following');
        onUpdateCounts(1);
      }
    } catch (error) {
      console.error("Erro ao seguir/deixar de seguir", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col sm:flex-row gap-2">
      <button
        onClick={() => openChat(user)}
        disabled={!canChat}
        title={!canChat ? "Necessário seguir-se mutuamente para conversar" : ""}
        className="flex-1 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg px-4 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <MessageIcon /> Conversar
      </button>

      <button onClick={handleFollow} disabled={loading} className={`flex-1 flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2 transition ${followStatus === 'following' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
        {loading ? "A processar..." : (followStatus === 'following' ? "Deixar de Seguir" : "Seguir")}
      </button>
    </div>
  );
};

export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { user, posts, followStatus, canChat, followersCount, followingCount, loading, error, setState } = useUserProfile(id);

  // Estado para os Modais
  const [modalType, setModalType] = useState(null); // 'followers', 'following', null
  const [modalUsers, setModalUsers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const myId = me?._id || me?.id;
  const isMyProfile = myId === id;

  const handlePostUpdate = (uP) => setState(s => ({ ...s, posts: s.posts.map(p => p._id === uP._id ? uP : p) }));
  const handlePostDelete = (dP) => setState(s => ({ ...s, posts: s.posts.filter(p => p._id !== dP) }));

  const updateFollowerCount = (delta) => {
    setState(s => ({ ...s, followersCount: s.followersCount + delta }));
  };

  // Função para buscar a lista e abrir o modal
  const openListModal = async (type) => {
    setModalType(type);
    setModalLoading(true);
    setModalUsers([]);
    try {
      const endpoint = type === 'followers' ? 'followers' : 'following';
      const { data } = await api.get(`/users/${id}/${endpoint}`);
      setModalUsers(data);
    } catch (e) {
      console.error("Erro ao buscar lista:", e);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) return <div className="bg-gray-50 min-h-screen"><Navbar /><div className="container-healer mt-6 text-center">A carregar...</div></div>;
  if (error) return <div className="bg-gray-50 min-h-screen"><Navbar /><div className="container-healer mt-6 text-center text-red-500">{error}</div></div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <Navbar />
      <div className="container-healer mt-6">
        <div className="grid grid-cols-12 gap-6">
          <main className="col-span-12 lg:col-span-8 space-y-6">
            <ProfileHeader
              user={user}
              followersCount={followersCount}
              followingCount={followingCount}
              onShowFollowers={() => openListModal('followers')}
              onShowFollowing={() => openListModal('following')}
            />

            {!isMyProfile ? (
              <div className="card p-4">
                <FollowActions user={user} followStatus={followStatus} setFollowStatus={s => setState(prev => ({ ...prev, followStatus: s }))} canChat={canChat} onUpdateCounts={updateFollowerCount} />
              </div>
            ) : (
              <div className="card p-4"><Link to="/settings" className="w-full block text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg py-2">Editar Perfil</Link></div>
            )}

            <div className="card p-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Publicações</h3>
              {posts.length > 0 ? posts.map(p => <PostCard key={p._id} post={p} onChanged={handlePostUpdate} onDelete={() => handlePostDelete(p._id)} />) : <p className="text-center py-8 text-gray-500">Nenhuma publicação.</p>}
            </div>
          </main>

          <aside className="hidden lg:block col-span-4 text-sm text-gray-500">
            <div className="card p-4">
              <h4 className="font-bold text-gray-700 mb-2">Sobre</h4>
              <p>Usuário da rede Healer.</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Renderização do Modal */}
      {modalType && (
        <UserListModal
          title={modalType === 'followers' ? 'Seguidores' : 'Seguindo'}
          users={modalUsers}
          loading={modalLoading}
          onClose={() => setModalType(null)}
        />
      )}
    </div>
  );
}