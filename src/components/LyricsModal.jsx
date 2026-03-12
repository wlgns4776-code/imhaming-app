import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music } from 'lucide-react';

const LyricsModal = ({ isOpen, onClose, song }) => {
  if (!isOpen || !song) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="absolute inset-0 bg-black/60 backdrop-blur-sm"
           onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-2xl bg-[#1a1a1a] text-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-800 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Music size={20} className="text-blue-500" /> {song.title}
              </h2>
              <p className="text-gray-400 text-sm mt-1">{song.artist}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto custom-scrollbar leading-relaxed text-lg whitespace-pre-wrap text-gray-200">
             {song.lyrics || "가사가 등록되지 않았습니다."}
          </div>
          
          {/* Footer (Optional tags) */}
           {song.tags && song.tags.length > 0 && (
            <div className="p-4 border-t border-gray-800 text-sm text-gray-500 flex gap-2 flex-wrap bg-[#1a1a1a]">
                {song.tags.map(tag => <span key={tag}>#{tag}</span>)}
            </div>
           )}

        </motion.div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #2d2d2d;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #777;
        }
      `}</style>
    </AnimatePresence>
  );
};

export default LyricsModal;
