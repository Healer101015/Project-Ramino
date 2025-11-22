// frontend/src/context/ChatContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
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

    // Ref para rastrear conexão atual e evitar loops
    const socketRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');

        // Só conecta se houver usuário, token e ainda não houver socket (ou se o usuário mudou)
        if (user && token) {
            // Se já existe um socket conectado para este usuário, não faz nada
            if (socketRef.current && socketRef.current.connected && socketRef.current.userId === user._id) {
                return;
            }

            // Se existe um socket de outro usuário (troca de conta), desconecta
            if (socketRef.current) {
                socketRef.current.disconnect();
            }

            console.log('[ChatContext] Iniciando conexão Socket.io...');
            const newSocket = io(API_URL, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
            });

            // Armazena ID do usuário no objeto socket para verificação
            newSocket.userId = user._id;

            newSocket.on('connect', () => {
                console.log('[ChatContext] Socket conectado:', newSocket.id);
            });

            newSocket.on('connect_error', (err) => {
                console.error('[ChatContext] Erro de conexão:', err);
            });

            socketRef.current = newSocket;
            setSocket(newSocket);
        } else if (!user && socketRef.current) {
            // Logout: desconecta
            console.log('[ChatContext] Usuário deslogado, fechando socket.');
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
        }

        // Cleanup apenas no unmount da aplicação, não na mudança de user
        return () => {
            // Opcional: Deixar a conexão viva enquanto o app estiver montado
        };
    }, [user?._id, user?.email]); // Dependência apenas de propriedades estáveis, não do objeto user inteiro

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
        socket
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};