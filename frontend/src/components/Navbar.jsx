import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import io from 'socket.io-client';
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const GenericAvatar = ({ user, className }) => {
  const getInitials = (name) => !name ? "?" : name.trim().split(" ").filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
  return <div className={`flex items-center justify-center rounded-full bg-white/20 text-white font-bold ${className}`}><span>{getInitials(user?.name)}</span></div>;
};

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length > 1) {
      api.get(`/users/search?q=${debouncedQuery}`)
        .then(r => setResults(r.data))
        .catch(console.error);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  return (
    <div className="relative flex-1 mx-4" ref={searchRef}>
      <div className="relative">
        <input
          placeholder="Pesquisar..."
          className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 w-full text-white placeholder-white/70 focus:outline-none focus:bg-white/30 transition-all border border-white/10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </div>
      </div>
      {isOpen && (query.length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl z-50 text-gray-800 overflow-hidden">
          {results.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto">
              {results.map(user => {
                const avatarUrl = user.avatarUrl ? `${API_URL}${user.avatarUrl}` : null;
                return (
                  <li key={user._id}>
                    <Link to={`/profile/${user._id}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 hover:bg-gray-100 transition-colors">
                      {avatarUrl ? (
                        <img src={avatarUrl} className="w-8 h-8 rounded-full object-cover" alt={`Avatar de ${user.name}`} />
                      ) : (
                        <GenericAvatar user={user} className="w-8 h-8 text-gray-500 bg-gray-200" />
                      )}
                      <span className="font-medium text-sm">{user.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-3 text-xs text-gray-500">{debouncedQuery.length > 1 ? "Nada encontrado." : "Digite para buscar..."}</p>
          )}
        </div>
      )}
    </div>
  );
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    const token = localStorage.getItem('token');
    if (token) {
      const socket = io(API_URL, { auth: { token } });
      socket.on('new_notification', (n) => setNotifications(prev => [n, ...prev]));
      return () => { clearInterval(interval); socket.disconnect(); };
    }
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      await api.post('/notifications/read');
      fetchNotifications();
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <button onClick={handleOpen} className="relative p-1">
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] items-center justify-center font-bold">{unreadCount}</span>
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-2xl z-50 text-gray-800 overflow-hidden ring-1 ring-black ring-opacity-5">
          <div className="bg-gray-50 p-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-b">Notificações</div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? notifications.map(notif => (
              <li key={notif._id} className={`border-b last:border-0 ${!notif.read ? 'bg-purple-50' : ''}`}>
                <Link to={`/profile/${notif.sender._id}`} onClick={() => setIsOpen(false)} className="flex items-start gap-3 p-3 hover:bg-gray-50">
                  <div className="w-1.5 h-1.5 mt-2 rounded-full bg-purple-500 shrink-0" style={{ opacity: notif.read ? 0 : 1 }}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 leading-snug">
                      <span className="font-bold">{notif.sender.name}</span> <span className="text-gray-600 text-xs">{notif.type === 'LIKE' ? 'curtiu seu post.' : 'enviou mensagem.'}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDistanceToNow(new Date(notif.createdAt), { locale: ptBR, addSuffix: true })}</p>
                  </div>
                </Link>
              </li>
            )) : <p className="p-4 text-sm text-gray-500 text-center">Tudo limpo por aqui.</p>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="amino-gradient shadow-md sticky top-0 z-40 transition-all duration-300">
      <div className="container-healer flex items-center justify-between py-3 px-3">
        <Link to="/" className="font-black text-xl text-white tracking-wider font-sans italic" aria-label="Healer">
          Healer
        </Link>

        {user ? (
          <>
            <SearchBar />
            <NotificationBell />
          </>
        ) : (
          <Link to="/login" className="bg-white text-purple-600 px-4 py-1.5 rounded-full font-bold text-sm shadow-sm hover:bg-gray-100">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}