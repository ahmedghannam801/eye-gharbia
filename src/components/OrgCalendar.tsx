import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { UserProfile, CalendarEvent, CalendarEventType } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Filter, 
  CheckCircle2, 
  Radio, 
  FolderKanban, 
  CalendarDays,
  Sparkles,
  X
} from 'lucide-react';

interface OrgCalendarProps {
  currentUser: UserProfile;
}

export const OrgCalendar: React.FC<OrgCalendarProps> = ({ currentUser }) => {
  const { isRtl, language } = useLanguage();
  const isAr = language === 'ar';

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedCommittee, setSelectedCommittee] = useState<string>('All');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Month navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const loadData = () => {
    const list = db.getCalendarEvents(currentUser);
    setEvents(list);
  };

  useEffect(() => {
    loadData();
    const unsub = db.onChange(loadData);
    return () => unsub();
  }, [currentUser]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthName = currentDate.toLocaleString(isAr ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0: Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter events
  const filteredEvents = events.filter(e => {
    const matchComm = selectedCommittee === 'All' || e.committee === 'All' || e.committee === selectedCommittee;
    const matchType = selectedEventType === 'all' || e.eventType === selectedEventType;
    return matchComm && matchType;
  });

  const getEventsForDay = (dayNumber: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    return filteredEvents.filter(e => e.date === dayStr);
  };

  const getEventBadgeStyle = (type: CalendarEventType) => {
    switch (type) {
      case 'task':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200';
      case 'meeting':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200';
      case 'workshop':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200';
      default:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200';
    }
  };

  const daysOfWeek = isAr
    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-widest">
            <CalendarIcon className="w-4 h-4 text-sky-400" />
            <span>{isAr ? 'الأجندة والمواعيد الموحدة' : 'EYE Organizational Calendar'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black">
            {isAr ? 'التقويم التفاعلي الموحد 📅' : 'Unified Organization Calendar 📅'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 font-medium">
            {isAr ? 'استعرض كافة المواعيد النهائية للمهام، الاجتماعات، والورش التدريبية في تقويم زمني واحد.' : 'Track task deadlines, meetings, live streams, and organizational events.'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 relative z-10">
          <select
            value={selectedCommittee}
            onChange={e => setSelectedCommittee(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="All">{isAr ? 'جميع اللجان' : 'All Committees'}</option>
            {['HR', 'PR', 'SM', 'OR'].map(c => (
              <option key={c} value={c}>{c} Committee</option>
            ))}
          </select>

          <select
            value={selectedEventType}
            onChange={e => setSelectedEventType(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="all">{isAr ? 'جميع الأحداث' : 'All Event Types'}</option>
            <option value="task">📌 المهام (Tasks)</option>
            <option value="meeting">📅 الاجتماعات (Meetings)</option>
            <option value="workshop">🔴 ورش البث (Live Streams)</option>
          </select>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-5 h-5 rtl:rotate-180" />
          </button>

          <h2 className="text-lg font-black text-slate-900 dark:text-white capitalize">
            {monthName}
          </h2>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 uppercase tracking-wider">
          {daysOfWeek.map(day => (
            <div key={day} className="py-2 bg-slate-50 dark:bg-slate-850 rounded-xl">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty starting slots */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-28 bg-slate-50/40 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-150 dark:border-slate-800/40" />
          ))}

          {/* Day slots */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayEvents = getEventsForDay(dayNum);
            const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div
                key={dayNum}
                className={`h-28 p-2 rounded-2xl border flex flex-col justify-between transition-all overflow-hidden ${
                  isToday
                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">{dayEvents.length}</span>
                  )}
                </div>

                {/* Events list in cell */}
                <div className="space-y-1 overflow-y-auto max-h-16">
                  {dayEvents.slice(0, 2).map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`p-1 rounded-lg text-[9.5px] font-bold truncate cursor-pointer transition-transform hover:scale-95 border ${getEventBadgeStyle(ev.eventType)}`}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] font-bold text-slate-400 text-center">
                      +{dayEvents.length - 2} {isAr ? 'أحداث أخرى' : 'more'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getEventBadgeStyle(selectedEvent.eventType)}`}>
                {selectedEvent.eventType.toUpperCase()}
              </span>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">{selectedEvent.title}</h3>
              <p className="text-xs text-slate-500 font-medium">{selectedEvent.description || (isAr ? 'لا يوجد وصف تفصيلي.' : 'No description.')}</p>
              
              <div className="pt-2 text-xs font-bold text-slate-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>{selectedEvent.date} {selectedEvent.time ? `@ ${selectedEvent.time}` : ''}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  const ev = selectedEvent;
                  const dateStr = ev.date.replace(/-/g, '');
                  const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//EYE Workflow Hub//EN\nBEGIN:VEVENT\nSUMMARY:${ev.title}\nDESCRIPTION:${ev.description || ''}\nDTSTART:${dateStr}T100000Z\nDTEND:${dateStr}T110000Z\nEND:VEVENT\nEND:VCALENDAR`;
                  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `${ev.title}.ics`;
                  link.click();
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة لتقويم (.ics)' : 'Add (.ics)'}</span>
              </button>

              <button
                onClick={() => {
                  const ev = selectedEvent;
                  const dateFormatted = ev.date.replace(/-/g, '');
                  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${dateFormatted}T100000Z/${dateFormatted}T110000Z&details=${encodeURIComponent(ev.description || 'EYE Organization Event')}`;
                  window.open(gCalUrl, '_blank');
                }}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Google 📅</span>
              </button>

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
