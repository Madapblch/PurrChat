import { useEffect, useState } from 'react';
import { Peer } from 'peerjs';
import { io, Socket } from 'socket.io-client';

// 1. ИСПРАВЛЕНО: Сюда нужно вставить ВАШУ полную ссылку из Render
const SOCKET_SERVER_URL = 'https://purrchat.onrender.com'; 

export const usePeer = (roomId: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Инициализация Socket.io
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
    });
    setSocket(newSocket);

    // 2. ИСПРАВЛЕНО: Убраны кривые настройки ICE-серверов, которые вызывали ошибку
    const newPeer = new Peer({
      secure: true,
    });
    setPeer(newPeer);

    return () => {
      newSocket.disconnect();
      newPeer.destroy();
    };
  }, []);

  useEffect(() => {
    // Защита от undefined
    if (!peer || !socket) return;

    peer.on('open', (id) => {
      setMyId(id);
      console.log('Ваш Peer ID:', id);
      socket.emit('join-room', roomId, id);
    });

    socket.on('user-connected', (userId: string) => {
      console.log('Пользователь подключился:', userId);
    });

    return () => {
      peer.off('open');
      socket.off('user-connected');
    };
  }, [peer, socket, roomId]);

  return {
    peer,
    myId,
    socket
  };
};
