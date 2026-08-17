import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { MemoryPost, UserProfile } from '../types';
import { Camera, Heart, Plus, Trash2, Calendar, User, X, Sparkles, Filter, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface MemoryWallProps {
  currentUser: UserProfile;
}

const CATEGORIES = [
  { id: 'All', labelAr: 'الكل 🌟', labelEn: 'All 🌟' },
  { id: 'Event', labelAr: 'الفعاليات 🎪', labelEn: 'Events 🎪' },
  { id: 'Achievement', labelAr: 'الإنجازات 🏆', labelEn: 'Achievements 🏆' },
  { id: 'Gathering', labelAr: 'اللقاءات والتجمعات 🤝', labelEn: 'Gatherings 🤝' },
  { id: 'Workshop', labelAr: 'الورش والتدريب 📚', labelEn: 'Workshops 📚' },
];

export const MemoryWall: React.FC<MemoryWallProps> = ({ currentUser }) => {
  const { language } = useLanguage();
  const [memories, setMemories] = useState<MemoryPost[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('Event');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const loadMemories = () => {
    setMemories(db.getMemoryPosts());
  };

  useEffect(() => {
    loadMemories();
    const unsub = db.onChange(loadMemories);
    return () => unsub();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) return;

    db.createMemoryPost(
      {
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        category,
        date,
        committee: currentUser.committee,
        createdBy: currentUser.id,
        createdByName: currentUser.fullName,
      },
      currentUser
    );

    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setImageUrl('');
    loadMemories();
  };

  const handleToggleLike = (id: string) => {
    db.toggleMemoryLike(id, currentUser.id);
    loadMemories();
  };

  const handleDelete = (id: string) => {
    if (confirm(language === 'ar' ? 'هل تود حذف هذه الذكرى من المعرض؟' : 'Delete this memory?')) {
      db.deleteMemoryPost(id, currentUser);
      loadMemories();
    }
  };

  const filteredMemories = memories.filter(m => selectedCat === 'All' || m.category === selectedCat);

  const canManage = ['Super Admin', 'Coordinator', 'Deputy Coordinator', 'Leader', 'Vice'].includes(currentUser.role);

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 text-start" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-950 border border-purple-500/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold">
              <Camera className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'معرض الذكريات والأحداث 📸' : 'Memory Wall & Highlights 📸'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              {language === 'ar' ? 'ألبوم ذكريات كيان EYE' : 'EYE Entity Photo Album'}
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 font-semibold leading-relaxed">
              {language === 'ar' 
                ? 'توثيق اللحظات المميزة، والفاعليات الميدانية، واللقاءات التي جمعتنا في طريق النجاح والتطوع.'
                : 'Capturing unforgettable moments, field events, and gatherings on our journey together.'}
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all cursor-pointer border border-purple-400/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة صورة لـ المعرض 📸' : 'Add New Memory 📸'}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              selectedCat === cat.id
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {language === 'ar' ? cat.labelAr : cat.labelEn}
          </button>
        ))}
      </div>

      {/* Memory Cards Masonry / Grid */}
      {filteredMemories.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
          <ImageIcon className="w-12 h-12 text-purple-400 mx-auto opacity-50" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {language === 'ar' ? 'لا توجد ذكريات مضافة بعد' : 'No memories added yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {language === 'ar' ? 'كن أول من يشارك صورة أو لقطة مميزة من الفعاليات!' : 'Be the first to share a moment from team activities!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMemories.map(mem => {
            const hasLiked = mem.likes?.includes(currentUser.id);
            const likesCount = mem.likes?.length || 0;

            return (
              <div
                key={mem.id}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Image Container */}
                <div className="relative aspect-video overflow-hidden bg-slate-950">
                  <img
                    src={mem.imageUrl}
                    alt={mem.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-xs font-bold">{mem.title}</span>
                  </div>

                  {/* Category Pill */}
                  <span className="absolute top-3 start-3 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md text-purple-300 text-[10px] font-bold border border-purple-400/30">
                    {mem.category}
                  </span>

                  {/* Delete Button */}
                  {(canManage || mem.createdBy === currentUser.id) && (
                    <button
                      onClick={() => handleDelete(mem.id)}
                      className="absolute top-3 end-3 p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-all shadow-md cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {mem.title}
                    </h3>
                    {mem.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {mem.description}
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold">
                        <User className="w-3 h-3 text-purple-400" />
                        {mem.createdByName}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {mem.date}
                      </span>
                    </div>

                    {/* Like Button */}
                    <button
                      onClick={() => handleToggleLike(mem.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                        hasLiked
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : ''}`} />
                      <span className="font-mono text-[10px]">{likesCount}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MEMORY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-500" />
                {language === 'ar' ? 'إضافة صورة جديدة للمعرض 📸' : 'Add New Memory Photo 📸'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  {language === 'ar' ? 'عنوان الذكرى / اللقطة' : 'Memory Title'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: اجتماع إطلاق الموسم الرابع' : 'Title...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  {language === 'ar' ? 'رابط الصورة (Image URL)' : 'Image URL'}
                </label>
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    {language === 'ar' ? 'التصنيف' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-bold"
                  >
                    <option value="Event">🎪 فعاليات</option>
                    <option value="Achievement">🏆 إنجازات</option>
                    <option value="Gathering">🤝 لقاءات</option>
                    <option value="Workshop">📚 ورش وتدريب</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    {language === 'ar' ? 'التاريخ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  {language === 'ar' ? 'الوصف / التفاصيل (اختياري)' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={language === 'ar' ? 'تفاصيل عن الصورة أو الأحداث...' : 'Details...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 resize-none focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs shadow-md"
                >
                  {language === 'ar' ? 'نشر في المعرض 🚀' : 'Publish Memory 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
