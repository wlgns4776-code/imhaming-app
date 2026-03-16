import React, { useState, useEffect } from 'react';
import { Menu, X, Minus, Monitor, Smartphone, Tablet, Download, RefreshCw } from 'lucide-react';

const TitleBar = ({ isEditing, setIsEditing }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [isElectron, setIsElectron] = useState(false);

  // Auto Updater State
  const [updateStatus, setUpdateStatus] = useState(null); // 'available', 'downloading', 'downloaded'
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check if running in Electron
    if (window.electronAPI) {
      setIsElectron(true);
      
      // Auto updater listeners
      window.electronAPI.onUpdateAvailable(() => setUpdateStatus('available'));
      window.electronAPI.onUpdateProgress((progObj) => {
        setUpdateStatus('downloading');
        setProgress(Math.round(progObj.percent));
      });
      window.electronAPI.onUpdateDownloaded(() => setUpdateStatus('downloaded'));
    }
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeApp();
  };

  const handleClose = () => {
    window.electronAPI?.closeApp();
  };

  const handleOpacityChange = (e) => {
    const newOpacity = parseFloat(e.target.value);
    setOpacity(newOpacity);
    window.electronAPI?.setOpacity(newOpacity);
  };

  const handleSizeChange = (width, height) => {
    window.electronAPI?.setSize({ width, height });
    setIsMenuOpen(false);
  };

  if (!isElectron) return null; // Don't show in web browser

  return (
    <>
      <div className="h-10 bg-white/80 backdrop-blur-md flex items-center justify-between px-2 select-none z-[10000] fixed top-0 left-0 right-0 border-b border-gray-200/50 input-drag titlebar">
        {/* Left: Drag Region (Spacer & Updater UI) */}
        <div className="flex-1 h-full titlebar-drag-region flex items-center px-4">
          {updateStatus === 'downloading' && (
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white/50 px-3 py-1 rounded-full border border-white/40">
              <Download size={14} className="animate-bounce" />
              업데이트 다운로드 중... {progress}%
            </div>
          )}
          {updateStatus === 'downloaded' && (
            <button 
              onClick={() => window.electronAPI.quitAndInstall()}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-full shadow-sm transition-all no-drag z-50"
            >
              <RefreshCw size={14} />
              재시작하여 업데이트 적용
            </button>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 no-drag ml-auto">
          {/* Settings Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 hover:bg-black/10 rounded transition-colors text-gray-600"
          >
            <Menu size={18} />
          </button>

          {/* Window Controls */}
          <button onClick={handleMinimize} className="p-1 hover:bg-black/10 rounded transition-colors text-gray-600">
            <Minus size={18} />
          </button>
          <button onClick={handleClose} className="p-1 hover:bg-red-500 hover:text-white rounded transition-colors text-gray-600">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Settings Dropdown/Modal */}
      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsMenuOpen(false)} 
          />
          <div className="fixed top-12 right-2 width-64 bg-white/90 backdrop-blur-xl shadow-2xl rounded-xl p-4 z-[9999] border border-white/20 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Settings</h3>
            
            {/* Creates a gap */}
            <div className="space-y-4">
              
              {/* Opacity Control */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block flex justify-between">
                  <span>투명도 (Opacity)</span>
                  <span>{Math.round(opacity * 100)}%</span>
                </label>
                <input 
                  type="range" 
                  min="0.2" 
                  max="1" 
                  step="0.05"
                  value={opacity}
                  onChange={handleOpacityChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>

              {/* Size Control */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">창 크기 (Window Size)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleSizeChange(400, 600)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-gray-600 hover:text-black hover:border-black/20"
                  >
                    <Smartphone size={16} className="mb-1" />
                    <span className="text-[10px]">Small</span>
                  </button>
                  <button 
                    onClick={() => handleSizeChange(800, 600)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-gray-600 hover:text-black hover:border-black/20"
                  >
                    <Tablet size={16} className="mb-1" />
                    <span className="text-[10px]">Medium</span>
                  </button>
                  <button 
                    onClick={() => handleSizeChange(1200, 800)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-gray-600 hover:text-black hover:border-black/20"
                  >
                    <Monitor size={16} className="mb-1" />
                    <span className="text-[10px]">Large</span>
                  </button>
                </div>
              </div>

              {/* Layout Edit Toggle */}
              <div className="pt-2 border-t border-gray-100">
                <button 
                  onClick={() => {
                    setIsEditing(!isEditing);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                    isEditing 
                      ? 'bg-yellow-400 text-black shadow-md hover:bg-yellow-500' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isEditing ? '편집 종료 (Finish Editing)' : '크기/위치 편집 (Edit Layout)'}
                </button>
              </div>

            </div>
          </div>
        </>
      )}
    </>
  );
};

export default TitleBar;
