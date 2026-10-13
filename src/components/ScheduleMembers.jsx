import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, LoaderCircle, Pencil, Plus, Search, X } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { searchSoopMembers } from '../api/soopMemberSearch';
import { normalizeScheduleMembers, soopProfileImageUrl, soopStationUrl } from '../utils/soopProfiles';
import './scheduleMembers.css';

function MemberAvatar({ member }) {
  const imageUrl = member.profileImage || soopProfileImageUrl(member.userId);
  const [failedUrl, setFailedUrl] = useState('');
  return (
    <span className="schedule-member-avatar" aria-hidden="true">
      {imageUrl && failedUrl !== imageUrl
        ? <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(imageUrl)} />
        : <span>{(member.nickname || member.userId).slice(0, 1)}</span>}
    </span>
  );
}

export function ScheduleMembersEditor({ members, library, onChange, onMemberSaved, onBusyChange, disabled }) {
  const [input, setInput] = useState('');
  const [candidate, setCandidate] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [resultPage, setResultPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(null);
  const activeRef = useRef(true);
  const busy = disabled || isSearching || isAdding;
  const selectedIds = new Set(members.map((member) => member.userId));
  const filteredLibrary = library.filter((member) => `${member.nickname} ${member.userId}`.toLowerCase().includes(libraryQuery.trim().toLowerCase()));

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    onBusyChange(isSearching || isAdding);
    return () => onBusyChange(false);
  }, [isSearching, isAdding, onBusyChange]);

  async function searchProfile(loadMore = false) {
    if (busy) return;
    setError('');
    if (!loadMore) {
      setCandidate(null);
      setSearchResults([]);
      setHasSearched(false);
      setHasMore(false);
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setIsSearching(true);
    try {
      const result = await searchSoopMembers(input, loadMore ? resultPage + 1 : 1, controller.signal);
      if (!controller.signal.aborted && activeRef.current) {
        setSearchResults((current) => normalizeScheduleMembers(loadMore ? [...current, ...result.members] : result.members));
        setResultPage(result.page);
        setHasMore(result.hasMore);
        setHasSearched(true);
        if (!loadMore && result.members.length === 1 && !result.hasMore) setCandidate(result.members[0]);
      }
    } catch (lookupError) {
      if (!controller.signal.aborted && activeRef.current) {
        setError(lookupError.name === 'AbortError' ? '조회 시간이 초과됐습니다. 다시 시도해 주세요.' : lookupError.message);
      }
    } finally {
      if (activeRef.current) setIsSearching(false);
    }
  }

  async function addCandidate() {
    if (busy || !candidate?.nickname.trim() || selectedIds.has(candidate.userId)) return;
    setIsAdding(true);
    setError('');
    try {
      const payload = { ...candidate, nickname: candidate.nickname.trim() };
      const existing = await base44.entities.ScheduleMember.filter({ userId: candidate.userId });
      const saved = existing[0]
        ? await base44.entities.ScheduleMember.update(existing[0].id, payload)
        : await base44.entities.ScheduleMember.create(payload);
      onMemberSaved(saved);
      if (!activeRef.current) return;
      onChange(normalizeScheduleMembers([...members, payload]));
      setCandidate(null);
      setInput('');
      setSearchResults([]);
      setHasSearched(false);
      setHasMore(false);
    } catch (saveError) {
      console.error('Failed to save schedule member:', saveError);
      if (activeRef.current) setError('멤버를 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (activeRef.current) setIsAdding(false);
    }
  }

  function toggleMember(member) {
    onChange(selectedIds.has(member.userId)
      ? members.filter((item) => item.userId !== member.userId)
      : normalizeScheduleMembers([...members, member]));
  }

  return (
    <fieldset className="schedule-members-editor" disabled={busy}>
      <legend>참여 멤버</legend>
      <div className="schedule-member-search">
        <input
          value={input}
          onChange={(event) => { setInput(event.target.value); setCandidate(null); setSearchResults([]); setHasSearched(false); setHasMore(false); setError(''); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); void searchProfile(); }
          }}
          placeholder="닉네임, SOOP ID 또는 방송국 주소"
          aria-label="참여 멤버 검색"
          maxLength={200}
        />
        <button type="button" className="schedule-member-icon" onClick={() => void searchProfile()} title="멤버 검색" aria-label="멤버 검색" disabled={!input.trim() || busy}>
          {isSearching ? <LoaderCircle size={18} className="schedule-member-spinner" /> : <Search size={18} />}
        </button>
      </div>
      {searchResults.length && !candidate ? (
        <div className="schedule-member-results">
          <ul aria-label="멤버 검색 결과">
            {searchResults.map((member) => (
              <li key={member.userId}>
                <button type="button" onClick={() => setCandidate(member)} aria-label={`${member.nickname} (${member.userId}) 선택`} disabled={selectedIds.has(member.userId)}>
                  <MemberAvatar member={member} />
                  <span><strong>{member.nickname}</strong><small>{member.userId}</small></span>
                  {selectedIds.has(member.userId) ? <Check size={16} /> : <ChevronRight size={16} />}
                </button>
              </li>
            ))}
          </ul>
          {hasMore ? <button type="button" className="schedule-member-more" onClick={() => void searchProfile(true)}><ChevronDown size={16} />더 보기</button> : null}
        </div>
      ) : null}
      {candidate ? (
        <div className="schedule-member-candidate">
          <MemberAvatar member={candidate} />
          <label>닉네임<input value={candidate.nickname} maxLength={60} onChange={(event) => setCandidate({ ...candidate, nickname: event.target.value })} /></label>
          <button type="button" className="schedule-member-icon" onClick={() => void addCandidate()} title="멤버 추가" aria-label="멤버 추가" disabled={busy || !candidate.nickname.trim() || selectedIds.has(candidate.userId)}>
            {isAdding ? <LoaderCircle size={18} className="schedule-member-spinner" /> : selectedIds.has(candidate.userId) ? <Check size={18} /> : <Plus size={18} />}
          </button>
        </div>
      ) : null}
      {hasSearched && !searchResults.length && !candidate && !error ? <p className="schedule-members-empty" role="status">검색 결과가 없습니다.</p> : null}
      {error ? <p className="edit-error" role="alert">{error}</p> : null}
      {members.length ? (
        <ul className="schedule-member-selected">
          {members.map((member) => (
            <li key={member.userId}>
              <MemberAvatar member={member} />
              <span>{member.nickname}</span>
              <button type="button" onClick={() => toggleMember(member)} title={`${member.nickname} 제외`} aria-label={`${member.nickname} 제외`}><X size={14} /></button>
            </li>
          ))}
        </ul>
      ) : null}
      {library.length ? (
        <details className="schedule-member-library">
          <summary>저장된 멤버 ({library.length})</summary>
          <input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="닉네임 또는 SOOP ID 검색" aria-label="저장된 멤버 검색" onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }} />
          <div className="schedule-members-grid">
            {filteredLibrary.map((member) => (
              <button type="button" className="schedule-member" key={member.userId} onClick={() => toggleMember(member)} aria-pressed={selectedIds.has(member.userId)}>
                <MemberAvatar member={member} />
                <span>{member.nickname}</span>
                {selectedIds.has(member.userId) ? <Check className="schedule-member-check" size={16} /> : null}
              </button>
            ))}
            {!filteredLibrary.length ? <p className="schedule-members-empty">검색 결과가 없습니다.</p> : null}
          </div>
        </details>
      ) : null}
    </fieldset>
  );
}

