// frontend/src/context/ChatContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [activeChats, setActiveChats] = useState([]);
    const [isMobileChatOpen, setMobileChatOpen] = useState(false);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        let newSocket = null;
        const token = localStorage.getItem('token');

        if (user && token) {
            newSocket = io(API_URL, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                timeout: 20000,
            });

            newSocket.on('connect', () => {
                console.log('[ChatContext] Socket conectado');
            });

            newSocket.on('connect_error', (err) => {
                console.error('[ChatContext] Erro de conexão:', err);
            });

            setSocket(newSocket);
        }

        return () => {
            if (newSocket) {
                console.log('[ChatContext] Desconectando socket');
                newSocket.disconnect();
            }
        };
    }, [user]);

    const openChat = (targetUser) => {
        if (window.innerWidth < 768) {
            setMobileChatOpen(true);
        }
        if (!activeChats.find(c => c._id === targetUser._id)) {
            setActiveChats(prev => [...prev, targetUser]);
        }
    };

    const closeChat = (userId) => {
        if (window.innerWidth < 768) {
            setMobileChatOpen(false);
        }
        setActiveChats(prev => prev.filter(c => c._id !== userId));
    };

    const value = {
        activeChats,
        openChat,
        closeChat,
        isMobileChatOpen,
        setMobileChatOpen,
        socket // Expondo o socket globalmente
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};