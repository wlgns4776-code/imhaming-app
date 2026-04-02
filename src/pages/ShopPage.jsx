import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Clock, Paintbrush, CheckCircle2, Package, Plus, Trash2, Edit3, X, Save } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { base44 } from '../api/base44Client';
import GlobalHeader from '../components/GlobalHeader';

/* ─── 그라데이션 프리셋 (카드 색상 선택용) ─── */
const COLOR_PRESETS = [
  { label: '핑크',   from: 'from-pink-400',   to: 'to-rose-500',   shadow: 'shadow-pink-200/60' },
  { label: '보라',   from: 'from-violet-400', to: 'to-purple-500', shadow: 'shadow-violet-200/60' },
  { label: '파랑',   from: 'from-blue-400',   to: 'to-indigo-500', shadow: 'shadow-blue-200/60' },
  { label: '주황',   from: 'from-amber-400',  to: 'to-orange-500', shadow: 'shadow-amber-200/60' },
  { label: '노랑',   from: 'from-yellow-400', to: 'to-amber-500',  shadow: 'shadow-yellow-200/60' },
  { label: '초록',   from: 'from-emerald-400',to: 'to-green-500',  shadow: 'shadow-emerald-200/60' },
  { label: '청록',   from: 'from-cyan-400',   to: 'to-teal-500',   shadow: 'shadow-cyan-200/60' },
];

