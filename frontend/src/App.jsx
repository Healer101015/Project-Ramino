import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import Communities from "./pages/Communities.jsx"; // NOVO
import CommunityView from "./pages/CommunityView.jsx"; // NOVO
import ChatContainer from "./components/ChatContainer.jsx";
import { useChat } from "./context/ChatContext.jsx";

function Private({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  const { isMobileChatOpen } = useChat();

  return (
    <>
      <div className={isMobileChatOpen ? 'hidden' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rotas Protegidas */}
          <Route path="/" element={<Private><Home /></Private>} />
          <Route path="/profile/:id" element={<Private><Profile /></Private>} />
          <Route path="/settings" element={<Private><Settings /></Private>} />

          {/* NOVAS ROTAS DE COMUNIDADE */}
          <Route path="/communities" element={<Private><Communities /></Private>} />
          <Route path="/communities/:id" element={<Private><CommunityView /></Private>} />
        </Routes>
      </div>
      <ChatContainer />
    </>
  )
}