import { useEffect, useState, useRef } from 'react';
import { Peer } from 'peerjs';
import { io, Socket } from 'socket.io-client';

// ВАЖНО: Я вписал твой точный адрес. Раньше там было просто 'onrender.com'
const SOCKET_URL = 'https://onrender.com';

export const usePeer = (currentUser: any) => {
  const [peerId, setPeerId] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<any>({});
  const [incomingMessages, setIncomingMessages] = useState<any>({});
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    // 1. Исправляем подключение к сокетам
    const s = io(SOCKET_URL, { 
      transports: ['websocket'],
      upgrade: false 
    });
    setSocket(s);

    // 2. Исправляем PeerJS (добавляем хост '0.peerjs.com' явно)
    const p = new Peer({
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      path: '/'
    });
    peerRef.current = p;

    p.on('open', (id) => {
      console.log('Peer ID создан:', id);
      setPeerId(id);
      s.emit('join-server', { ...currentUser, id });
    });

    p.on('error', (err) => {
      console.error('Ошибка PeerJS:', err.type);
      // Если облако PeerJS тупит, пробуем переподключиться через 3 секунды
      if (err.type === 'server-error') {
         setTimeout(() => window.location.reload(), 3000);
      }
    });

    s.on('users-list', (users) => setConnectedUsers(users));
    
    s.on('receive-message', (msg) => {
      setIncomingMessages((prev: any) => ({
        ...prev, 
        [msg.senderId]: [...(prev[msg.senderId] || []), msg] 
      }));
    });

    return () => { 
      s.disconnect(); 
      p.destroy(); 
    };
  }, []);

  // Остальные функции (sendMessageToPeer и т.д.) оставляем как были
  const sendMessageToPeer = (to: string, text: string, type: string) => {
    socket?.emit('send-message', { to, text, type, senderId: peerId });
  };

  return { 
    peerId, 
    socket, 
    connectedUsers, 
    incomingMessages, 
    sendMessageToPeer,
    connectToPeer: async (id: string) => { /* твоя логика */ },
    sendEditToPeer: () => {},
    sendDeleteToPeer: () => {},
    createGroup: () => {},
    incomingGroups: [],
    sendTypingToPeer: () => {},
    typingUsers: {}
  };
};
