import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, Star, ChevronLeft, ChevronRight, X, Sparkles, Eye } from 'lucide-react';
import clsx from 'clsx';
import outfitsData from '../data/outfits.json';

/* ─── 태그 파싱 유틸 ─── */
const parseTags = (desc) => {
  if (!desc) return [];
  return desc.split('|').map(s => s.trim()).filter(Boolean);
};

/* ─── 태그 색상 매핑 ─── */
const tagStyle = (tag) => {
  if (tag.includes('구매 가능')) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  if (tag.includes('구매 불가')) return 'bg-red-50 text-red-500 border-red-200';
  if (tag.includes('교차 선택 가능')) return 'bg-blue-50 text-blue-500 border-blue-200';
  if (tag.includes('교차 선택 불가')) return 'bg-amber-50 text-amber-600 border-amber-200';
  if (tag.includes('전용')) return 'bg-violet-50 text-violet-600 border-violet-200';
  if (tag.includes('판매')) return 'bg-gray-50 text-gray-500 border-gray-200';
  return 'bg-orange-50 text-orange-600 border-orange-200';
};

/* ─── 카테고리 필터 ─── */
const FILTERS = [
  { key: 'all', label: '전체', emoji: '✨' },
  { key: 'outfit', label: '의상', emoji: '👗' },
  { key: 'hair', label: '헤어', emoji: '💇' },
];

/* ═══════════ 이미지 캐러셀 모달 ═══════════ */
const ImageModal = ({ outfit, onClose }) => {
  const [current, setCurrent] = useState(0);
  const imgs = outfit.images;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden"
      >
        {/* 닫기 */}
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors">
          <X size={16} />
        </button>

        {/* 이미지 영역 */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-indigo-100 to-violet-50 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.img
              key={current}
              src={imgs[current]}
              alt={outfit.title}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="max-h-full max-w-full object-contain p-6"
            />
          </AnimatePresence>

          {/* 좌우 버튼 */}
          {imgs.length > 1 && (
            <>
              <button
                onClick={() => setCurrent((c) => (c - 1 + imgs.length) % imgs.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrent((c) => (c + 1) % imgs.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* 페이지 인디케이터 */}
          {imgs.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={clsx(
                    'w-2 h-2 rounded-full transition-all',
                    i === current ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/60'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="p-5">
          <h3 className="text-lg font-extrabold text-gray-900 mb-2">{outfit.title}</h3>
          <div className="flex flex-wrap gap-1.5">
            {parseTags(outfit.description).map((tag, i) => (
              <span key={i} className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border', tagStyle(tag))}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ═══════════ 의상 카드 ═══════════ */
const OutfitCard = ({ outfit, index, onClick }) => {
  const tags = parseTags(outfit.description);
  const isHair = outfit.title.includes('헤어');
  const hasMultipleImages = outfit.images.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100/80 transition-all duration-300 hover:-translate-y-1">
        {/* 이미지 */}
        <div className={clsx(
          'relative aspect-square flex items-center justify-center overflow-hidden',
          isHair
            ? 'bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50'
            : 'bg-gradient-to-br from-indigo-50 via-blue-50 to-violet-50'
        )}>
          {outfit.images.length > 0 ? (
            <img
              src={outfit.images[0]}
              alt={outfit.title}
              className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="text-gray-300 flex flex-col items-center gap-1">
              <Shirt size={32} />
              <span className="text-xs">이미지 없음</span>
            </div>
          )}

          {/* 다중 이미지 배지 */}
          {hasMultipleImages && (
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Eye size={10} />
              {outfit.images.length}
            </div>
          )}

          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
              <Eye size={11} /> 자세히 보기
            </span>
          </div>
        </div>

        {/* 텍스트 정보 */}
        <div className="p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">{isHair ? '💇' : '👗'}</span>
            <h3 className="text-sm font-extrabold text-gray-800 truncate">{outfit.title}</h3>
          </div>

          {/* 태그 */}
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded-md border', tagStyle(tag))}>
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[9px] font-bold text-gray-400 px-1">+{tags.length - 3}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ═══════════ 메인 갤러리 ═══════════ */
const OutfitGallery = () => {
  const [filter, setFilter] = useState('all');
  const [selectedOutfit, setSelectedOutfit] = useState(null);

  const filteredOutfits = outfitsData.filter((outfit) => {
    if (filter === 'all') return true;
    if (filter === 'outfit') return outfit.title.includes('의상');
    if (filter === 'hair') return outfit.title.includes('헤어');
    return true;
  });

  return (
    <section className="mt-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 shadow-lg shadow-violet-200/50 flex items-center justify-center">
            <Star size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-800">밍조각 의상 도감</h2>
            <p className="text-xs text-gray-400">밍조각으로 구매할 수 있는 의상 · 헤어 모음</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 font-bold">
          <Sparkles size={12} className="text-violet-400" />
          {outfitsData.length}종
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-5 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 border',
              filter === f.key
                ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-200/50'
                : 'bg-white/60 text-gray-500 border-gray-100/80 hover:bg-white hover:text-gray-700'
            )}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredOutfits.map((outfit, i) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              index={i}
              onClick={() => setSelectedOutfit(outfit)}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredOutfits.length === 0 && (
        <div className="text-center py-16 bg-white/40 rounded-2xl border border-dashed border-gray-200 text-gray-400">
          <Shirt size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">해당 카테고리에 의상이 없습니다.</p>
        </div>
      )}

      {/* 모달 */}
      <AnimatePresence>
        {selectedOutfit && (
          <ImageModal outfit={selectedOutfit} onClose={() => setSelectedOutfit(null)} />
        )}
      </AnimatePresence>
    </section>
  );
};

export default OutfitGallery;
