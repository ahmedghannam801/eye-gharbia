import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { Meeting, AttendanceRecord, MeetingType, MeetingStatus, UserProfile, COMMITTEE_STRUCTURE } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { AttendanceImporter } from './AttendanceImporter';
import {
  CalendarDays, Users, Plus, CheckCircle2, XCircle, Clock, Lock, Unlock,
  MapPin, Trash2, ChevronDown, ChevronUp, QrCode, UserCheck, AlertCircle,
  RefreshCw, Building2, FileUp
} from 'lucide-react';

interface MeetingsProps {
  currentUser: UserProfile;
  onNavigateToView?: (view: string, targetId?: string) => void;
}

const isLeaderOrAdmin = (u: UserProfile) => ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(u.role);

export const MeetingAttendance: React.FC<MeetingsProps> = ({ currentUser, onNavigateToView }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord[]>>({});
  const [expandedMtg, setExpandedMtg] = useState<string | null>(null);
  const [checkInCode, setCheckInCode] = useState('');
  const [checkInResult, setCheckInResult] = useState<'ok' | 'wrong_code' | 'already' | 'closed' | null>(null);
  const [checkingMtgId, setCheckingMtgId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImporter, setShowImporter] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<MeetingType>('General');
  const [formCommittee, setFormCommittee] = useState<string>('All');
  const [formDept, setFormDept] = useState<string>('All');
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formAttendeesCount, setFormAttendeesCount] = useState<string>('');

  const load = () => {
    const all = db.getMeetings();
    // Filter by role visibility
    let visible = all;
    if (currentUser.role === 'Member') {
      visible = all.filter(m =>
        (m.committee === 'All' || m.committee === currentUser.committee) &&
        (m.department === 'All' || m.department === currentUser.department)
      );
    } else if (currentUser.role === 'Leader') {
      visible = all.filter(m =>
        m.committee === 'All' ||
        m.committee === currentUser.committee ||
        m.createdBy === currentUser.id
      );
    }
    setMeetings(visible);
    const attMap: Record<string, AttendanceRecord[]> = {};
    visible.forEach(m => { attMap[m.id] = db.getAttendance(m.id); });
    setAttendanceMap(attMap);
  };

  useEffect(() => {
    load();
    const unsub = db.onChange(load);
    return () => unsub();
  }, []);

  const handleDeleteMeeting = (mtgId: string) => {
    const confirmMsg = isAr
      ? 'هل أنت تأكد من رغبتك في حذف هذا الاجتماع نهائياً؟ سيتم حذفه من عند الجميع.'
      : 'Are you sure you want to permanently delete this meeting? It will be removed for everyone.';

    if (window.confirm(confirmMsg)) {
      db.deleteMeeting(mtgId, currentUser);
      load();
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    db.createMeeting({
      title: formTitle,
      description: formDesc,
      type: formType,
      committee: isLeaderOrAdmin(currentUser) ? formCommittee : currentUser.committee,
      department: formDept,
      scheduledAt: formDate,
      location: formLocation,
      expectedAttendeesCount: formAttendeesCount ? parseInt(formAttendeesCount, 10) : undefined,
      createdBy: currentUser.id,
      createdByName: currentUser.fullName,
      status: 'Scheduled',
    }, currentUser);
    setShowCreate(false);
    setFormTitle(''); setFormDesc(''); setFormDate(''); setFormLocation(''); setFormAttendeesCount('');
  };

  const handleCheckIn = (mtgId: string) => {
    const result = db.checkIn(mtgId, checkInCode, currentUser);
    setCheckInResult(result);
    if (result === 'ok') {
      setCheckInCode('');
      setTimeout(() => setCheckInResult(null), 3000);
    }
  };

  const statusColor = (s: MeetingStatus) => ({
    Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    Open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    Closed: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  }[s]);

  const statusLabel = (s: MeetingStatus) => isAr
    ? ({ Scheduled: 'مجدول', Open: 'مفتوح', Closed: 'مغلق' }[s])
    : s;

  const typeLabel = (t: MeetingType) => isAr
    ? ({ General: 'عام', Committee: 'لجنة', Department: 'قسم', Emergency: 'طارئ' }[t])
    : t;

  const myAttendance = db.getAllAttendance().filter(a => a.memberId === currentUser.id);

  return (
    <div className="p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'} id="meetings-view">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50/40 dark:from-slate-900 dark:to-slate-850 p-6 rounded-3xl border border-blue-200/40 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">
            <CalendarDays className="w-4 h-4" />
            <span>{isAr ? 'نظام الاجتماعات' : 'Meetings & Attendance'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'الاجتماعات وتسجيل الحضور 📅' : 'Meetings & Attendance 📅'}
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            {isAr ? 'تابع الاجتماعات وسجّل حضورك بكود سري' : 'Track meetings and check-in with a secret code'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <p className="text-blue-600 font-black text-xl">{myAttendance.length}</p>
            <p className="text-[10px] text-slate-500 font-bold">{isAr ? 'حضوري' : 'My Attended'}</p>
          </div>
          {isLeaderOrAdmin(currentUser) && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImporter(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                id="import-attendance-btn"
              >
                <FileUp className="w-4 h-4" />
                {isAr ? 'رفع ملف' : 'Import File'}
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-eye-brand hover:bg-eye-brand-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                id="create-meeting-btn"
              >
                <Plus className="w-4 h-4" />
                {isAr ? 'اجتماع جديد' : 'New Meeting'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-16 text-center">
          <CalendarDays className="w-12 h-12 text-blue-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">{isAr ? 'لا توجد اجتماعات مجدولة.' : 'No meetings scheduled yet.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map(mtg => {
            const att = attendanceMap[mtg.id] || [];
            const iCheckedIn = att.some(a => a.memberId === currentUser.id);
            const isExpanded = expandedMtg === mtg.id;
            const isCreator = mtg.createdBy === currentUser.id || isLeaderOrAdmin(currentUser);

            return (
              <div key={mtg.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm card-pressable">
                {/* Meeting header row */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer select-none"
                  onClick={() => setExpandedMtg(isExpanded ? null : mtg.id)}
                >
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${mtg.status === 'Open' ? 'bg-emerald-100 dark:bg-emerald-950/40' : mtg.status === 'Closed' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-blue-100 dark:bg-blue-950/40'}`}>
                    <CalendarDays className={`w-5 h-5 ${mtg.status === 'Open' ? 'text-emerald-600' : mtg.status === 'Closed' ? 'text-slate-400' : 'text-blue-600'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{mtg.title}</p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${statusColor(mtg.status)}`}>{statusLabel(mtg.status)}</span>
                      <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{typeLabel(mtg.type)}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap mt-1 text-[10px] text-slate-500 font-semibold">
                      <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        {new Date(mtg.scheduledAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' — '}
                        {new Date(mtg.scheduledAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {mtg.location && mtg.location.match(/^https?:\/\//i) ? (
                        <a
                          href={mtg.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                        >
                          <MapPin className="w-3 h-3 text-blue-500" />
                          <span>{isAr ? 'رابط الاجتماع 🔗' : 'Meeting Link 🔗'}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{mtg.location}</span>
                      )}
                      <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        <Users className="w-3 h-3 text-blue-500" />
                        <span>{att.length}{mtg.expectedAttendeesCount ? ` / ${mtg.expectedAttendeesCount}` : ''} {isAr ? 'عضو' : 'members'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {iCheckedIn && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black">✓ {isAr ? 'حضرت' : 'Attended'}</span>}
                    {isLeaderOrAdmin(currentUser) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(mtg.id); }}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-100 transition-colors"
                        title={isAr ? 'حذف الاجتماع' : 'Delete Meeting'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-5">
                    {mtg.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{mtg.description}</p>
                    )}

                    {mtg.location && mtg.location.match(/^https?:\/\//i) && (
                      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                            {isAr ? '🔗 رابط الانضمام للاجتماع (Online):' : '🔗 Meeting Link (Online):'}
                          </p>
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono truncate">{mtg.location}</p>
                        </div>
                        <a
                          href={mtg.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
                        >
                          <span>{isAr ? 'انضمام الآن 🚀' : 'Join Now 🚀'}</span>
                        </a>
                      </div>
                    )}

                    {/* Check-in section (Members only, meeting is Open) */}
                    {!iCheckedIn && currentUser.role === 'Member' && mtg.status === 'Open' && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl p-4 border border-blue-200/40">
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5" />
                          {isAr ? 'سجّل حضورك بالكود السري' : 'Check-in with secret code'}
                        </p>
                        <div className="flex gap-2">
                          <input
                            value={checkInCode}
                            onChange={e => setCheckInCode(e.target.value.toUpperCase())}
                            placeholder={isAr ? 'أدخل الكود...' : 'Enter code...'}
                            maxLength={6}
                            className="flex-1 bg-white dark:bg-slate-900 border border-blue-200 rounded-xl px-3 py-2 text-sm font-black text-center tracking-widest focus:outline-none focus:border-eye-brand font-mono uppercase"
                            id={`checkin-code-${mtg.id}`}
                          />
                          <button
                            onClick={() => { setCheckingMtgId(mtg.id); handleCheckIn(mtg.id); }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                          >
                            {isAr ? 'تسجيل' : 'Check-in'}
                          </button>
                        </div>
                        {checkInResult && checkingMtgId === mtg.id && (
                          <div className={`mt-2 flex items-center gap-2 text-xs font-bold ${checkInResult === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {checkInResult === 'ok' && <><CheckCircle2 className="w-3.5 h-3.5" />{isAr ? 'تم تسجيل حضورك بنجاح! ✅' : 'Checked in successfully! ✅'}</>}
                            {checkInResult === 'wrong_code' && <><XCircle className="w-3.5 h-3.5" />{isAr ? 'الكود غير صحيح' : 'Wrong code'}</>}
                            {checkInResult === 'already' && <><AlertCircle className="w-3.5 h-3.5" />{isAr ? 'سبق تسجيل حضورك' : 'Already checked in'}</>}
                            {checkInResult === 'closed' && <><Lock className="w-3.5 h-3.5" />{isAr ? 'الاجتماع مغلق' : 'Meeting is closed'}</>}
                          </div>
                        )}
                      </div>
                    )}

                    {iCheckedIn && (
                      <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2.5 rounded-xl border border-emerald-200/40">
                        <CheckCircle2 className="w-4 h-4" />
                        {isAr ? 'تم تسجيل حضورك بنجاح في هذا الاجتماع' : 'You are marked as attended for this meeting'}
                      </div>
                    )}

                    {/* Leader Controls */}
                    {isLeaderOrAdmin(currentUser) && (
                      <div className="space-y-4">
                        {/* Attendance Code Display */}
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <QrCode className="w-4 h-4 text-eye-brand shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold">{isAr ? 'كود الحضور السري' : 'Secret Attendance Code'}</p>
                            <p className="text-xl font-black font-mono tracking-widest text-eye-brand">{mtg.attendanceCode}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 ms-auto">{isAr ? 'أعطه للأعضاء فقط' : 'Share with members only'}</p>
                        </div>

                        {/* Status controls */}
                        <div className="flex gap-2 flex-wrap">
                          {mtg.status === 'Scheduled' && (
                            <button onClick={() => db.updateMeetingStatus(mtg.id, 'Open')}
                              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 transition-all">
                              <Unlock className="w-3.5 h-3.5" />{isAr ? 'افتح تسجيل الحضور' : 'Open Check-in'}
                            </button>
                          )}
                          {mtg.status === 'Open' && (
                            <button onClick={() => db.updateMeetingStatus(mtg.id, 'Closed')}
                              className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-all">
                              <Lock className="w-3.5 h-3.5" />{isAr ? 'أغلق تسجيل الحضور' : 'Close Check-in'}
                            </button>
                          )}
                          <button onClick={() => db.deleteMeeting(mtg.id, currentUser)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />{isAr ? 'حذف' : 'Delete'}
                          </button>
                        </div>

                        {/* Attendance list */}
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                            {isAr ? `الحاضرون (${att.length})` : `Attendance (${att.length})`}
                          </p>
                          {att.length === 0 ? (
                            <p className="text-xs text-slate-400 font-semibold">{isAr ? 'لا أحد سجّل حضوره بعد' : 'No one checked in yet'}</p>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {att.map(a => (
                                <div key={a.id} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p 
                                      className="text-[10px] font-black text-slate-800 dark:text-slate-100 cursor-pointer hover:text-eye-brand hover:underline"
                                      onClick={() => onNavigateToView?.('profile', a.memberId)}
                                    >
                                      {a.memberName}
                                    </p>
                                    <p className="text-[9px] text-slate-400">{a.department} · {new Date(a.checkedInAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-GB', { timeStyle: 'short' })}</p>
                                  </div>
                                  {a.isExcused && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{isAr ? 'معذور' : 'Excused'}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 modal-panel-animate">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />{isAr ? 'إنشاء اجتماع جديد' : 'Create New Meeting'}
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input required value={formTitle} onChange={e => setFormTitle(e.target.value)}
                placeholder={isAr ? 'عنوان الاجتماع' : 'Meeting title'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-eye-brand" />
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2}
                placeholder={isAr ? 'وصف (اختياري)' : 'Description (optional)'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-eye-brand resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={formType} onChange={e => setFormType(e.target.value as MeetingType)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-eye-brand">
                  <option value="General">{isAr ? 'عام' : 'General'}</option>
                  <option value="Committee">{isAr ? 'لجنة' : 'Committee'}</option>
                  <option value="Department">{isAr ? 'قسم' : 'Department'}</option>
                  <option value="Emergency">{isAr ? 'طارئ' : 'Emergency'}</option>
                </select>
                <select value={formCommittee} onChange={e => setFormCommittee(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-eye-brand">
                  <option value="All">{isAr ? 'الكل' : 'All'}</option>
                  {['HR','PR','SM','OR'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input required value={formDate} onChange={e => setFormDate(e.target.value)} type="datetime-local"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-eye-brand" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {isAr ? 'المكان أو رابط الاجتماع *' : 'Location or Link *'}
                  </label>
                  <input required value={formLocation} onChange={e => setFormLocation(e.target.value)}
                    placeholder={isAr ? 'المكان أو رابط الاجتماع' : 'Location or meeting link'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-eye-brand" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {isAr ? 'عدد الحضور المستهدف / المتوقع' : 'Target Attendees Count'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formAttendeesCount}
                    onChange={e => setFormAttendeesCount(e.target.value)}
                    placeholder={isAr ? 'عدد الحضور (مثال: 50)' : 'Target count (e.g. 50)'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-eye-brand" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit"
                  className="flex-1 bg-eye-brand hover:bg-eye-brand-dark text-white rounded-xl text-xs font-bold py-2.5 transition-all shadow-sm">
                  {isAr ? 'إنشاء الاجتماع' : 'Create Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Importer Modal */}
      {showImporter && (
        <AttendanceImporter
          currentUser={currentUser}
          onClose={() => { setShowImporter(false); load(); }}
        />
      )}
    </div>
  );
};
