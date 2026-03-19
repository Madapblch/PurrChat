import React from 'react';
import { motion } from 'framer-motion';

export const Cat = ({ isTyping = false }: { isTyping?: boolean }) => {
  return (
    <div className="relative w-24 h-24">
      <motion.svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ repeat: Infinity, repeatType: "reverse", duration: 2 }}
      >
        {/* Body */}
        <circle cx="100" cy="120" r="70" fill="#e67e22" />
        <circle cx="100" cy="120" r="50" fill="#d35400" opacity="0.2" />
        
        {/* Ears */}
        <motion.path 
          d="M60 70 L40 20 L90 60 Z" 
          fill="#e67e22" 
          animate={isTyping ? { rotate: [-5, 5, -5] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
        <motion.path 
          d="M140 70 L160 20 L110 60 Z" 
          fill="#e67e22"
          animate={isTyping ? { rotate: [5, -5, 5] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        />

        {/* Eyes */}
        <circle cx="70" cy="100" r="10" fill="white" />
        <motion.circle 
          cx="70" 
          cy="100" 
          r="4" 
          fill="black"
          animate={isTyping ? { cx: [68, 72, 68] } : {}} 
          transition={{ duration: 1, repeat: Infinity }}
        />
        
        <circle cx="130" cy="100" r="10" fill="white" />
        <motion.circle 
          cx="130" 
          cy="100" 
          r="4" 
          fill="black"
          animate={isTyping ? { cx: [128, 132, 128] } : {}} 
          transition={{ duration: 1, repeat: Infinity }}
        />

        {/* Nose */}
        <path d="M95 115 L105 115 L100 125 Z" fill="#ffcccc" />

        {/* Whiskers */}
        <path d="M60 115 L20 110" stroke="#ecf0f1" strokeWidth="2" />
        <path d="M60 120 L20 125" stroke="#ecf0f1" strokeWidth="2" />
        <path d="M140 115 L180 110" stroke="#ecf0f1" strokeWidth="2" />
        <path d="M140 120 L180 125" stroke="#ecf0f1" strokeWidth="2" />
      </motion.svg>
    </div>
  );
};
