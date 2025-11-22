import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const getAvatarUrl = (user) => {
  if (!user?.avatarUrl) return null;
  if (user.avatarUrl.startsWith('http')) return user.avatarUrl;
  return `${API_URL}${user.avatarUrl}`;
};

const GenericAvatar = ({ user, className }) => {
  const getInitials = (name) => !name ? "?" : name.substring(0, 2).toUpperCase();
  // (Manter lógica de cores anterior se quiser, simplificado aqui)
  return <div className={`flex items-center justify-center rounded-full bg-gray-400 text-white font-bold ${className}`}>{getInitials(user.name)}</div>;
};

const useFollowSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    try {
      const [{ data: me }, { data: users }] = await Promise.all([
        api.get("/users/me"),
        api.get("/users/search?q="),
      ]);

      // Sugerir quem eu AINDA NÃO sigo
      const notFollowing = users.filter(user =>
        user._id !== me._id && !me.following.includes(user._id)
      ).slice(0, 5);

      setSuggestions(notFollowing);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);
  return { suggestions, loading };
};

export default function Sidebar() {
  const { suggestions, loading } = useFollowSuggestions();

  if (loading) return <div className="card p-4 text-sm">Carregando sugestões...</div>;

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Quem seguir</h3>
      <ul className="space-y-4">
        {suggestions.map(user => (
          <li key={user._id} className="flex justify-between items-center">
            <Link to={`/profile/${user._id}`} className="flex items-center gap-3 group">
              {user.avatarUrl ? <img src={getAvatarUrl(user)} className="w-9 h-9 rounded-full object-cover" /> : <GenericAvatar user={user} className="w-9 h-9 text-sm" />}
              <span className="font-medium text-gray-800 group-hover:text-sky-600 truncate max-w-[120px]">{user.name}</span>
            </Link>
            <Link to={`/profile/${user._id}`} className="text-xs bg-sky-100 text-sky-700 px-3 py-1 rounded-full hover:bg-sky-200">Ver</Link>
          </li>
        ))}
        {suggestions.length === 0 && <p className="text-sm text-gray-500">Sem sugestões no momento.</p>}
      </ul>
    </div>
  );
}