export function ScheduleDetailDialog({ event, timeLabel, onClose, onEdit }) {
  const dialogRef = useRef(null);
  const dateLabel = new Date(`${event.date}T12:00:00`).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      className="schedule-detail-modal"
      ref={dialogRef}
      aria-labelledby="schedule-detail-title"
      onCancel={(cancelEvent) => { cancelEvent.preventDefault(); onClose(); }}
      onClick={(clickEvent) => {
        if (clickEvent.target !== dialogRef.current) return;
        const rect = dialogRef.current.getBoundingClientRect();
        if (clickEvent.clientX < rect.left || clickEvent.clientX > rect.right || clickEvent.clientY < rect.top || clickEvent.clientY > rect.bottom) onClose();
      }}
    >
      <header className="schedule-detail-head" style={{ '--schedule-color': event.color }}>
        <div><p>{dateLabel} · {timeLabel}</p><h2 id="schedule-detail-title">{event.title}</h2></div>
        <div className="schedule-detail-tools">
          {onEdit ? <button type="button" onClick={onEdit} title="일정 수정" aria-label="일정 수정"><Pencil size={18} /></button> : null}
          <button type="button" onClick={onClose} title="닫기" aria-label="닫기" autoFocus><X size={20} /></button>
        </div>
      </header>
      {event.location ? <p className="schedule-detail-memo">{event.location}</p> : null}
      {event.members.length ? (
        <section className="schedule-detail-members">
          <h3>참여 멤버 <span>{event.members.length}</span></h3>
          <div className="schedule-members-grid">
            {event.members.map((member) => (
              <a className="schedule-member" key={member.userId} href={soopStationUrl(member.userId)} target="_blank" rel="noopener noreferrer" aria-label={`${member.nickname} 방송국`}>
                <MemberAvatar member={member} />
                <span>{member.nickname}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </dialog>
  );
}
