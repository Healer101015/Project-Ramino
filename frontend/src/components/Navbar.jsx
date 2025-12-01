import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Ícones (Mantidos, mas classes ajustadas no render)
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const CommunityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const GenericAvatar = ({ user, className }) => {
  const getInitials = (name) => !name ? "?" : name.trim().split(" ").filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
  // Mudança: Fundo verde Amino ou gradiente
  return <div className={`flex items-center justify-center rounded-full bg-gradient-to-br from-amino-green to-emerald-600 text-white font-bold border-2 border-white shadow-sm ${className}`}><span>{getInitials(user?.name)}</span></div>;
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
      api.get(`/users/search?q=${debouncedQuery}`).then(r => setResults(r.data)).catch(console.error);
    } else { setResults([]); }
  }, [debouncedQuery]);

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative group">
        <input
          placeholder="Pesquisar..."
          className="bg-gray-100 text-gray-800 rounded-full pl-10 pr-4 py-2.5 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-amino-green/50 focus:bg-white transition-all font-medium text-sm placeholder-gray-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amino-green transition-colors">
          <SearchIcon />
        </div>
      </div>
      {isOpen && (query.length > 0) && (
        <div className="absolute top-full mt-2 w-full md:w-80 bg-white rounded-2xl shadow-xl z-20 border border-gray-100 overflow-hidden">
          {results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {results.map(user => {
                const avatarUrl = user.avatarUrl ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`) : null;
                return (
                  <li key={user._id}>
                    <Link to={`/profile/${user._id}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                      {avatarUrl ? <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover border border-gray-100" /> : <GenericAvatar user={user} className="w-10 h-10" />}
                      <span className="font-bold text-gray-800 text-sm">{user.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-4 text-sm text-gray-500 text-center font-medium">Nenhum resultado.</p>
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
  const { socket } = useChat();
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => { try { const { data } = await api.get('/notifications'); setNotifications(data); } catch (error) { } };

  useEffect(() => {
    fetchNotifications();
    if (socket) {
      const handleNewNotif = (n) => setNotifications(prev => [n, ...prev]);
      socket.on('new_notification', handleNewNotif);
      return () => socket.off('new_notification', handleNewNotif);
    }
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) { await api.post('/notifications/read'); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); }
  };

  const getNotificationMessage = (notif) => {
    switch (notif.type) {
      case 'FOLLOW': return 'começou a seguir-te.';
      case 'LIKE': return 'gostou do teu blog.';
      case 'COMMENT': return 'comentou: ';
      case 'NEW_MESSAGE': return 'enviou uma mensagem.';
      default: return 'interagiu contigo.';
    }
  }

  return (
    <div className="relative" ref={bellRef}>
      <button onClick={handleOpen} className={`relative p-2.5 rounded-full transition-all duration-300 ${isOpen ? 'bg-amino-green/10 text-amino-green' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl z-20 border border-gray-100 overflow-hidden animate-fade-in">
          <div className="p-3.5 font-bold text-gray-800 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span>Notificações</span>
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{unreadCount} novas</span>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? notifications.map(notif => {
              const senderAvatar = notif.sender.avatarUrl ? (notif.sender.avatarUrl.startsWith('http') ? notif.sender.avatarUrl : `${API_URL}${notif.sender.avatarUrl}`) : null;
              return (
                <li key={notif._id}>
                  <Link to={`/profile/${notif.sender._id}`} onClick={() => setIsOpen(false)}
                    className={`flex items-start gap-3 p-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 ${!notif.read ? 'bg-green-50/50' : ''}`}>
                    {senderAvatar ? <img src={senderAvatar} className="w-10 h-10 rounded-full object-cover border border-gray-100" /> : <GenericAvatar user={notif.sender} className="w-10 h-10" />}
                    <div className="flex-1 text-sm">
                      <p className="text-gray-800"><span className="font-bold text-gray-900">{notif.sender.name}</span> {getNotificationMessage(notif)}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wide">{formatDistanceToNow(new Date(notif.createdAt), { locale: ptBR })}</p>
                    </div>
                  </Link>
                </li>
              )
            }) : <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2"><BellIcon /><span className="text-sm">Tudo limpo!</span></div>}
          </ul>
        </div>
      )}
    </div>
  );
};

const ProfileDropdown = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };
  let avatarUrl = null;
  if (user?.avatarUrl) { avatarUrl = user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`; }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition">
        {avatarUrl ? <img src={avatarUrl} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" /> : <GenericAvatar user={user} className="w-9 h-9" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-xl z-20 border border-gray-100 overflow-hidden animate-fade-in p-1.5">
          <div className="px-3 py-2 border-b border-gray-100 mb-1">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">Nível {user?.level || 1}</p>
          </div>
          {user?._id && (
            <Link to={`/profile/${user._id}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition">
              <ProfileIcon /> Meu Perfil
            </Link>
          )}
          <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition mt-1">
            <LogoutIcon /> Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default function Navbar() {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/70 h-16 flex items-center shadow-sm">
      <div className="container-healer flex items-center justify-between px-4 w-full">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-black text-2xl text-amino-green tracking-tighter hover:scale-105 transition-transform">
            amino
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/" className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-amino-green hover:bg-amino-green/5 rounded-full transition">Feed</Link>
              <Link to="/communities" className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-amino-green hover:bg-amino-green/5 rounded-full transition">Comunidades</Link>
            </nav>
          )}
        </div>

        <div className="hidden md:flex gap-3 items-center">
          {loading ? <div className="w-32 h-8 bg-gray-100 rounded-full animate-pulse"></div> : user ? (
            <>
              <SearchBar />
              <div className="h-6 w-px bg-gray-200 mx-1"></div>
              <NotificationBell />
              <ProfileDropdown />
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="px-5 py-2 text-sm font-bold text-gray-600 hover:text-amino-green transition">Entrar</Link>
              <Link to="/register" className="bg-amino-green text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-amino-green/30 hover:shadow-xl hover:scale-105 transition">Criar Conta</Link>
            </div>
          )}
        </div>

        <div className="md:hidden flex items-center gap-4">
          {user && <NotificationBell />}
          <button onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-700">
            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white border-b border-gray-200 shadow-xl p-4 flex flex-col gap-4 md:hidden animate-fade-in">
          {user ? (
            <>
              <SearchBar />
              <Link to="/communities" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl font-bold text-gray-700">
                <CommunityIcon /> Explorar Comunidades
              </Link>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <ProfileDropdown />
              </div>
            </>
          ) : (
            <Link to="/login" className="block w-full text-center bg-amino-green text-white px-4 py-3 rounded-xl font-bold">Entrar</Link>
          )}
        </div>
      )}
    </header>
  );
}