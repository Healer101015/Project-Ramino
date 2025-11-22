import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const getAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
};

const GenericAvatar = ({ name, className }) => {
  const initials = name ? name.substring(0, 2).toUpperCase() : "?";
  return <div className={`flex items-center justify-center rounded-full bg-gray-400 text-white font-bold ${className}`}>{initials}</div>;
};

export default function Sidebar() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSidebarData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Buscar comunidades e sugestões em paralelo
      const [{ data: communities }, { data: users }] = await Promise.all([
        api.get("/communities"),
        api.get("/users/search?q=")
      ]);

      // Filtrar comunidades que eu participo
      const myComms = communities.filter(c => c.members.includes(user._id || user.id));
      setMyCommunities(myComms);

      // Filtrar sugestões (quem não sigo e não sou eu)
      const { data: me } = await api.get("/users/me");
      const notFollowing = users.filter(u =>
        u._id !== me._id && !me.following.includes(u._id)
      ).slice(0, 5);
      setSuggestions(notFollowing);

    } catch (err) {
      console.error("Erro sidebar:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSidebarData(); }, [fetchSidebarData]);

  if (loading) return <div className="card p-4 text-sm text-gray-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Minhas Comunidades */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Minhas Comunidades</h3>
        {myCommunities.length > 0 ? (
          <ul className="space-y-3">
            {myCommunities.map(c => (
              <li key={c._id}>
                <Link to={`/communities/${c._id}`} className="flex items-center gap-3 hover:bg-gray-50 p-1 rounded transition-colors">
                  {c.avatarUrl ? (
                    <img src={getAvatarUrl(c.avatarUrl)} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <GenericAvatar name={c.name} className="w-8 h-8 rounded-lg text-xs" />
                  )}
                  <span className="font-medium text-gray-800 text-sm truncate">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Você ainda não participa de nenhuma comunidade.</p>
        )}
        <Link to="/communities" className="block mt-3 text-xs text-sky-600 hover:underline">Explorar Comunidades</Link>
      </div>

      {/* Sugestões de Seguidores */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Quem seguir</h3>
        <ul className="space-y-4">
          {suggestions.map(u => (
            <li key={u._id} className="flex justify-between items-center">
              <Link to={`/profile/${u._id}`} className="flex items-center gap-3 group">
                {u.avatarUrl ? (
                  <img src={getAvatarUrl(u.avatarUrl)} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <GenericAvatar name={u.name} className="w-9 h-9 text-sm" />
                )}
                <span className="font-medium text-gray-800 group-hover:text-sky-600 truncate max-w-[100px]">{u.name}</span>
              </Link>
              <Link to={`/profile/${u._id}`} className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded hover:bg-sky-200">Ver</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}