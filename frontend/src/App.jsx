// frontend/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import Communities from "./pages/Communities.jsx";
import CommunityHome from "./pages/CommunityHome.jsx"; // Importar
import ChatContainer from "./components/ChatContainer.jsx";
import BottomNav from "./components/BottomNav.jsx";
import { useChat } from "./context/ChatContext.jsx";

const MobileChatList = () => (
  <div className="min-h-screen bg-white pt-10">
    <div className="p-4 bg-gray-50 border-b">
      <h2 className="text-lg font-bold">Meus Chats</h2>
    </div>
    <div className="p-4 text-center text-gray-500 mt-10">
      <p>Suas conversas recentes aparecerão aqui.</p>
    </div>
  </div>
);

function Private({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  const { isMobileChatOpen } = useChat();

  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-16">
      <div className={isMobileChatOpen ? 'hidden' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<Private><Home /></Private>} />
          <Route path="/communities" element={<Private><Communities /></Private>} />
          <Route path="/c/:id" element={<Private><CommunityHome /></Private>} /> {/* NOVA ROTA DINÂMICA */}

          <Route path="/profile/:id" element={<Private><Profile /></Private>} />
          <Route path="/settings" element={<Private><Settings /></Private>} />
          <Route path="/chat-list" element={<Private><MobileChatList /></Private>} />
        </Routes>
      </div>

      <div className="hidden md:block">
        <ChatContainer />
      </div>

      <BottomNav />
    </div>
  )
}