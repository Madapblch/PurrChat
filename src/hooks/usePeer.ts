import { useEffect, useState, useRef } from 'react';
import { Peer } from 'peerjs';
import { io, Socket } from 'socket.io-client';

export const usePeer = (currentUser: any) => {
  const [peerId, setPeerId] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectedUsers, setConnectedUsers] = useState({});
  const [incomingMessages, setIncomingMessages] = useState({});
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    const s = io('https://onrender.com', { transports: ['websocket'] });
    setSocket(s);

    const p = new Peer({ secure: true });
    peerRef.current = p;

    p.on('open', (id) => {
      setPeerId(id);
      s.emit('join-server', { ...currentUser, id });
    });

    s.on('users-list', (users) => setConnectedUsers(users));
    s.on('receive-message', (msg) => {
      setIncomingMessages(prev => ({ ...prev, [msg.senderId]: [...(prev[msg.senderId] || []), msg] }));
    });

    return () => { s.disconnect(); p.destroy(); };
  }, []);

  const sendMessageToPeer = (to: string, text: string, type: string) => {
    socket?.emit('send-message', { to, text, type, senderId: peerId });
  };

  return { peerId, socket, connectedUsers, incomingMessages, sendMessageToPeer, connectToPeer: async (id: string) => {}, sendEditToPeer: () => {}, sendDeleteToPeer: () => {}, createGroup: () => {}, incomingGroups: [], sendTypingToPeer: () => {}, typingUsers: {} };
};
