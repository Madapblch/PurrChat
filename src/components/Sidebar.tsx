import React, { useState } from 'react';
import { Search, Plus, User, HelpCircle, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  currentUser: any;
  chats: any[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onAddFriend: () => void;
  onCreateGroup: () => void;
  onEditProfile: () => void;
  onShowHelp: () => void;
}

export const Sidebar = ({ 
  currentUser, 
  chats, 
  activeChatId, 
  onSelectChat, 
  onAddFriend,
  onCreateGroup,
  onEditProfile,
  onShowHelp
}: SidebarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-80 h-full bg-gray-900 border-r border-gray-800 flex flex-col text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center relative">
        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-800 p-2 rounded-lg transition-colors" onClick={() => setShowMenu(!showMenu)}>
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center overflow-hidden border-2 border-purple-400">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold">{currentUser.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex flex-col">
             <span className="font-semibold text-sm">{currentUser.name}</span>
             <span className="text-xs text-gray-400">Online</span>
          </div>
        </div>
        
        <div className="flex gap-2">
            <button onClick={onAddFriend} className="p-2 hover:bg-gray-800 rounded-full" title="Add Friend">
               <Plus size={20} className="text-purple-400" />
            </button>
            <button onClick={onCreateGroup} className="p-2 hover:bg-gray-800 rounded-full" title="Create Group">
               <User size={20} className="text-blue-400" />
            </button>
            <button onClick={onShowHelp} className="p-2 hover:bg-gray-800 rounded-full" title="Help">
               <HelpCircle size={20} className="text-gray-400" />
            </button>
        </div>

        {/* Menu Dropdown */}
        <AnimatePresence>
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-4 w-48 bg-gray-800 rounded-xl shadow-xl border border-gray-700 z-50 overflow-hidden"
            >
              <div className="p-2 space-y-1">
                <button onClick={() => { setShowMenu(false); onEditProfile(); }} className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-lg flex items-center gap-2 text-sm">
                  <User size={16} /> My Profile
                </button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-lg flex items-center gap-2 text-sm text-red-400">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search chats..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 placeholder-gray-500 text-sm"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredChats.map(chat => (
          <div 
            key={chat.id} 
            onClick={() => onSelectChat(chat.id)}
            className={`p-4 flex items-center gap-3 hover:bg-gray-800 cursor-pointer transition-colors ${activeChatId === chat.id ? 'bg-gray-800 border-l-4 border-purple-500' : 'border-l-4 border-transparent'}`}
          >
            <div className="relative">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${chat.id === 'bot' ? 'bg-orange-500' : 'bg-gray-700'}`}>
                 {chat.avatar ? (
                   <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-lg font-bold text-white">{chat.name.charAt(0)}</span>
                 )}
               </div>
               {chat.online && (
                 <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
               )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold truncate">{chat.name}</span>
                <span className="text-xs text-gray-500">{chat.lastMessageTime}</span>
              </div>
              <p className="text-sm text-gray-400 truncate">
                {chat.typing ? (
                  <span className="text-purple-400 animate-pulse">typing...</span>
                ) : (
                  chat.lastMessage
                )}
              </p>
            </div>
          </div>
        ))}
        
        {filteredChats.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
                No chats found. <br/> Click + to start a new one!
            </div>
        )}
      </div>
    </div>
  );
};
