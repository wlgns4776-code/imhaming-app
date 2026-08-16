import React, { useEffect, useState } from 'react';
import { CheckCircle, Download, Menu, Minus, Monitor, RefreshCw, Smartphone, Tablet, X } from 'lucide-react';

const APP_NAME = '임하밍 아카이브';
const APP_ICON_SRC = new URL('app-icon.png', window.location.href).toString();

export default function DesktopShell({ children }) {
  const [isElectron, setIsElectron] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [version, setVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!window.electronAPI) return;

    setIsElectron(true);
    document.body.classList.add('desktop-shell-active');

    window.electronAPI.getAppVersion?.().then((appVersion) => {
      if (appVersion) setVersion(appVersion);
    }).catch(() => {});

    window.electronAPI.onCheckingForUpdate?.(() => setUpdateStatus('checking'));
    window.electronAPI.onUpdateAvailable?.(() => setUpdateStatus('available'));
    window.electronAPI.onUpdateNotAvailable?.(() => {
      setUpdateStatus('current');
      window.setTimeout(() => setUpdateStatus((status) => (status === 'current' ? null : status)), 3500);
    });
    window.electronAPI.onUpdateProgress?.((progressInfo) => {
      setUpdateStatus('downloading');
      setProgress(progressInfo?.percent ? Math.round(progressInfo.percent) : 0);
    });
    window.electronAPI.onUpdateDownloaded?.(() => setUpdateStatus('downloaded'));
    window.electronAPI.onUpdateError?.((message) => {
      console.error('Update error:', message);
      setUpdateStatus('error');
    });

    return () => {
      document.body.classList.remove('desktop-shell-active');
    };
  }, []);

  function changeOpacity(nextOpacity) {
    setOpacity(nextOpacity);
    window.electronAPI?.setOpacity(nextOpacity);
  }

  function changeSize(width, height) {
    window.electronAPI?.setSize({ width, height });
    setIsMenuOpen(false);
  }

  function checkForUpdates() {
    setUpdateStatus('checking');
    window.electronAPI?.checkForUpdates();
    setIsMenuOpen(false);
  }

  if (!isElectron) return children;

  return (
    <>
      <header className="desktop-titlebar">
        <div className="desktop-drag-region">
          <img className="desktop-app-icon" src={APP_ICON_SRC} alt="" />
          <span className="desktop-app-name">{APP_NAME}</span>
          <UpdateIndicator status={updateStatus} progress={progress} />
        </div>
        <div className="desktop-window-controls">
          <button type="button" onClick={() => setIsMenuOpen((open) => !open)} aria-label="메뉴 열기">
            <Menu size={18} />
          </button>
          <button type="button" onClick={() => window.electronAPI?.minimizeApp()} aria-label="최소화">
            <Minus size={18} />
          </button>
          <button type="button" className="close" onClick={() => window.electronAPI?.closeApp()} aria-label="닫기">
            <X size={18} />
          </button>
        </div>
      </header>

      {isMenuOpen ? (
        <>
          <button className="desktop-menu-backdrop" type="button" aria-label="메뉴 닫기" onClick={() => setIsMenuOpen(false)} />
          <aside className="desktop-settings">
            <strong>{APP_NAME}{version ? ` v${version}` : ''}</strong>
            <label className="desktop-range">
              <span><b>투명도</b><b>{Math.round(opacity * 100)}%</b></span>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(event) => changeOpacity(Number(event.target.value))}
              />
            </label>
            <div className="desktop-size-grid">
              <button type="button" onClick={() => changeSize(420, 640)}><Smartphone size={15} />작게</button>
              <button type="button" onClick={() => changeSize(900, 680)}><Tablet size={15} />보통</button>
              <button type="button" onClick={() => changeSize(1280, 820)}><Monitor size={15} />크게</button>
            </div>
            <button className="desktop-edit-toggle" type="button" onClick={checkForUpdates}>
              <RefreshCw size={15} />업데이트 확인
            </button>
          </aside>
        </>
      ) : null}

      {children}
    </>
  );
}

function UpdateIndicator({ status, progress }) {
  if (!status) return null;

  if (status === 'downloaded') {
    return (
      <button className="desktop-update-button" type="button" onClick={() => window.electronAPI?.quitAndInstall()}>
        <RefreshCw size={14} />재시작해서 업데이트
      </button>
    );
  }

  const messageByStatus = {
    checking: '업데이트 확인 중',
    available: '업데이트 발견',
    downloading: `업데이트 다운로드 ${progress}%`,
    current: '최신 버전',
    error: '업데이트 확인 실패',
  };

  const Icon = status === 'current' ? CheckCircle : status === 'downloading' ? Download : RefreshCw;

  return (
    <span className="desktop-update-pill">
      <Icon size={14} className={status === 'checking' || status === 'available' ? 'spin' : ''} />
      {messageByStatus[status]}
    </span>
  );
}
