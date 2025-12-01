import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const GenericAvatar = ({ user, className }) => {
  const getInitials = (name) => !name ? "?" : name.trim().slice(0, 1).toUpperCase();
  return (
    <div className={`flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold ${className}`}>
      <span>{getInitials(user.name)}</span>
    </div>
  );
};

const useFriendSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const fetchSuggestions = useCallback(async () => {
    try {
      const [{ data: meData }, { data: usersData }] = await Promise.all([
        api.get("/users/me"),
        api.get("/users/search?q="),
      ]);
      const filteredUsers = usersData.filter(user =>
        user._id !== meData._id && !meData.friends.includes(user._id)
      ).slice(0, 10);
      setSuggestions(filteredUsers);
    } catch (err) { console.error(err); }
  }, []);
  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);
  return { suggestions };
};

export default function Sidebar() {
  const { suggestions } = useFriendSuggestions();

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white md:rounded-xl md:shadow-sm md:p-4 mb-4">
      {/* Título desktop */}
      <h3 className="hidden md:block font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Sugeridos</h3>

      {/* Layout Mobile: Horizontal Scroll (Estilo Stories Amino) */}
      <div className="flex md:flex-col gap-4 overflow-x-auto no-scrollbar py-3 px-4 md:p-0 bg-white shadow-sm md:shadow-none">
        {suggestions.map(user => {
          let avatarUrl = user.avatarUrl ? (user.avatarUrl.includes("/uploads/") ? `${API_URL}${user.avatarUrl}` : user.avatarUrl) : null;

          return (
            <Link to={`/profile/${user._id}`} key={user._id} className="flex flex-col md:flex-row items-center gap-2 md:gap-3 min-w-[70px] md:min-w-0">
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.name} className="w-14 h-14 md:w-10 md:h-10 rounded-full object-cover border-2 border-purple-500 p-0.5" />
                ) : (
                  <GenericAvatar user={user} className="w-14 h-14 md:w-10 md:h-10 text-xl md:text-sm border-2 border-purple-500 p-0.5" />
                )}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-[10px] md:text-sm font-semibold text-gray-800 truncate w-16 md:w-auto">{user.name.split(' ')[0]}</span>
                <span className="hidden md:block text-xs text-gray-500">Membro novo</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  );
}