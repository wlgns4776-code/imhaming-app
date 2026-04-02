import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, Star, ChevronLeft, ChevronRight, X, Eye, Plus, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { base44 } from '../api/base44Client';
import GlobalHeader from '../components/GlobalHeader';

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

/* ═══════════ 이미지 캐러셀 모달 ═══════════ */
const ImageModal = ({ outfit, onClose }) => {
  const [current, setCurrent] = useState(0);
  const imgs = outfit.images || [];

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
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors">
          <X size={16} />
        </button>

        <div className="relative aspect-[4/3] bg-gradient-to-br from-indigo-100 to-violet-50 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {imgs.length > 0 ? (
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
            ) : (
                <div className="text-gray-400 p-6 flex flex-col items-center">
                    <Shirt size={48} className="mb-2" />
                    <p>이미지 없음</p>
                </div>
            )}
          </AnimatePresence>

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
const OutfitCard = ({ outfit, index, isAdmin, onClick, onEdit, onDelete }) => {
  const tags = parseTags(outfit.description);
  const isHair = outfit.title.includes('헤어');
  const imgs = outfit.images || [];
  const hasMultipleImages = imgs.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
      className="group relative cursor-pointer"
    >
      {isAdmin && (
        <div className="absolute -top-2 -right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(outfit); }}
            className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-blue-600 transition-colors"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(outfit.id); }}
            className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-red-600 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      <div onClick={onClick} className="relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100/80 transition-all duration-300 hover:-translate-y-1">
        <div className={clsx(
          'relative aspect-square flex items-center justify-center overflow-hidden',
          isHair
            ? 'bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50'
            : 'bg-gradient-to-br from-indigo-50 via-blue-50 to-violet-50'
        )}>
          {imgs.length > 0 ? (
            <img
              src={imgs[0]}
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

          {hasMultipleImages && (
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Eye size={10} />
              {imgs.length}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
              <Eye size={11} /> 자세히 보기
            </span>
          </div>
        </div>

        <div className="p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">{isHair ? '💇' : '👗'}</span>
            <h3 className="text-sm font-extrabold text-gray-800 truncate">{outfit.title}</h3>
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, i) => (
              <span key={i} className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded-md border', tagStyle(tag))}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ═══════════ 메인 페이지 ═══════════ */
const OutfitPage = () => {
  const { isAdmin } = useAuth();
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ming'); // ming | bangcel
  const [selectedOutfit, setSelectedOutfit] = useState(null);

  // Admin Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: 'ming', description: '', images: [] });
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await base44.entities.Outfit.list();
      // sort by title temporarily or ID
      setOutfits(result.sort((a, b) => a.title.localeCompare(b.title)));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await base44.entities.Outfit.delete(id);
      loadData();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const handleEdit = (outfit) => {
    setEditingId(outfit.id);
    setFormData({
      title: outfit.title,
      category: outfit.category,
      description: outfit.description || '',
      images: outfit.images || []
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const { file_url } = await base44.integrations.Core.UploadFile({
          file: files[i]
        });
        newUrls.push(file_url);
      }
      setFormData(prev => ({ ...prev, images: [...prev.images, ...newUrls] }));
    } catch (err) {
      alert('이미지 업로드에 실패했습니다.');
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const removeImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert('제목을 입력하세요.');

    try {
      if (editingId) {
        await base44.entities.Outfit.update(editingId, {
          title: formData.title,
          category: formData.category,
          description: formData.description,
          images: formData.images,
        });
      } else {
        await base44.entities.Outfit.create({
          title: formData.title,
          category: formData.category,
          description: formData.description,
          images: formData.images,
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ title: '', category: 'ming', description: '', images: [] });
      loadData();
    } catch (err) {
      alert('저장 실패');
    }
  };

  const currentOutfits = outfits.filter(o => o.category === activeTab);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in relative pb-32">
      <GlobalHeader title="👗 의상함" />

      {/* Tabs */}
      <div className="flex items-center gap-2 px-2">
        {[{ id: 'ming', label: '밍조각 의상' }, { id: 'bangcel', label: '방셀 의상' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-5 py-2.5 rounded-full font-bold transition-all',
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isAdmin && (
        <div className="px-2">
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ title: '', category: activeTab, description: '', images: [] });
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-gray-800 to-gray-700 text-white px-5 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? '닫기' : '의상 추가'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {isAdmin && showForm && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="font-bold text-gray-800">{editingId ? '의상 수정' : '새 의상 등록'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 pl-1">의상 이름</label>
                  <input
                    className="input-field w-full"
                    placeholder="예: ver2. 2번 의상"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 pl-1">카테고리</label>
                  <select
                    className="input-field w-full"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="ming">밍조각</option>
                    <option value="bangcel">방셀</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 pl-1">설명 및 태그 ( | 기호로 구분 )</label>
                <input
                  className="input-field w-full"
                  placeholder="예: 밍조각 구매 가능 | 교차 선택 불가 | 판매 의상"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 pl-1">의상 이미지</label>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {formData.images.map((url, idx) => (
                      <div key={idx} className="relative group w-20 h-20 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={url} alt={`Preview ${idx}`} className="max-w-full max-h-full object-contain p-1" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {isUploading && (
                      <div className="w-20 h-20 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer file-upload-btn w-fit flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-bold text-sm transition-colors">
                    <Plus size={16} /> 파일 올리기
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-blue-700 transition-colors">
                  {editingId ? '수정 완료' : '등록하기'}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 카드 그리드 */}
      {!loading && currentOutfits.length === 0 ? (
        <div className="text-center py-20 bg-white/40 rounded-3xl border border-dashed border-gray-200">
          <Shirt size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">현재 분류에 등록된 의상이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4 px-1">
          <AnimatePresence mode="popLayout">
            {currentOutfits.map((outfit, i) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                index={i}
                isAdmin={isAdmin}
                onClick={() => setSelectedOutfit(outfit)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 모달 */}
      <AnimatePresence>
        {selectedOutfit && (
          <ImageModal outfit={selectedOutfit} onClose={() => setSelectedOutfit(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OutfitPage;
