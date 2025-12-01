// frontend/src/components/BottomNav.jsx
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Ícones Estilo Amino (Filled/Outline)
const CompassIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-all ${active ? 'text-white scale-110' : 'text-gray-400'}`} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        {active ? (
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.12 14.12l-6.24 2.16 2.16-6.24 6.24-2.16-2.16 6.24z" />
        ) : (
            <circle cx="12" cy="12" r="10" />
        )}
        {!active && <path d="M16.24 7.76l-2.16 6.24-6.24 2.16 2.16-6.24 6.24-2.16z" />}
    </svg>
);

const GridIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-all ${active ? 'text-white scale-110' : 'text-gray-400'}`} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
);

const ChatBubbleIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-all ${active ? 'text-white scale-110' : 'text-gray-400'}`} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const UserIcon = ({ active, avatarUrl }) => (
    <div className={`relative transition-all ${active ? 'scale-110 ring-2 ring-white rounded-full' : ''}`}>
        {avatarUrl ? (
            <img src={avatarUrl} className="w-7 h-7 rounded-full object-cover" />
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 ${active ? 'text-white' : 'text-gray-400'}`} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        )}
    </div>
);

export default function BottomNav() {
    const { user } = useAuth();
    const location = useLocation();
    const path = location.pathname;

    if (!user) return null;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const avatarUrl = user.avatarUrl && !user.avatarUrl.includes("/uploads/")
        ? user.avatarUrl
        : user.avatarUrl ? `${API_URL}${user.avatarUrl}` : null;

    // Background escuro estilo Amino Global
    return (
        <div className="fixed bottom-0 left-0 w-full bg-[#1a1a1d] border-t border-white/5 flex justify-around items-center py-3 pb-4 z-50">

            {/* Botão Descobrir (Home/Feed) */}
            <Link to="/" className="flex flex-col items-center gap-1 w-16">
                <CompassIcon active={path === "/"} />
                <span className={`text-[9px] font-bold tracking-wide ${path === "/" ? 'text-white' : 'text-gray-500'}`}>Descobrir</span>
            </Link>

            {/* Botão Comunidades (NOVO - Ala em baixo) */}
            <Link to="/communities" className="flex flex-col items-center gap-1 w-16">
                <GridIcon active={path === "/communities"} />
                <span className={`text-[9px] font-bold tracking-wide ${path === "/communities" ? 'text-white' : 'text-gray-500'}`}>Comunidades</span>
            </Link>

            {/* Botão Chats */}
            <Link to="/chat-list" className="flex flex-col items-center gap-1 w-16">
                <div className="relative">
                    <ChatBubbleIcon active={path.includes("/chat")} />
                    {/* Badge simulado */}
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1a1a1d]"></span>
                </div>
                <span className={`text-[9px] font-bold tracking-wide ${path.includes("/chat") ? 'text-white' : 'text-gray-500'}`}>Chats</span>
            </Link>

            {/* Botão Eu (Perfil) */}
            <Link to={`/profile/${user._id}`} className="flex flex-col items-center gap-1 w-16">
                <UserIcon active={path.includes("/profile")} avatarUrl={avatarUrl} />
                <span className={`text-[9px] font-bold tracking-wide ${path.includes("/profile") ? 'text-white' : 'text-gray-500'}`}>Eu</span>
            </Link>

        </div>
    );
}