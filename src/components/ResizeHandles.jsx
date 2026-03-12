import React, { useState, useEffect, useRef } from 'react';

const ResizeHandles = ({ setIsEditing }) => {
  const [bounds, setBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const draggingRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startBoundsRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    // Initial bounds sync
    if (window.electronAPI) {
      window.electronAPI.getBounds();
      window.electronAPI.onGetBoundsReply((newBounds) => {
        setBounds(newBounds);
      });
    }

    const handleMouseMove = (e) => {
      if (!draggingRef.current) return;

      const direction = draggingRef.current;
      const deltaX = e.screenX - startPosRef.current.x;
      const deltaY = e.screenY - startPosRef.current.y;
      
      const newBounds = { ...startBoundsRef.current };

      if (direction.includes('e')) newBounds.width += deltaX;
      if (direction.includes('s')) newBounds.height += deltaY;
      if (direction.includes('w')) {
        newBounds.x += deltaX;
        newBounds.width -= deltaX;
      }
      if (direction.includes('n')) {
        newBounds.y += deltaY;
        newBounds.height -= deltaY;
      }

      // Minimum size constraint
      if (newBounds.width < 300) newBounds.width = 300;
      if (newBounds.height < 400) newBounds.height = 400;

      window.electronAPI?.setBounds(newBounds);
    };

    const handleMouseUp = () => {
      draggingRef.current = null;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDrag = (e, direction) => {
    e.preventDefault();
    draggingRef.current = direction;
    startPosRef.current = { x: e.screenX, y: e.screenY };
    
    // We need current bounds from main process for accurate calculation
    // But since we are pushing updates, we can assume electron's bounds follow our requests.
    // However, to be safe, we should probably get bounds right before drag.
    // For now, let's assume the local state (if we were syncing it) or just Request it.
    // Actually, `e.screenX` is global. 
    // Optimization: Request bounds on mouse down?
    // Let's rely on the fact that we might not have the *exact* bounds in state if we don't poll.
    // But wait, we can't calculate 'newBounds' without 'startBounds'.
    // Problem: `window.electronAPI.getBounds` is async.
    // Workaround: We can't easily wait for async in mousedown to start drag synchronously.
    // Alternative: We can use `window.outerWidth/Height` and `window.screenX/Y` from DOM?
    // Yes! `window.screenX/Y` and `window.outerWidth/Height` are available in Renderer.
    
    startBoundsRef.current = {
      x: window.screenX,
      y: window.screenY,
      width: window.outerWidth,
      height: window.outerHeight
    };
    
    document.body.style.cursor = `${direction}-resize`;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[10001] border-2 border-dashed border-yellow-400">
        {/* Resize Handles - Pointer events auto enabled for them */}
        {/* N */}
        <div onMouseDown={(e) => startDrag(e, 'n')} className="absolute top-0 left-0 right-0 h-2 cursor-n-resize pointer-events-auto hover:bg-yellow-400/50" />
        {/* S */}
        <div onMouseDown={(e) => startDrag(e, 's')} className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize pointer-events-auto hover:bg-yellow-400/50" />
        {/* W */}
        <div onMouseDown={(e) => startDrag(e, 'w')} className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize pointer-events-auto hover:bg-yellow-400/50" />
        {/* E */}
        <div onMouseDown={(e) => startDrag(e, 'e')} className="absolute top-0 bottom-0 right-0 w-2 cursor-e-resize pointer-events-auto hover:bg-yellow-400/50" />
        
        {/* NW */}
        <div onMouseDown={(e) => startDrag(e, 'nw')} className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize pointer-events-auto bg-yellow-400" />
        {/* NE */}
        <div onMouseDown={(e) => startDrag(e, 'ne')} className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize pointer-events-auto bg-yellow-400" />
        {/* SW */}
        <div onMouseDown={(e) => startDrag(e, 'sw')} className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize pointer-events-auto bg-yellow-400" />
        {/* SE */}
        <div onMouseDown={(e) => startDrag(e, 'se')} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize pointer-events-auto bg-yellow-400" />

        {/* Done Button */}
        <button 
            onClick={() => setIsEditing(false)}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-1 rounded-full text-xs font-bold pointer-events-auto shadow-lg hover:bg-yellow-500 transition-colors"
        >
            편집 완료 (Done)
        </button>
    </div>
  );
};

export default ResizeHandles;
