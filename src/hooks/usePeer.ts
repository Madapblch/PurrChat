import { useEffect, useState, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }
];

export interface PeerMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  groupId?: string;
}

export interface PeerUser {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
}

export const usePeer = (currentUser: PeerUser) => {
  const [peerId, setPeerId] = useState<string>('');
  const [connections, setConnections] = useState<{ [key: string]: DataConnection }>({});
  
  // !!! ИЗМЕНЕНО: Загрузка сообщений из LocalStorage
  const [incomingMessages, setIncomingMessages] = useState<{ [key: string]: PeerMessage[] }>(() => {
    const saved = localStorage.getItem('purrchat_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Восстанавливаем объекты Date из строк
        Object.keys(parsed).forEach(key => {
          parsed[key] = parsed[key].map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        });
        return parsed;
      } catch (e) {
        console.error("Failed to load messages", e);
        return {};
      }
    }
    return {};
  });

  const [connectedUsers, setConnectedUsers] = useState<{ [key: string]: PeerUser }>({});
  
  // !!! ИЗМЕНЕНО: Загрузка групп из LocalStorage
  const [incomingGroups, setIncomingGroups] = useState<any[]>(() => {
    const saved = localStorage.getItem('purrchat_groups');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: boolean }>({});

  const peerRef = useRef<Peer | null>(null);
  const currentUserRef = useRef(currentUser);

  // !!! НОВОЕ: Сохраняем сообщения при каждом изменении
  useEffect(() => {
    localStorage.setItem('purrchat_messages', JSON.stringify(incomingMessages));
  }, [incomingMessages]);

  // !!! НОВОЕ: Сохраняем группы при каждом изменении
  useEffect(() => {
    localStorage.setItem('purrchat_groups', JSON.stringify(incomingGroups));
  }, [incomingGroups]);

  useEffect(() => {
    currentUserRef.current = currentUser;
    Object.values(connections).forEach(conn => {
      if (conn.open) {
         conn.send({ type: 'handshake', user: currentUser });
      }
    });
  }, [currentUser, connections]);

  const handleData = useCallback((data: any, conn: DataConnection) => {
    if (data.type === 'handshake') {
       console.log('Handshake received from:', data.user);
       setConnectedUsers(prev => ({ ...prev, [data.user.id]: data.user }));
    } else if (data.type === 'message') {
      setTypingUsers(prev => ({ ...prev, [data.message.senderId]: false }));
      const msg: PeerMessage = {
        ...data.message,
        timestamp: new Date(data.message.timestamp),
      };
      setIncomingMessages(prev => {
        const chatId = msg.groupId || msg.senderId;
        const chatMessages = prev[chatId] || [];
        if (chatMessages.some(m => m.id === msg.id)) return prev;
        return { ...prev, [chatId]: [...chatMessages, msg] };
      });
    } else if (data.type === 'group_create') {
        setIncomingGroups(prev => {
            if (prev.find(g => g.id === data.group.id)) return prev;
            return [...prev, data.group];
        });
    } else if (data.type === 'EDIT') {
      setIncomingMessages(prev => {
        const senderId = conn.peer;
        const msgs = prev[senderId] || [];
        return { ...prev, [senderId]: msgs.map(m => m.id === data.id ? { ...m, content: data.newContent } : m) };
      });
    } else if (data.type === 'DELETE') {
       setIncomingMessages(prev => {
        const senderId = conn.peer;
        const msgs = prev[senderId] || [];
        return { ...prev, [senderId]: msgs.filter(m => m.id !== data.id) };
       });
    } else if (data.type === 'TYPING') {
        const chatId = data.groupId || conn.peer;
        setTypingUsers(prev => ({
            ...prev,
            [chatId]: data.isTyping
        }));
    }
  }, []);

  const setupConnection = useCallback((conn: DataConnection) => {
    const handleOpen = () => {
      console.log('Connection ready with: ' + conn.peer);
      setConnections(prev => ({ ...prev, [conn.peer]: conn }));
      conn.send({ type: 'handshake', user: currentUserRef.current });
    };

    if (conn.open) handleOpen();
    else conn.on('open', handleOpen);

    conn.on('data', (data) => handleData(data, conn));

    conn.on('close', () => {
      console.log('Connection closed: ' + conn.peer);
      setConnections(prev => {
        const newConns = { ...prev };
        delete newConns[conn.peer];
        return newConns;
      });
      // При отключении помечаем пользователя как offline в UI через connectedUsers?
      // На самом деле connectedUsers используется для статуса Online.
      // Удаляем его оттуда.
      setConnectedUsers(prev => {
          const newUsers = { ...prev };
          delete newUsers[conn.peer];
          return newUsers;
      });
    });
    
    conn.on('error', (err) => console.error('Connection error:', err));
  }, [handleData]);

  useEffect(() => {
    let myId = localStorage.getItem('purrchat_peer_id');
    if (!myId) {
      myId = uuidv4().substring(0, 8);
      localStorage.setItem('purrchat_peer_id', myId);
    }
    setPeerId(myId);

  const peer = new Peer(myId, {
    config: { iceServers: [{ urls: 'stun:://google.com' }] },
    secure: true,
    debug: 1
  });

    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      setPeerId(id);
    });

    peer.on('connection', (conn) => {
      console.log('Incoming connection from: ' + conn.peer);
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'unavailable-id') {
         const newId = uuidv4().substring(0, 8);
         localStorage.setItem('purrchat_peer_id', newId);
         window.location.reload();
      }
    });

    return () => peer.destroy();
  }, [setupConnection]);

  const connectToPeer = (targetId: string): Promise<DataConnection> => {
      return new Promise((resolve, reject) => {
        if (!peerRef.current) return reject(new Error("Peer not initialized"));
        if (connections[targetId]) return resolve(connections[targetId]);
        if (targetId === peerId) return reject(new Error("Cannot connect to yourself"));
        
        const conn = peerRef.current.connect(targetId, { reliable: true });
        const timeout = setTimeout(() => { conn.close(); reject(new Error("Timeout")); }, 15000);

        conn.on('open', () => { clearTimeout(timeout); setupConnection(conn); resolve(conn); });
        conn.on('error', (err) => { clearTimeout(timeout); reject(err); });
      });
  };

  const sendMessageToPeer = (targetId: string, content: string, type: 'text' | 'image' | 'file' = 'text', fileUrl?: string, fileName?: string, groupId?: string, existingMessageId?: string) => {
    const conn = connections[targetId];
    // Если соединения нет, мы всё равно сохраняем сообщение локально, но оно не уйдет
    // Это нормальное поведение для "офлайн" истории, но P2P требует онлайн.
    // Пока оставим проверку.
    
    // Но мы должны обновить локальный стейт даже если отправка не удалась? 
    // Обычно нет, иначе будет рассинхрон.
    // Однако, если это групповой чат, мы отправляем всем.
    
    if (conn && conn.open) {
      const msg: PeerMessage = {
        id: existingMessageId || uuidv4(),
        senderId: peerId,
        content,
        timestamp: new Date(),
        type,
        fileUrl,
        fileName,
        groupId
      };
      
      conn.send({ type: 'message', message: msg });
      
      setIncomingMessages(prev => {
        const chatId = groupId || targetId;
        const chatMessages = prev[chatId] || [];
        if (chatMessages.some(m => m.id === msg.id)) return prev;
        return { ...prev, [chatId]: [...chatMessages, msg] };
      });
      return true;
    }
    return false;
  };

  const createGroup = (members: string[], groupData: any) => {
    members.forEach(memberId => {
        if (memberId === peerId) return; 
        const conn = connections[memberId];
        if (conn && conn.open) conn.send({ type: 'group_create', group: groupData });
    });
    setIncomingGroups(prev => {
        if (prev.find(g => g.id === groupData.id)) return prev;
        return [...prev, groupData];
    });
  };

  const sendEditToPeer = (targetId: string, messageId: string, newContent: string) => {
    setIncomingMessages(prev => {
      const msgs = prev[targetId] || [];
      return { ...prev, [targetId]: msgs.map(m => m.id === messageId ? { ...m, content: newContent } : m) };
    });
    const conn = connections[targetId];
    if (conn && conn.open) conn.send({ type: 'EDIT', id: messageId, newContent });
  };

  const sendDeleteToPeer = (targetId: string, messageId: string) => {
    setIncomingMessages(prev => {
      const msgs = prev[targetId] || [];
      return { ...prev, [targetId]: msgs.filter(m => m.id !== messageId) };
    });
    const conn = connections[targetId];
    if (conn && conn.open) conn.send({ type: 'DELETE', id: messageId });
  };

  const sendTypingToPeer = (targetId: string, isTyping: boolean, groupId?: string) => {
      const conn = connections[targetId];
      if (conn && conn.open) {
          conn.send({ type: 'TYPING', isTyping, groupId });
      }
  };

  return {
    peerId,
    connectToPeer,
    sendMessageToPeer,
    sendEditToPeer,
    sendDeleteToPeer,
    incomingMessages,
    setIncomingMessages,
    connectedUsers,
    createGroup,
    incomingGroups,
    sendTypingToPeer,
    typingUsers
  };
};
