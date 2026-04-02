import { useEffect, useState } from 'react';
import { Peer } from 'peerjs';
import { io, Socket } from 'socket.io-client';

// Замените на ВАШ адрес из панели Render
const SOCKET_SERVER_URL = 'https://onrender.com';

export const usePeer = (roomId: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // 1. Инициализация Socket.io
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
    });
    setSocket(newSocket);

    // 2. Инициализация PeerJS (используем бесплатное облако для стабильности)
    const newPeer = new Peer({
      config: { iceServers: [{ urls: 'stun:://google.com' }] },
      secure: true,
    });
    setPeer(newPeer);

    return () => {
      newSocket.disconnect();
      newPeer.destroy();
    };
  }, []);

  useEffect(() => {
    // ЗАЩИТА: Если объекты еще не созданы, выходим из функции
    if (!peer || !socket) return;

    peer.on('open', (id) => {
      setMyId(id);
      console.log('Ваш Peer ID:', id);
      socket.emit('join-room', roomId, id);
    });

    socket.on('user-connected', (userId) => {
      console.log('Пользователь подключился:', userId);
    });

    // Очистка событий при закрытии
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