/* ─── 칸반 상태 ─── */
const KANBAN_COLUMNS = [
  { key: 'waiting', label: '대기중', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
  { key: 'working', label: '작업중', icon: Paintbrush, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400' },
  { key: 'done', label: '배송완료', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-400' },
];

const STATUS_LABELS = { waiting: '대기중', working: '작업중', done: '배송완료' };

/* ═════════════ 교환비 카드 ═════════════ */
const ExchangeCard = ({ rate, index, isAdmin, onEdit, onDelete }) => {
  const colorClass = `${rate.colorFrom || 'from-gray-400'} ${rate.colorTo || 'to-gray-500'}`;
  const preset = COLOR_PRESETS.find(p => p.from === rate.colorFrom) || COLOR_PRESETS[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={clsx('relative group rounded-2xl p-[1px] overflow-hidden', rate.popular && 'ring-2 ring-blue-400/40 ring-offset-2 ring-offset-gray-50/60')}
    >
      <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none', colorClass)} />
      <div className="relative bg-white rounded-[15px] p-5 flex flex-col items-center gap-3 h-full">
        {rate.popular && <span className="absolute -top-0.5 right-3 bg-blue-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-b-lg tracking-wide">BEST</span>}
        {isAdmin && (
          <div className="absolute top-1.5 left-1.5 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onEdit(rate); }} className="w-7 h-7 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center hover:bg-blue-200 shadow-sm"><Edit3 size={11} /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(rate.id); }} className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 shadow-sm"><Trash2 size={11} /></button>
          </div>
        )}
        <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br shadow-lg', colorClass, preset.shadow)}>
          <span className="drop-shadow-sm">{rate.emoji || '🎁'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-black text-gray-800">{rate.pieces}</span>
          <span className="text-sm font-semibold text-gray-400">조각</span>
        </div>
        <ArrowRight size={14} className="text-gray-300" />
        <p className="text-sm font-bold text-gray-700 text-center leading-snug">{rate.reward}</p>
      </div>
    </motion.div>
  );
};

/* ═════════════ 칸반 주문 카드 ═════════════ */
const OrderCard = ({ order, colDef, isAdmin, onStatusCycle, onDelete }) => {
  const isDone = order.status === 'done';
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={clsx('bg-white rounded-xl p-4 border shadow-sm transition-all hover:shadow-md group', isDone ? 'border-gray-100 opacity-70' : 'border-gray-100/80')}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={clsx('font-bold text-sm', isDone ? 'text-gray-400 line-through' : 'text-gray-800')}>{order.nickname}</span>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button onClick={() => onStatusCycle(order)} className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer hover:shadow-sm active:scale-95 transition-all', colDef.bg, colDef.color, colDef.border)}>
              {colDef.label} ↻
            </button>
          )}
          {!isAdmin && (
            <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border', colDef.bg, colDef.color, colDef.border)}>{colDef.label}</span>
          )}
        </div>
      </div>
      <p className={clsx('text-xs mb-2', isDone ? 'text-gray-300 line-through' : 'text-gray-500')}>👗 {order.costume}</p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400 font-medium">{order.type}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-orange-400">{order.pieces}조각</span>
          {isAdmin && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} className="text-red-300 hover:text-red-500 transition-colors">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ═════════════ 메인 페이지 ═════════════ */
const ShopPage = () => {
  const { isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState('kanban');
  const [loading, setLoading] = useState(true);

  /* ── 교환비 ── */
  const [rates, setRates] = useState([]);
  const [showRateForm, setShowRateForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [rateForm, setRateForm] = useState({ pieces: '', reward: '', emoji: '🎁', colorIdx: 0, popular: false, sortOrder: 0 });

  /* ── 주문 ── */
  const [orders, setOrders] = useState([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({ nickname: '', costume: '', type: '', pieces: '', status: 'waiting' });

  const sortedRates = useMemo(() => [...rates].sort((a, b) => (a.sortOrder || a.pieces) - (b.sortOrder || b.pieces)), [rates]);

  /* ── 데이터 로드 ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rateItems, orderItems] = await Promise.all([
          base44.entities.ShopExchangeRate.list(),
          base44.entities.ShopOrder.list(),
        ]);
        setRates(rateItems || []);
        setOrders(orderItems || []);
      } catch (e) {
        console.error('Failed to fetch shop data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  /* ── 교환비 CRUD ── */
  const openRateForm = (rate = null) => {
    if (rate) {
      const cIdx = COLOR_PRESETS.findIndex(p => p.from === rate.colorFrom);
      setRateForm({ pieces: rate.pieces, reward: rate.reward, emoji: rate.emoji || '🎁', colorIdx: cIdx >= 0 ? cIdx : 0, popular: rate.popular || false, sortOrder: rate.sortOrder || rate.pieces });
      setEditingRate(rate);
    } else {
      setRateForm({ pieces: '', reward: '', emoji: '🎁', colorIdx: 0, popular: false, sortOrder: rates.length });
      setEditingRate(null);
    }
    setShowRateForm(true);
  };

  const saveRate = async (e) => {
    e.preventDefault();
    const preset = COLOR_PRESETS[rateForm.colorIdx];
    const data = {
      pieces: Number(rateForm.pieces),
      reward: rateForm.reward,
      emoji: rateForm.emoji,
      colorFrom: preset.from,
      colorTo: preset.to,
      popular: rateForm.popular,
      sortOrder: Number(rateForm.sortOrder) || Number(rateForm.pieces),
    };
    try {
      if (editingRate) {
        await base44.entities.ShopExchangeRate.update(editingRate.id, data);
        setRates(prev => prev.map(r => r.id === editingRate.id ? { ...r, ...data } : r));
      } else {
        const created = await base44.entities.ShopExchangeRate.create(data);
        setRates(prev => [...prev, created]);
      }
      setShowRateForm(false);
    } catch (err) {
      console.error('Failed to save rate:', err);
    }
  };

  const deleteRate = async (id) => {
    if (!window.confirm('이 교환비를 삭제하시겠습니까?')) return;
    try {
      await base44.entities.ShopExchangeRate.delete(id);
      setRates(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete rate:', err);
    }
  };

  /* ── 주문 CRUD ── */
  const saveOrder = async (e) => {
    e.preventDefault();
    const data = { ...orderForm, pieces: Number(orderForm.pieces) };
    try {
      const created = await base44.entities.ShopOrder.create(data);
      setOrders(prev => [...prev, created]);
      setOrderForm({ nickname: '', costume: '', type: '', pieces: '', status: 'waiting' });
      setShowOrderForm(false);
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  const deleteOrder = async (id) => {
    try {
      await base44.entities.ShopOrder.delete(id);
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  const cycleOrderStatus = async (order) => {
    const seq = ['waiting', 'working', 'done'];
    const nextStatus = seq[(seq.indexOf(order.status) + 1) % seq.length];
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
    try {
      await base44.entities.ShopOrder.update(order.id, { status: nextStatus });
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="h-full flex flex-col pb-20">
      <GlobalHeader title="🎁 교환소" />

      {/* ═══ 상단: 교환비 안내판 ═══ */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg shadow-orange-200/50 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-800">조각 교환 메뉴판</h2>
              <p className="text-xs text-gray-400">룰렛 조각을 모아 방셀로 교환하세요!</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => openRateForm()} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 shadow-sm transition-colors flex items-center gap-1">
              <Plus size={16} /> 메뉴 추가
            </button>
          )}
        </div>

        {/* 교환비 추가/수정 폼 */}
        <AnimatePresence>
          {showRateForm && (
            <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              onSubmit={saveRate} className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-blue-100/60 mb-5 overflow-hidden"
            >
              <h3 className="text-sm font-extrabold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center"><Plus size={12} /></span>
                {editingRate ? '교환 메뉴 수정' : '새 교환 메뉴 등록'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">조각 수 *</label>
                  <input type="number" placeholder="예: 4" value={rateForm.pieces} onChange={e => setRateForm(p => ({ ...p, pieces: e.target.value }))} className="input-field" required autoFocus />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">보상 *</label>
                  <input placeholder="예: 얼빡 방셀 1장" value={rateForm.reward} onChange={e => setRateForm(p => ({ ...p, reward: e.target.value }))} className="input-field" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">이모지</label>
                  <input placeholder="예: 📸" value={rateForm.emoji} onChange={e => setRateForm(p => ({ ...p, emoji: e.target.value }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">정렬 순서</label>
                  <input type="number" placeholder="자동" value={rateForm.sortOrder} onChange={e => setRateForm(p => ({ ...p, sortOrder: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl flex-wrap">
                <span className="text-xs font-bold text-gray-500">카드 색상</span>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((p, i) => (
                    <button key={i} type="button" onClick={() => setRateForm(prev => ({ ...prev, colorIdx: i }))}
                      className={clsx('w-8 h-8 rounded-full bg-gradient-to-br border-2 transition-all hover:scale-105', p.from, p.to, rateForm.colorIdx === i ? 'border-gray-800 scale-110 shadow-md' : 'border-white shadow-sm')}
                    />
                  ))}
                </div>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer select-none">
                  <input type="checkbox" checked={rateForm.popular} onChange={e => setRateForm(p => ({ ...p, popular: e.target.checked }))} className="rounded border-gray-300" />
                  ⭐ BEST 표시
                </label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors"><Save size={14} /> {editingRate ? '수정 완료' : '등록하기'}</button>
                <button type="button" onClick={() => setShowRateForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">취소</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* 카드 그리드 */}
        {sortedRates.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {sortedRates.map((rate, i) => (
              <ExchangeCard key={rate.id} rate={rate} index={i} isAdmin={isAdmin} onEdit={openRateForm} onDelete={deleteRate} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white/40 rounded-2xl border border-dashed border-gray-200 text-gray-400">
            <p className="text-sm">{loading ? '불러오는 중...' : '등록된 교환 메뉴가 없습니다.'}</p>
            {isAdmin && !loading && <p className="text-xs mt-1">상단 '메뉴 추가' 버튼으로 등록하세요.</p>}
          </div>
        )}
      </section>

      {/* ═══ 하단: 진행 현황판 ═══ */}
      <section className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg shadow-blue-200/50 flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-800">진행 현황판</h2>
              <p className="text-xs text-gray-400">확정권 신청 및 작업 진행 상태를 확인하세요</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => setShowOrderForm(true)} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 shadow-sm transition-colors flex items-center gap-1">
                <Plus size={16} /> 주문 추가
              </button>
            )}
            <div className="flex bg-white rounded-xl p-1 border border-gray-100/80 shadow-sm">
              <button onClick={() => setViewMode('kanban')} className={clsx('px-3 py-1.5 rounded-lg text-xs font-bold transition-all', viewMode === 'kanban' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>칸반</button>
              <button onClick={() => setViewMode('list')} className={clsx('px-3 py-1.5 rounded-lg text-xs font-bold transition-all', viewMode === 'list' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>리스트</button>
            </div>
          </div>
        </div>

        {/* 주문 추가 폼 */}
        <AnimatePresence>
          {showOrderForm && (
            <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              onSubmit={saveOrder} className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-blue-100/60 mb-5 overflow-hidden"
            >
              <h3 className="text-sm font-extrabold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center"><Plus size={12} /></span>
                새 주문 등록
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">닉네임 *</label>
                  <input placeholder="시청자 닉네임" value={orderForm.nickname} onChange={e => setOrderForm(p => ({ ...p, nickname: e.target.value }))} className="input-field" required autoFocus />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">의상 / 옵션 *</label>
                  <input placeholder="요청 의상 또는 옵션" value={orderForm.costume} onChange={e => setOrderForm(p => ({ ...p, costume: e.target.value }))} className="input-field" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">교환 유형 *</label>
                  <input placeholder="예: 코스튬 방셀" value={orderForm.type} onChange={e => setOrderForm(p => ({ ...p, type: e.target.value }))} className="input-field" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">사용 조각 수 *</label>
                  <input type="number" placeholder="예: 7" value={orderForm.pieces} onChange={e => setOrderForm(p => ({ ...p, pieces: e.target.value }))} className="input-field" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 ml-1">진행 상태</label>
                  <select value={orderForm.status} onChange={e => setOrderForm(p => ({ ...p, status: e.target.value }))} className="input-field">
                    <option value="waiting">⏳ 대기중</option>
                    <option value="working">🎨 작업중</option>
                    <option value="done">✅ 배송완료</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors"><Save size={14} /> 등록하기</button>
                <button type="button" onClick={() => setShowOrderForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">취소</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {viewMode === 'kanban' ? (
            <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1"
            >
              {KANBAN_COLUMNS.map(col => {
                const Icon = col.icon;
                const colOrders = orders.filter(o => o.status === col.key);
                return (
                  <div key={col.key} className={clsx('rounded-2xl border p-4 flex flex-col', col.bg, col.border, 'bg-opacity-40')}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={clsx('w-2 h-2 rounded-full', col.dot)} />
                      <Icon size={14} className={col.color} />
                      <span className={clsx('text-sm font-bold', col.color)}>{col.label}</span>
                      <span className="ml-auto text-xs font-bold text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">{colOrders.length}</span>
                    </div>
                    <div className="flex flex-col gap-2.5 flex-1">
                      {colOrders.map(order => (
                        <OrderCard key={order.id} order={order} colDef={col} isAdmin={isAdmin} onStatusCycle={cycleOrderStatus} onDelete={deleteOrder} />
                      ))}
                      {colOrders.length === 0 && <div className="text-center py-8 text-gray-300 text-xs">항목 없음</div>}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/40 shadow-sm overflow-hidden flex-1"
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-orange-100/50 border-b border-orange-200/50">
                    <th className="p-4 font-bold text-gray-700 w-12">#</th>
                    <th className="p-4 font-bold text-gray-700">닉네임</th>
                    <th className="p-4 font-bold text-gray-700">교환 유형</th>
                    <th className="p-4 font-bold text-gray-700">신청 의상</th>
                    <th className="p-4 font-bold text-gray-700 text-center">조각</th>
                    <th className="p-4 font-bold text-gray-700 text-center">상태</th>
                    {isAdmin && <th className="p-4 w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => {
                    const colDef = KANBAN_COLUMNS.find(c => c.key === order.status) || KANBAN_COLUMNS[0];
                    const isDone = order.status === 'done';
                    return (
                      <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                        className={clsx('border-b border-gray-100/50 last:border-0 transition-colors', isDone ? 'bg-gray-50/80' : 'hover:bg-white/40')}
                      >
                        <td className={clsx('p-4 text-sm', isDone ? 'text-gray-300' : 'text-gray-400')}>{idx + 1}</td>
                        <td className={clsx('p-4 font-medium', isDone ? 'line-through text-gray-400' : 'text-gray-900')}>{order.nickname}</td>
                        <td className={clsx('p-4 text-sm', isDone ? 'text-gray-400' : 'text-gray-600')}>{order.type}</td>
                        <td className={clsx('p-4 text-sm', isDone ? 'line-through text-gray-400' : 'text-gray-600')}>👗 {order.costume}</td>
                        <td className="p-4 text-center"><span className="font-bold text-orange-400 text-sm">{order.pieces}</span></td>
                        <td className="p-4 text-center">
                          <button onClick={() => isAdmin && cycleOrderStatus(order)} disabled={!isAdmin}
                            className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all', colDef.bg, colDef.color, colDef.border, isAdmin && 'cursor-pointer hover:shadow-sm active:scale-95')}
                          >
                            <span className={clsx('w-1.5 h-1.5 rounded-full', colDef.dot)} />
                            {colDef.label}{isAdmin && ' ↻'}
                          </button>
                        </td>
                        {isAdmin && (
                          <td className="p-4 text-right">
                            <button onClick={() => deleteOrder(order.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr><td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-gray-400 text-sm">{loading ? '불러오는 중...' : '등록된 주문이 없습니다.'}</td></tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};

export default ShopPage;
