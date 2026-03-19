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
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ginger',
  online: true,
  bio: 'I am a ginger cat who loves to chat! Meow!'
};

export function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('purrchat_user');
    return saved ? JSON.parse(saved) : {
      id: 'me',
      name: 'Guest User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      bio: 'Loves cats and coding.'
    };
  });

  const [activeChatId, setActiveChatId] = useState<string>(BOT_ID);
  
  // !!! ИЗМЕНЕНО: Загрузка списка чатов
  const [chats, setChats] = useState<any[]>(() => {
    const saved = localStorage.getItem('purrchat_chats');
    if (saved) {
      const parsedChats = JSON.parse(saved);
      // При загрузке сбрасываем статус online на false для всех, кроме бота и групп
      return parsedChats.map((c: any) => ({
        ...c,
        online: c.id === BOT_ID ? true : (c.isGroup ? true : false) 
      }));
    }
    return [{ ...BOT_USER, lastMessage: 'Welcome to PurrChat!', lastMessageTime: 'Now' }];
  });
  
  // !!! ИЗМЕНЕНО: Загрузка сообщений бота
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
    return [{
      id: 'welcome-msg',
      senderId: BOT_ID,
      content: 'Meow! Welcome to PurrChat! 🐱\nI can chat with you, or you can find friends online!',
      timestamp: new Date(),
      type: 'text'
    }];
  });

  // !!! НОВОЕ: Сохранение чатов и бота
  useEffect(() => {
     localStorage.setItem('purrchat_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
     localStorage.setItem('purrchat_bot_messages', JSON.stringify(botMessages));
  }, [botMessages]);


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
       console.log('Syncing User ID with Peer ID:', peerId);
       const updated = { ...currentUser, id: peerId };
       setCurrentUser(updated);
       localStorage.setItem('purrchat_user', JSON.stringify(updated));
    }
  }, [peerId, currentUser]);

  useEffect(() => {
    Object.keys(incomingMessages).forEach(chatId => {
       if (chatId.startsWith('group-')) return;
       setChats(prev => {
          if (prev.find(c => c.id === chatId)) return prev;
          return [...prev, {
             id: chatId,
             name: `User ${chatId.substr(0,4)}`,
             avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatId}`,
             online: true, // Здесь ставим true, так как получили сообщение - значит живой
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

  // Обновление статусов Online на основе connectedUsers
  useEffect(() => {
    setChats(prev => {
      let newChats = [...prev];
      let changed = false;

      // 1. Проходим по всем подключенным юзерам и обновляем/добавляем их
      Object.values(connectedUsers).forEach(user => {
         const index = newChats.findIndex(c => c.id === user.id);
         if (index !== -1) {
            const chat = newChats[index];
            if (chat.name !== user.name || chat.avatar !== user.avatar || chat.bio !== user.bio || !chat.online) {
               newChats[index] = { ...chat, name: user.name, avatar: user.avatar, bio: user.bio || chat.bio, online: true };
               changed = true;
            }
         } else {
            newChats.push({
               id: user.id,
               name: user.name,
               avatar: user.avatar,
               bio: user.bio || 'New P2P Friend',
               online: true,
               lastMessage: 'Connected',
               lastMessageTime: 'Now'
            });
            changed = true;
         }
      });

      // 2. Если юзер в списке чатов, но его НЕТ в connectedUsers, ставим online: false
      // (Это обрабатывает ситуацию, когда друг отключился)
      // Исключаем Бота и Группы
      newChats.forEach((chat, idx) => {
         if (chat.id !== BOT_ID && !chat.isGroup) {
             const isConnected = !!connectedUsers[chat.id];
             if (chat.online !== isConnected) {
                 newChats[idx] = { ...chat, online: isConnected };
                 changed = true;
             }
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
         const botReply: PeerMessage = {
           id: Date.now().toString() + 'bot',
           senderId: BOT_ID,
           content: file ? 'Meow! That looks interesting! 😺' : `Meow meow! You said: "${text}" 😻`,
           timestamp: new Date(),
           type: 'text'
         };
         setBotMessages(prev => [...prev, botReply]);
      }, 1500);
    } else {
      let peerFileUrl = undefined;
      if (file) {
         try {
            peerFileUrl = await fileToBase64(file);
         } catch (e) {
            alert('Failed to process file.');
            return;
         }
      }

      const activeChat = chats.find(c => c.id === activeChatId);
      if (activeChat?.isGroup) {
         activeChat.members.forEach((memberId: string) => {
            if (memberId !== currentUser.id) {
               sendMessageToPeer(memberId, text, newMessage.type, peerFileUrl, newMessage.fileName, activeChat.id, newMessage.id);
            }
         });
      } else {
         sendMessageToPeer(activeChatId, text, newMessage.type, peerFileUrl, newMessage.fileName, undefined, newMessage.id);
      }
      
      setChats(prev => prev.map(c => 
         c.id === activeChatId 
         ? { ...c, lastMessage: text || 'Sent a file', lastMessageTime: format(new Date(), 'HH:mm') } 
         : c
      ));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleEditMessage = (id: string, newContent: string) => {
    if (activeChatId === BOT_ID) {
      setBotMessages(prev => prev.map(m => m.id === id ? { ...m, content: newContent } : m));
    } else {
      sendEditToPeer(activeChatId, id, newContent);
    }
    setEditingMessage(null);
  };

  const handleStartEdit = (id: string, content: string) => {
    setEditingMessage({ id, content });
  };

  const handleDeleteMessage = (id: string) => {
    if (activeChatId === BOT_ID) {
      setBotMessages(prev => prev.filter(m => m.id !== id));
    } else {
      sendDeleteToPeer(activeChatId, id);
    }
    if (editingMessage?.id === id) setEditingMessage(null);
  };

  const handleTyping = (isTyping: boolean) => {
      if (activeChatId === BOT_ID) return; 

      const activeChat = chats.find(c => c.id === activeChatId);
      if (activeChat?.isGroup) {
          activeChat.members.forEach((memberId: string) => {
              if (memberId !== currentUser.id) {
                  sendTypingToPeer(memberId, isTyping, activeChat.id);
              }
          });
      } else {
          sendTypingToPeer(activeChatId, isTyping);
      }
  };

  const handleAddFriend = async () => {
    const targetId = friendIdInput.trim();
    if (!targetId || targetId === peerId) return;
    setIsConnecting(true);
    try {
      await connectToPeer(targetId);
      // При успешном подключении добавляем чат, но не дублируем
      // Логика добавления уже есть в useEffect[connectedUsers], но для быстрого UI обновления можно и здесь
      // Главное - сохранить
      setChats(prev => {
         if (prev.find(c => c.id === targetId)) return prev;
         return [...prev, {
            id: targetId,
            name: `Friend ${targetId.substr(0,4)}`,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetId}`,
            online: true,
            bio: 'Connected!',
            lastMessage: 'Chat created',
            lastMessageTime: 'Now'
         }];
      });
      setActiveChatId(targetId);
      setShowAddFriend(false);
      setFriendIdInput('');
    } catch (err: any) {
      alert(`Connection failed: ${err.message || err}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateGroup = () => {
      if (!groupNameInput.trim() || selectedGroupMembers.length === 0) return;
      const groupId = `group-${Date.now()}`;
      const newGroupChat = {
        id: groupId,
        name: groupNameInput,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${groupNameInput}`,
        online: true,
        isGroup: true,
        members: [...selectedGroupMembers, currentUser.id],
        lastMessage: 'Group created',
        lastMessageTime: 'Now'
      };
      setChats(prev => [...prev, newGroupChat]);
      createGroup(selectedGroupMembers, newGroupChat);
      setActiveChatId(groupId);
      setShowCreateGroup(false);
      setGroupNameInput('');
      setSelectedGroupMembers([]);
  };

  const toggleGroupMember = (id: string) => setSelectedGroupMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  const handleCopyId = () => { navigator.clipboard.writeText(peerId); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); };
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const saveProfile = () => {
    const updated = { ...currentUser, name: editName, bio: editBio };
    setCurrentUser(updated);
    localStorage.setItem('purrchat_user', JSON.stringify(updated));
    setIsEditingProfile(false);
  };
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        try {
            const base64 = await fileToBase64(e.target.files[0]);
            const updated = { ...currentUser, avatar: base64 };
            setCurrentUser(updated);
            localStorage.setItem('purrchat_user', JSON.stringify(updated));
        } catch(e) { console.error(e); }
    }
  };

  const activeMessages = activeChatId === BOT_ID ? botMessages : (incomingMessages[activeChatId] || []);
  
  const rawChatInfo = chats.find(c => c.id === activeChatId) || BOT_USER;
  const activeChatInfo = {
      ...rawChatInfo,
      typing: activeChatId === BOT_ID ? false : (typingUsers[activeChatId] || false)
  };

  return (
    <div className="flex h-screen bg-gray-950 font-sans overflow-hidden text-gray-100">
      <Sidebar 
        currentUser={currentUser}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onAddFriend={() => setShowAddFriend(true)}
        onCreateGroup={() => setShowCreateGroup(true)}
        onShowHelp={() => setShowHelp(true)}
        onEditProfile={() => setShowProfile(true)}
      />

      <ChatWindow 
        chat={activeChatInfo}
        messages={activeMessages}
        currentUser={currentUser}
        onSendMessage={handleSendMessage}
        onShowProfile={() => setShowUserProfile(true)}
        onEditMessage={handleEditMessage}
        onStartEdit={handleStartEdit}
        onDeleteMessage={handleDeleteMessage}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        onTyping={handleTyping}
      />

      <AnimatePresence>
        {showCreateGroup && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
                 <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Create Group Chat</h2><button onClick={() => setShowCreateGroup(false)} className="text-gray-400 hover:text-white"><X /></button></div>
                 <div className="space-y-4">
                    <div><label className="text-sm text-gray-400 mb-1 block">Group Name</label><input type="text" value={groupNameInput} onChange={(e) => setGroupNameInput(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none transition-colors" /></div>
                    <div><label className="text-sm text-gray-400 mb-2 block">Select Members</label><div className="max-h-48 overflow-y-auto bg-gray-900 rounded-xl border border-gray-700 p-2 custom-scrollbar">{chats.filter(c => c.id !== BOT_ID && !c.isGroup).map(friend => (<div key={friend.id} onClick={() => toggleGroupMember(friend.id)} className={`p-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${selectedGroupMembers.includes(friend.id) ? 'bg-purple-900/40 border border-purple-500/50' : 'hover:bg-gray-800 border border-transparent'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center border ${selectedGroupMembers.includes(friend.id) ? 'border-purple-400' : 'border-gray-600'}`}>{selectedGroupMembers.includes(friend.id) && <Check size={14} className="text-purple-400" />}</div><span className="text-sm text-gray-200">{friend.name}</span></div>))}</div></div>
                    <button onClick={handleCreateGroup} disabled={!groupNameInput.trim() || selectedGroupMembers.length === 0} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-all">Create Group</button>
                 </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddFriend && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
               <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Add New Friend</h2><button onClick={() => setShowAddFriend(false)} className="text-gray-400 hover:text-white"><X /></button></div>
               <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-gray-700"><label className="text-xs text-purple-400 uppercase font-bold tracking-wider mb-2 block">Your ID</label><div className="flex items-center justify-between gap-2"><code className="text-lg font-mono text-white tracking-wide">{peerId || 'Generating...'}</code><button onClick={handleCopyId} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white">{copySuccess ? <Check className="text-green-500" size={20} /> : <Copy size={20} />}</button></div></div>
               <div className="space-y-4"><div><label className="text-sm text-gray-400 mb-1 block">Friend's ID</label><input type="text" value={friendIdInput} onChange={(e) => setFriendIdInput(e.target.value)} placeholder="Paste their ID here..." className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none transition-colors" /></div><button onClick={handleAddFriend} disabled={isConnecting} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-70 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">{isConnecting ? 'Connecting...' : 'Connect & Chat'}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHelp && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg border border-gray-700 shadow-2xl relative"><button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X /></button><h2 className="text-2xl font-bold text-white mb-4">How to Chat Online? 🌐</h2><div className="space-y-4 text-gray-300"><p>PurrChat uses P2P technology.</p><ol className="list-decimal list-inside space-y-2 ml-2"><li>Click <Plus size={16} className="inline" /></li><li>Copy Your ID</li><li>Enter Friend ID</li></ol></div></div></motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
           <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 left-0 w-full max-w-md bg-gray-900 z-50 border-r border-gray-800 shadow-2xl flex flex-col">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center"><h2 className="text-xl font-bold text-white">My Profile</h2><button onClick={() => setShowProfile(false)}><X className="text-gray-400" /></button></div>
              <div className="p-8 flex flex-col items-center flex-1 overflow-y-auto"><input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarFileSelect} /><div className="relative group cursor-pointer" onClick={isEditingProfile ? () => avatarInputRef.current?.click() : undefined}><div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-600 shadow-xl mb-4"><img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" /></div>{isEditingProfile && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-xs font-bold">Change</span></div>}</div>{!isEditingProfile ? (<><h2 className="text-2xl font-bold text-white mb-2">{currentUser.name}</h2><p className="text-purple-400 mb-6">@{currentUser.id.substr(0,8)}</p><div className="w-full bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6"><h3 className="text-sm font-bold text-gray-500 uppercase mb-2">About Me</h3><p className="text-gray-300 italic">"{currentUser.bio}"</p></div><button onClick={() => { setIsEditingProfile(true); setEditName(currentUser.name); setEditBio(currentUser.bio); }} className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-white font-medium"><Edit2 size={18} /> Edit Profile</button></>) : (<div className="w-full space-y-4"><div><label className="text-sm text-gray-400 mb-1 block">Name</label><input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" /></div><div><label className="text-sm text-gray-400 mb-1 block">Bio</label><textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" rows={3} /></div><div className="flex gap-3 pt-4"><button onClick={() => setIsEditingProfile(false)} className="flex-1 py-3 bg-gray-800 rounded-xl text-white">Cancel</button><button onClick={saveProfile} className="flex-1 py-3 bg-purple-600 rounded-xl text-white font-bold flex justify-center gap-2"><Save size={20} /> Save</button></div></div>)}</div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {showUserProfile && activeChatId !== BOT_ID && (
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 z-40 shadow-2xl p-6"><button onClick={() => setShowUserProfile(false)} className="absolute top-4 left-4 p-2 bg-gray-800 rounded-full text-white"><X size={20} /></button><div className="mt-12 flex flex-col items-center text-center"><div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-700 mb-4"><img src={activeChatInfo.avatar} alt="" className="w-full h-full object-cover" /></div><h2 className="text-xl font-bold text-white">{activeChatInfo.name}</h2><p className="text-green-500 text-sm mb-6 flex items-center gap-1">● Online</p><div className="w-full text-left space-y-6"><div><h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Info</h3><p className="text-gray-300 text-sm">{activeChatInfo.bio || 'No bio available.'}</p></div><div><h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ID</h3><code className="bg-gray-800 p-2 rounded text-xs text-gray-400 block">{activeChatInfo.id}</code></div></div></div></motion.div>
         )}
      </AnimatePresence>

    </div>
  );
}