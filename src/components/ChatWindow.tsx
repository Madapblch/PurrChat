import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Paperclip, Smile, MoreVertical, FileText, Download, 
  X, Edit, Trash2, ZoomIn, ZoomOut, Maximize2 
} from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cat } from './Cat';

interface ChatWindowProps {
  chat: any;
  messages: any[];
  currentUser: any;
  onSendMessage: (text: string, file?: File) => void;
  onShowProfile: () => void;
  onEditMessage: (id: string, newContent: string) => void;
  onStartEdit: (id: string, content: string) => void;
  onDeleteMessage: (id: string) => void;
  editingMessage: any | null;
  onCancelEdit: () => void;
  onTyping: (isTyping: boolean) => void;
}

export const ChatWindow = ({ 
  chat, 
  messages, 
  currentUser, 
  onSendMessage, 
  onShowProfile,
  onEditMessage,
  onStartEdit,
  onDeleteMessage,
  editingMessage,
  onCancelEdit,
  onTyping
}: ChatWindowProps) => {
  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // !!! НОВОЕ: Состояния для просмотра изображений
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обработка нажатия ESC для закрытия просмотра картинки
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseImage();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const isImage = selectedFile.type.startsWith('image/') || 
                    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(selectedFile.name);

    if (isImage) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (editingMessage) {
      setInputText(editingMessage.content);
    } else {
      setInputText('');
    }
  }, [editingMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chat.typing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setInputText(text);

      if (!editingMessage) {
          if (text.length > 0) {
              onTyping(true);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => {
                  onTyping(false);
              }, 2000);
          } else {
              onTyping(false);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          }
      }
  };

  const handleSend = () => {
    if (!inputText.trim() && !selectedFile) return;

    if (editingMessage) {
      onEditMessage(editingMessage.id, inputText);
      setInputText('');
      onCancelEdit();
    } else {
      onSendMessage(inputText, selectedFile || undefined);
      onTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setInputText('');
      setSelectedFile(null);
      setShowEmoji(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setInputText(prev => prev + emojiData.emoji);
  };

  // !!! НОВОЕ: Функции управления просмотром
  const handleImageClick = (url: string) => {
    setViewingImage(url);
    setZoomScale(1); // Сбрасываем зум при открытии
  };

  const handleCloseImage = () => {
    setViewingImage(null);
    setZoomScale(1);
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale(prev => Math.min(prev + 0.5, 4)); // Максимум 4x
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale(prev => Math.max(prev - 0.5, 0.5)); // Минимум 0.5x
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950 relative">
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900 shadow-md z-10">
        <div className="flex items-center gap-4 cursor-pointer" onClick={onShowProfile}>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500 bg-gray-800 flex items-center justify-center">
             {chat.avatar ? (
                <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
             ) : (
                <span className="text-white font-bold">{chat.name.charAt(0)}</span>
             )}
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">{chat.name}</h2>
            <p className="text-gray-400 text-xs">
              {chat.typing ? (
                  <span className="text-purple-400 font-semibold animate-pulse">typing...</span>
              ) : (
                  chat.online ? 'Online' : 'Last seen recently'
              )}
            </p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-white transition-colors">
          <MoreVertical size={24} />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative"
        style={{ backgroundImage: 'radial-gradient(circle at center, #2d1b4e 0%, #0f0f1a 100%)' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} 
        />

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
            {chat.id === 'bot' ? <Cat /> : <div className="text-6xl mb-4">👋</div>}
            <p>Say hello to {chat.name}!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 group`}
            >
              {isMe && (
                <div className="flex items-center gap-2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onStartEdit(msg.id, msg.content)} className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"><Edit size={14} /></button>
                  <button onClick={() => onDeleteMessage(msg.id)} className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              )}
              <div className={`max-w-[70%] p-3 rounded-2xl shadow-lg relative ${isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'}`}>
                
                {/* !!! ИЗМЕНЕНО: Обработка клика по изображению */}
                {msg.type === 'image' && msg.fileUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/10 relative group/img cursor-zoom-in" onClick={() => handleImageClick(msg.fileUrl!)}>
                    <img src={msg.fileUrl} alt="attachment" className="max-w-full h-auto object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                        <Maximize2 className="text-white drop-shadow-md" size={24} />
                    </div>
                  </div>
                )}
                
                {msg.type === 'file' && msg.fileUrl && (
                  <div className="mb-2 flex items-center gap-3 p-3 bg-black/20 rounded-lg">
                    <div className="p-2 bg-white/10 rounded-full"><FileText size={20} /></div>
                    <div className="flex-1 overflow-hidden">
                       <p className="truncate text-sm font-medium">{msg.fileName || 'Document'}</p>
                       <p className="text-xs opacity-70">File</p>
                    </div>
                    <a href={msg.fileUrl} download={msg.fileName} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Download size={18} /></a>
                  </div>
                )}
                <p className="text-sm md:text-base break-words leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <span className={`text-[10px] absolute bottom-1 right-3 opacity-60`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          );
        })}
        
        {chat.typing && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start mb-4">
              <div className="bg-gray-800 p-3 rounded-2xl rounded-bl-none border border-gray-700 flex items-center gap-1">
                 <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                 <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                 <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
           </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <AnimatePresence>
          {editingMessage && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex items-center justify-between mb-3 bg-gray-800 p-2 rounded-lg border-l-4 border-purple-500">
              <div className="flex flex-col">
                <span className="text-purple-400 text-xs font-bold uppercase">Editing Message</span>
                <span className="text-gray-300 text-sm truncate max-w-xs">{editingMessage.content}</span>
              </div>
              <button onClick={onCancelEdit} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white"><X size={16} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedFile && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex items-center gap-3 mb-3 bg-gray-800 p-2 rounded-lg border border-gray-700 w-fit">
               {previewUrl ? (
                 <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-600 group shrink-0">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover"/>
                 </div>
               ) : (
                 <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 shrink-0"><FileText size={20} /></div>
               )}
               <div className="flex flex-col min-w-0">
                 <span className="text-sm text-gray-300 max-w-xs truncate font-medium block">{selectedFile.name}</span>
                 <span className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
               </div>
               <button onClick={() => setSelectedFile(null)} className="ml-2 p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-red-400 transition-colors shrink-0"><X size={16} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-3 bg-gray-800 p-2 rounded-2xl border border-gray-700 relative z-20">
          <button onClick={() => setShowEmoji(!showEmoji)} className={`p-3 rounded-xl transition-colors ${showEmoji ? 'text-purple-400 bg-gray-700' : 'text-gray-400 hover:text-purple-400 hover:bg-gray-700'}`}>
            <Smile size={24} />
          </button>
          
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-purple-400 hover:bg-gray-700 rounded-xl transition-colors">
            <Paperclip size={24} />
          </button>

          <textarea
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onPaste={(e) => {
              const items = e.clipboardData.items;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                  const blob = items[i].getAsFile();
                  if (blob) {
                     e.preventDefault();
                     setSelectedFile(blob);
                  }
                }
              }
            }}
            placeholder="Type a message (or paste an image)..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 p-3 max-h-32 resize-none focus:outline-none scrollbar-hide"
            rows={1}
            style={{ minHeight: '48px' }}
          />
          
          <button onClick={handleSend} disabled={!inputText.trim() && !selectedFile} className={`p-3 rounded-xl transition-all duration-200 ${(inputText.trim() || selectedFile) ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-900/50' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
            <Send size={24} />
          </button>

          <AnimatePresence>
            {showEmoji && (
               <motion.div className="absolute bottom-full mb-4 left-0 shadow-2xl rounded-2xl overflow-hidden z-50 border border-gray-700"
                 initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}>
                 <EmojiPicker theme={Theme.DARK} onEmojiClick={onEmojiClick} lazyLoadEmojis={true} width={350} height={400} />
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* !!! НОВОЕ: Полноэкранный просмотрщик изображений */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={handleCloseImage} // Закрыть по клику на фон
          >
            {/* Панель инструментов */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-[101]" onClick={e => e.stopPropagation()}>
                <div className="bg-gray-800/80 backdrop-blur rounded-lg p-1 flex items-center border border-gray-700">
                   <button 
                      onClick={handleZoomOut}
                      className="p-2 text-white hover:bg-gray-700 rounded-md transition-colors"
                      title="Zoom Out (-)"
                   >
                      <ZoomOut size={20} />
                   </button>
                   <span className="w-12 text-center text-xs font-mono text-gray-300">
                     {Math.round(zoomScale * 100)}%
                   </span>
                   <button 
                      onClick={handleZoomIn}
                      className="p-2 text-white hover:bg-gray-700 rounded-md transition-colors"
                      title="Zoom In (+)"
                   >
                      <ZoomIn size={20} />
                   </button>
                </div>

                <button 
                   onClick={handleCloseImage}
                   className="p-3 bg-gray-800/80 hover:bg-red-500/80 text-white rounded-lg backdrop-blur border border-gray-700 transition-colors"
                >
                   <X size={20} />
                </button>
            </div>

            {/* Изображение с поддержкой перетаскивания (pan) */}
            <motion.img 
               src={viewingImage} 
               alt="Full screen view" 
               className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing"
               style={{ scale: zoomScale }}
               onClick={(e) => e.stopPropagation()} // Клик по самой картинке не закрывает её
               drag={zoomScale > 1} // Можно таскать только если увеличено
               dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
               dragElastic={0.1}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};