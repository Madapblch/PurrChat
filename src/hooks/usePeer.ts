import { useEffect, useState } from 'react';
import { Peer } from 'peerjs';
import { io, Socket } from 'socket.io-client';

// Твой проверенный адрес сервера на Render
const SOCKET_SERVER_URL = 'https://purrchat.onrender.com'; 

export const usePeer = (roomId: string) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // 1. Подключаем сокеты для чата
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
    });
    setSocket(newSocket);

    // 2. Создаем Peer-объект без лишних конфигов (чтобы не было ошибок ICE)
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
    // Ждем, пока всё создастся, чтобы не было ошибки "reading 'on'"
    if (!peer || !socket) return;

    peer.on('open', (id) => {
      setMyId(id);
      console.log('Ваш Peer ID:', id);
      // Уведомляем сервер, что мы зашли в комнату
      socket.emit('join-room', roomId, id);
    });

    socket.on('user-connected', (userId: string) => {
      console.log('К нам подключился пользователь:', userId);
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
