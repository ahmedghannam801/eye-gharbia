import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { AcademyCourse, UserProfile } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { BookOpen, Download, Plus, CheckCircle2, Video, FileText, ChevronRight, XCircle, Search, Trash2 } from 'lucide-react';

interface InternalAcademyProps {
  currentUser: UserProfile;
}

export const InternalAcademy: React.FC<InternalAcademyProps> = ({ currentUser }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';
  const isAdminOrLeader = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role);

  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showCreate, setShowCreate] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseCat, setCourseCat] = useState('General');
  const [courseComm, setCourseComm] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const load = () => {
    let all = db.getCourses();
    // Filter by committee visibility (Members see All and their own committee courses)
    if (currentUser.role === 'Member') {
      all = all.filter(c => c.committee === 'All' || c.committee === currentUser.committee);
    }
    setCourses(all);
  };

  useEffect(() => {
    load();
    const unsub = db.onChange(load);
    return () => unsub();
  }, []);

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    db.createCourse(courseTitle, courseDesc, courseCat, courseComm, currentUser);
    setShowCreate(false);
    setCourseTitle('');
    setCourseDesc('');
  };

  const categories = ['All', 'General', 'Design', 'Management', 'Marketing', 'Logistics'];

  const filteredCourses = courses.filter(c => {
    const matchesCat = activeCategory === 'All' || c.category === activeCategory;
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 to-teal-50/40 dark:from-slate-900 dark:to-slate-850 p-6 rounded-3xl border border-emerald-200/40 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest">
            <BookOpen className="w-4 h-4" />
            <span>{isAr ? 'أكاديمية التدريب والموارد' : 'EYE Academy'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'أكاديمية التدريب والتعلم 🎓' : 'Internal Academy & Library 🎓'}
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            {isAr ? 'اقرأ الدلائل الإرشادية، شاهد الورش التدريبية وطوّر مهاراتك القيادية' : 'Access training decks, code of conducts, guidelines, and track read completions'}
          </p>
        </div>
        {isAdminOrLeader && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {isAr ? 'إضافة مادة' : 'Add Course / PDF'}
          </button>
        )}
      </div>

      {/* Search & Categories */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Categories slider */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap border ${
                activeCategory === cat
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'ابحث عن مادة تدريبية...' : 'Search training guides...'}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 font-semibold text-slate-700 dark:text-slate-300 shadow-sm"
          />
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredCourses.map(course => {
          const completed = course.completedBy.includes(currentUser.id);
          return (
            <div key={course.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                    {course.category}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold">
                    👁️ {course.readsCount} {isAr ? 'قراءة' : 'reads'}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white leading-snug">{course.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-3">{course.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {completed ? (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isAr ? 'تمت القراءة' : 'Completed'}
                    </span>
                  ) : (
                    <button
                      onClick={() => db.trackRead(course.id, currentUser.id)}
                      className="text-[10px] text-emerald-600 font-bold hover:underline"
                    >
                      {isAr ? 'تحديد كمقروء' : 'Mark as Read'}
                    </button>
                  )}

                  {isAdminOrLeader && (
                    <button
                      onClick={() => {
                        if (confirm(isAr ? 'هل أنت متأكد من مسح هذه المادة التدريبية؟' : 'Delete this course?')) {
                          db.deleteCourse(course.id, currentUser);
                          load();
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title={isAr ? 'حذف المادة' : 'Delete Course'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <a
                  href="#download"
                  onClick={(e) => { e.preventDefault(); db.trackRead(course.id, currentUser.id); alert(isAr ? 'جاري فتح الملف التدريبي...' : 'Opening resource file...'); }}
                  className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isAr ? 'تحميل PDF' : 'Download'}
                </a>
              </div>
            </div>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-sm">
            <BookOpen className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">{isAr ? 'لا توجد مواد تدريبية مطابقة.' : 'No training materials matching this search.'}</p>
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? 'إضافة مادة تدريبية جديدة' : 'Add Training Resource'}</span>
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-4.5 h-4.5" /></button>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <input
                required
                value={courseTitle}
                onChange={e => setCourseTitle(e.target.value)}
                placeholder={isAr ? 'عنوان الملف التدريبي' : 'Resource Title'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
              <textarea
                required
                value={courseDesc}
                onChange={e => setCourseDesc(e.target.value)}
                rows={3}
                placeholder={isAr ? 'وصف موجز لمحتويات الملف...' : 'Brief summary of contents...'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={courseCat}
                  onChange={e => setCourseCat(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold"
                >
                  <option value="General">General</option>
                  <option value="Design">Design</option>
                  <option value="Management">Management</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Logistics">Logistics</option>
                </select>
                <select
                  value={courseComm}
                  onChange={e => setCourseComm(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold"
                >
                  <option value="All">All Committees</option>
                  {['HR','PR','SM','OR'].map(c => (
                    <option key={c} value={c}>{c} Committee</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-slate-250 dark:border-slate-700 rounded-xl py-2.5 text-xs font-bold text-slate-500">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm">
                  {isAr ? 'إضافة المادة' : 'Publish Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
