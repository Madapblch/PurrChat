import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { usePeer, PeerMessage } from './hooks/usePeer';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Save, Edit2, Plus } from 'lucide-react';
import { format } from 'date-fns';

const BOT_ID = 'bot';
const BOT_USER = {
  id: BOT_ID,
  name: 'Ginger (CatBot)',
  avatar: 'https://dicebear.com',
  online: true,
  bio: 'I am a ginger cat who loves to chat! Meow!'
};

export function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('purrchat_user');
    return saved ? JSON.parse(saved) : {
      id: 'me',
      name: 'Guest User',
      avatar: 'https://dicebear.com',
      bio: 'Loves cats and coding.'
    };
  });

  const [activeChatId, setActiveChatId] = useState<string>(BOT_ID);
  const [chats, setChats] = useState<any[]>(() => {
    const saved = localStorage.getItem('purrchat_chats');
    if (saved) {
      const parsedChats = JSON.parse(saved);
      return parsedChats.map((c: any) => ({
        ...c,
        online: c.id === BOT_ID ? true : (c.isGroup ? true : false) 
      }));
    }
    return [{ ...BOT_USER, lastMessage: 'Welcome to PurrChat!', lastMessageTime: 'Now' }];
  });
  
  const [botMessages, setBotMessages] = useState<PeerMessage[]>(() => {
    const saved = localStorage.getItem('purrchat_bot_messages');
    if (saved) {
        try {
            return JSON.parse(saved).map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp)
            }));
        } catch(e) { return []; }
    }
    return;
  });

  useEffect(() => { localStorage.setItem('purrchat_chats', JSON.stringify(chats)); }, [chats]);
  useEffect(() => { localStorage.setItem('purrchat_bot_messages', JSON.stringify(botMessages)); }, [botMessages]);

  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editBio, setEditBio] = useState(currentUser.bio);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);

  const { 
    peerId, 
    connectToPeer, 
    sendMessageToPeer, 
    sendEditToPeer, 
    sendDeleteToPeer, 
    incomingMessages, 
    connectedUsers,
    createGroup,
    incomingGroups,
    sendTypingToPeer,
    typingUsers
  } = usePeer(currentUser);

  useEffect(() => {
    if (peerId && currentUser.id !== peerId) {
       const updated = { ...currentUser, id: peerId };
       setCurrentUser(updated);
       localStorage.setItem('purrchat_user', JSON.stringify(updated));
    }
  }, [peerId]);

  useEffect(() => {
    Object.keys(incomingMessages).forEach(chatId => {
       if (chatId.startsWith('group-')) return;
       setChats(prev => {
          if (prev.find(c => c.id === chatId)) return prev;
          return [...prev, {
             id: chatId,
             name: `User ${chatId.substr(0,4)}`,
             avatar: `https://dicebear.com{chatId}`,
             online: true,
             bio: 'A new friend found via P2P.',
             lastMessage: 'New message',
             lastMessageTime: 'Just now'
          }];
       });
    });
  }, [incomingMessages]);

  useEffect(() => {
    incomingGroups.forEach(group => {
        setChats(prev => {
            if (prev.find(c => c.id === group.id)) return prev;
            return [...prev, { ...group, lastMessage: 'Group joined', lastMessageTime: 'Now' }];
        });
    });
  }, [incomingGroups]);

  useEffect(() => {
    setChats(prev => {
      let newChats = [...prev];
      let changed = false;
      Object.values(connectedUsers).forEach((user: any) => {
         const index = newChats.findIndex(c => c.id === user.id);
         if (index !== -1) {
            if (!newChats[index].online) { newChats[index].online = true; changed = true; }
         } else {
            newChats.push({ id: user.id, name: user.name, avatar: user.avatar, online: true, lastMessage: 'Connected', lastMessageTime: 'Now' });
            changed = true;
         }
      });
      return changed ? newChats : prev;
    });
  }, [connectedUsers]);

  const handleSendMessage = async (text: string, file?: File) => {
    const newMessage: PeerMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      content: text,
      timestamp: new Date(),
      type: file ? (file.type.startsWith('image/') ? 'image' : 'file') : 'text',
      fileUrl: file ? URL.createObjectURL(file) : undefined,
      fileName: file?.name
    };

    if (activeChatId === BOT_ID) {
      setBotMessages(prev => [...prev, newMessage]);
      setTimeout(() => {
         setBotMessages(prev =>);
      }, 1500);
    } else {
      sendMessageToPeer(activeChatId, text, newMessage.type, newMessage.fileUrl, newMessage.fileName, undefined, newMessage.id);
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, lastMessage: text || 'File', lastMessageTime: 'Now' } : c));
    }
  };

  const handleCopyId = () => { navigator.clipboard.writeText(peerId); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); };
  const saveProfile = () => {
    const updated = { ...currentUser, name: editName, bio: editBio };
    setCurrentUser(updated);
    localStorage.setItem('purrchat_user', JSON.stringify(updated));
    setIsEditingProfile(false);
  };

  const activeMessages = activeChatId === BOT_ID ? botMessages : (incomingMessages[activeChatId] || []);
  const rawChatInfo = chats.find(c => c.id === activeChatId) || BOT_USER;
  const activeChatInfo = { ...rawChatInfo, typing: typingUsers[activeChatId] || false };

  return (
    <div className="flex h-screen bg-gray-950 font-sans overflow-hidden text-gray-100">
      <Sidebar currentUser={currentUser} chats={chats} activeChatId={activeChatId} onSelectChat={setActiveChatId} onAddFriend={() => setShowAddFriend(true)} onCreateGroup={() => setShowCreateGroup(true)} onShowHelp={() => setShowHelp(true)} onEditProfile={() => setShowProfile(true)} />
      <ChatWindow chat={activeChatInfo} messages={activeMessages} currentUser={currentUser} onSendMessage={handleSendMessage} onShowProfile={() => setShowUserProfile(true)} onEditMessage={handleEditMessage} onStartEdit={handleStartEdit} onDeleteMessage={handleDeleteMessage} editingMessage={editingMessage} onCancelEdit={() => setEditingMessage(null)} onTyping={handleTyping} />
      
      {/* Модалки (Add Friend, Profile и т.д.) */}
      <AnimatePresence>
        {showAddFriend && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
               <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Add Friend</h2><button onClick={() => setShowAddFriend(false)}><X /></button></div>
               <div className="mb-6 p-4 bg-gray-900 rounded-xl"><label className="text-xs text-purple-400 font-bold mb-2 block">Your ID</label><div className="flex items-center justify-between"><code>{peerId || '...'}</code><button onClick={handleCopyId}>{copySuccess ? <Check className="text-green-500" /> : <Copy />}</button></div></div>
               <input type="text" value={friendIdInput} onChange={e => setFriendIdInput(e.target.value)} placeholder="Friend ID" className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 mb-4" />
               <button onClick={async () => { setIsConnecting(true); await connectToPeer(friendIdInput); setShowAddFriend(false); setIsConnecting(false); }} className="w-full bg-purple-600 py-3 rounded-xl font-bold">{isConnecting ? 'Connecting...' : 'Connect'}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
