import React, { useState, useEffect } from 'react';
import { UserProfile, OccasionGreeting } from '../types';
import { db } from '../db/localDb';
import { Sparkles, Calendar, Plus, Trash2, X, Megaphone, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react';

interface OccasionBannerProps {
  currentUser: UserProfile;
}

export const OccasionBanner: React.FC<OccasionBannerProps> = ({ currentUser }) => {
  const [activeOccasion, setActiveOccasion] = useState<OccasionGreeting | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [occasionsList, setOccasionsList] = useState<OccasionGreeting[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // New Occasion Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'Eid' | 'Ramadan' | 'National' | 'NewYear' | 'Custom'>('Eid');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [icon, setIcon] = useState('🎉');
  const [bannerBg, setBannerBg] = useState('from-amber-600 via-amber-700 to-amber-900');

  const loadOccasions = () => {
    const active = db.getActiveOccasion();
    setActiveOccasion(active);
    const list = db.getOccasions();
    setOccasionsList(list);
  };

  useEffect(() => {
    loadOccasions();
  }, []);

  const handleCreateOccasion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    db.createOccasion(
      {
        title,
        message,
        category,
        startDate,
        endDate,
        icon,
        bannerBg,
        isActive: true,
      },
      currentUser
    );

    setTitle('');
    setMessage('');
    setShowManageModal(false);
    loadOccasions();
  };

  const handleDeleteOccasion = (id: string) => {
    if (confirm('هل أنت تأكد من حذف هذه التهنئة للمناسبة؟')) {
      db.deleteOccasion(id, currentUser);
      loadOccasions();
    }
  };

  const isExpired = (endDateStr: string) => {
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    return new Date() > end;
  };

  return (
    <>
      {/* Active Banner for all users */}
      {activeOccasion && !isDismissed && (
        <div className={`bg-gradient-to-r ${activeOccasion.bannerBg || 'from-amber-600 to-amber-900'} text-white p-5 rounded-3xl shadow-xl border border-white/20 mb-6 relative overflow-hidden transition-all animate-fade-in`}>
          {/* Dismiss button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-3 left-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-all z-20"
            title="إغلاق التهنئة"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Background overlay sparkles */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10 pe-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/25 text-3xl shadow-md">
                {activeOccasion.icon || '🎉'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                    تهنئة رسمية من كيان EYE
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-200 animate-spin-slow" />
                </div>
                <h3 className="text-lg font-black text-white">{activeOccasion.title}</h3>
                <p className="text-xs text-amber-100/90 leading-relaxed max-w-2xl">
                  {activeOccasion.message}
                </p>
              </div>
            </div>

            {/* Admin Manage Button */}
            {(currentUser.role === 'Super Admin' || currentUser.role === 'HRM' || currentUser.role === 'Leader') && (
              <button
                onClick={() => setShowManageModal(true)}
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-white/30 backdrop-blur-sm transition-all shrink-0 self-end md:self-center"
              >
                إدارة التهاني والمناسبات
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Button if no active banner but user is admin */}
      {!activeOccasion && (currentUser.role === 'Super Admin' || currentUser.role === 'HRM') && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowManageModal(true)}
            className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            نشر تهنئة بمناسبة جديدة 🎉
          </button>
        </div>
      )}

      {/* Manage Occasions Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                إدارة تهاني المناسبات والأعياد الرسمية
              </h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Collapsible Form Section */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 mb-6 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="w-full p-4 flex items-center justify-between font-extrabold text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>إضافة تهنئة بمناسبة جديدة</span>
                </div>
                {isFormOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {isFormOpen && (
                <form onSubmit={handleCreateOccasion} className="p-4 pt-0 space-y-4 border-t border-slate-200/60 dark:border-slate-700/50 mt-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">عنوان المناسبة</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="مثال: عيد الأضحى المبارك 🌙✨"
                        required
                        className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">نوع المناسبة والأيقونة</label>
                      <div className="flex gap-2">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value as any)}
                          className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                        >
                          <option value="Eid">عيد ديني (الأضحى / الفطر)</option>
                          <option value="Ramadan">شهر رمضان المبارك</option>
                          <option value="National">مناسبة وطنية / قومية</option>
                          <option value="NewYear">رأس السنة</option>
                          <option value="Custom">مناسبة خاصة بالكيان</option>
                        </select>
                        <input
                          type="text"
                          value={icon}
                          onChange={(e) => setIcon(e.target.value)}
                          placeholder="🎉"
                          className="w-14 text-center text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">رسالة التهنئة</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="اكتب نص المعايدة التي ستظهر لجميع الأعضاء..."
                      rows={2}
                      required
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">تاريخ البدء</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">تاريخ الانتهاء</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>نشر التهنئة وإرسال إشعارات للأعضاء</span>
                  </button>
                </form>
              )}
            </div>

            {/* List of Existing Occasions */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" />
                المناسبة الحالية والسابقة:
              </h4>

              {occasionsList.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  لا توجد تهاني مناسبات مسجلة حالياً.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {occasionsList.map((occ) => {
                    const expired = isExpired(occ.endDate);
                    return (
                      <div
                        key={occ.id}
                        className="flex items-start justify-between p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl gap-3 shadow-sm hover:border-amber-400/50 transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-2xl flex items-center justify-center shrink-0 border border-amber-500/20">
                            {occ.icon || '🎉'}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{occ.title}</h5>
                              {expired ? (
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> منتهي
                                </span>
                              ) : (
                                <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle className="w-2.5 h-2.5" /> نشط حالياً
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                              {occ.message}
                            </p>
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                                <Calendar className="w-3 h-3 text-amber-500" />
                                من {occ.startDate} إلى {occ.endDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteOccasion(occ.id)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-xl transition-all border border-transparent hover:border-red-200 dark:hover:border-red-900/50 shrink-0 self-start mt-0.5"
                          title="حذف التهنئة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

