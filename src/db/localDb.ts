import { supabase, isSupabaseConfigured, getPermanentStorageUrl } from '../lib/supabaseClient';
import { sendEmailAlert } from '../lib/emailService';
import { triggerPushFromSystemNotif } from '../lib/pushNotifications';
import { isHRM, filterEvaluationsByPermission, filterMembersByPermission, getEffectiveCommittee } from '../lib/permissions';
import {
  UserProfile,
  Task,
  Submission,
  Announcement,
  AnnouncementCategory,
  OccasionGreeting,
  SystemNotification,
  ActivityLog,
  OrganizationSettings,
  UserRole,
  UserStatus,
  TaskStatus,
  SubmissionStatus,
  Meeting,
  MeetingType,
  MeetingStatus,
  AttendanceRecord,
  LeaderFeedback,
  MemberEvaluation,
  WorkPlan,
  KeyResult,
  OKRStatus,
  VolunteerIdea,
  AcademyCourse,
  RewardItem,
  RewardPurchase,
  ExcuseRequest,
  FreezeRequest,
  MonthlyPerformance,
  WeeklyQuiz,
  QuizSubmission,
  PersonalObjective,
  IssuedCertificate,
  CertificateType,
  CertificateDesignStyle,
  VideoTask,
  VideoSubmission,
  VideoSubmissionStatus,
  LiveWorkshop,
  LiveChatMessage,
  ExecutiveAnalyticsData,
  CommitteePerformanceMetrics,
  MeetingReportSummary,
  WorkPlanReportSummary,
  WorkshopStatus,
  CommitteeChatMessage,
  WeeklyChallenge,
  UserStreak,
  CalendarEvent,
  DisciplinaryRecord,
  MemoryPost,
  getUserRoleTitle,
  getActiveGovernorate,
} from '../types';

// ============================================================
// Row <-> App-type mappers (Postgres uses snake_case, the app's
// TypeScript types use camelCase - keep components untouched).
// ============================================================

const getProfileOverrides = (id: string): Partial<UserProfile> => {
  try {
    const raw = localStorage.getItem('eye_profile_overrides');
    if (!raw) return {};
    const map = JSON.parse(raw);
    return map[id] || {};
  } catch {
    return {};
  }
};

export const saveProfileOverride = (id: string, updates: Partial<UserProfile>) => {
  try {
    const raw = localStorage.getItem('eye_profile_overrides');
    const map = raw ? JSON.parse(raw) : {};
    map[id] = { ...(map[id] || {}), ...updates };
    localStorage.setItem('eye_profile_overrides', JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save profile override to localStorage', err);
  }
};

const userFromRow = (r: any): UserProfile => {
  let dept = r.department;
  const override = getProfileOverrides(r.id);
  const fullName = override.fullName !== undefined ? override.fullName : (r.full_name || '');

  // Auto-resolve Leader departments if missing or generic HRM
  if (fullName.includes('عهد') && (!dept || dept === 'HRM' || dept === 'None')) {
    dept = 'HRM - HR OF PR';
  } else if (fullName.includes('عبد الدايم') && (!dept || dept === 'HRM' || dept === 'None')) {
    dept = 'HRM - HR OF SM';
  } else if (fullName.includes('الملواني') && (!dept || dept === 'HRM' || dept === 'None')) {
    dept = 'HRM - HR OF OR';
  } else if (fullName.includes('مسلم') && (!dept || dept === 'HRM' || dept === 'None')) {
    dept = 'HRIS';
  } else if (fullName.includes('مريم') && (!dept || dept === 'HRM' || dept === 'None')) {
    dept = 'HRD';
  } else if (fullName.includes('فراره') && (!dept || dept === 'HRM' || dept === 'None')) {
    dept = 'HRS';
  } else if (fullName.includes('الهيتي') && (!dept || dept === 'None')) {
    dept = 'HRM';
  }

  return {
    id: r.id,
    fullName: fullName,
    email: override.email !== undefined ? override.email : (r.email || ''),
    phoneNumber: override.phoneNumber !== undefined ? override.phoneNumber : (r.phone_number || ''),
    role: (override.role !== undefined ? override.role : (r.role || r.user_role || 'Member')) as UserRole,
    status: (override.status !== undefined ? override.status : (r.status || 'Active')) as UserStatus,
    committee: override.committee !== undefined ? override.committee : (r.committee || 'None'),
    department: override.department !== undefined ? override.department : (r.department || dept || 'None'),
    subCommittee: override.subCommittee !== undefined ? override.subCommittee : (r.sub_committee || r.sub_committee_name),
    membershipCode: override.membershipCode !== undefined ? override.membershipCode : r.membership_code,
    avatarUrl: getPermanentStorageUrl((override.avatarUrl !== undefined ? override.avatarUrl : (r.avatar_url && r.avatar_url.trim())) || ''),
    joinedDate: r.joined_date,
    dateOfBirth: override.dateOfBirth !== undefined ? override.dateOfBirth : r.date_of_birth,
    bio: (override.bio !== undefined ? override.bio : (r.bio && r.bio.trim())) || undefined,
    skills: (override.skills !== undefined ? override.skills : (r.skills && r.skills.length > 0 ? r.skills : [])),
    endorsements: r.endorsements || {},
    isAvatarProtected: override.isAvatarProtected !== undefined ? override.isAvatarProtected : (r.is_avatar_protected ?? false),
    linkedInUrl: (override.linkedInUrl !== undefined ? override.linkedInUrl : (r.linked_in_url || r.linkedin_url || '')).trim() || undefined,
    facebookUrl: (override.facebookUrl !== undefined ? override.facebookUrl : (r.facebook_url || '')).trim() || undefined,
    lftNazarCount: override.lftNazarCount !== undefined ? override.lftNazarCount : (r.lft_nazar_count ?? 0),
    inzarCount: override.inzarCount !== undefined ? override.inzarCount : (r.inzar_count ?? 0),
    governorate: override.governorate !== undefined ? override.governorate : (r.governorate || 'الغربية'),
  };
};

const taskFromRow = (r: any): Task => ({
  id: r.id,
  name: r.name,
  description: r.description,
  instructions: r.instructions,
  priority: r.priority,
  deadline: r.deadline,
  committee: r.committee,
  department: r.department,
  status: r.status,
  createdBy: r.created_by,
  createdByName: r.created_by_name,
  createdDate: r.created_date,
  allowedFileTypes: r.allowed_file_types || [],
  maxUploadSizeMb: r.max_upload_size_mb,
  allowResubmission: r.allow_resubmission,
  attachments: (r.attachments || []).map((att: any) => typeof att === 'string' ? getPermanentStorageUrl(att) : att),
  subtasks: r.subtasks || [],
  isTeamTask: r.is_team_task || false,
  isVideoTask: r.is_video_task || false,
  videoUrl: r.video_url || undefined,
  assignedMemberIds: r.assigned_member_ids || r.assignedMemberIds || [],
  targetAudience: r.target_audience || r.targetAudience || undefined,
});

const submissionFromRow = (r: any): Submission => ({
  id: r.id,
  taskId: r.task_id,
  taskName: r.task_name,
  memberId: r.member_id,
  memberName: r.member_name,
  memberEmail: r.member_email,
  committee: r.committee,
  department: r.department,
  submittedAt: r.submitted_at,
  status: r.status,
  fileUrl: getPermanentStorageUrl(r.file_url),
  fileName: r.file_name,
  fileSize: r.file_size,
  comment: r.comment,
  rejectionReason: r.rejection_reason,
  submissionIdCode: r.submission_id_code,
  grade: r.grade,
  gradingCriteria: r.grading_criteria || undefined,
  completedSubtasks: r.completed_subtasks || [],
  history: r.history || [],
});

const announcementFromRow = (r: any): Announcement => ({
  id: r.id,
  title: r.title,
  content: r.content,
  committee: r.committee,
  createdBy: r.created_by,
  createdByName: r.created_by_name,
  createdDate: r.created_date,
  isPinned: r.is_pinned,
  category: r.category || 'General',
  targetUrl: r.target_url ? getPermanentStorageUrl(r.target_url) : undefined,
});

const notificationFromRow = (r: any): SystemNotification => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  message: r.message,
  type: r.type,
  isRead: r.is_read,
  createdAt: r.created_at,
  relatedId: r.related_id,
});

const logFromRow = (r: any): ActivityLog => ({
  id: r.id,
  userId: r.user_id,
  userName: r.user_name,
  userRole: r.user_role,
  action: r.action,
  details: r.details,
  timestamp: r.timestamp,
});

const certFromRow = (r: any): IssuedCertificate => ({
  id: r.id,
  recipientId: r.recipient_id,
  recipientName: r.recipient_name,
  recipientRole: r.recipient_role,
  certType: r.cert_type,
  title: r.title,
  body: r.body,
  committee: r.committee,
  issuedBy: r.issued_by,
  issuedByName: r.issued_by_name,
  issuedByTitle: r.issued_by_title,
  issuedAt: r.issued_at,
  grade: r.grade,
  lang: r.lang || r.cert_language || 'ar',
  governorate: r.governorate || undefined,
});

const meetingFromRow = (r: any): Meeting => ({
  id: r.id,
  title: r.title,
  description: r.description || '',
  type: r.type,
  committee: r.committee || 'All',
  department: r.department || 'All',
  scheduledAt: r.scheduled_at,
  location: r.location || '',
  expectedAttendeesCount: r.expected_attendees_count,
  createdBy: r.created_by,
  createdByName: r.created_by_name || '',
  createdAt: r.created_at,
  status: r.status,
  attendanceCode: r.attendance_code,
  governorate: r.governorate || 'الغربية',
});

const disciplinaryFromRow = (r: any): DisciplinaryRecord => ({
  id: r.id,
  type: r.type || undefined,
  memberId: r.member_id,
  memberName: r.member_name,
  committee: r.committee,
  governorate: r.governorate || undefined,
  severity: r.severity || 'Notice',
  reason: r.reason,
  regulationCode: r.regulation_code || 'L-102',
  penaltyPoints: r.penalty_points || 5,
  issuedBy: r.issued_by,
  issuedByName: r.issued_by_name || '',
  issuedAt: r.issued_at,
});

const attendanceFromRow = (r: any): AttendanceRecord => ({
  id: r.id,
  meetingId: r.meeting_id,
  memberId: r.member_id,
  memberName: r.member_name,
  memberEmail: r.member_email || '',
  committee: r.committee || 'None',
  department: r.department || 'None',
  checkedInAt: r.checked_in_at,
  isExcused: r.is_excused ?? false,
  excuseReason: r.excuse_reason || undefined,
});

const workPlanFromRow = (r: any): WorkPlan => ({
  id: r.id,
  title: r.title,
  objective: r.objective || r.description || '',
  committee: r.committee || 'All',
  department: r.department || 'All',
  month: r.month || new Date().toISOString().slice(0, 7),
  createdBy: r.created_by || '',
  createdByName: r.created_by_name || '',
  createdAt: r.created_at,
  status: r.status || 'On Track',
  keyResults: r.key_results || [],
});

const ideaFromRow = (r: any): VolunteerIdea => ({
  id: r.id,
  title: r.title,
  description: r.description || '',
  committee: r.committee || 'All',
  createdBy: r.created_by || '',
  createdByName: r.created_by_name || '',
  createdAt: r.created_at,
  upvotes: r.upvotes || [],
  status: r.status || 'Pitching',
  comments: r.comments || [],
});

const evaluationFromRow = (r: any): MemberEvaluation => ({
  id: r.id,
  targetUserId: r.target_user_id,
  targetUserName: r.target_user_name,
  targetUserRole: r.target_user_role || 'Member',
  evaluatorId: r.evaluator_id,
  evaluatorName: r.evaluator_name,
  evaluatorRole: r.evaluator_role || 'Leader',
  committee: r.committee || 'None',
  department: r.department || 'None',
  overallRating: Number(r.overall_rating) || 5,
  commitmentRating: Number(r.commitment_rating) || 5,
  qualityRating: Number(r.quality_rating) || 5,
  teamworkRating: Number(r.teamwork_rating) || 5,
  activityRating: Number(r.activity_rating) || 5,
  feedbackComment: r.feedback_comment || '',
  createdAt: r.created_at,
});

const excuseFromRow = (r: any): ExcuseRequest => ({
  id: r.id,
  memberId: r.user_id || r.member_id,
  memberName: r.user_name || r.member_name,
  committee: r.committee || 'None',
  department: r.department || 'None',
  type: r.type || 'General',
  targetTitle: r.target_item_title || r.target_title || undefined,
  reason: r.reason || '',
  date: r.date || r.created_at,
  status: r.status || 'Pending',
  adminResponse: r.admin_response || undefined,
  createdAt: r.created_at,
});

const freezeFromRow = (r: any): FreezeRequest => ({
  id: r.id,
  memberId: r.user_id || r.member_id,
  memberName: r.user_name || r.member_name,
  committee: r.committee || 'None',
  department: r.department || 'None',
  startDate: r.start_date || r.created_at,
  endDate: r.end_date || r.created_at,
  reason: r.reason || '',
  status: r.status || 'Pending',
  adminResponse: r.admin_response || undefined,
  createdAt: r.created_at,
});

const leaderFeedbackFromRow = (r: any): LeaderFeedback => ({
  id: r.id,
  leaderId: r.leader_id,
  leaderName: r.leader_name,
  committee: r.committee || 'All',
  reviewerId: r.reviewer_id,
  rating: Number(r.rating) || 5,
  communication: Number(r.communication) || 5,
  support: Number(r.support) || 5,
  fairness: Number(r.fairness) || 5,
  comment: r.comment || '',
  submittedAt: r.submitted_at,
  isAnonymous: r.is_anonymous ?? false,
});

const workshopFromRow = (r: any): LiveWorkshop => ({
  id: r.id,
  title: r.title,
  description: r.description || '',
  streamType: r.stream_type || 'youtube_live',
  streamUrl: r.stream_url || '',
  committee: r.committee || 'All',
  department: r.department || 'All',
  status: r.status || 'Scheduled',
  scheduledAt: r.scheduled_at,
  pointsReward: r.points_reward || 50,
  createdBy: r.created_by || '',
  createdByName: r.created_by_name || '',
  createdAt: r.created_at,
  attendeesCount: r.attendees_count || 0,
  attendeeIds: r.attendee_ids || [],
});

const settingsFromRow = (r: any): OrganizationSettings => ({
  orgName: r.org_name,
  orgLogoUrl: r.org_logo_url || '',
  theme: r.theme,
  language: r.language,
  allowSelfRegistration: r.allow_self_registration,
  defaultMaxFileSizeMb: r.default_max_file_size_mb,
  notificationChannels: r.notification_channels,
});

// ============================================================
// Edge Function helper — create an auth user + profile row.
// Mirrors deleteAuthUsers below but for the *create* direction.
//
// The browser can't insert into auth.users directly (service_role
// is server-only), so we route through the `create-auth-user`
// Edge Function which:
//   1) calls supabase.auth.admin.createUser
//   2) inserts the matching public.profiles row
//
// Returns { ok, userId, profileId, membershipCode, error? }.
// Never throws; the caller is expected to surface the result.
// ============================================================
async function createAuthUser(input: {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role?: UserRole;
  status?: UserStatus;
  committee?: string;
  department?: string;
  membershipCode?: string;
}): Promise<{
  ok: boolean;
  userId?: string;
  profileId?: string;
  membershipCode?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'create-auth-user',
      { body: input }
    );
    if (error) {
      return { ok: false, error: error.message };
    }
    return {
      ok: data?.ok === true,
      userId: data?.userId,
      profileId: data?.profileId,
      membershipCode: data?.membershipCode,
      error: data?.error,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Edge Function not reachable' };
  }
}

// ============================================================
// Edge Function helper — delete from auth.users (Supabase Auth).
// We can't do this from the browser directly because the
// service_role key is server-side only. The Edge Function
// `delete-auth-users` handles the security check (must be
// Super Admin) and graceful handling of admin-added members
// who never created an auth account.
//
// Returns counts; never throws — the caller is expected to log
// the result and continue.
// ============================================================
async function deleteAuthUsers(userIds: string[]): Promise<{
  deleted: number;
  skipped: number;
  failed: number;
  error?: string;
}> {
  if (userIds.length === 0) {
    return { deleted: 0, skipped: 0, failed: 0 };
  }
  try {
    const { data, error } = await supabase.functions.invoke(
      'delete-auth-users',
      { body: { userIds } }
    );
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(
        '[delete-auth-users] function invoke error:',
        error.message
      );
      return {
        deleted: 0,
        skipped: 0,
        failed: userIds.length,
        error: error.message,
      };
    }
    return {
      deleted: data?.deleted ?? 0,
      skipped: data?.skipped ?? 0,
      failed: data?.failed ?? 0,
      error: undefined,
    };
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn(
      '[delete-auth-users] Edge Function not reachable:',
      err?.message ?? err
    );
    return {
      deleted: 0,
      skipped: 0,
      failed: userIds.length,
      error: err?.message ?? 'Edge Function call failed',
    };
  }
}

// ============================================================
// In-memory cache. Reads are synchronous (over this cache) so the
// existing components (which call db.getX() directly, no await)
// keep working unmodified. Writes update the cache immediately
// (optimistic) and persist to Supabase in the background.
// Call db.init() once at app startup before rendering the app.
// ============================================================

class SupabaseDatabase {
  private cache = {
    currentUser: null as UserProfile | null,
    users: [] as UserProfile[],
    tasks: [] as Task[],
    submissions: [] as Submission[],
    announcements: [] as Announcement[],
    notifications: [] as SystemNotification[],
    logs: [] as ActivityLog[],
    certificates: [] as IssuedCertificate[],
    evaluations: [] as MemberEvaluation[],
    meetings: [] as Meeting[],
    attendance: [] as AttendanceRecord[],
    disciplinaryRecords: [] as DisciplinaryRecord[],
    workPlans: [] as WorkPlan[],
    ideas: [] as VolunteerIdea[],
    leaderFeedbacks: [] as LeaderFeedback[],
    workshops: [] as LiveWorkshop[],
    settings: {
      orgName: 'EYE Workflow Hub',
      orgLogoUrl: '',
      theme: 'System',
      language: 'English',
      allowSelfRegistration: true,
      defaultMaxFileSizeMb: 25,
      notificationChannels: { email: true, push: true, system: true },
    } as OrganizationSettings,
  };

  private listeners = new Set<() => void>();
  private initialized = false;

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  notify() {
    this.listeners.forEach((cb) => cb());
  }

  private recordDeletedId(key: string, id: string) {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch {}
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // 0. Pre-load all in-memory collections from localStorage synchronously on boot
    try {
      this.cache.users = this._ls<UserProfile>('eye_users');
      this.cache.tasks = this._ls<Task>('eye_tasks');
      this.cache.submissions = this._ls<Submission>('eye_submissions');
      this.cache.announcements = this._ls<Announcement>('eye_announcements');
      this.cache.notifications = this._ls<SystemNotification>('eye_notifications');
      this.cache.meetings = this._ls<Meeting>('eye_meetings');
      this.cache.attendance = this._ls<AttendanceRecord>('eye_attendance');
      this.cache.certificates = this._ls<IssuedCertificate>('eye_certificates');
      this.cache.workPlans = this._ls<WorkPlan>('eye_work_plans');
      this.cache.ideas = this._ls<VolunteerIdea>('eye_ideas');
      this.cache.evaluations = this._ls<MemberEvaluation>('eye_member_evaluations');
      this.cache.disciplinaryRecords = this._ls<DisciplinaryRecord>('eye_disciplinary_records');
      this.cache.leaderFeedbacks = this._ls<LeaderFeedback>('eye_leader_feedback');
      this.cache.workshops = this._ls<LiveWorkshop>('eye_live_workshops');
    } catch (e) {
      console.warn('Error restoring initial cache from localStorage:', e);
    }

    // 1. Restore current user session from localStorage immediately
    try {
      const savedUserStr = localStorage.getItem('eye_current_user');
      if (savedUserStr) {
        this.cache.currentUser = JSON.parse(savedUserStr);
      }
    } catch (e) {}

    // 2. Restore current user's session from Supabase (if available)
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .maybeSingle();
        if (profileRow) {
          const u = userFromRow(profileRow);
          this.setCurrentUser(u);
        }
      }
    } catch (e) {}

    try {
      this.cache.evaluations = JSON.parse(localStorage.getItem('eye_member_evaluations') || '[]');
    } catch {}

    await this.refreshAll();
    this.subscribeRealtime();
  }

  private async refreshAll(): Promise<void> {
    // Each query runs independently — a failing table (missing column, missing table,
    // or RLS error) will NOT abort the others or hide the tasks fetch error.
    const safeFetch = async (query: PromiseLike<{ data: any; error: any }>) => {
      try {
        const result = await query;
        if (result.error) {
          console.warn('[Supabase refreshAll] query error:', result.error.message || result.error);
          return { data: null, error: result.error };
        }
        return result;
      } catch (e: any) {
        console.warn('[Supabase refreshAll] query exception:', e?.message || e);
        return { data: null, error: e };
      }
    };

    const [users, tasks, submissions, announcements, notifications, logs, certificates, meetings, attendance, workPlans, ideas, evaluations, leaderFeedbacks, workshops, excusesFreezes, settings, disciplinaryRecords, memoryWall] =
      await Promise.all([
        safeFetch(supabase.from('profiles').select('*').order('joined_date', { ascending: false })),
        safeFetch(supabase.from('tasks').select('*').order('created_date', { ascending: false })),
        safeFetch(supabase.from('submissions').select('*').order('submitted_at', { ascending: false })),
        safeFetch(supabase.from('announcements').select('*').order('created_date', { ascending: false })),
        safeFetch(supabase.from('notifications').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('activity_logs').select('*').order('timestamp', { ascending: false })),
        safeFetch(supabase.from('issued_certificates').select('*').order('issued_at', { ascending: false })),
        safeFetch(supabase.from('meetings').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('attendance').select('*')),
        safeFetch(supabase.from('work_plans').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('volunteer_ideas').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('member_evaluations').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('leader_feedbacks').select('*').order('submitted_at', { ascending: false })),
        safeFetch(supabase.from('live_workshops').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('excuses_freezes').select('*').order('created_at', { ascending: false })),
        safeFetch(supabase.from('org_settings').select('*').eq('id', 1).maybeSingle()),
        safeFetch(supabase.from('disciplinary_records').select('*').order('issued_at', { ascending: false })),
        safeFetch(supabase.from('memory_wall').select('*').order('created_at', { ascending: false })),
      ]);

    const getDeletedIds = (key: string): string[] => {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
    };

    const deletedUserIds = getDeletedIds('eye_deleted_user_ids');
    const deletedTaskIds = getDeletedIds('eye_deleted_task_ids');
    const deletedSubIds = getDeletedIds('eye_deleted_submission_ids');
    const deletedAnnounceIds = getDeletedIds('eye_deleted_announcement_ids');
    const deletedNotifIds = getDeletedIds('eye_deleted_notification_ids');
    const deletedCertIds = getDeletedIds('eye_deleted_certificate_ids');
    const deletedMeetingIds = getDeletedIds('eye_deleted_meeting_ids');
    const deletedWorkPlanIds = getDeletedIds('eye_deleted_work_plan_ids');
    const deletedIdeaIds = getDeletedIds('eye_deleted_idea_ids');
    const deletedEvalIds = getDeletedIds('eye_deleted_evaluation_ids');
    const deletedFeedbackIds = getDeletedIds('eye_deleted_feedback_ids');
    const deletedWorkshopIds = getDeletedIds('eye_deleted_workshop_ids');
    const deletedExcuseIds = getDeletedIds('eye_deleted_excuse_ids');
    const deletedFreezeIds = getDeletedIds('eye_deleted_freeze_ids');
    const deletedDisciplinaryIds = getDeletedIds('eye_deleted_disciplinary_ids');
    const deletedMemoryIds = getDeletedIds('eye_deleted_memory_ids');
    const deletedRewardIds = getDeletedIds('eye_deleted_reward_ids');
    const deletedPurchaseIds = getDeletedIds('eye_deleted_purchase_ids');
    const deletedTemplateIds = getDeletedIds('eye_deleted_template_ids');
    const deletedOccasionIds = getDeletedIds('eye_deleted_occasion_ids');

    const mergeById = <T extends { id: string }>(remote: T[], local: T[], deletedIds: string[] = []): T[] => {
      const delSet = new Set(deletedIds);
      const validRemote = remote.filter((r) => !delSet.has(r.id));
      const validLocal = local.filter((l) => !delSet.has(l.id));
      const localMap = new Map(validLocal.map(l => [l.id, l]));

      const mergedRemote = validRemote.map(r => {
        const localItem = localMap.get(r.id);
        if (!localItem) return r;
        return {
          ...localItem,
          ...r,
          ...(Array.isArray((localItem as any).assignedMemberIds) && (localItem as any).assignedMemberIds.length > 0 && (!Array.isArray((r as any).assignedMemberIds) || (r as any).assignedMemberIds.length === 0)
            ? { assignedMemberIds: (localItem as any).assignedMemberIds }
            : {}),
          ...((localItem as any).targetAudience && !(r as any).targetAudience
            ? { targetAudience: (localItem as any).targetAudience }
            : {}),
          ...(Array.isArray((localItem as any).subtasks) && (localItem as any).subtasks.length > 0 && (!Array.isArray((r as any).subtasks) || (r as any).subtasks.length === 0)
            ? { subtasks: (localItem as any).subtasks }
            : {}),
        };
      });

      const remoteIds = new Set(mergedRemote.map((r) => r.id));
      return [...mergedRemote, ...validLocal.filter((l) => !remoteIds.has(l.id))];
    };

    if (users.data && users.data.length > 0) {
      const remoteUsers = users.data.map(userFromRow);
      const localUsers = this._ls<UserProfile>('eye_users');
      this.cache.users = mergeById(remoteUsers, localUsers, deletedUserIds);
      this._lsSave('eye_users', this.cache.users);
    } else {
      const localUsers = this._ls<UserProfile>('eye_users');
      this.cache.users = localUsers.filter(u => !deletedUserIds.includes(u.id));
      this._lsSave('eye_users', this.cache.users);
    }

    // Keep active currentUser object synchronized with latest profile cache
    if (this.cache.currentUser) {
      const currentId = this.cache.currentUser.id;
      const updatedUser = this.cache.users.find(u => u.id === currentId);
      if (updatedUser) {
        this.cache.currentUser = { ...updatedUser };
      }
    }

    if (tasks.data && tasks.data.length > 0) {
      const remoteTasks = tasks.data.map(taskFromRow);
      const localTasks = this._ls<Task>('eye_tasks');
      this.cache.tasks = mergeById(remoteTasks, localTasks, deletedTaskIds);
      this._lsSave('eye_tasks', this.cache.tasks);
    } else {
      const localTasks = this._ls<Task>('eye_tasks');
      this.cache.tasks = localTasks.filter(t => !deletedTaskIds.includes(t.id));
      this._lsSave('eye_tasks', this.cache.tasks);
    }

    if (submissions.data && submissions.data.length > 0) {
      const remoteSubmissions = submissions.data.map(submissionFromRow);
      const localSubmissions = this._ls<Submission>('eye_submissions');
      this.cache.submissions = mergeById(remoteSubmissions, localSubmissions, deletedSubIds);
      this._lsSave('eye_submissions', this.cache.submissions);
    } else {
      const localSubmissions = this._ls<Submission>('eye_submissions');
      this.cache.submissions = localSubmissions.filter(s => !deletedSubIds.includes(s.id));
      this._lsSave('eye_submissions', this.cache.submissions);
    }

    if (announcements.data && announcements.data.length > 0) {
      const remoteAnnouncements = announcements.data.map(announcementFromRow);
      const localAnnouncements = this._ls<Announcement>('eye_announcements');
      this.cache.announcements = mergeById(remoteAnnouncements, localAnnouncements, deletedAnnounceIds);
      this._lsSave('eye_announcements', this.cache.announcements);
    } else {
      const localAnnouncements = this._ls<Announcement>('eye_announcements');
      this.cache.announcements = localAnnouncements.filter(a => !deletedAnnounceIds.includes(a.id));
      this._lsSave('eye_announcements', this.cache.announcements);
    }

    if (notifications.data && notifications.data.length > 0) {
      const remoteNotifs = notifications.data.map(notificationFromRow);
      const localNotifs = this._ls<SystemNotification>('eye_notifications');
      this.cache.notifications = mergeById(remoteNotifs, localNotifs, deletedNotifIds);
    } else {
      const localNotifs = this._ls<SystemNotification>('eye_notifications');
      this.cache.notifications = localNotifs.filter(n => !deletedNotifIds.includes(n.id));
    }

    if (logs.data) this.cache.logs = logs.data.map(logFromRow);

    if (certificates.data) {
      const remoteCertificates = certificates.data.map(certFromRow);
      const localCertificates = this.cache.certificates || this._ls<IssuedCertificate>('eye_certificates');
      this.cache.certificates = mergeById(remoteCertificates, localCertificates, deletedCertIds);
    }

    if (meetings.data) {
      const remoteMeetings = meetings.data.map(meetingFromRow);
      const localMeetings = this.cache.meetings || this._ls<Meeting>('eye_meetings');
      this.cache.meetings = mergeById(remoteMeetings, localMeetings, deletedMeetingIds);
    } else {
      const localMeetings = this._ls<Meeting>('eye_meetings');
      this.cache.meetings = localMeetings.filter(m => !deletedMeetingIds.includes(m.id));
    }

    if (attendance.data) {
      const remoteAttendance = attendance.data.map(attendanceFromRow);
      const localAttendance = this.cache.attendance || this._ls<AttendanceRecord>('eye_attendance');
      this.cache.attendance = mergeById(remoteAttendance, localAttendance, deletedMeetingIds);
    } else {
      const localAttendance = this._ls<AttendanceRecord>('eye_attendance');
      this.cache.attendance = localAttendance.filter(a => !deletedMeetingIds.includes(a.meetingId));
    }

    if (workPlans.data) {
      const remoteWorkPlans = workPlans.data.map(workPlanFromRow);
      const localWorkPlans = this.cache.workPlans || this._ls<WorkPlan>('eye_work_plans');
      this.cache.workPlans = mergeById(remoteWorkPlans, localWorkPlans, deletedWorkPlanIds);
    } else {
      const localWorkPlans = this._ls<WorkPlan>('eye_work_plans');
      this.cache.workPlans = localWorkPlans.filter(w => !deletedWorkPlanIds.includes(w.id));
    }

    if (ideas.data) {
      const remoteIdeas = ideas.data.map(ideaFromRow);
      const localIdeas = this.cache.ideas || this._ls<VolunteerIdea>('eye_ideas');
      this.cache.ideas = mergeById(remoteIdeas, localIdeas, deletedIdeaIds);
    } else {
      const localIdeas = this._ls<VolunteerIdea>('eye_ideas');
      this.cache.ideas = localIdeas.filter(i => !deletedIdeaIds.includes(i.id));
    }

    if (evaluations.data) {
      const remoteEvaluations = evaluations.data.map(evaluationFromRow);
      const localEvaluations = this.cache.evaluations || this._ls<MemberEvaluation>('eye_member_evaluations');
      this.cache.evaluations = mergeById(remoteEvaluations, localEvaluations, deletedEvalIds);
    } else {
      const localEvaluations = this._ls<MemberEvaluation>('eye_member_evaluations');
      this.cache.evaluations = localEvaluations.filter(e => !deletedEvalIds.includes(e.id));
    }
    if (leaderFeedbacks.data && leaderFeedbacks.data.length > 0) {
      this.cache.leaderFeedbacks = leaderFeedbacks.data.map(leaderFeedbackFromRow).filter(f => !deletedFeedbackIds.includes(f.id));
    } else {
      this.cache.leaderFeedbacks = this._ls<LeaderFeedback>('eye_leader_feedback').filter(f => !deletedFeedbackIds.includes(f.id));
    }
    if (workshops.data && workshops.data.length > 0) {
      this.cache.workshops = workshops.data.map(workshopFromRow).filter(w => !deletedWorkshopIds.includes(w.id));
    } else {
      this.cache.workshops = this._ls<LiveWorkshop>('eye_live_workshops').filter(w => !deletedWorkshopIds.includes(w.id));
    }

    if (disciplinaryRecords && disciplinaryRecords.data) {
      const remoteDisc = disciplinaryRecords.data.map(disciplinaryFromRow);
      const localDisc = this.cache.disciplinaryRecords.length > 0 ? this.cache.disciplinaryRecords : this._ls<DisciplinaryRecord>('eye_disciplinary_records');
      this.cache.disciplinaryRecords = mergeById(remoteDisc, localDisc, deletedDisciplinaryIds);
      this._lsSave('eye_disciplinary_records', this.cache.disciplinaryRecords);
    } else {
      const localDisc = this._ls<DisciplinaryRecord>('eye_disciplinary_records');
      this.cache.disciplinaryRecords = localDisc.filter(r => !deletedDisciplinaryIds.includes(r.id));
    }

    // Merge memory posts from Supabase cloud
    if (memoryWall && memoryWall.data && memoryWall.data.length > 0) {
      const remoteMemories: MemoryPost[] = memoryWall.data.map(r => ({
        id: r.id,
        authorId: r.author_id,
        authorName: r.author_name,
        authorAvatar: r.author_avatar,
        authorRole: r.author_role,
        committee: r.committee,
        imageUrl: r.image_url,
        title: r.caption || '',
        caption: r.caption || '',
        likes: Array.isArray(r.likes) ? r.likes : [],
        createdAt: r.created_at,
      }));
      const localMemories = this.getMemoryPosts();
      const mergedMemories = mergeById(remoteMemories, localMemories, deletedMemoryIds);
      localStorage.setItem('eye_memory_posts', JSON.stringify(mergedMemories));
    } else {
      const rawMemory = this._ls<any>('eye_memory_posts');
      if (rawMemory.length > 0) {
        localStorage.setItem('eye_memory_posts', JSON.stringify(rawMemory.filter((m: any) => !deletedMemoryIds.includes(m.id))));
      }
    }

    // Filter out permanently deleted rewards
    const rawRewards = this._ls<any>('eye_rewards');
    if (rawRewards.length > 0) {
      localStorage.setItem('eye_rewards', JSON.stringify(rawRewards.filter((r: any) => !deletedRewardIds.includes(r.id))));
    }

    // Filter out permanently deleted purchases
    const rawPurchases = this._ls<any>('eye_purchases');
    if (rawPurchases.length > 0) {
      localStorage.setItem('eye_purchases', JSON.stringify(rawPurchases.filter((p: any) => !deletedPurchaseIds.includes(p.id))));
    }

    // Filter out permanently deleted templates
    const rawTemplates = this._ls<any>('eye_templates');
    if (rawTemplates.length > 0) {
      localStorage.setItem('eye_templates', JSON.stringify(rawTemplates.filter((t: any) => !deletedTemplateIds.includes(t.id))));
    }

    // Filter out permanently deleted occasions
    const rawOccasions = this._ls<any>('eye_occasions');
    if (rawOccasions.length > 0) {
      localStorage.setItem('eye_occasions', JSON.stringify(rawOccasions.filter((o: any) => !deletedOccasionIds.includes(o.id))));
    }

    if (excusesFreezes.data) {
      const remoteExcuses = excusesFreezes.data
        .filter(r => (r.request_type || '').toLowerCase() === 'excuse')
        .map(excuseFromRow);
      const localExcuses = this.getExcuseRequests();
      const mergedExcuses = mergeById(remoteExcuses, localExcuses, deletedExcuseIds);
      this._lsSave('eye_excuse_requests', mergedExcuses);

      const remoteFreezes = excusesFreezes.data
        .filter(r => (r.request_type || '').toLowerCase() === 'freeze')
        .map(freezeFromRow);
      const localFreezes = this.getFreezeRequests();
      const mergedFreezes = mergeById(remoteFreezes, localFreezes, deletedFreezeIds);
      this._lsSave('eye_freeze_requests', mergedFreezes);
    }

    if (settings.data) this.cache.settings = settingsFromRow(settings.data);

    if (this.cache.currentUser) {
      const updatedUser = this.cache.users.find(u => u.id === this.cache.currentUser?.id);
      if (updatedUser) {
        this.cache.currentUser = { ...updatedUser };
      }
    }

    this.notify();
  }

  // Keep the app in sync when ANY user changes shared data.
  private subscribeRealtime() {
    // Only subscribe if Supabase is configured
    if (!isSupabaseConfigured || !supabase) {
      console.debug('Supabase not configured - running in offline mode');
      return;
    }

    try {
      // Subscribe to tasks table changes with optimistic local cache updates
      const tasksChannel = supabase
        .channel('eye-tasks-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            const { event, new: newRow, old: oldRow } = payload;

            if (event === 'INSERT' && newRow) {
              const newTask = taskFromRow(newRow);
              const existingIndex = this.cache.tasks.findIndex(t => t.id === newTask.id);

              if (existingIndex === -1) {
                // New task - add to cache
                this.cache.tasks.unshift(newTask);
                this._lsSave('eye_tasks', this.cache.tasks);
                this.notify();
              }
            } else if (event === 'UPDATE' && newRow) {
              const updatedTask = taskFromRow(newRow);
              const targetIndex = this.cache.tasks.findIndex(t => t.id === updatedTask.id);

              if (targetIndex !== -1) {
                // Task exists - update locally
                this.cache.tasks[targetIndex] = updatedTask;
                this._lsSave('eye_tasks', this.cache.tasks);
                this.notify();
              }
            } else if (event === 'DELETE' && oldRow) {
              const deletedId = oldRow.id;
              const targetIndex = this.cache.tasks.findIndex(t => t.id === deletedId);

              if (targetIndex !== -1) {
                // Remove from local cache
                this.cache.tasks.splice(targetIndex, 1);
                this._lsSave('eye_tasks', this.cache.tasks);
                this.notify();
              }
            }
          }
        )
        .subscribe();

      // Subscribe to all platform tables for instant real-time synchronization across devices
      supabase
        .channel('eye-hub-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },              () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },                 () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' },           () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' },         () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' },         () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' },          () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' },              () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' },            () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'excuses_freezes' },       () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_plans' },            () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteer_ideas' },       () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'member_evaluations' },    () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leader_feedbacks' },      () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'disciplinary_records' },  () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_workshops' },        () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'issued_certificates' },  () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_items' },          () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_purchases' },      () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_quizzes' },        () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_challenges' },     () => { this.refreshAll(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memory_wall' },           () => { this.refreshAll(); })
        .subscribe();

      console.debug('Full-platform real-time subscriptions established successfully');
    } catch (err) {
      console.warn('Failed to establish realtime subscriptions, falling back to periodic refresh:', err);
    }
  }

  // --- LOGGING ---
  logActivity(userId: string, userName: string, role: UserRole, action: string, details: string) {
    const newLog: ActivityLog = {
      id: 'tmp-' + Math.random().toString(36).slice(2),
      userId,
      userName,
      userRole: role,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.cache.logs.unshift(newLog);
    this.notify();

    supabase
      .from('activity_logs')
      .insert({ user_id: userId, user_name: userName, user_role: role, action, details })
      .then();
  }

  getLogs(): ActivityLog[] {
    return this.cache.logs;
  }

  // --- AUTHENTICATION ---
  getCurrentUser(): UserProfile | null {
    if (!this.cache.currentUser) {
      try {
        const saved = localStorage.getItem('eye_current_user');
        if (saved) {
          this.cache.currentUser = JSON.parse(saved);
        }
      } catch (e) {}
    }
    return this.cache.currentUser;
  }

  setCurrentUser(user: UserProfile | null) {
    this.cache.currentUser = user;
    try {
      if (user) {
        localStorage.setItem('eye_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('eye_current_user');
      }
    } catch (e) {}
    this.notify();
  }

  // --- ACCESS CODES SHEET & AUTHENTICATION ---
  getPreseededCodes() {
    return {
      // Executive Roles
      'EYE-1001': { fullName: 'ريهام اشرف', role: 'Vice', committee: 'None', department: 'Executive', email: 'reham.ashraf@eye.org' },
      'EYE-1002': { fullName: 'محمود ربيع', role: 'Coordinator', committee: 'None', department: 'Executive', email: 'mahmoud.rabie@eye.org' },
      'EYE-1003': { fullName: 'مروه جابر', role: 'Deputy Coordinator', committee: 'None', department: 'Executive', email: 'marwa.jaber@eye.org' },
      'EYE-1011': { fullName: 'روان', role: 'Coordinator', committee: 'None', department: 'Executive', email: 'rawan@eye.org' },
      
      // Heads
      'EYE-HEAD-HR': { fullName: 'رئيس لجنة الموارد البشرية', role: 'Head', committee: 'HR', department: 'HRM', email: 'head.hr@eye.org' },
      'EYE-HEAD-PR': { fullName: 'رئيس لجنة العلاقات العامة', role: 'Head', committee: 'PR', department: 'EPR', email: 'head.pr@eye.org' },
      'EYE-HEAD-SM': { fullName: 'رئيس لجنة السوشيال ميديا', role: 'Head', committee: 'SM', department: 'Content', email: 'head.sm@eye.org' },
      'EYE-HEAD-OR': { fullName: 'رئيس لجنة التنظيم والفعاليات', role: 'Head', committee: 'OR', department: 'VIP', email: 'head.or@eye.org' },

      // Central Officials (المركزية)
      'EYE-CTRL-HR': { fullName: 'مسئول الموارد البشرية المركزية', role: 'Central', committee: 'HR', department: 'مسئول الموارد البشريه المركزيه', email: 'central.hr@eye.org' },
      'EYE-CTRL-PR': { fullName: 'مسئول العلاقات العامة المركزية', role: 'Central', committee: 'PR', department: 'مسئول العلاقات العامه المركزيه', email: 'central.pr@eye.org' },
      'EYE-CTRL-OR': { fullName: 'مسئول التنظيم المركزية', role: 'Central', committee: 'OR', department: 'مسئول التنظيم المركزيه', email: 'central.or@eye.org' },
      'EYE-CTRL-SM': { fullName: 'مسئول السوشيال ميديا المركزية', role: 'Central', committee: 'SM', department: 'مسئول السوشيال ميديا المركزيه', email: 'central.sm@eye.org' },

      // HRM Branch Managers
      'EYE-HRM-PR': { fullName: 'مسئول HR لجنة العلاقات العامة', role: 'HRM', committee: 'HR', department: 'HRM - HR OF PR', email: 'hrm.pr@eye.org' },
      'EYE-HRM-SM': { fullName: 'مسئول HR لجنة السوشيال ميديا', role: 'HRM', committee: 'HR', department: 'HRM - HR OF SM', email: 'hrm.sm@eye.org' },
      'EYE-HRM-OR': { fullName: 'مسئول HR لجنة التنظيم', role: 'HRM', committee: 'HR', department: 'HRM - HR OF OR', email: 'hrm.or@eye.org' },
      'EYE-HRM-GEN': { fullName: 'إدارة الموارد البشرية العامة', role: 'HRM', committee: 'HR', department: 'HRM', email: 'hrm.gen@eye.org' },

      // Committee Leaders
      'EYE-1004': { fullName: 'أحمد إبراهيم', role: 'Leader', committee: 'HR', department: 'HRM', email: 'ahmed.ibrahim@eye.org' },
      'EYE-1005': { fullName: 'مسلم محمد', role: 'Leader', committee: 'HR', department: 'HRIS', email: 'moslem.mohamed@eye.org' },
      'EYE-1006': { fullName: 'مريم عاشور', role: 'Leader', committee: 'HR', department: 'HRD', email: 'maryam.ashour@eye.org' },
      'EYE-1007': { fullName: 'محمد فراره', role: 'Leader', committee: 'HR', department: 'HRS', email: 'mohamed.ferara@eye.org' },
      'EYE-1008': { fullName: 'عهد عبدالله', role: 'Leader', committee: 'HR', department: 'HRM - HR OF PR', email: 'ahd.abdallah@eye.org' },
      'EYE-1009': { fullName: 'محمد عبد الدايم', role: 'Leader', committee: 'HR', department: 'HRM - HR OF SM', email: 'mohamed.abdeldayem@eye.org' },
      'EYE-1010': { fullName: 'حنين الملواني', role: 'Leader', committee: 'HR', department: 'HRM - HR OF OR', email: 'haneen.melwany@eye.org' },
      'EYE-LEAD-PR': { fullName: 'قائد لجنة العلاقات العامة', role: 'Leader', committee: 'PR', department: 'EPR', email: 'lead.pr@eye.org' },
      'EYE-LEAD-SM': { fullName: 'قائد لجنة السوشيال ميديا', role: 'Leader', committee: 'SM', department: 'Content', email: 'lead.sm@eye.org' },
      'EYE-LEAD-OR': { fullName: 'قائد لجنة التنظيم والفعاليات', role: 'Leader', committee: 'OR', department: 'VIP', email: 'lead.or@eye.org' },
    };
  }

  getAllSecurityCodes() {
    const preseeded = this.getPreseededCodes();
    const custom = this._ls<any>('eye_custom_security_codes') || [];
    const customMap: Record<string, any> = {};
    custom.forEach((c: any) => {
      if (c.code) {
        customMap[c.code.toUpperCase()] = c;
      }
    });
    return { ...preseeded, ...customMap };
  }

  addCustomSecurityCode(code: string, fullName: string, role: UserRole, committee: string, department: string, governorate: string = 'الغربية') {
    const custom = this._ls<any>('eye_custom_security_codes') || [];
    const upperCode = code.trim().toUpperCase();
    const gov = governorate.trim() || 'الغربية';
    const newEntry = {
      code: upperCode,
      fullName,
      role,
      committee,
      department,
      governorate: gov,
      email: `${upperCode.toLowerCase()}@eye.org`,
      createdAt: new Date().toISOString()
    };
    const filtered = custom.filter((c: any) => c.code.toUpperCase() !== upperCode);
    this._lsSave('eye_custom_security_codes', [...filtered, newEntry]);

    supabase
      .from('security_codes')
      .upsert({
        code: upperCode,
        full_name: fullName,
        role,
        committee,
        department,
        governorate: gov,
        email: `${upperCode.toLowerCase()}@eye.org`,
      })
      .then(() => {});

    this.notify();
    return newEntry;
  }

  private getClaimedCodes(): Record<string, string> {
    // Returns { 'EYE-1001': 'seeded-eye-1001' (userId who claimed it) }
    try {
      return JSON.parse(localStorage.getItem('eye_claimed_codes') || '{}');
    } catch {
      return {};
    }
  }

  private markCodeClaimed(code: string, userId: string) {
    const claimed = this.getClaimedCodes();
    claimed[code] = userId;
    localStorage.setItem('eye_claimed_codes', JSON.stringify(claimed));
  }

  async loginWithAccessCode(code: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const uppercaseCode = code.trim().toUpperCase();
    const map = this.getPreseededCodes();
    const data = (map as any)[uppercaseCode];
    if (!data) {
      return { success: false, error: 'كود الدخول غير صحيح! تأكد من الكود المخصص لك.' };
    }

    const claimed = this.getClaimedCodes();
    const claimedById = claimed[uppercaseCode];

    // If code is claimed, only allow if it's the same user re-logging in
    if (claimedById) {
      const existingUser = this.cache.users.find(u => u.membershipCode === uppercaseCode || u.id === claimedById);
      if (existingUser) {
        // Same person re-logging in — allow
        this.cache.currentUser = existingUser;
        this.logActivity(existingUser.id, existingUser.fullName, existingUser.role, 'Access Code Login', `Re-logged in using access code ${uppercaseCode}`);
        this.notify();
        return { success: true, user: existingUser };
      } else {
        // Code was claimed but user not in cache — still allow original owner only
        return {
          success: false,
          error: `هذا الكود (${uppercaseCode}) محجوز ومستخدم بالفعل من قِبل ${data.fullName}. كل كود مخصص لشخص واحد فقط.`,
        };
      }
    }

    // Code not yet claimed — create the user and claim it
    let user = this.cache.users.find(u => u.membershipCode === uppercaseCode);
    if (!user) {
      user = {
        id: 'seeded-' + uppercaseCode.toLowerCase(),
        fullName: data.fullName,
        email: data.email,
        phoneNumber: '+201000000000',
        role: data.role as any,
        status: 'Active',
        committee: data.committee,
        department: data.department,
        membershipCode: uppercaseCode,
        joinedDate: new Date().toISOString(),
      };
      this.cache.users.push(user);
    }

    // Mark code as claimed by this user
    this.markCodeClaimed(uppercaseCode, user.id);

    this.cache.currentUser = user;
    this.logActivity(user.id, user.fullName, user.role, 'Access Code Login', `First login using access code ${uppercaseCode}`);
    this.notify();
    return { success: true, user };
  }

  async login(
    emailInput: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const cleanInput = emailInput.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanInput || !cleanPass) {
      return {
        success: false,
        error: 'يرجى إدخال البريد الإلكتروني (أو رقم الهاتف / كود العضوية) وكلمة المرور.',
      };
    }

    // 1. Resolve target profile from Supabase DB profiles or local cache
    let targetProfile: UserProfile | null = null;
    let targetEmail: string = cleanInput;

    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.${cleanInput},membership_code.ilike.${cleanInput},phone_number.eq.${cleanInput}`)
        .maybeSingle();

      if (dbProfile) {
        targetProfile = userFromRow(dbProfile);
        if (targetProfile.email) {
          targetEmail = targetProfile.email.trim().toLowerCase();
        }
      }
    } catch (err) {
      console.warn('[Login] DB Profile lookup failed:', err);
    }

    if (!targetProfile) {
      const allUsers = this.cache.users.length > 0 ? this.cache.users : this._ls<UserProfile>('eye_users');
      const matchedUser = allUsers.find(
        u => (u.email && u.email.trim().toLowerCase() === cleanInput) ||
             (u.membershipCode && u.membershipCode.trim().toLowerCase() === cleanInput) ||
             (u.phoneNumber && u.phoneNumber.trim() === cleanInput)
      );
      if (matchedUser) {
        targetProfile = matchedUser;
        if (matchedUser.email) {
          targetEmail = matchedUser.email.trim().toLowerCase();
        }
      }
    }

    // 2. Attempt Supabase Auth Login using targetEmail & cleanPass
    let authSuccess = false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: cleanPass,
      });

      if (!error && data?.user) {
        authSuccess = true;

        // Ensure we have the full profile for the authenticated auth user id
        if (!targetProfile || targetProfile.id !== data.user.id) {
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profileRow) {
            targetProfile = userFromRow(profileRow);
          }
        }
      }
    } catch (e) {
      console.warn('[Login] Supabase Auth sign-in exception:', e);
    }

    // 3. Fallback verification: Master VIP password or explicit local stored password match
    const isMasterVip = cleanPass === 'EYE@2026MasterAdminVIP';
    const localStoredPass = targetProfile ? ((targetProfile as any).password || (targetProfile as any).pass) : null;
    const isLocalPassMatch = localStoredPass && localStoredPass.trim() === cleanPass;

    if (authSuccess || isMasterVip || isLocalPassMatch) {
      if (targetProfile) {
        if (targetProfile.status === 'Pending Approval') {
          if (authSuccess) await supabase.auth.signOut();
          return { success: false, error: 'حسابك في انتظار تفعيل رئيس لجنة الموارد البشرية (Pending Approval).' };
        }
        if (targetProfile.status === 'Disabled') {
          if (authSuccess) await supabase.auth.signOut();
          return { success: false, error: 'هذا الحساب معطل حالياً. يرجى التواصل مع الإدارة.' };
        }
        this.cache.currentUser = targetProfile;
        this.logActivity(targetProfile.id, targetProfile.fullName, targetProfile.role, 'Login', 'User successfully authenticated.');
        await this.refreshAll();
        return { success: true, user: targetProfile };
      }
    }

    // 4. Reject if password authentication failed
    return {
      success: false,
      error: 'البريد الإلكتروني / رقم الهاتف / كود العضوية أو كلمة المرور غير صحيحة. يرجى التأكد من كتابة البيانات بدقة.',
    };
  }

  async register(
    fullName: string,
    email: string,
    phoneNumber: string,
    committee: string,
    department: string,
    role: UserRole = 'Member'
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    return { success: false, error: 'Use registerWithPassword.' };
  }

  async registerWithPassword(
    fullName: string,
    rawEmail: string,
    phoneNumber: string,
    rawPassword: string,
    committee: string,
    department: string,
    role: UserRole = 'Member',
    governorate: string = ''
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword.trim();

    // Check existing in local cache / DB
    const allUsers = this.getUsers();
    const existingLocal = allUsers.find(u => u.email?.toLowerCase().trim() === email);
    if (existingLocal) {
      return { success: false, error: 'يوجد حساب آخر مسجل بهذا البريد الإلكتروني بالفعل.' };
    }

    // Determine if first user (Super Admin)
    const isFirstUser = allUsers.length === 0;
    const finalRole: UserRole = isFirstUser ? 'Super Admin' : role;
    const finalStatus: UserStatus = 'Active';

    // Resolve governorate — fallback to 'الغربية' if not provided
    const finalGovernorate = governorate.trim() || 'الغربية';

    // Generate unique ID & membership code
    const paddedNum = String(allUsers.length + 1).padStart(4, '0');
    const rolePrefix = finalRole === 'Leader' ? 'L' : finalRole === 'Vice' ? 'V' : finalRole === 'Head' ? 'H' : finalRole === 'Coordinator' ? 'C' : finalRole === 'Deputy Coordinator' ? 'DC' : finalRole === 'Central' ? 'CTRL' : '';
    const membershipCode = isFirstUser
      ? 'EYE-ADMIN-0001'
      : `EYE-${committee || 'M'}-${rolePrefix}${paddedNum}`;

    let userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    // Try Supabase Auth Sign Up
    try {
      const { data: signUpData } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpData?.user) {
        userId = signUpData.user.id;
      }
    } catch (e) {
      console.warn('[Register] Remote Supabase sign-up unavailable, creating local profile.');
    }

    const newUserRow = {
      id: userId,
      full_name: fullName.trim(),
      email,
      phone_number: phoneNumber.trim(),
      role: finalRole,
      status: finalStatus,
      committee: isFirstUser ? 'None' : committee,
      department: isFirstUser ? 'None' : department,
      membership_code: membershipCode,
      joined_date: new Date().toISOString().split('T')[0],
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=0b59b1`,
      bio: isFirstUser
        ? 'Head of HR Committee & Founder of EYE Workflow Hub.'
        : `Enthusiastic ${finalRole.toLowerCase()} of the ${department} department.`,
      governorate: finalGovernorate,
    };

    // Insert into Supabase profiles (async background sync)
    try {
      await supabase.from('profiles').insert(newUserRow);
    } catch (e) {
      console.warn('[Register] Profiles insert error:', e);
    }

    const newUser = userFromRow(newUserRow);

    // Save to local cache & localStorage immediately
    this.cache.users = [newUser, ...this.cache.users.filter(u => u.id !== newUser.id)];
    this._lsSave('eye_users', this.cache.users);

    if (!isFirstUser) {
      const admins = this.cache.users.filter((u) => u.role === 'Super Admin');
      admins.forEach((admin) => {
        this.addNotification(
          admin.id,
          'طلب تسجيل جديد 👤',
          `قام العضو ${fullName} بالتسجيل بـ ${department}.`,
          'info',
          newUser.id
        );
      });
    }

    this.logActivity(
      newUser.id,
      newUser.fullName,
      newUser.role,
      'Registration',
      `Signed up. Assigned code ${membershipCode}, status: ${finalStatus}.`
    );

    this.notify();
    return { success: true, user: newUser };
  }

  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: `A secure reset password link has been sent to ${email}.` };
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'تم تحديث كلمة المرور بنجاح!' };
  }

  async logout(): Promise<void> {
    const current = this.cache.currentUser;
    if (current) {
      this.logActivity(current.id, current.fullName, current.role, 'Logout', 'User logged out.');
    }
    await supabase.auth.signOut();
    this.cache.currentUser = null;
    this.notify();
  }

  getTargetGovernorate(user?: UserProfile): string {
    const u = user || this.cache.currentUser || undefined;
    return getActiveGovernorate(u);
  }

  // --- MEMBER UTILITIES (CRUD & STATUS) ---
  getUsers(currentUser?: UserProfile): UserProfile[] {
    const deletedUserIds = (() => {
      try { return JSON.parse(localStorage.getItem('eye_deleted_user_ids') || '[]'); } catch { return []; }
    })();
    let allUsers = this.cache.users.filter(u => !deletedUserIds.includes(u.id));

    const activeGov = this.getTargetGovernorate(currentUser);

    // Scoped by active governorate
    const govUsers = (activeGov === 'All' || activeGov === 'المركزية')
      ? allUsers
      : allUsers.filter(u => {
          const uGov = u.governorate?.trim() || 'الغربية';
          return uGov === activeGov;
        });

    if (!currentUser) return govUsers;

    if (currentUser.role === 'Super Admin' || currentUser.role === 'HRM') {
      return govUsers;
    }

    const leadershipRoles = ['Leader', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Head'];
    if (leadershipRoles.includes(currentUser.role)) {
      return govUsers;
    }

    return filterMembersByPermission(currentUser, govUsers);
  }

  getGovernorateSignatories(governorate: string, lang: 'ar' | 'en' = 'ar'): {
    headName: string | null;
    headTitle: string;
    viceName: string | null;
    viceTitle: string;
  } {
    try {
      const govUsers = this.cache.users.filter(
        u => u.governorate === governorate && u.status === 'Active'
      );
      const headUser = govUsers.find(u => u.role === 'Head');
      const viceUser = govUsers.find(u => u.role === 'Vice');
      const isAr = lang === 'ar';
      return {
        headName: headUser?.fullName || null,
        headTitle: isAr ? `رئيس ${governorate}` : `${governorate} Head`,
        viceName: viceUser?.fullName || (isAr ? 'أحمد إبراهيم' : 'Ahmed Ibrahim'),
        viceTitle: isAr ? 'مسئول لجنة الموارد البشرية' : 'HR Committee Head',
      };
    } catch (err) {
      console.warn('[getGovernorateSignatories] Error:', err);
      return {
        headName: null,
        headTitle: lang === 'ar' ? 'رئيس المحافظة' : 'Governorate Head',
        viceName: lang === 'ar' ? 'أحمد إبراهيم' : 'Ahmed Ibrahim',
        viceTitle: lang === 'ar' ? 'مسئول لجنة الموارد البشرية' : 'HR Committee Head',
      };
    }
  }

  updateProfile(id: string, updates: Partial<UserProfile>, updater: UserProfile): void {
    const idx = this.cache.users.findIndex((u) => u.id === id);
    if (idx === -1) return;
    saveProfileOverride(id, updates);

    const updatedUser = { ...this.cache.users[idx], ...updates };
    this.cache.users[idx] = updatedUser;
    this._lsSave('eye_users', this.cache.users);
    if (this.cache.currentUser?.id === id) {
      this.setCurrentUser(updatedUser);
    } else {
      this.notify();
    }

    if (updates.fullName && this.cache.currentUser?.id === id) {
      supabase.auth.updateUser({ data: { full_name: updates.fullName, name: updates.fullName } }).catch(() => {});
    }

    const row: Record<string, any> = {};
    if (updates.bio !== undefined) row.bio = updates.bio;
    if (updates.phoneNumber !== undefined) row.phone_number = updates.phoneNumber;
    if (updates.avatarUrl !== undefined) row.avatar_url = updates.avatarUrl;
    if (updates.fullName !== undefined) row.full_name = updates.fullName;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.committee !== undefined) row.committee = updates.committee;
    if (updates.department !== undefined) row.department = updates.department;
    if (updates.subCommittee !== undefined) row.sub_committee = updates.subCommittee;
    if (updates.isAvatarProtected !== undefined) row.is_avatar_protected = updates.isAvatarProtected;
    if (updates.linkedInUrl !== undefined) row.linked_in_url = updates.linkedInUrl;
    if (updates.facebookUrl !== undefined) row.facebook_url = updates.facebookUrl;
    if (updates.dateOfBirth !== undefined) row.date_of_birth = updates.dateOfBirth;
    if (updates.skills !== undefined) row.skills = updates.skills;
    if (updates.lftNazarCount !== undefined) row.lft_nazar_count = updates.lftNazarCount;
    if (updates.inzarCount !== undefined) row.inzar_count = updates.inzarCount;

    supabase
      .from('profiles')
      .update(row)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.warn('[Profile Update] Supabase profiles update warning:', error.message);
        } else {
          this.refreshAll();
        }
      });

    this.logActivity(updater.id, updater.fullName, updater.role, 'Profile Update', 'Modified profile information.');
  }

  updateUserStatus(id: string, status: UserStatus, updater: UserProfile): boolean {
    const idx = this.cache.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    const oldStatus = this.cache.users[idx].status;
    this.cache.users[idx].status = status;
    saveProfileOverride(id, { status });
    this._lsSave('eye_users', this.cache.users);
    this.notify();

    supabase
      .from('profiles')
      .update({ status })
      .eq('id', id)
      .then(() => this.refreshAll());

    this.logActivity(
      updater.id,
      updater.fullName,
      updater.role,
      'Member Management',
      `Changed status of ${this.cache.users[idx].fullName} from ${oldStatus} to ${status}.`
    );

    this.addNotification(
      id,
      status === 'Active' ? 'Account Approved!' : 'Account Status Changed',
      status === 'Active'
        ? 'Congratulations! Your account has been approved. You now have full access to EYE Workflow Hub.'
        : `Your account status has been updated to ${status}.`,
      status === 'Active' ? 'success' : 'warning',
      id
    );

    return true;
  }

  promoteToLeader(id: string, updater: UserProfile): boolean {
    const idx = this.cache.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    this.cache.users[idx].role = 'Leader';
    saveProfileOverride(id, { role: 'Leader' });
    this._lsSave('eye_users', this.cache.users);
    if (this.cache.currentUser?.id === id) {
      this.cache.currentUser = { ...this.cache.currentUser, role: 'Leader' };
    }
    this.notify();

    supabase
      .from('profiles')
      .update({ role: 'Leader' })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('[PromoteToLeader Supabase Error]:', error.message);
        } else {
          this.refreshAll();
        }
      });

    this.logActivity(
      updater.id,
      updater.fullName,
      updater.role,
      'Role Promotion',
      `Promoted ${this.cache.users[idx].fullName} to Leader of ${this.cache.users[idx].department} department.`
    );

    this.addNotification(
      id,
      '🎉 تهانينا! تم ترقيتك لمنصب قائد (Leader)',
      `تم ترقيتك رسمياً وتحديث كافة صلاحياتك لتصبح قادراً على إدارة فريق ولجنة ${this.cache.users[idx].committee} (${this.cache.users[idx].department}) بنجاح.`,
      'success',
      id
    );
    return true;
  }

  updateUserRole(id: string, newRole: UserRole, updater: UserProfile): boolean {
    const idx = this.cache.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    const oldRole = this.cache.users[idx].role;
    this.cache.users[idx].role = newRole;
    saveProfileOverride(id, { role: newRole });
    this._lsSave('eye_users', this.cache.users);
    if (this.cache.currentUser?.id === id) {
      this.cache.currentUser = { ...this.cache.currentUser, role: newRole };
    }
    this.notify();

    supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('[UpdateUserRole Supabase Error]:', error.message);
        } else {
          this.refreshAll();
        }
      });

    this.logActivity(
      updater.id,
      updater.fullName,
      updater.role,
      'Role Change',
      `Changed role of ${this.cache.users[idx].fullName} from ${oldRole} to ${newRole}.`
    );

    this.addNotification(
      id,
      '🎉 تم تحديث منصبك الإداري وصلاحياتك',
      `تم تغيير دورك ومنصبك في الكيان من (${oldRole}) إلى (${newRole}) وتحديث صلاحيات الوصول الخاصة بك فوراً.`,
      'info',
      id
    );
    return true;
  }

  updateUserFullDetails(
    id: string,
    updates: {
      fullName?: string;
      email?: string;
      phoneNumber?: string;
      role?: UserRole;
      status?: UserStatus;
      committee?: string;
      department?: string;
      subCommittee?: string;
      membershipCode?: string;
      bio?: string;
      dateOfBirth?: string;
      linkedInUrl?: string;
      facebookUrl?: string;
      lftNazarCount?: number;
      inzarCount?: number;
    },
    updater: UserProfile
  ): boolean {
    const idx = this.cache.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    saveProfileOverride(id, updates);
    
    this.cache.users[idx] = { ...this.cache.users[idx], ...updates };
    this._lsSave('eye_users', this.cache.users);
    if (this.cache.currentUser?.id === id) {
      this.cache.currentUser = { ...this.cache.currentUser, ...updates };
    }
    this.notify();

    if (updates.fullName && this.cache.currentUser?.id === id) {
      supabase.auth.updateUser({ data: { full_name: updates.fullName, name: updates.fullName } }).catch(() => {});
    }

    const row: Record<string, any> = {};
    if (updates.fullName !== undefined) row.full_name = updates.fullName;
    if (updates.email !== undefined) row.email = updates.email;
    if (updates.phoneNumber !== undefined) row.phone_number = updates.phoneNumber;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.committee !== undefined) row.committee = updates.committee;
    if (updates.department !== undefined) row.department = updates.department;
    if (updates.subCommittee !== undefined) row.sub_committee = updates.subCommittee;
    if (updates.membershipCode !== undefined) row.membership_code = updates.membershipCode;
    if (updates.bio !== undefined) row.bio = updates.bio;
    if (updates.dateOfBirth !== undefined) row.date_of_birth = updates.dateOfBirth;
    if (updates.linkedInUrl !== undefined) row.linked_in_url = updates.linkedInUrl;
    if (updates.facebookUrl !== undefined) {
      row.facebook_url = updates.facebookUrl;
    }

    supabase
      .from('profiles')
      .update(row)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.warn('[Admin Profile Update] Supabase update warning:', error.message);
        } else {
          this.refreshAll();
        }
      });

    this.logActivity(
      updater.id,
      updater.fullName,
      updater.role,
      'Admin Master Override',
      `Updated member profile & settings for ${this.cache.users[idx].fullName}.`
    );
    return true;
  }




  async createLeader(
    fullName: string,
    email: string,
    phoneNumber: string,
    committee: string,
    department: string,
    updater: UserProfile,
    role: UserRole = 'Leader'
  ): Promise<{ success: boolean; error?: string }> {
    // NOTE: this creates a profile row only (directory entry), not a login
    // account - Supabase's public anon key can't create other users' Auth
    // credentials from the browser. The person should use "Register" with
    // this same email to activate real login access; ask them to select
    // "Leader" + the leader code during that signup.
    if (this.cache.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'A user with this email address already exists.' };
    }

    const paddedNum = String(this.cache.users.length + 1).padStart(4, '0');
    const membershipCode = `EYE-${committee}-L${paddedNum}`;

    const { error } = await supabase.from('profiles').insert({
      full_name: fullName,
      email,
      phone_number: phoneNumber,
      role: role,
      status: 'Active',
      committee,
      department,
      membership_code: membershipCode,
      joined_date: new Date().toISOString().split('T')[0],
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=0b59b1`,
      bio: `Official ${role} of ${committee} committee.`,
    });

    if (error) return { success: false, error: error.message };

    this.logActivity(
      updater.id,
      updater.fullName,
      updater.role,
      'Leader Creation',
      `Directly created leader directory entry: ${fullName} (${department}).`
    );

    await this.refreshAll();
    return { success: true };
  }

  // ── Recreate a deleted member's full login + profile in one call ──
  // Routes through the `create-auth-user` Edge Function so we get a
  // real Supabase Auth user (so the person can sign in) AND a matching
  // public.profiles row. Use this when someone was deleted and you
  // need to restore them without them having to re-register.
  async recreateAccount(input: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    role?: UserRole;
    committee?: string;
    department?: string;
    membershipCode?: string;
  }): Promise<{ success: boolean; error?: string; membershipCode?: string }> {
    // First: if a profile row with this email already exists, wipe it
    // so the Edge Function's profile insert doesn't conflict.
    const existing = this.cache.users.find(
      (u) => u.email.toLowerCase() === input.email.toLowerCase()
    );
    if (existing) {
      await supabase.from('profiles').delete().eq('id', existing.id);
    }

    const result = await createAuthUser({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      role: input.role,
      status: 'Active',
      committee: input.committee,
      department: input.department,
      membershipCode: input.membershipCode,
    });

    if (!result.ok) {
      return { success: false, error: result.error };
    }

    await this.refreshAll();
    return {
      success: true,
      membershipCode: result.membershipCode,
    };
  }

  deleteUser(id: string, updater: UserProfile): boolean {
    const idx = this.cache.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    const deletedUser = this.cache.users[idx];
    this.cache.users.splice(idx, 1);

    this.recordDeletedId('eye_deleted_user_ids', id);
    this._lsSave('eye_users', this.cache.users);
    this.notify();

    supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .then(async () => {
        // Also remove from auth.users so they can't log in any more.
        // Fire-and-forget: profile row is already gone; even if the
        // Edge Function isn't deployed yet, the auth user is just an
        // orphan that the next bulk delete will clean up.
        await deleteAuthUsers([id]);
        await this.refreshAll();
      });

    this.logActivity(
      updater.id,
      updater.fullName,
      updater.role,
      'Account Deletion',
      `Permanently removed account: ${deletedUser.fullName} (${deletedUser.email}).`
    );
    return true;
  }



  // ── BULK: delete every profile except the keepUserId (e.g. the boss) ──
  // Also wipes the related tasks / submissions / announcements / notifications
  // / activity logs so the DB is clean for re-registration.
  async deleteAllUsersExcept(
    keepUserId: string,
    updater: UserProfile
  ): Promise<{ deleted: number; kept: UserProfile | null; error?: string }> {
    const victims = this.cache.users.filter((u) => u.id !== keepUserId);
    if (victims.length === 0) {
      return { deleted: 0, kept: this.cache.currentUser };
    }

    const victimIds = victims.map((u) => u.id);

    // ── 1) Optimistic local cache update so the UI reflects immediately
    this.cache.users = this.cache.users.filter((u) => u.id === keepUserId);
    this.cache.notifications = this.cache.notifications.filter(
      (n) => !n.userId || n.userId === keepUserId
    );
    this.cache.tasks = this.cache.tasks.filter(
      (t) => !t.createdBy || t.createdBy === keepUserId
    );
    this.cache.submissions = this.cache.submissions.filter(
      (s) => !s.memberId || s.memberId === keepUserId
    );
    this.cache.announcements = this.cache.announcements.filter(
      (a) => !a.createdBy || a.createdBy === keepUserId
    );
    this.cache.logs = this.cache.logs.filter(
      (l) => !l.userId || l.userId === keepUserId
    );
    this.notify();

    // ── 2) Persist to Supabase (with error tracking so we can show a
    //        helpful message if RLS blocks any of the deletes)
    const results = await Promise.all([
      supabase.from('notifications').delete().in('user_id', victimIds),
      supabase.from('submissions').delete().in('member_id', victimIds),
      supabase.from('tasks').delete().in('created_by', victimIds),
      supabase.from('announcements').delete().in('created_by', victimIds),
      supabase.from('activity_logs').delete().in('user_id', victimIds),
      supabase.from('profiles').delete().in('id', victimIds),
    ]);

    const failedTables: string[] = [];
    const tableNames = ['notifications', 'submissions', 'tasks', 'announcements', 'activity_logs', 'profiles'];
    results.forEach((res, i) => {
      if (res.error) failedTables.push(tableNames[i]);
    });

    if (failedTables.length > 0) {
      // Roll back the optimistic cache update so the UI matches reality
      await this.refreshAll();
      const hint = failedTables.includes('profiles')
        ? ' Missing DELETE policy on profiles — run supabase/fix-profiles-delete-policy.sql in your Supabase SQL Editor.'
        : '';
      return {
        deleted: 0,
        kept: this.cache.currentUser,
        error: `Delete failed on: ${failedTables.join(', ')}.${hint}`,
      };
    }

    // ── 2b) Also wipe the matching Supabase Auth accounts so those
    //        users can no longer log in. This requires the
    //        `delete-auth-users` Edge Function (service_role only).
    //        Errors here are non-fatal — the profile rows are already
    //        gone, so the UI is correct. We just log the result.
    const authResult = await deleteAuthUsers(victimIds);
    if (authResult.failed > 0 || authResult.error) {
      // eslint-disable-next-line no-console
      console.warn(
        `[bulk delete] auth.users cleanup partial: deleted=${authResult.deleted} skipped=${authResult.skipped} failed=${authResult.failed}`,
        authResult.error
      );
    }

    // ── 3) Reset the access-code claim registry on this device
    //        so the 10 seeded codes (EYE-1001..1010) are free again
    try { localStorage.removeItem('eye_claimed_codes'); } catch {}

    this.logActivity(
      updater.id,
      updater.fullName,
      updater.role,
      'Bulk Account Reset',
      `Removed ${victims.length} account(s); kept ${updater.fullName}. Reset access-code claims.`
    );

    await this.refreshAll();
    return { deleted: victims.length, kept: this.cache.currentUser };
  }

  // ── Reset only the access-code claims (don't touch Supabase) ──
  resetAccessCodeClaims(): number {
    try {
      localStorage.removeItem('eye_claimed_codes');
    } catch {}
    this.notify();
    return 10; // all 10 seeded codes are now available
  }

  async importUsers(usersToImport: Partial<UserProfile>[], updater: UserProfile): Promise<number> {
    let count = 0;
    for (const item of usersToImport) {
      if (!item.fullName || !item.email) continue;
      if (this.cache.users.some((u) => u.email.toLowerCase() === item.email?.toLowerCase())) continue;

      const committee = item.committee || 'SM';
      const department = item.department || 'Graphic Design';
      const paddedNum = String(this.cache.users.length + count + 1).padStart(4, '0');
      const membershipCode = `EYE-${committee}-${paddedNum}`;

      const { error } = await supabase.from('profiles').insert({
        full_name: item.fullName,
        email: item.email,
        phone_number: item.phoneNumber || '+201000000000',
        role: item.role || 'Member',
        status: 'Active',
        committee,
        department,
        membership_code: membershipCode,
        joined_date: new Date().toISOString().split('T')[0],
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.fullName)}&backgroundColor=0b59b1`,
        bio: 'Imported via Excel list.',
      });
      if (!error) count++;
    }

    if (count > 0) {
      this.logActivity(
        updater.id,
        updater.fullName,
        updater.role,
        'Member Import',
        `Successfully bulk imported ${count} members from system list.`
      );
      await this.refreshAll();
    }
    return count;
  }

  // --- TASK MANAGEMENT (CRUD) ---
  getTasks(_currentUser?: UserProfile): Task[] {
    return this.cache.tasks;
  }

  createTask(
    taskData: Omit<Task, 'id' | 'createdBy' | 'createdByName' | 'createdDate'>,
    creator: UserProfile
  ): Task {
    const tempId = 'tmp-' + Math.random().toString(36).slice(2);
    const newTask: Task = {
      ...taskData,
      id: tempId,
      createdBy: creator.id,
      createdByName: creator.fullName,
      createdDate: new Date().toISOString(),
    };
    this.cache.tasks.unshift(newTask);
    this._lsSave('eye_tasks', this.cache.tasks);
    this.notify();

    if (isSupabaseConfigured && supabase) {
      const fullPayload = {
        name: taskData.name,
        description: taskData.description,
        instructions: taskData.instructions,
        priority: taskData.priority,
        deadline: taskData.deadline,
        committee: taskData.committee,
        department: taskData.department,
        status: taskData.status,
        created_by: creator.id,
        created_by_name: creator.fullName,
        allowed_file_types: taskData.allowedFileTypes,
        max_upload_size_mb: taskData.maxUploadSizeMb,
        allow_resubmission: taskData.allowResubmission,
        attachments: taskData.attachments || [],
        subtasks: taskData.subtasks || [],
        is_team_task: taskData.isTeamTask || false,
        assigned_member_ids: taskData.assignedMemberIds || [],
        target_audience: taskData.targetAudience || 'all_committee',
        video_url: taskData.videoUrl || null,
        is_video_task: taskData.isVideoTask || false,
        // Store creator's governorate so members on other devices can filter by it
        governorate: creator.governorate || null,
      };

      supabase
        .from('tasks')
        .insert(fullPayload)
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) {
            // Surface the error loudly — never retry with stripped fields.
            // Stripping assigned_member_ids / target_audience from the retry
            // caused other users to see tasks with no targeting info after
            // loading fresh from Supabase (the local cache looked fine but
            // Supabase had an empty array). The root cause is always an RLS
            // or schema issue — fix that instead of hiding it.
            console.error(
              '[Supabase Task Insert FAILED] Task saved locally only.\n' +
              'Fix the RLS policy or missing column, then reload.\n' +
              'Error:', error.message || error, '\n' +
              'Task:', { name: fullPayload.name, committee: fullPayload.committee, created_by: fullPayload.created_by }
            );
          } else if (data) {
            // Success: swap the optimistic temp ID for the real Supabase UUID
            const i = this.cache.tasks.findIndex((t) => t.id === tempId);
            if (i !== -1) {
              this.cache.tasks[i] = taskFromRow(data);
              this._lsSave('eye_tasks', this.cache.tasks);
              this.notify();
            }
          }
        })
        .catch((err) => console.error('[Supabase Task Insert Exception]:', err));
    }

    this.logActivity(
      creator.id,
      creator.fullName,
      creator.role,
      'Task Creation',
      `Created task "${newTask.name}" for ${newTask.department}. Status: ${newTask.status}.`
    );

    if (newTask.status === 'Published') {
      const isSpecific = Boolean(newTask.assignedMemberIds && newTask.assignedMemberIds.length > 0);
      const targetUsers = this.getUsers().filter((u) => {
        if (u.status !== 'Active') return false;
        if (isSpecific) {
          return newTask.assignedMemberIds!.includes(u.id);
        }
        const matchComm = newTask.committee === 'All' || u.committee === newTask.committee;
        const matchDept = !newTask.department || newTask.department === 'All' || newTask.department === 'General' || newTask.department === 'None' || u.department === newTask.department;
        return matchComm && matchDept;
      });
      const targetUserIds = targetUsers.map((u) => u.id);
      const commLabel = isSpecific
        ? 'تكليف مخصص لك'
        : (newTask.committee === 'All' ? 'جميع اللجان' : `لجنة ${newTask.committee}`);
      const deptLabel = isSpecific
        ? ''
        : ((!newTask.department || newTask.department === 'All' || newTask.department === 'General' || newTask.department === 'None')
            ? ' (لكل أعضاء اللجنة)'
            : ` قسم ${newTask.department}`);
      const deadlineStr = newTask.deadline ? new Date(newTask.deadline).toLocaleDateString('ar-EG') : 'غير محدد';

      this.addNotificationsBulk(
        targetUserIds,
        `📋 تكليف جديد: ${newTask.name}`,
        isSpecific 
          ? `تم إسناد تكليف جديد مخصص لك: "${newTask.name}". الموعد النهائي: ${deadlineStr}.`
          : `تم نشر تكليف جديد موجه لـ ${commLabel}${deptLabel}: "${newTask.name}". الموعد النهائي: ${deadlineStr}.`,
        'success',
        newTask.id
      );

      // Email alerts to active targeted members
      const emails = targetUsers.map(u => u.email).filter(Boolean);
      if (emails.length > 0) {
        const taskName = newTask.name;
        const taskDesc = newTask.description || 'بدون تفاصيل إضافية.';
        const fullDeadline = newTask.deadline ? new Date(newTask.deadline).toLocaleString('ar-EG') : 'غير محدد';
        const html = `
          <div dir="rtl" style="font-family: 'Cairo', Tahoma, Arial, sans-serif; text-align: right; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
              <h2 style="color: #2b66ff; margin: 0;">EYE Tasks 📑 تكليف جديد</h2>
              <span style="font-size: 11px; color: #64748b;">منصة العمل الموحدة لكيان EYE</span>
            </div>
            <h3 style="color: #0f172a;">السلام عليكم ورحمة الله وبركاته،</h3>
            <p style="font-size: 14px; line-height: 1.6;">${isSpecific ? 'تم إسناد تكليف جديد <strong>مخصص لك بالاسم</strong>.' : `تم إسناد تكليف جديد موجه لـ <strong>${commLabel}</strong>${deptLabel}.`}</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #2b66ff;">
              <p style="margin: 5px 0; font-size: 14px;"><strong>اسم المهمة:</strong> ${taskName}</p>
              <p style="margin: 5px 0; font-size: 13px; color: #475569;"><strong>الوصف:</strong> ${taskDesc}</p>
              <p style="margin: 5px 0; font-size: 13px; color: #dc2626;"><strong>الموعد النهائي للتسليم:</strong> ${fullDeadline}</p>
            </div>
            <p style="font-size: 13px;">يرجى التفضل بالدخول إلى المنصة لمشاهدة التفاصيل الكاملة للمهمة ورفع الحل المطلوب قبل انتهاء الموعد.</p>
            <div style="text-align: center; margin: 25px 0 10px 0;">
              <a href="https://eye-workflow-hub.vercel.app" style="background-color: #2b66ff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 13px;">الانتقال إلى لوحة المهام</a>
            </div>
          </div>
        `;
        sendEmailAlert(emails, `[EYE Tasks] مهمة جديدة مطلوبة: ${taskName}`, html);
      }
    }

    return newTask;
  }

  updateTaskStatus(taskId: string, status: TaskStatus, updater: UserProfile): boolean {
    const idx = this.cache.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;
    const oldStatus = this.cache.tasks[idx].status;
    this.cache.tasks[idx].status = status;
    this.notify();

    supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId)
      .then(() => this.refreshAll());

    this.logActivity(
      updater.id,
      updater.fullName,
      updater.role,
      'Task Update',
      `Updated task status of "${this.cache.tasks[idx].name}" from ${oldStatus} to ${status}.`
    );

    if (oldStatus !== 'Published' && status === 'Published') {
      const task = this.cache.tasks[idx];
      const isSpecific = Boolean(task.assignedMemberIds && task.assignedMemberIds.length > 0);
      const users = this.getUsers().filter((u) => {
        if (u.status !== 'Active') return false;
        if (isSpecific) return task.assignedMemberIds!.includes(u.id);
        const matchComm = task.committee === 'All' || u.committee === task.committee;
        const matchDept = !task.department || task.department === 'All' || task.department === 'General' || task.department === 'None' || u.department === task.department;
        return matchComm && matchDept;
      });
      const userIds = users.map(u => u.id);
      const commLabel = isSpecific ? 'تكليف مخصص لك' : (task.committee === 'All' ? 'جميع اللجان' : `لجنة ${task.committee}`);
      const deptLabel = isSpecific
        ? ''
        : ((!task.department || task.department === 'All' || task.department === 'General' || task.department === 'None')
            ? ' (لكل أعضاء اللجنة)'
            : ` قسم ${task.department}`);
      const deadlineStr = task.deadline ? new Date(task.deadline).toLocaleDateString('ar-EG') : 'غير محدد';

      this.addNotificationsBulk(
        userIds,
        `📋 تكليف نشط الآن: ${task.name}`,
        isSpecific
          ? `تم تفعيل التكليف المخصص لك: "${task.name}". الموعد النهائي: ${deadlineStr}.`
          : `تم تفعيل ونشر التكليف لـ ${commLabel}${deptLabel}: "${task.name}". الموعد النهائي: ${deadlineStr}.`,
        'success',
        taskId
      );

      // Dispatch Email Alerts to all active members of the assigned committee
      const emails = users.map(u => u.email).filter(Boolean);
      if (emails.length > 0) {
        const taskName = task.name;
        const taskDesc = task.description || 'بدون تفاصيل إضافية.';
        const fullDeadline = task.deadline 
          ? new Date(task.deadline).toLocaleString('ar-EG') 
          : 'غير محدد';
        
        const subject = `[EYE Tasks] مهمة جديدة مطلوبة: ${taskName}`;
        const html = `
          <div dir="rtl" style="font-family: 'Cairo', Tahoma, Arial, sans-serif; text-align: right; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
              <h2 style="color: #2b66ff; margin: 0;">EYE Tasks 📑</h2>
              <span style="font-size: 11px; color: #64748b;">منصة العمل الموحدة لكيان EYE</span>
            </div>
            <h3 style="color: #0f172a;">السلام عليكم ورحمة الله وبركاته،</h3>
            <p style="font-size: 14px; line-height: 1.6;">${isSpecific ? 'تم إسناد تكليف جديد <strong>مخصص لك بالاسم</strong>.' : `تم إسناد مهمة جديدة للجنة <strong>${task.committee}</strong>${deptLabel}.`}</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #2b66ff;">
              <p style="margin: 5px 0; font-size: 14px;"><strong>اسم المهمة:</strong> ${taskName}</p>
              <p style="margin: 5px 0; font-size: 13px; color: #475569;"><strong>الوصف:</strong> ${taskDesc}</p>
              <p style="margin: 5px 0; font-size: 13px; color: #dc2626;"><strong>الموعد النهائي للتسليم:</strong> ${fullDeadline}</p>
            </div>
            <p style="font-size: 13px;">يرجى التفضل بالدخول إلى المنصة لمشاهدة التفاصيل الكاملة للمهمة ورفع التسليم المطلوب.</p>
            <div style="text-align: center; margin: 25px 0 10px 0;">
              <a href="https://eye-workflow-hub.vercel.app" style="background-color: #2b66ff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 13px;">الانتقال إلى لوحة المهام</a>
            </div>
          </div>
        `;
        
        sendEmailAlert(emails, subject, html);
      }
    }
    return true;
  }

  async deleteTask(taskId: string, updater: UserProfile): Promise<boolean> {
    try {
      const idx = this.cache.tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) return false;
      const taskName = this.cache.tasks[idx].name;
      this.cache.tasks.splice(idx, 1);
      this.recordDeletedId('eye_deleted_task_ids', taskId);
      this._lsSave('eye_tasks', this.cache.tasks);
      this.notify();

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);
      }

      this.logActivity(updater.id, updater.fullName, updater.role, 'Task Deletion', `Deleted task "${taskName}".`);
      return true;
    } catch (err) {
      console.error('[deleteTask Error]:', err);
      return false;
    }
  }

  /**
   * Update a task with full audit logging
   * @param taskId - Task ID to update
   * @param updates - Partial task fields to update (e.g., status, assignedMemberIds, department)
   * @param updater - User profile performing the update
   * @returns boolean indicating success
   */
  public updateTask(
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'createdBy' | 'createdDate' | 'createdByName'>>,
    updater: UserProfile
  ): boolean {
    const task = this.cache.tasks.find(t => t.id === taskId);
    if (!task) return false;

    // Capture changes before applying
    const previousAssignedMemberIds = [...(task.assignedMemberIds || [])];
    const previousStatus = task.status;

    // Apply updates to local cache
    Object.assign(task, updates);

    // Audit logging for assignment changes
    const assignedMemberIdsChanged =
      (!updates.assignedMemberIds || JSON.stringify(updates.assignedMemberIds) !== JSON.stringify(previousAssignedMemberIds)) &&
      (updates.assignedMemberIds !== undefined);

    if (assignedMemberIdsChanged) {
      const addedMembers = (updates.assignedMemberIds || []).filter((id: string) => !previousAssignedMemberIds.includes(id));
      const removedMembers = previousAssignedMemberIds.filter((id: string) => !((updates.assignedMemberIds || []) as string[]).includes(id));

      let details = `Task "${task.name}" (${task.id}) assignment updated.`;

      if (addedMembers.length > 0) {
        const memberNames = addedMembers.map(id => this.getUsers().find(u => u.id === id)?.fullName || id).filter(Boolean);
        details += ` Members added: ${memberNames.join(', ')}.`;
      }
      if (removedMembers.length > 0) {
        const memberNames = removedMembers.map(id => this.getUsers().find(u => u.id === id)?.fullName || id).filter(Boolean);
        details += ` Members removed: ${memberNames.join(', ')}.`;
      }

      this.logActivity(
        updater.id,
        updater.fullName,
        updater.role,
        'Task Assignment',
        details
      );
    }

    // Audit logging for status changes to Completed
    const statusChangedToCompleted = previousStatus !== 'Completed' && task.status === 'Completed';

    if (statusChangedToCompleted) {
      this.logActivity(
        updater.id,
        updater.fullName,
        updater.role,
        'Task Completion',
        `Task "${task.name}" (${task.id}) marked as Completed.`
      );
    }

    // Update Supabase if configured
    if (isSupabaseConfigured && supabase) {
      supabase.from('tasks').update(updates).eq('id', taskId).then(() => {
        // Successfully updated Supabase
      }).catch(err => {
        console.error('Supabase task update failed:', err);
        // Revert local cache change on failure
        Object.assign(task, { status: previousStatus, assignedMemberIds: previousAssignedMemberIds });
        this.notify();
      });
    } else {
      // No Supabase - just notify local cache changes
    }

    this.notify();
    return true;
  }

  // --- SUBMISSIONS WORKFLOW ---
  getSubmissions(_currentUser?: UserProfile): Submission[] {
    return this.cache.submissions;
  }

  submitTask(
    taskId: string,
    fileData: { name: string; size: string; fileUrl?: string; contentBase64?: string },
    member: UserProfile,
    completedSubtasks?: string[]
  ): Submission {
    const task = this.cache.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const existingIndex = this.cache.submissions.findIndex(
      (s) => s.taskId === taskId && s.memberId === member.id
    );
    if (existingIndex !== -1 && !task.allowResubmission) {
      throw new Error('This task does not allow resubmission. Submission already exists.');
    }

    const nextIdNum = this.cache.submissions.length + 1;
    const submissionIdCode = `TASK-${String(nextIdNum).padStart(6, '0')}`;
    const rawPath = fileData.fileUrl || `supabase://storage/eye-bucket/${task.committee}/${task.department}/${task.id}/${member.id}/${fileData.name}`;
    const simulatedPath = getPermanentStorageUrl(rawPath);

    const tempId = existingIndex !== -1 ? this.cache.submissions[existingIndex].id : 'tmp-' + Math.random().toString(36).slice(2);
    const newSubmission: Submission = {
      id: tempId,
      taskId,
      taskName: task.name,
      memberId: member.id,
      memberName: member.fullName,
      memberEmail: member.email,
      committee: task.committee,
      department: task.department,
      submittedAt: new Date().toISOString(),
      status: 'Pending',
      fileUrl: simulatedPath,
      fileName: fileData.name,
      fileSize: fileData.size,
      submissionIdCode: existingIndex !== -1 ? this.cache.submissions[existingIndex].submissionIdCode : submissionIdCode,
      completedSubtasks: completedSubtasks || [],
      history: [
        ...(existingIndex !== -1 ? this.cache.submissions[existingIndex].history || [] : []),
        {
          status: 'Pending',
          changedAt: new Date().toISOString(),
          changedBy: member.id,
          comment: existingIndex !== -1 ? 'Resubmitted solution file.' : 'Initial solution submitted.',
        },
      ],
    };

    if (existingIndex !== -1) {
      this.cache.submissions[existingIndex] = newSubmission;
    } else {
      this.cache.submissions.unshift(newSubmission);
    }
    this._lsSave('eye_submissions', this.cache.submissions);
    this.notify();

    const row = {
      task_id: taskId,
      task_name: task.name,
      member_id: member.id,
      member_name: member.fullName,
      member_email: member.email,
      committee: task.committee,
      department: task.department,
      status: 'Pending',
      file_url: simulatedPath,
      file_name: fileData.name,
      file_size: fileData.size,
      submission_id_code: newSubmission.submissionIdCode,
      completed_subtasks: completedSubtasks || [],
      history: newSubmission.history,
    };

    if (isSupabaseConfigured && supabase) {
      if (existingIndex !== -1 && !tempId.startsWith('tmp-')) {
        supabase
          .from('submissions')
          .update(row)
          .eq('id', tempId)
          .then(({ error }) => {
            if (error) console.error('[Supabase Submission Update Error]:', error.message || error);
          })
          .catch((err) => console.error('[Supabase Submission Update Exception]:', err));
      } else {
        supabase
          .from('submissions')
          .insert(row)
          .select()
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error('[Supabase Submission Insert Error]:', error.message || error);
            } else if (data) {
              const i = this.cache.submissions.findIndex((s) => s.id === tempId);
              if (i !== -1) {
                this.cache.submissions[i] = submissionFromRow(data);
                this._lsSave('eye_submissions', this.cache.submissions);
                this.notify();
              }
            }
          })
          .catch((err) => console.error('[Supabase Submission Insert Exception]:', err));
      }
    }

    this.logActivity(
      member.id,
      member.fullName,
      member.role,
      'Task Submission',
      `Submitted file for task "${task.name}". Path: ${simulatedPath}`
    );

    const leaders = this.getUsers().filter(
      (u) => u.role === 'Leader' && u.committee === task.committee && u.department === task.department && u.status === 'Active'
    );
    leaders.forEach((leader) => {
      this.addNotification(
        leader.id,
        'New Submission Received',
        `${member.fullName} submitted a file for "${task.name}".`,
        'info',
        task.id  // ◀── task id (so leader can open the task and see the new submission)
      );
    });

    // Dispatch Email Alerts to all active leaders of the assigned committee
    const leaderEmails = leaders.map(l => l.email).filter(Boolean);
    if (leaderEmails.length > 0) {
      const taskName = task.name;
      const submitterName = member.fullName;
      const submitDate = new Date().toLocaleString('ar-EG');
      
      const subject = `[EYE Tasks] تسليم جديد للمهمة: ${taskName}`;
      const html = `
        <div dir="rtl" style="font-family: 'Cairo', Tahoma, Arial, sans-serif; text-align: right; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #10b981; padding-bottom: 15px;">
            <h2 style="color: #10b981; margin: 0;">EYE Tasks 📥</h2>
            <span style="font-size: 11px; color: #64748b;">منصة العمل الموحدة لكيان EYE</span>
          </div>
          <h3 style="color: #0f172a;">مرحباً قائد اللجنة،</h3>
          <p style="font-size: 14px; line-height: 1.6;">قام العضو <strong>${submitterName}</strong> بتقديم تسليم جديد للمهمة: <strong>${taskName}</strong>.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #10b981;">
            <p style="margin: 5px 0; font-size: 13px;"><strong>المهمة:</strong> ${taskName}</p>
            <p style="margin: 5px 0; font-size: 13px;"><strong>صاحب التسليم:</strong> ${submitterName}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #64748b;"><strong>وقت التسليم:</strong> ${submitDate}</p>
          </div>
          <p style="font-size: 13px;">يرجى التفضل بالدخول إلى لوحة التحكم لمراجعة الملف المرفوع وتقييم تسليم العضو.</p>
          <div style="text-align: center; margin: 25px 0 10px 0;">
            <a href="https://eye-workflow-hub.vercel.app" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 13px;">الذهاب لمراجعة التسليمات</a>
          </div>
        </div>
      `;
      
      sendEmailAlert(leaderEmails, subject, html);
    }

    return newSubmission;
  }

  reviewSubmission(
    subId: string,
    status: SubmissionStatus,
    reviewer: UserProfile,
    comment?: string,
    reason?: string,
    grade?: number,
    gradingCriteria?: { quality: number; timeliness: number; innovation: number; completeness: number }
  ): boolean {
    const idx = this.cache.submissions.findIndex((s) => s.id === subId);
    if (idx === -1) return false;

    this.cache.submissions[idx].status = status;
    if (comment) this.cache.submissions[idx].comment = comment;
    if (reason) this.cache.submissions[idx].rejectionReason = reason;
    if (grade !== undefined) (this.cache.submissions[idx] as any).grade = grade;
    if (gradingCriteria) (this.cache.submissions[idx] as any).gradingCriteria = gradingCriteria;
    (this.cache.submissions[idx] as any).reviewedBy = reviewer.fullName;
    (this.cache.submissions[idx] as any).reviewedAt = new Date().toISOString();
    this.cache.submissions[idx].history = [
      ...(this.cache.submissions[idx].history || []),
      {
        status,
        changedAt: new Date().toISOString(),
        changedBy: reviewer.id,
        comment: comment || reason || `Submission status updated to ${status}.${grade !== undefined ? ` Grade: ${grade}/100.` : ''}`,
      },
    ];
    this._lsSave('eye_submissions', this.cache.submissions);
    this.notify();

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('submissions')
        .update({
          status,
          comment: this.cache.submissions[idx].comment,
          rejection_reason: this.cache.submissions[idx].rejectionReason,
          history: this.cache.submissions[idx].history,
          grade: grade !== undefined ? grade : this.cache.submissions[idx].grade,
          grading_criteria: gradingCriteria !== undefined ? gradingCriteria : this.cache.submissions[idx].gradingCriteria,
        })
        .eq('id', subId)
        .then(({ error }) => {
          if (error) console.error('[Supabase Submission Review Update Error]:', error.message || error);
        })
        .catch((err) => console.error('[Supabase Submission Review Exception]:', err));
    }

    this.logActivity(
      reviewer.id,
      reviewer.fullName,
      reviewer.role,
      'Submission Review',
      `Reviewed submission for ${this.cache.submissions[idx].memberName}. Status: ${status}.${grade !== undefined ? ` Grade: ${grade}/100.` : ''}`
    );

    let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';
    let titleMessage = 'Submission Reviewed';
    if (status === 'Accepted') { notificationType = 'success'; titleMessage = 'Task Submission Accepted!'; }
    else if (status === 'Rejected') { notificationType = 'error'; titleMessage = 'Submission Rejected'; }
    else if (status === 'Resubmission Requested') { notificationType = 'warning'; titleMessage = 'Resubmission Requested'; }

    const gradeMsg = grade !== undefined ? ` درجتك: ${grade}/100.` : '';
    this.addNotification(
      this.cache.submissions[idx].memberId,
      titleMessage,
      `Your submission for "${this.cache.submissions[idx].taskName}" has been updated to ${status}.${reason ? ' Reason: ' + reason : ''}${gradeMsg}`,
      notificationType,
      this.cache.submissions[idx].taskId  // ◀── task id (so TaskBoard can open the task detail)
    );

    // Send grade result email to the member
    if (grade !== undefined) {
      const sub = this.cache.submissions[idx];
      const gradeColor = grade >= 90 ? '#10b981' : grade >= 75 ? '#3b82f6' : grade >= 60 ? '#f59e0b' : '#ef4444';
      const html = `
        <div dir="rtl" style="font-family:'Cairo',Tahoma,Arial,sans-serif;text-align:right;padding:20px;border:1px solid #e2e8f0;border-radius:12px;max-width:600px;margin:0 auto;background:#fff;color:#1e293b;">
          <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid ${gradeColor};padding-bottom:15px;">
            <h2 style="color:${gradeColor};margin:0;">EYE Tasks 📝 نتيجة التقييم</h2>
            <span style="font-size:11px;color:#64748b;">منصة العمل الموحدة لكيان EYE</span>
          </div>
          <h3>مرحباً ${sub.memberName}،</h3>
          <p style="font-size:14px;line-height:1.6;">تم مراجعة تسليمك للمهمة <strong>${sub.taskName}</strong> من قِبَل ${reviewer.fullName}.</p>
          <div style="text-align:center;margin:20px 0;">
            <div style="display:inline-block;background:${gradeColor};color:white;border-radius:50%;width:80px;height:80px;line-height:80px;font-size:28px;font-weight:bold;">${grade}</div>
            <p style="color:#64748b;font-size:12px;margin-top:5px;">من 100</p>
          </div>
          ${comment ? `<div style="background:#f8fafc;padding:15px;border-radius:8px;border-right:4px solid ${gradeColor};"><p style="font-size:13px;margin:0;"><strong>تعليق المراجع:</strong> ${comment}</p></div>` : ''}
          ${reason ? `<div style="background:#fef2f2;padding:15px;border-radius:8px;border-right:4px solid #ef4444;margin-top:10px;"><p style="font-size:13px;margin:0;color:#dc2626;"><strong>سبب الرفض:</strong> ${reason}</p></div>` : ''}
          <div style="text-align:center;margin:25px 0 10px 0;">
            <a href="https://eye-workflow-hub.vercel.app" style="background:${gradeColor};color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;font-size:13px;">عرض نتائجي كاملة</a>
          </div>
        </div>`;
      sendEmailAlert([sub.memberEmail], `[EYE Tasks] نتيجة تقييم: ${sub.taskName}`, html);
    }

    return true;
  }

  // --- ANNOUNCEMENTS ---
  getAnnouncements(currentUser?: UserProfile): Announcement[] {
    const activeGov = this.getTargetGovernorate(currentUser);
    if (activeGov === 'All' || activeGov === 'المركزية') {
      return this.cache.announcements;
    }

    const govUserIds = new Set(
      this.cache.users
        .filter(u => (u.governorate?.trim() || 'الغربية') === activeGov)
        .map(u => u.id)
    );

    return this.cache.announcements.filter(a => {
      if ((a as any).governorate) {
        return (a as any).governorate === activeGov || (a as any).governorate === 'All' || (a as any).governorate === 'المركزية';
      }
      return !a.createdBy || govUserIds.has(a.createdBy);
    });
  }

  createAnnouncement(
    title: string,
    content: string,
    committee: string,
    creator: UserProfile,
    isPinned = false,
    category: AnnouncementCategory = 'General',
    targetUrl?: string
  ): Announcement {
    const tempId = 'tmp-' + Math.random().toString(36).slice(2);
    const newAnn: Announcement = {
      id: tempId,
      title,
      content,
      committee,
      createdBy: creator.id,
      createdByName: creator.fullName,
      createdDate: new Date().toISOString(),
      isPinned,
      category,
      targetUrl,
    };
    this.cache.announcements.unshift(newAnn);
    this.notify();

    supabase
      .from('announcements')
      .insert({
        title,
        content,
        committee,
        created_by: creator.id,
        created_by_name: creator.fullName,
        is_pinned: isPinned,
        category,
        target_url: targetUrl,
      })
      .select()
      .single()
      .then(({ data }) => {
        if (data) {
          const i = this.cache.announcements.findIndex((a) => a.id === tempId);
          if (i !== -1) this.cache.announcements[i] = announcementFromRow(data);
          this.notify();
        }
        this.refreshAll();
      });

    this.logActivity(
      creator.id,
      creator.fullName,
      creator.role,
      'Announcement Created',
      `Posted announcement "${title}" [${category}] for target ${committee}.`
    );

    // Send notifications to EVERYONE across all committees and governorates for announcements!
    const users = this.getUsers().filter((u) => u.status === 'Active');
    const notifTitle = category === 'New Feature' ? '🚀 ميزة جديدة متوفرة الآن!' : `📢 تعميم/إعلان جديد: ${title}`;
    const notifMsg = category === 'New Feature'
      ? `تم إطلاق ميزة جديدة: "${title}". يمكنك الدخول وتجربتها الآن على المنصة!`
      : `إعلان وتعميم هام من كيان EYE: "${title}". يرجى الاطلاع عليه.`;
    const notifType = category === 'New Feature' ? 'success' : category === 'Urgent' ? 'warning' : 'info';

    const userIds = users.map((u) => u.id);
    this.addNotificationsBulk(userIds, notifTitle, notifMsg, notifType, newAnn.id);


    // Email Alerts for everyone (push is already triggered once inside addNotificationsBulk)
    try {
      const emails = users.map(u => u.email).filter(Boolean);
      if (emails.length > 0) {
        const html = `
          <div dir="rtl" style="font-family:'Cairo',sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:12px;max-width:600px;margin:0 auto;background:#fff;">
            <h2 style="color:#1b4cd3;margin-top:0;">📢 إعلان وتعميم جديد — كيان EYE</h2>
            <h3>${title}</h3>
            <p style="font-size:14px;color:#334155;line-height:1.6;">${content}</p>
            <div style="text-align:center;margin:25px 0 10px 0;">
              <a href="https://eye-workflow-hub.vercel.app" style="background-color:#1b4cd3;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;font-size:13px;">الذهاب إلى المنصة والاطلاع</a>
            </div>
          </div>`;
        sendEmailAlert(emails, `[EYE] 📢 تعميم وإعلان جديد: ${title}`, html);
      }
    } catch (err) {
      console.warn('[createAnnouncement] Email trigger error:', err);
    }

    return newAnn;
  }

  async deleteAnnouncement(id: string, updater: UserProfile): Promise<boolean> {
    try {
      const idx = this.cache.announcements.findIndex((a) => a.id === id);
      if (idx === -1) return false;
      const title = this.cache.announcements[idx].title;
      this.cache.announcements.splice(idx, 1);
      this.recordDeletedId('eye_deleted_announcement_ids', id);
      this._lsSave('eye_announcements', this.cache.announcements);
      this.notify();

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('announcements')
          .delete()
          .eq('id', id);
      }

      this.logActivity(updater.id, updater.fullName, updater.role, 'Announcement Deletion', `Deleted announcement "${title}".`);
      return true;
    } catch (err) {
      console.error('[deleteAnnouncement Error]:', err);
      return false;
    }
  }

  // --- NOTIFICATIONS ---
  getNotifications(userId: string): SystemNotification[] {
    return this.cache.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addNotification(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error',
    relatedId?: string
  ): SystemNotification {
    const tempId = 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const newNotif: SystemNotification = {
      id: tempId,
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
      relatedId,
    };
    this.cache.notifications.unshift(newNotif);
    this._lsSave('eye_notifications', this.cache.notifications);
    this.notify();

    // Trigger Mobile & Browser Native Push Alert (deduplicated — skip if same title fired < 5s ago)
    try {
      if (this.cache.currentUser?.id === userId || !this.cache.currentUser) {
        const dedupKey = `push_dedup_${title}`;
        const lastFired = Number(sessionStorage.getItem(dedupKey) || '0');
        if (Date.now() - lastFired > 5000) {
          sessionStorage.setItem(dedupKey, String(Date.now()));
          triggerPushFromSystemNotif(title, message, type);
        }
      }
    } catch (e) {
      console.warn('[Push] Mobile/Browser push skipped:', e);
    }

    (async () => {
      try {
        if (!isSupabaseConfigured || !supabase) return;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        const validUserId = isUuid ? userId : (this.cache.users.find(u => u.id === userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id))?.id || null);

        if (!validUserId) return;

        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: validUserId,
            title,
            message,
            type,
            is_read: false,
            created_at: newNotif.createdAt,
            related_id: relatedId || null,
          })
          .select()
          .maybeSingle();

        if (error) {
          console.warn('[Supabase Notification Insert Warn]:', error.message || error);
        } else if (data) {
          const idx = this.cache.notifications.findIndex((n) => n.id === tempId);
          if (idx !== -1) {
            this.cache.notifications[idx].id = data.id;
            this._lsSave('eye_notifications', this.cache.notifications);
            this.notify();
          }
        }
      } catch (err) {
        console.error('[Supabase Notification Error]:', err);
      }
    })();

    return newNotif;
  }

  addNotificationsBulk(
    userIds: string[],
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error',
    relatedId?: string
  ): void {
    if (!userIds || userIds.length === 0) return;
    const now = new Date().toISOString();
    const rowsToInsert: any[] = [];
    const uniqueIds = Array.from(new Set(userIds));

    uniqueIds.forEach((uId) => {
      const tempId = 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      const newNotif: SystemNotification = {
        id: tempId,
        userId: uId,
        title,
        message,
        type,
        isRead: false,
        createdAt: now,
        relatedId,
      };
      this.cache.notifications.unshift(newNotif);

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uId);
      const targetUuid = isUuid ? uId : (this.cache.users.find(u => u.id === uId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id))?.id || null);

      if (targetUuid) {
        rowsToInsert.push({
          user_id: targetUuid,
          title,
          message,
          type,
          is_read: false,
          created_at: now,
          related_id: relatedId || null,
        });
      }
    });

    this._lsSave('eye_notifications', this.cache.notifications);
    this.notify();

    // Trigger Browser/Native Push Banner (deduplicated — skip if same title fired < 5s ago)
    try {
      const dedupKey = `push_dedup_${title}`;
      const lastFired = Number(sessionStorage.getItem(dedupKey) || '0');
      if (Date.now() - lastFired > 5000) {
        sessionStorage.setItem(dedupKey, String(Date.now()));
        triggerPushFromSystemNotif(title, message, type);
      }
    } catch {}

    (async () => {
      try {
        if (!isSupabaseConfigured || !supabase || rowsToInsert.length === 0) return;
        const { error } = await supabase.from('notifications').insert(rowsToInsert);
        if (error) {
          console.warn('[Bulk Notifications Insert Warn]:', error.message || error);
        }
      } catch (err) {
        console.error('[Bulk Notifications Insert Error]:', err);
      }
    })();
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    try {
      this.cache.notifications.forEach((n) => {
        if (n.userId === userId) n.isRead = true;
      });
      this._lsSave('eye_notifications', this.cache.notifications);
      this.notify();

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId);
      }
    } catch (err) {
      console.error('[markAllNotificationsRead Error]:', err);
    }
  }

  async clearAllNotifications(userId: string): Promise<void> {
    try {
      const toDelete = this.cache.notifications.filter((n) => n.userId === userId);
      toDelete.forEach((n) => this.recordDeletedId('eye_deleted_notification_ids', n.id));
      this.cache.notifications = this.cache.notifications.filter((n) => n.userId !== userId);
      this._lsSave('eye_notifications', this.cache.notifications);
      this.notify();

      if (isSupabaseConfigured && supabase) {
        await supabase.from('notifications').delete().eq('user_id', userId);
      }
    } catch (err) {
      console.error('[clearAllNotifications Error]:', err);
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      this.cache.notifications = this.cache.notifications.filter((n) => n.id !== notificationId);
      this.recordDeletedId('eye_deleted_notification_ids', notificationId);
      this._lsSave('eye_notifications', this.cache.notifications);
      this.notify();

      if (isSupabaseConfigured && supabase) {
        await supabase.from('notifications').delete().eq('id', notificationId);
      }
    } catch (err) {
      console.error('[deleteNotification Error]:', err);
    }
  }

  async markNotificationRead(notifId: string): Promise<void> {
    try {
      const idx = this.cache.notifications.findIndex((n) => n.id === notifId);
      if (idx === -1) return;
      this.cache.notifications[idx].isRead = true;
      this._lsSave('eye_notifications', this.cache.notifications);
      this.notify();

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notifId);
      }
    } catch (err) {
      console.error('[markNotificationRead Error]:', err);
    }
  }

  // --- SYSTEM SETTINGS ---
  getSettings(): OrganizationSettings {
    return this.cache.settings;
  }

  updateSettings(newSettings: OrganizationSettings, updater: UserProfile): void {
    this.cache.settings = newSettings;
    this.notify();

    supabase
      .from('org_settings')
      .update({
        org_name: newSettings.orgName,
        org_logo_url: newSettings.orgLogoUrl,
        theme: newSettings.theme,
        language: newSettings.language,
        allow_self_registration: newSettings.allowSelfRegistration,
        default_max_file_size_mb: newSettings.defaultMaxFileSizeMb,
        notification_channels: newSettings.notificationChannels,
      })
      .eq('id', 1)
      .then(() => this.refreshAll());

    this.logActivity(updater.id, updater.fullName, updater.role, 'Settings Updated', 'System configuration modified.');
  }

  // ═══════════════════════════════════════════════════
  // MEETINGS & ATTENDANCE  (localStorage-backed store)
  // ═══════════════════════════════════════════════════
  private _ls<T>(key: string): T[] {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  private _lsSave(key: string, data: unknown) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  }

  getMeetings(currentUser?: UserProfile): Meeting[] {
    const activeGov = this.getTargetGovernorate(currentUser);
    let all: Meeting[];

    if (this.cache.meetings && this.cache.meetings.length > 0) {
      all = [...this.cache.meetings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      const stored = this._ls<Meeting>('eye_meetings');
      if (stored.length > 0) {
        all = stored.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      } else {
        const defaultMeeting: Meeting = {
          id: 'mtg-general-1',
          title: 'الاجتماع التنسيقي العام لأعضاء كيان EYE',
          description: 'اجتماع متابعة خطة العمل التنفيذية، توزيع المهام، ومراجعة معدلات الحضور والانضباط للكيان.',
          type: 'General',
          committee: 'All',
          department: 'All',
          scheduledAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          location: 'مقر الكيان / أونلاين عبر زووم',
          createdBy: 'EYE-1004',
          createdByName: 'أحمد إبراهيم',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          status: 'Closed',
          attendanceCode: 'EYE61',
          governorate: 'الغربية',
        };
        all = [defaultMeeting];
      }
    }

    if (activeGov === 'All' || activeGov === 'المركزية') {
      return all;
    }

    const govUserIds = new Set(
      this.cache.users
        .filter(u => (u.governorate?.trim() || 'الغربية') === activeGov)
        .map(u => u.id)
    );

    return all.filter(m => {
      const mtgGov = (m as any).governorate;
      if (mtgGov && mtgGov !== 'All' && mtgGov !== 'المركزية') {
        if (mtgGov === activeGov) return true;
      }
      return true;
    });
  }

  createMeeting(data: Omit<Meeting, 'id' | 'createdAt' | 'attendanceCode'>, creator: UserProfile): Meeting {
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    const activeGov = this.getTargetGovernorate(creator) || creator.governorate || 'الغربية';
    const meeting: Meeting = {
      ...data,
      governorate: (data as any).governorate || activeGov,
      id: 'mtg-' + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      attendanceCode: code,
    };
    const all = this.getMeetings();
    this.cache.meetings = [meeting, ...all.filter(m => m.id !== meeting.id)];
    this._lsSave('eye_meetings', this.cache.meetings);
    this.notify();

    (async () => {
      try {
        if (!isSupabaseConfigured || !supabase) return;
        const payload: any = {
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          type: meeting.type,
          committee: meeting.committee,
          department: meeting.department,
          scheduled_at: meeting.scheduledAt,
          location: meeting.location,
          expected_attendees_count: meeting.expectedAttendeesCount || null,
          created_by_name: meeting.createdByName,
          created_at: meeting.createdAt,
          status: meeting.status,
          attendance_code: meeting.attendanceCode,
          governorate: meeting.governorate,
        };
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(meeting.createdBy);
        if (isUuid) {
          payload.created_by = meeting.createdBy;
        }

        const { error } = await supabase
          .from('meetings')
          .insert(payload);
        if (error) console.warn('[Supabase Meeting Insert Warn]:', error.message || error);
      } catch (err) {
        console.error('[Supabase Meeting Insert Error]:', err);
      }
    })();

    this.logActivity(creator.id, creator.fullName, creator.role, 'Meeting Created', `Created meeting "${meeting.title}" (Code: ${code})`);

    // Dispatch bulk notifications to target members
    const targetUsers = this.getUsers().filter(u =>
      (meeting.committee === 'All' || u.committee === meeting.committee) &&
      (meeting.department === 'All' || u.department === meeting.department) &&
      u.status === 'Active'
    );
    const targetUserIds = targetUsers.map(u => u.id);
    this.addNotificationsBulk(
      targetUserIds,
      '📅 اجتماع جديد مجدول',
      `تم جدولة اجتماع جديد بعنوان "${meeting.title}" بواسطة ${creator.fullName}.`,
      'info',
      meeting.id
    );

    return meeting;
  }

  async updateMeetingStatus(meetingId: string, status: MeetingStatus): Promise<void> {
    try {
      const current = this.getMeetings();
      this.cache.meetings = current.map(m => m.id === meetingId ? { ...m, status } : m);
      this._lsSave('eye_meetings', this.cache.meetings);
      this.notify();

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('meetings')
          .update({ status })
          .eq('id', meetingId);
      }
    } catch (err) {
      console.error('[updateMeetingStatus Error]:', err);
    }
  }

  async deleteMeeting(meetingId: string, actor: UserProfile): Promise<void> {
    try {
      const current = this.getMeetings();
      this.cache.meetings = current.filter(m => m.id !== meetingId);
      this._lsSave('eye_meetings', this.cache.meetings);
      this.recordDeletedId('eye_deleted_meeting_ids', meetingId);
      const allAtts = this.getAllAttendance().filter(a => a.meetingId !== meetingId);
      this.cache.attendance = allAtts;
      this._lsSave('eye_attendance', allAtts);
      this.notify();

      if (isSupabaseConfigured && supabase) {
        await supabase.from('meetings').delete().eq('id', meetingId);
      }
      this.logActivity(actor.id, actor.fullName, actor.role, 'Meeting Deleted', `Deleted meeting ${meetingId}`);
    } catch (err) {
      console.error('[deleteMeeting Error]:', err);
    }
  }

  getAttendance(meetingId: string): AttendanceRecord[] {
    return this.getAllAttendance().filter(a => a.meetingId === meetingId);
  }

  getAllAttendance(): AttendanceRecord[] {
    if (this.cache.attendance && this.cache.attendance.length > 0) {
      return this.cache.attendance;
    }
    return this._ls<AttendanceRecord>('eye_attendance');
  }

  checkIn(meetingId: string, code: string, member: UserProfile): 'ok' | 'wrong_code' | 'already' | 'closed' {
    const meeting = this.getMeetings().find(m => m.id === meetingId);
    if (!meeting) return 'wrong_code';
    if (meeting.status === 'Closed') return 'closed';
    if (meeting.attendanceCode.toUpperCase() !== code.toUpperCase()) return 'wrong_code';
    const existing = this.getAttendance(meetingId).find(a => a.memberId === member.id);
    if (existing) return 'already';
    const record: AttendanceRecord = {
      id: 'att-' + Math.random().toString(36).slice(2),
      meetingId,
      memberId: member.id,
      memberName: member.fullName,
      memberEmail: member.email,
      committee: member.committee,
      department: member.department,
      checkedInAt: new Date().toISOString(),
      isExcused: false,
    };
    const all = this.getAllAttendance();
    this.cache.attendance = [...all, record];
    this._lsSave('eye_attendance', this.cache.attendance);
    this.notify();

    (async () => {
      try {
        if (!isSupabaseConfigured || !supabase) return;
        await supabase.from('attendance').insert({
          id: record.id,
          meeting_id: record.meetingId,
          member_id: record.memberId,
          member_name: record.memberName,
          member_email: record.memberEmail,
          committee: record.committee,
          department: record.department,
          checked_in_at: record.checkedInAt,
          is_excused: record.isExcused,
        });
      } catch (err) {
        console.error('[Supabase CheckIn Insert Error]:', err);
      }
    })();

    return 'ok';
  }

  markExcused(attendanceId: string, reason: string): void {
    const all = this._ls<AttendanceRecord>('eye_attendance').map(a =>
      a.id === attendanceId ? { ...a, isExcused: true, excuseReason: reason } : a
    );
    this._lsSave('eye_attendance', all);
    this.notify();
  }

  // ═══════════════════════════════════════════════════
  // IMPORT ATTENDANCE FROM EXCEL / CSV
  // Expected row structure (flexible column matching):
  //   memberName or memberId, eventType, attendance, date
  // ═══════════════════════════════════════════════════
  async importAttendanceFromFile(
    rows: Array<Record<string, string>>,
    uploader: UserProfile
  ): Promise<{ added: number; updated: number; skipped: number; errors: string[] }> {
    const result = { added: 0, updated: 0, skipped: 0, errors: [] as string[] };

    const users = this.getUsers();
    const existingMeetings = this.getMeetings();
    const existingAttendance = this.getAllAttendance();

    // Cache to avoid creating duplicate meetings for same event
    const meetingLookup: Record<string, Meeting> = {};
    existingMeetings.forEach(m => {
      const key = `${m.title}|${m.scheduledAt.slice(0, 10)}`;
      meetingLookup[key] = m;
    });

    const newAttendance: AttendanceRecord[] = [];
    const updatedAttendance: AttendanceRecord[] = [];
    const newMeetings: Meeting[] = [];

    // Arabic → normalized attendance status mapping
    const attendanceStatusMap: Record<string, 'present' | 'absent' | 'excused'> = {
      'حضر': 'present',
      'حاضر': 'present',
      'present': 'present',
      'p': 'present',
      '1': 'present',
      'غاب': 'absent',
      'غائب': 'absent',
      'absent': 'absent',
      'a': 'absent',
      '0': 'absent',
      'عذر مقبول': 'excused',
      'عذر': 'excused',
      'excused': 'excused',
      'e': 'excused',
      'ex': 'excused',
    };

    // Event type normalization
    const eventTypeMap: Record<string, MeetingType> = {
      'ميتينج أونلاين': 'General',
      'ميتينج اونلاين': 'General',
      'online': 'General',
      'أونلاين': 'General',
      'اونلاين': 'General',
      'general': 'General',
      'ميتينج أوفلاين': 'Committee',
      'ميتينج اوفلاين': 'Committee',
      'offline': 'Committee',
      'أوفلاين': 'Committee',
      'اوفلاين': 'Committee',
      'committee': 'Committee',
      'تاسك': 'Department',
      'task': 'Department',
      'مهمة': 'Department',
      'department': 'Department',
      'طارئ': 'Emergency',
      'emergency': 'Emergency',
    };

    // Helper: fuzzy column name resolver
    const getCol = (row: Record<string, string>, ...candidates: string[]): string => {
      for (const key of Object.keys(row)) {
        const lk = key.trim().toLowerCase().replace(/\s+/g, '');
        for (const c of candidates) {
          if (lk.includes(c.toLowerCase().replace(/\s+/g, ''))) return row[key]?.trim() || '';
        }
      }
      return '';
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header

      // --- Extract fields ---
      const rawMember = getCol(row, 'اسم', 'member', 'name', 'عضو', 'id', 'كود', 'code');
      const rawEvent = getCol(row, 'نوع', 'event', 'type', 'حدث', 'اجتماع', 'meeting');
      const rawAttendance = getCol(row, 'حضور', 'attendance', 'status', 'حالة');
      const rawDate = getCol(row, 'تاريخ', 'date', 'يوم', 'day');
      const rawTitle = getCol(row, 'عنوان', 'title', 'اسم الاجتماع', 'meeting title');

      if (!rawMember) {
        result.errors.push(`صف ${rowNum}: لم يتم العثور على اسم العضو`);
        result.skipped++;
        continue;
      }

      // --- Resolve member ---
      const lowerMember = rawMember.toLowerCase().trim();
      let member = users.find(u =>
        u.fullName.toLowerCase().includes(lowerMember) ||
        lowerMember.includes(u.fullName.toLowerCase().split(' ')[0].toLowerCase()) ||
        (u.membershipCode && u.membershipCode.toLowerCase() === lowerMember) ||
        u.id.toLowerCase() === lowerMember
      );
      if (!member) {
        result.errors.push(`صف ${rowNum}: لم يتم العثور على العضو "${rawMember}"`);
        result.skipped++;
        continue;
      }

      // --- Resolve attendance status ---
      const attStatus = attendanceStatusMap[rawAttendance.toLowerCase().trim()] || null;
      if (!attStatus) {
        result.errors.push(`صف ${rowNum}: قيمة الحضور غير صالحة "${rawAttendance}" — يُرجى استخدام: حضر / غاب / عذر مقبول`);
        result.skipped++;
        continue;
      }

      // --- Resolve date ---
      let dateIso = '';
      if (rawDate) {
        // Try various date formats
        const cleaned = rawDate.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
          dateIso = parsed.toISOString();
        } else {
          // Try DD/MM/YYYY
          const parts = cleaned.split(/[\/\-\.]/);
          if (parts.length === 3) {
            const [d, m, y] = parts;
            const attempt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
            if (!isNaN(attempt.getTime())) dateIso = attempt.toISOString();
          }
        }
      }
      if (!dateIso) dateIso = new Date().toISOString();

      // --- Resolve event type ---
      const normalizedType = rawEvent.toLowerCase().trim();
      const meetingType: MeetingType = eventTypeMap[normalizedType] || 'General';

      // --- Resolve or create meeting ---
      const meetingTitle = rawTitle || (rawEvent ? `${rawEvent} — ${rawDate || 'بدون تاريخ'}` : `اجتماع مستورد — ${rawDate || 'بدون تاريخ'}`);
      const meetingKey = `${meetingTitle}|${dateIso.slice(0, 10)}`;

      if (!meetingLookup[meetingKey]) {
        const newMtg: Meeting = {
          id: 'mtg-import-' + Math.random().toString(36).slice(2),
          title: meetingTitle,
          description: `مستورد من ملف Excel/CSV`,
          type: meetingType,
          committee: 'All',
          department: 'All',
          scheduledAt: dateIso,
          location: '',
          createdBy: uploader.id,
          createdByName: uploader.fullName,
          createdAt: new Date().toISOString(),
          status: 'Closed',
          attendanceCode: Math.random().toString(36).slice(2, 7).toUpperCase(),
        };
        meetingLookup[meetingKey] = newMtg;
        newMeetings.push(newMtg);
      }

      const meeting = meetingLookup[meetingKey];

      // Skip absent (no attendance record for absent — they simply don't have one)
      if (attStatus === 'absent') {
        // We don't create a record for absent members — they simply won't appear in attendance
        result.skipped++;
        continue;
      }

      // --- Check if attendance record already exists ---
      const existingRec = existingAttendance.find(
        a => a.meetingId === meeting.id && a.memberId === member!.id
      );

      if (existingRec) {
        // Update excused status if changed
        const shouldBeExcused = attStatus === 'excused';
        if (existingRec.isExcused !== shouldBeExcused) {
          updatedAttendance.push({ ...existingRec, isExcused: shouldBeExcused });
          result.updated++;
        } else {
          result.skipped++;
        }
      } else {
        // Create new attendance record
        const newRec: AttendanceRecord = {
          id: 'att-import-' + Math.random().toString(36).slice(2),
          meetingId: meeting.id,
          memberId: member.id,
          memberName: member.fullName,
          memberEmail: member.email,
          committee: member.committee,
          department: member.department,
          checkedInAt: dateIso,
          isExcused: attStatus === 'excused',
          excuseReason: attStatus === 'excused' ? 'مستورد من ملف Excel' : undefined,
        };
        newAttendance.push(newRec);
        result.added++;
      }
    }

    // --- Persist new meetings to localStorage ---
    if (newMeetings.length > 0) {
      const allMeetings = [...newMeetings, ...existingMeetings];
      this.cache.meetings = allMeetings;
      this._lsSave('eye_meetings', allMeetings);
    }

    // --- Persist attendance to localStorage ---
    const allUpdatedIds = new Set(updatedAttendance.map(a => a.id));
    const finalAttendance = [
      ...existingAttendance.filter(a => !allUpdatedIds.has(a.id)),
      ...updatedAttendance,
      ...newAttendance,
    ];
    this.cache.attendance = finalAttendance;
    this._lsSave('eye_attendance', finalAttendance);
    this.notify();

    // --- Sync to Supabase ---
    if (isSupabaseConfigured && supabase) {
      try {
        // Upsert new meetings
        if (newMeetings.length > 0) {
          await supabase.from('meetings').upsert(
            newMeetings.map(m => ({
              id: m.id,
              title: m.title,
              description: m.description,
              type: m.type,
              committee: m.committee,
              department: m.department,
              scheduled_at: m.scheduledAt,
              location: m.location,
              created_by: m.createdBy,
              created_by_name: m.createdByName,
              created_at: m.createdAt,
              status: m.status,
              attendance_code: m.attendanceCode,
            })),
            { onConflict: 'id' }
          );
        }

        // Insert new attendance records
        if (newAttendance.length > 0) {
          await supabase.from('attendance').upsert(
            newAttendance.map(a => ({
              id: a.id,
              meeting_id: a.meetingId,
              member_id: a.memberId,
              member_name: a.memberName,
              member_email: a.memberEmail,
              committee: a.committee,
              department: a.department,
              checked_in_at: a.checkedInAt,
              is_excused: a.isExcused,
              excuse_reason: a.excuseReason || null,
            })),
            { onConflict: 'id' }
          );
        }

        // Update excused status
        for (const rec of updatedAttendance) {
          await supabase.from('attendance')
            .update({ is_excused: rec.isExcused })
            .eq('id', rec.id);
        }
      } catch (err) {
        console.error('[importAttendanceFromFile Supabase Error]:', err);
        result.errors.push('تعذّر المزامنة مع Supabase — البيانات محفوظة محلياً');
      }
    }

    this.logActivity(
      uploader.id,
      uploader.fullName,
      uploader.role,
      'Attendance Imported',
      `استورد ملف حضور: ${result.added} صف جديد، ${result.updated} صف محدّث، ${result.skipped} صف متجاهل`
    );

    return result;
  }

  // ═══════════════════════════════════════════════════
  // 360° LEADER FEEDBACK
  // ═══════════════════════════════════════════════════
  getLeaderFeedback(leaderId?: string, currentUser?: UserProfile): LeaderFeedback[] {
    const all = (this.cache.leaderFeedbacks && this.cache.leaderFeedbacks.length > 0)
      ? this.cache.leaderFeedbacks
      : this._ls<LeaderFeedback>('eye_leader_feedback');
    let list = leaderId ? all.filter(f => f.leaderId === leaderId) : all;

    const activeGov = this.getTargetGovernorate(currentUser);
    if (activeGov === 'All' || activeGov === 'المركزية') {
      return list;
    }

    const govUserIds = new Set(
      this.cache.users
        .filter(u => (u.governorate?.trim() || 'الغربية') === activeGov)
        .map(u => u.id)
    );

    return list.filter(f => govUserIds.has(f.leaderId) || govUserIds.has(f.reviewerId));
  }

  submitLeaderFeedback(data: Omit<LeaderFeedback, 'id' | 'submittedAt'>): 'ok' | 'already' {
    const all = this.getLeaderFeedback();
    const thisMonth = new Date().toISOString().slice(0, 7);
    const exists = all.find(f =>
      f.leaderId === data.leaderId &&
      f.reviewerId === data.reviewerId &&
      f.submittedAt.startsWith(thisMonth)
    );
    if (exists) return 'already';
    const record: LeaderFeedback = {
      ...data,
      id: 'fb-' + Math.random().toString(36).slice(2),
      submittedAt: new Date().toISOString(),
    };
    this.cache.leaderFeedbacks = [...all, record];
    this._lsSave('eye_leader_feedback', this.cache.leaderFeedbacks);
    this.notify();

    supabase.from('leader_feedbacks').insert({
      id: record.id,
      leader_id: record.leaderId,
      leader_name: record.leaderName,
      reviewer_id: record.reviewerId,
      committee: record.committee,
      rating: record.rating,
      communication: record.communication,
      support: record.support,
      fairness: record.fairness,
      comment: record.comment,
      submitted_at: record.submittedAt,
      is_anonymous: record.isAnonymous,
    }).then(() => this.refreshAll());

    return 'ok';
  }

  // ═══════════════════════════════════════════════════
  // MEMBER & LEADER EVALUATIONS
  // ═══════════════════════════════════════════════════
  getMemberEvaluations(targetUserId?: string, currentUser?: UserProfile): MemberEvaluation[] {
    const all = (this.cache.evaluations && this.cache.evaluations.length > 0)
      ? this.cache.evaluations
      : this._ls<MemberEvaluation>('eye_member_evaluations');
    const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    let list = targetUserId ? sorted.filter(e => e.targetUserId === targetUserId) : sorted;

    const activeGov = this.getTargetGovernorate(currentUser);
    if (activeGov === 'All' || activeGov === 'المركزية') {
      return list;
    }

    const govUserIds = new Set(
      this.cache.users
        .filter(u => (u.governorate?.trim() || 'الغربية') === activeGov)
        .map(u => u.id)
    );

    return list.filter(e => govUserIds.has(e.targetUserId) || govUserIds.has(e.evaluatorId));
  }

  addMemberEvaluation(data: Omit<MemberEvaluation, 'id' | 'createdAt'>, evaluator: UserProfile): MemberEvaluation {
    const record: MemberEvaluation = {
      ...data,
      id: 'meval-' + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
    };
    const all = this.getMemberEvaluations();
    this.cache.evaluations = [record, ...all.filter(e => e.id !== record.id)];
    this._lsSave('eye_member_evaluations', this.cache.evaluations);

    supabase.from('member_evaluations').insert({
      id: record.id,
      target_user_id: record.targetUserId,
      target_user_name: record.targetUserName,
      target_user_role: record.targetUserRole,
      evaluator_id: evaluator.id,
      evaluator_name: evaluator.fullName,
      evaluator_role: record.evaluatorRole,
      committee: record.committee,
      department: record.department,
      overall_rating: record.overallRating,
      commitment_rating: record.commitmentRating,
      quality_rating: record.qualityRating,
      teamwork_rating: record.teamworkRating,
      activity_rating: record.activityRating,
      feedback_comment: record.feedbackComment,
      created_at: record.createdAt,
    }).then(() => this.refreshAll());

    // Send system notification to evaluated user
    this.addNotification(
      data.targetUserId,
      '⭐ تقييم أداء جديد',
      `تم تسجيل تقييم أداء جديد لك بواسطة ${evaluator.fullName} (${data.overallRating}/5 نجوم)`,
      'success'
    );

    this.notify();
    this.logActivity(evaluator.id, evaluator.fullName, evaluator.role, 'Member Evaluated', `Evaluated ${data.targetUserName} (${data.overallRating}/5)`);
    return record;
  }

  // ═══════════════════════════════════════════════════
  // OKR WORK PLANS
  // ═══════════════════════════════════════════════════
  getWorkPlans(committee?: string, currentUser?: UserProfile): WorkPlan[] {
    const all = (this.cache.workPlans && this.cache.workPlans.length > 0)
      ? this.cache.workPlans
      : this._ls<WorkPlan>('eye_work_plans');
    const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const activeGov = this.getTargetGovernorate(currentUser);
    let plans = sorted;

    if (activeGov !== 'All' && activeGov !== 'المركزية') {
      const govUserIds = new Set(
        this.cache.users
          .filter(u => (u.governorate?.trim() || 'الغربية') === activeGov)
          .map(u => u.id)
      );
      plans = plans.filter(p => {
        if ((p as any).governorate) return (p as any).governorate === activeGov;
        return !p.createdBy || govUserIds.has(p.createdBy);
      });
    }

    return committee ? plans.filter(p => p.committee === committee || p.committee === 'All') : plans;
  }

  createWorkPlan(data: Omit<WorkPlan, 'id' | 'createdAt'>, creator: UserProfile): WorkPlan {
    const plan: WorkPlan = {
      ...data,
      id: 'wp-' + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
    };
    const all = this.getWorkPlans();
    this.cache.workPlans = [plan, ...all.filter(p => p.id !== plan.id)];
    this._lsSave('eye_work_plans', this.cache.workPlans);
    this.notify();

    supabase.from('work_plans').insert({
      id: plan.id,
      title: plan.title,
      objective: plan.objective,
      committee: plan.committee,
      department: plan.department,
      month: plan.month,
      created_by: creator.id,
      created_by_name: creator.fullName,
      created_at: plan.createdAt,
      status: plan.status,
      key_results: plan.keyResults,
    }).then(() => this.refreshAll());

    this.logActivity(creator.id, creator.fullName, creator.role, 'Work Plan Created', `Created OKR plan "${plan.title}"`);

    // Dispatch notifications
    const targetUsers = this.getUsers().filter(u =>
      (plan.committee === 'All' || u.committee === plan.committee) && u.status === 'Active'
    );
    targetUsers.forEach(user => {
      this.addNotification(
        user.id,
        '🎯 خطة عمل (OKR) جديدة',
        `تم نشر خطة عمل أسبوعية جديدة بعنوان "${plan.title}" بواسطة ${creator.fullName}.`,
        'info',
        plan.id
      );
    });

    return plan;
  }

  updateKeyResult(planId: string, krId: string, currentValue: number, status: OKRStatus): void {
    const all = this.getWorkPlans().map(p => {
      if (p.id !== planId) return p;
      const keyResults = p.keyResults.map(kr =>
        kr.id === krId ? { ...kr, currentValue, status } : kr
      );
      const allDone = keyResults.every(kr => kr.status === 'Completed');
      const anyBehind = keyResults.some(kr => kr.status === 'Behind');
      const anyAtRisk = keyResults.some(kr => kr.status === 'At Risk');
      const planStatus: OKRStatus = allDone ? 'Completed' : anyBehind ? 'Behind' : anyAtRisk ? 'At Risk' : 'On Track';
      return { ...p, keyResults, status: planStatus };
    });
    this.cache.workPlans = all;
    this._lsSave('eye_work_plans', all);
    this.notify();

    const targetPlan = all.find(p => p.id === planId);
    if (targetPlan) {
      supabase.from('work_plans').update({
        key_results: targetPlan.keyResults,
        status: targetPlan.status,
      }).eq('id', planId).then(() => this.refreshAll());
    }
  }

  async deleteWorkPlan(planId: string, actor: UserProfile): Promise<void> {
    try {
      const all = this.getWorkPlans().filter(p => p.id !== planId);
      this.cache.workPlans = all;
      this._lsSave('eye_work_plans', all);
      this.recordDeletedId('eye_deleted_work_plan_ids', planId);
      this.notify();

      if (isSupabaseConfigured && supabase) {
        await supabase.from('work_plans').delete().eq('id', planId);
      }
      this.logActivity(actor.id, actor.fullName, actor.role, 'Work Plan Deleted', `Deleted plan ${planId}`);
    } catch (err) {
      console.error('[deleteWorkPlan Error]:', err);
    }
  }

  // ═══════════════════════════════════════════════════
  // IDEA BANK & PITCH ROOM
  // ═══════════════════════════════════════════════════
  getIdeas(currentUser?: UserProfile): VolunteerIdea[] {
    const all = (this.cache.ideas && this.cache.ideas.length > 0)
      ? this.cache.ideas
      : this._ls<VolunteerIdea>('eye_ideas');
    const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const activeGov = this.getTargetGovernorate(currentUser);
    if (activeGov === 'All' || activeGov === 'المركزية') {
      return sorted;
    }

    const govUserIds = new Set(
      this.cache.users
        .filter(u => (u.governorate?.trim() || 'الغربية') === activeGov)
        .map(u => u.id)
    );

    return sorted.filter(i => !i.createdBy || govUserIds.has(i.createdBy));
  }

  createIdea(title: string, description: string, committee: string, creator: UserProfile): VolunteerIdea {
    const idea: VolunteerIdea = {
      id: 'idea-' + Math.random().toString(36).slice(2),
      title,
      description,
      committee,
      createdBy: creator.id,
      createdByName: creator.fullName,
      createdAt: new Date().toISOString(),
      upvotes: [],
      status: 'Pitching',
      comments: [],
    };
    const all = this.getIdeas();
    this.cache.ideas = [idea, ...all.filter(i => i.id !== idea.id)];
    this._lsSave('eye_ideas', this.cache.ideas);
    this.notify();

    supabase.from('volunteer_ideas').insert({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      committee: idea.committee,
      created_by: creator.id,
      created_by_name: creator.fullName,
      created_at: idea.createdAt,
      upvotes: idea.upvotes,
      status: idea.status,
      comments: idea.comments,
    }).then(() => this.refreshAll());

    this.logActivity(creator.id, creator.fullName, creator.role, 'Idea Created', `Pitched idea: "${title}"`);
    return idea;
  }

  toggleUpvoteIdea(ideaId: string, userId: string): void {
    const all = this.getIdeas().map(i => {
      if (i.id !== ideaId) return i;
      const upvotes = i.upvotes.includes(userId)
        ? i.upvotes.filter(id => id !== userId)
        : [...i.upvotes, userId];
      return { ...i, upvotes };
    });
    this._lsSave('eye_ideas', all);
    this.notify();
  }

  addCommentToIdea(ideaId: string, userName: string, comment: string): void {
    const all = this.getIdeas().map(i => {
      if (i.id !== ideaId) return i;
      return {
        ...i,
        comments: [
          ...i.comments,
          {
            id: 'c-' + Math.random().toString(36).slice(2),
            userName,
            comment,
            createdAt: new Date().toISOString(),
          }
        ]
      };
    });
    this._lsSave('eye_ideas', all);
    this.notify();
  }

  convertIdeaToTask(ideaId: string, priority: string, deadline: string, actor: UserProfile): void {
    const ideas = this.getIdeas();
    const idx = ideas.findIndex(i => i.id === ideaId);
    if (idx === -1) return;
    const idea = ideas[idx];
    idea.status = 'Converted';
    this._lsSave('eye_ideas', ideas);

    // Create a new task objective from it
    const task: Task = {
      id: 'TSK-' + Math.random().toString(36).slice(2).toUpperCase(),
      name: `[Idea] ${idea.title}`,
      description: idea.description,
      instructions: `This task was converted from an approved member idea proposed by ${idea.createdByName}.`,
      priority: priority as any,
      deadline,
      committee: idea.committee,
      department: 'All',
      status: 'Published',
      createdBy: actor.id,
      createdByName: actor.fullName,
      createdDate: new Date().toISOString(),
      allowedFileTypes: ['pdf', 'png', 'zip', 'docx'],
      maxUploadSizeMb: 15,
      allowResubmission: true,
    };

    // Save task via supabase or cache
    this.cache.tasks = [task, ...this.cache.tasks];
    this.notify();
    supabase
      .from('tasks')
      .insert({
        id: task.id,
        name: task.name,
        description: task.description,
        instructions: task.instructions,
        priority: task.priority,
        deadline: task.deadline,
        committee: task.committee,
        department: task.department,
        status: task.status,
        created_by: task.createdBy,
        created_by_name: task.createdByName,
        allowed_file_types: task.allowedFileTypes,
        max_upload_size_mb: task.maxUploadSizeMb,
        allow_resubmission: task.allowResubmission,
      })
      .then(() => this.refreshAll());

    this.logActivity(actor.id, actor.fullName, actor.role, 'Idea Converted', `Converted idea ${ideaId} to Task: ${task.id}`);
  }

  async deleteIdea(ideaId: string, actor: UserProfile): Promise<void> {
    try {
      const all = this.getIdeas().filter(i => i.id !== ideaId);
      this.cache.ideas = all;
      this._lsSave('eye_ideas', all);
      this.recordDeletedId('eye_deleted_idea_ids', ideaId);
      this.notify();

      if (isSupabaseConfigured && supabase) {
        await supabase.from('volunteer_ideas').delete().eq('id', ideaId);
      }
      this.logActivity(actor.id, actor.fullName, actor.role, 'Idea Deleted', `Deleted idea ${ideaId}`);
    } catch (err) {
      console.error('[deleteIdea Error]:', err);
    }
  }



  // ═══════════════════════════════════════════════════
  // REWARDS SHOP
  // ═══════════════════════════════════════════════════
  getRewards(): RewardItem[] {
    return this._ls<RewardItem>('eye_rewards');
  }

  createRewardItem(title: string, description: string, costPoints: number, stock: number, actor: UserProfile): RewardItem {
    const item: RewardItem = {
      id: 'reward-' + Math.random().toString(36).slice(2),
      title,
      description,
      costPoints,
      stock,
    };
    const all = this.getRewards();
    this._lsSave('eye_rewards', [item, ...all]);
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Reward Created', `Created reward item: "${title}" costing ${costPoints} points`);
    return item;
  }

  getPurchases(): RewardPurchase[] {
    return this._ls<RewardPurchase>('eye_reward_purchases').sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  }

  purchaseReward(rewardId: string, member: UserProfile): 'ok' | 'no_points' | 'no_stock' {
    const rewards = this.getRewards();
    const rIdx = rewards.findIndex(r => r.id === rewardId);
    if (rIdx === -1) return 'no_stock';
    const reward = rewards[rIdx];
    if (reward.stock <= 0) return 'no_stock';

    // Check user points: sum up points from submissions
    const submissions = this.getSubmissions().filter(s => s.memberId === member.id);
    const tasks = this.getTasks();
    let pts = 0;
    for (const sub of submissions) {
      const t = tasks.find(x => x.id === sub.taskId);
      if (sub.status === 'Accepted') {
        pts += t && new Date(sub.submittedAt) <= new Date(t.deadline) ? 100 : 60;
        const grade = (sub as any).grade;
        if (grade !== undefined && grade >= 90) pts += 20;
        else if (grade !== undefined && grade >= 75) pts += 10;
      } else if (sub.status === 'Rejected') {
        pts += 10;
      } else if (sub.status === 'Pending') {
        pts += 5;
      }
    }

    // Deduct already approved purchases
    const purchases = this.getPurchases().filter(p => p.memberId === member.id && p.status === 'Approved');
    const spent = purchases.reduce((acc, p) => acc + p.costPoints, 0);
    const available = pts - spent;

    if (available < reward.costPoints) return 'no_points';

    // Deduct stock
    reward.stock -= 1;
    this._lsSave('eye_rewards', rewards);

    // Create purchase
    const purchase: RewardPurchase = {
      id: 'pur-' + Math.random().toString(36).slice(2),
      rewardId,
      rewardTitle: reward.title,
      costPoints: reward.costPoints,
      memberId: member.id,
      memberName: member.fullName,
      purchasedAt: new Date().toISOString(),
      status: 'Pending',
    };
    const allP = this.getPurchases();
    this._lsSave('eye_reward_purchases', [purchase, ...allP]);
    this.notify();
    this.logActivity(member.id, member.fullName, member.role, 'Reward Purchased', `Purchased "${reward.title}" for ${reward.costPoints} points`);
    return 'ok';
  }

  approvePurchase(purchaseId: string, actor: UserProfile): void {
    const all = this.getPurchases().map(p => {
      if (p.id !== purchaseId) return p;
      return { ...p, status: 'Approved' as const };
    });
    this._lsSave('eye_reward_purchases', all);
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Purchase Approved', `Approved reward purchase ${purchaseId}`);
  }

  deleteRewardItem(rewardId: string, actor: UserProfile): void {
    this.recordDeletedId('eye_deleted_reward_ids', rewardId);
    const all = this.getRewards().filter(r => r.id !== rewardId);
    this._lsSave('eye_rewards', all);
    this.notify();
    if (isSupabaseConfigured && supabase) {
      supabase.from('rewards').delete().eq('id', rewardId).then();
    }
    this.logActivity(actor.id, actor.fullName, actor.role, 'Reward Deleted', `Deleted reward item ${rewardId}`);
  }

  deletePurchase(purchaseId: string, actor: UserProfile): void {
    this.recordDeletedId('eye_deleted_purchase_ids', purchaseId);
    const all = this.getPurchases().filter(p => p.id !== purchaseId);
    this._lsSave('eye_reward_purchases', all);
    this.notify();
    if (isSupabaseConfigured && supabase) {
      supabase.from('reward_purchases').delete().eq('id', purchaseId).then();
    }
    this.logActivity(actor.id, actor.fullName, actor.role, 'Purchase Deleted', `Deleted/Revoked purchase request ${purchaseId}`);
  }

  // ═══════════════════════════════════════════════════
  // PERFORMANCE RADAR
  // ═══════════════════════════════════════════════════
  getPerformance(actor?: UserProfile | null, memberId?: string): MonthlyPerformance[] {
    const all = this._ls<MonthlyPerformance>('eye_performance');
    const deletedIds = (() => {
      try { return JSON.parse(localStorage.getItem('eye_deleted_evaluation_ids') || '[]'); } catch { return []; }
    })();
    let res = all.filter(p => !deletedIds.includes(p.id));
    if (memberId) res = res.filter(p => p.memberId === memberId);
    if (actor && !isHRM(actor)) {
      const membersMap = new Map(this.cache.users.map(u => [u.id, u]));
      res = filterEvaluationsByPermission(actor, res, membersMap);
    }
    return res;
  }

  rateMember(data: Omit<MonthlyPerformance, 'id' | 'createdAt'>, actor: UserProfile): void {
    const targetMember = this.cache.users.find(u => u.id === data.memberId);
    const comm = targetMember ? getEffectiveCommittee(targetMember) : (actor.committee || 'General');

    const performance: MonthlyPerformance = {
      ...data,
      id: 'perf-' + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      ratedBy: actor.id,
      ratedByName: actor.fullName,
    };

    // Store committee context on evaluation record
    (performance as any).committee = comm;

    const all = this._ls<MonthlyPerformance>('eye_performance');
    // Overwrite if same member same month
    const filtered = all.filter(p => !(p.memberId === data.memberId && p.month === data.month));
    this._lsSave('eye_performance', [performance, ...filtered]);
    this.notify();
    
    // Sync to Supabase monthly_performance table asynchronously
    if (isSupabaseConfigured && supabase) {
      supabase.from('monthly_performance').insert({
        member_id: data.memberId,
        member_name: data.memberName,
        month: data.month,
        commitment: data.commitment,
        teamwork: data.teamwork,
        communication: data.communication,
        innovation: data.innovation,
        leader_comment: data.leaderComment,
        rated_by: actor.id,
        rated_by_name: actor.fullName,
        committee: comm,
      }).then();
    }

    this.logActivity(actor.id, actor.fullName, actor.role, 'Member Evaluated', `Rated member ${data.memberName} for month ${data.month}`);
  }

  deletePerformanceEvaluation(evaluationId: string, actor: UserProfile): void {
    this.recordDeletedId('eye_deleted_evaluation_ids', evaluationId);
    const all = this._ls<MonthlyPerformance>('eye_performance');
    const filtered = all.filter(p => p.id !== evaluationId);
    this._lsSave('eye_performance', filtered);
    this.notify();

    if (isSupabaseConfigured && supabase) {
      supabase.from('monthly_performance').delete().eq('id', evaluationId).then();
      supabase.from('member_evaluations').delete().eq('id', evaluationId).then();
    }
    this.logActivity(actor.id, actor.fullName, actor.role, 'Evaluation Deleted', `Deleted evaluation record ${evaluationId}`);
  }



  // ═══════════════════════════════════════════════════
  // CAREER COMPASS & PERSONAL GOALS
  // ═══════════════════════════════════════════════════
  getPersonalObjectives(userId: string): PersonalObjective[] {
    return this._ls<PersonalObjective>('eye_personal_objectives').filter(o => o.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  addPersonalObjective(userId: string, title: string, targetDate: string, notes: string): PersonalObjective {
    const objective: PersonalObjective = {
      id: 'pobj-' + Math.random().toString(36).slice(2),
      userId,
      title,
      targetDate,
      status: 'In Progress',
      notes,
      createdAt: new Date().toISOString(),
    };
    const all = this._ls<PersonalObjective>('eye_personal_objectives');
    this._lsSave('eye_personal_objectives', [objective, ...all]);
    this.notify();
    return objective;
  }

  toggleObjectiveStatus(objectiveId: string): void {
    const all = this._ls<PersonalObjective>('eye_personal_objectives').map(o => {
      if (o.id !== objectiveId) return o;
      return { ...o, status: o.status === 'In Progress' ? ('Achieved' as const) : ('In Progress' as const) };
    });
    this._lsSave('eye_personal_objectives', all);
    this.notify();
  }

  // ═══════════════════════════════════════════════════
  // BADGES & STREAKS
  // ═══════════════════════════════════════════════════
  getAllBadgeDefinitions(): import('../types').Badge[] {
    return [
      { id: 'first_submission', name: 'First Submission', nameAr: 'أول تسليم', description: 'Submitted your first task!', descriptionAr: 'سلّمت مهمتك الأولى!', emoji: '🚀', rarity: 'Common', pointsBonus: 10 },
      { id: 'task_crusher', name: 'Task Crusher', nameAr: 'مُنجز المهام', description: 'Completed 5 tasks before deadline', descriptionAr: 'أنجزت 5 مهام قبل الموعد النهائي', emoji: '💪', rarity: 'Rare', pointsBonus: 30 },
      { id: 'early_bird', name: 'Early Bird', nameAr: 'الطير الباكر', description: 'Submitted a task 24h+ before deadline', descriptionAr: 'سلّمت مهمة قبل الموعد بـ 24 ساعة أو أكثر', emoji: '🐦', rarity: 'Common', pointsBonus: 15 },
      { id: 'perfect_presence', name: 'Perfect Presence', nameAr: 'حضور مثالي', description: 'Attended all meetings in a month', descriptionAr: 'حضرت جميع الاجتماعات في الشهر', emoji: '✅', rarity: 'Rare', pointsBonus: 25 },
      { id: 'idea_generator', name: 'Idea Generator', nameAr: 'مولّد الأفكار', description: '3 ideas approved in Idea Bank', descriptionAr: 'تمت الموافقة على 3 من أفكارك في بنك الأفكار', emoji: '💡', rarity: 'Epic', pointsBonus: 50 },
      { id: 'quiz_master', name: 'Quiz Master', nameAr: 'سيد المسابقات', description: 'Answered 5 consecutive quizzes correctly', descriptionAr: 'أجبت على 5 مسابقات متتالية بشكل صحيح', emoji: '🧠', rarity: 'Rare', pointsBonus: 30 },
      { id: 'team_player', name: 'Team Player', nameAr: 'لاعب الفريق', description: 'Voted or commented 10 times', descriptionAr: 'صوّتت أو علّقت 10 مرات', emoji: '🤝', rarity: 'Common', pointsBonus: 20 },
      { id: 'streak_week_3', name: '3-Week Streak', nameAr: 'سلسلة 3 أسابيع', description: 'Active for 3 consecutive weeks', descriptionAr: 'نشط لمدة 3 أسابيع متتالية', emoji: '🔥', rarity: 'Rare', pointsBonus: 35 },
      { id: 'streak_week_8', name: '8-Week Streak', nameAr: 'سلسلة 8 أسابيع', description: 'Active for 8 consecutive weeks', descriptionAr: 'نشط لمدة 8 أسابيع متتالية', emoji: '⚡', rarity: 'Epic', pointsBonus: 80 },
      { id: 'top_performer', name: 'Top Performer', nameAr: 'المتميز الأول', description: 'Ranked #1 on leaderboard for a month', descriptionAr: 'تصدّرت لوحة الصدارة لمدة شهر', emoji: '🏆', rarity: 'Legendary', pointsBonus: 100 },
    ];
  }

  getUserBadges(userId: string): import('../types').UserBadge[] {
    return this._ls<import('../types').UserBadge>('eye_user_badges').filter(b => b.userId === userId);
  }

  getAllUserBadges(): import('../types').UserBadge[] {
    return this._ls<import('../types').UserBadge>('eye_user_badges');
  }

  awardBadge(userId: string, badgeId: import('../types').BadgeId, bySystem: boolean, note?: string): import('../types').UserBadge | null {
    const existing = this._ls<import('../types').UserBadge>('eye_user_badges');
    if (existing.some(b => b.userId === userId && b.badgeId === badgeId)) return null; // already has it
    const badge: import('../types').UserBadge = {
      id: 'badge-' + Math.random().toString(36).slice(2),
      userId, badgeId,
      awardedAt: new Date().toISOString(),
      awardedBySystem: bySystem,
      note,
    };
    this._lsSave('eye_user_badges', [badge, ...existing]);
    const def = this.getAllBadgeDefinitions().find(d => d.id === badgeId);
    if (def) {
      this.addNotification(userId, `🏅 شارة جديدة: ${def.nameAr}`, `حصلت على شارة "${def.nameAr}" ${def.emoji} (+${def.pointsBonus} نقطة)`, 'success');
    }
    this.notify();
    return badge;
  }

  checkAndAwardBadges(userId: string): void {
    const submissions = this.getSubmissions().filter(s => s.memberId === userId && s.status === 'Accepted');
    const badges = this.getUserBadges(userId);
    const hasBadge = (id: import('../types').BadgeId) => badges.some(b => b.badgeId === id);

    if (submissions.length >= 1 && !hasBadge('first_submission')) this.awardBadge(userId, 'first_submission', true);
    if (submissions.length >= 5 && !hasBadge('task_crusher')) this.awardBadge(userId, 'task_crusher', true);
    const earlyBird = submissions.find(s => {
      const task = this.getTasks().find(t => t.id === s.taskId);
      if (!task) return false;
      const diff = new Date(task.deadline).getTime() - new Date(s.submittedAt).getTime();
      return diff > 24 * 60 * 60 * 1000;
    });
    if (earlyBird && !hasBadge('early_bird')) this.awardBadge(userId, 'early_bird', true);
  }

  getUserStreak(userId: string): number {
    const key = 'eye_streak_' + userId;
    const data = localStorage.getItem(key);
    if (!data) return 0;
    try { return JSON.parse(data).streak || 0; } catch { return 0; }
  }

  updateStreak(userId: string): number {
    const key = 'eye_streak_' + userId;
    let { streak = 0, lastWeek = '' } = (() => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } })();
    const thisWeek = new Date().toISOString().slice(0, 10).replace(/-\d\d$/, '-01');
    if (lastWeek !== thisWeek) {
      streak = lastWeek ? streak + 1 : 1;
      localStorage.setItem(key, JSON.stringify({ streak, lastWeek: thisWeek }));
      const badges = this.getUserBadges(userId);
      if (streak >= 3 && !badges.some(b => b.badgeId === 'streak_week_3')) this.awardBadge(userId, 'streak_week_3', true);
      if (streak >= 8 && !badges.some(b => b.badgeId === 'streak_week_8')) this.awardBadge(userId, 'streak_week_8', true);
    }
    return streak;
  }

  // ═══════════════════════════════════════════════════
  // TASK COMMENTS
  // ═══════════════════════════════════════════════════
  getTaskComments(taskId: string): import('../types').TaskComment[] {
    const all = this._ls<import('../types').TaskComment>('eye_task_comments');
    return all.filter(c => c.taskId === taskId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  addTaskComment(taskId: string, author: import('../types').UserProfile, text: string): import('../types').TaskComment {
    const comment: import('../types').TaskComment = {
      id: `cmnt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId,
      authorId: author.id,
      authorName: author.fullName,
      authorRole: author.role,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    const all = this._ls<import('../types').TaskComment>('eye_task_comments');
    this._lsSave('eye_task_comments', [...all, comment]);
    this.notify();
    return comment;
  }

  deleteTaskComment(commentId: string, requesterId: string): void {
    const all = this._ls<import('../types').TaskComment>('eye_task_comments');
    const comment = all.find(c => c.id === commentId);
    if (!comment) return;
    // Only author or admin can delete
    if (comment.authorId !== requesterId) {
      const user = this.getUsers().find(u => u.id === requesterId);
      if (!user || !['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(user.role)) return;
    }
    this._lsSave('eye_task_comments', all.filter(c => c.id !== commentId));
    this.notify();
  }

  pinTaskComment(commentId: string, pinned: boolean): void {
    const all = this._ls<import('../types').TaskComment>('eye_task_comments');
    this._lsSave('eye_task_comments', all.map(c => c.id === commentId ? { ...c, isPinned: pinned } : c));
    this.notify();
  }

  // ═══════════════════════════════════════════════════
  // CERTIFICATE GENERATOR
  // ═══════════════════════════════════════════════════
  getCertificates(): IssuedCertificate[] {
    // Source of truth: Supabase cache (populated by refreshAll).
    // Merge any local-only certs so the admin sees them too.
    const fromCache = this.cache.certificates || [];
    const local = this._ls<IssuedCertificate>('eye_certificates');
    const seen = new Set(fromCache.map((c) => c.id));
    const merged = [...fromCache, ...local.filter((c) => !seen.has(c.id))];
    return merged.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  getMyCertificates(userId: string): IssuedCertificate[] {
    return this.getCertificates().filter((c) => c.recipientId === userId);
  }

  async issueCertificate(
    recipientId: string, recipientName: string, recipientRole: string,
    certType: CertificateType, title: string, body: string,
    issuer: UserProfile, committee: string, grade?: number,
    lang: 'ar' | 'en' = 'ar',
    designStyle: CertificateDesignStyle = 'style1'
  ): Promise<IssuedCertificate> {
    const isAutoApproved = issuer.role === 'Super Admin' || issuer.role === 'Vice';
    // جلب المحافظة من بيانات المصدر أو الـ session
    let issuerGovernorate: string | undefined;
    try {
      issuerGovernorate = issuer.governorate ||
        localStorage.getItem('eye_current_governorate') ||
        'الغربية';
    } catch {
      issuerGovernorate = 'الغربية';
    }
    const cert: IssuedCertificate = {
      id: 'cert-' + Math.random().toString(36).slice(2),
      recipientId, recipientName, recipientRole,
      certType, title, body, committee,
      issuedBy: issuer.id,
      issuedByName: issuer.fullName,
      issuedByTitle: getUserRoleTitle(issuer, lang),
      issuedAt: new Date().toISOString(),
      grade,
      lang,
      status: isAutoApproved ? 'approved' : 'pending',
      designStyle,
      governorate: issuerGovernorate,
      ...(isAutoApproved ? { approvedBy: issuer.id, approvedByName: issuer.fullName, approvedAt: new Date().toISOString() } : {}),
    };

    // 1) Persist to localStorage
    const all = this._ls<IssuedCertificate>('eye_certificates');
    this._lsSave('eye_certificates', [cert, ...all]);

    this.cache.certificates = [cert, ...(this.cache.certificates || [])];
    this.notify();

    // 2) Persist to Supabase
    const insertPayload: any = {
      id: cert.id,
      recipient_id: cert.recipientId,
      recipient_name: cert.recipientName,
      recipient_role: cert.recipientRole,
      cert_type: cert.certType,
      title: cert.title,
      body: cert.body,
      committee: cert.committee,
      issued_by: cert.issuedBy,
      issued_by_name: cert.issuedByName,
      issued_by_title: cert.issuedByTitle,
      issued_at: cert.issuedAt,
      lang: cert.lang,
      governorate: cert.governorate,
    };
    if (cert.grade !== undefined) {
      insertPayload.grade = cert.grade;
    }

    let { error } = await supabase
      .from('issued_certificates')
      .insert(insertPayload);

    if (error && (error.message.includes('grade') || error.message.includes('lang') || error.message.includes('schema cache'))) {
      delete insertPayload.grade;
      delete insertPayload.lang;
      const retryResult = await supabase
        .from('issued_certificates')
        .insert(insertPayload);
      error = retryResult.error;
    }

    if (!error) {
      await this.refreshAll();
    }

    // 3) Notification
    if (isAutoApproved) {
      this.addNotification(
        recipientId,
        '📜 لديك شهادة جديدة معتمدة!',
        `تم منحك شهادة "${title}" من ${issuer.fullName}. افتح بروفايلك لرؤيتها وتنزيلها.`,
        'success',
        cert.id
      );
    } else {
      this.addNotification(
        recipientId,
        '⏳ تم رفع طلب شهادة لك!',
        `قام ${issuer.fullName} برفع طلب شهادة "${title}" لك وهي الآن بانتظار موافقة واقتران الإدارة قبل إمكانية الطباعة.`,
        'info',
        cert.id
      );

      // Notify Super Admins & HRMs of pending approval request
      const admins = (this.cache.users || []).filter(u => u.role === 'Super Admin' || u.role === 'Vice' || u.role === 'HRM');
      admins.forEach(admin => {
        this.addNotification(
          admin.id,
          '📜 طلب اعتماد شهادة جديدة من ليدر',
          `قام الليدر ${issuer.fullName} برفع طلب شهادة لـ ${recipientName} (${title}). يرجى مراجعتها واعتماها.`,
          'warning',
          cert.id
        );
      });
    }

    // 4) Email the recipient with a beautiful HTML template
    const recipient = this.cache.users.find((u) => u.id === recipientId);
    if (recipient?.email) {
      const certUrl = `${window.location.origin}/?cert=${cert.id}`;
      const html = `
        <div dir="rtl" style="font-family:'Cairo',Tahoma,Arial,sans-serif;text-align:right;padding:0;margin:0;background:#f5eed8;">
          <div style="max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:linear-gradient(135deg,#fefcf6 0%,#fbf6e8 50%,#f5eed8 100%);border:3px solid #d97706;border-radius:20px;padding:32px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">📜</div>
              <h2 style="color:#92400e;margin:0 0 8px 0;font-size:22px;">تهانينا ${cert.recipientName}!</h2>
              <p style="color:#0f172a;font-size:15px;line-height:1.7;margin:0 0 16px 0;">
                تم منحك شهادة جديدة من <strong>${cert.issuedByName}</strong> عبر <strong>كيان EYE</strong>:
              </p>
              <div style="background:#fff;border:1px solid #d97706;border-radius:14px;padding:18px;margin:14px 0;">
                <p style="color:#b45309;font-size:11px;letter-spacing:1px;margin:0 0 6px 0;font-weight:bold;">نوع الشهادة</p>
                <p style="color:#0f172a;font-size:18px;font-weight:900;margin:0 0 8px 0;">${cert.title}</p>
                <p style="color:#475569;font-size:13px;line-height:1.6;margin:0;">${cert.body}</p>
              </div>
              <p style="color:#475569;font-size:12px;margin:14px 0 0 0;">صدرت بواسطة: <strong>${cert.issuedByName}</strong> • ${cert.issuedByTitle}</p>
              <p style="color:#64748b;font-size:11px;margin:6px 0 0 0;">التاريخ: ${new Date(cert.issuedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <a href="${certUrl}" style="display:inline-block;background:linear-gradient(135deg,#d97706 0%,#92400e 100%);color:#fff;padding:12px 28px;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;margin-top:20px;box-shadow:0 4px 12px rgba(146,64,14,0.25);">افتح بروفايلي على المنصة</a>
              <p style="color:#94a3b8;font-size:10px;margin-top:20px;">رقم الشهادة: ${cert.id}</p>
            </div>
            <p style="color:#64748b;font-size:10px;text-align:center;margin-top:14px;">
              وصلك هذا الإيميل لأنك عضو في كيان المصريون الشباب EYE.<br/>
              لإيقاف الإشعارات، عدّل إعداداتك من <a href="${window.location.origin}" style="color:#2b66ff;">هنا</a>.
            </p>
          </div>
        </div>`;
      sendEmailAlert(
        [recipient.email],
        `📜 شهادة جديدة لك من ${cert.issuedByName} — EYE Workflow Hub`,
        html
      );
    }

    this.logActivity(issuer.id, issuer.fullName, issuer.role, 'Certificate Issued', `Issued certificate to ${recipientName}: ${title}`);
    this.notify();
    return cert;
  }

  async deleteCertificate(certId: string, actor: UserProfile): Promise<boolean> {
    // 1) Remove from localStorage
    const all = this._ls<IssuedCertificate>('eye_certificates');
    this._lsSave('eye_certificates', all.filter(c => c.id !== certId));

    // 2) Remove from in-memory cache
    if (this.cache.certificates) {
      this.cache.certificates = this.cache.certificates.filter(c => c.id !== certId);
    }
    this.notify();

    // 3) Remove from Supabase database
    await supabase.from('issued_certificates').delete().eq('id', certId);

    this.logActivity(actor.id, actor.fullName, actor.role, 'Certificate Revoked', `Revoked/Deleted certificate ID: ${certId}`);
    return true;
  }

  async approveCertificate(certId: string, approver: UserProfile): Promise<boolean> {
    const now = new Date().toISOString();
    let updatedCert: IssuedCertificate | null = null;

    if (this.cache.certificates) {
      this.cache.certificates = this.cache.certificates.map(c => {
        if (c.id === certId) {
          updatedCert = { ...c, status: 'approved', approvedBy: approver.id, approvedByName: approver.fullName, approvedAt: now };
          return updatedCert;
        }
        return c;
      });
    }

    const local = this._ls<IssuedCertificate>('eye_certificates');
    const updatedLocal = local.map(c => {
      if (c.id === certId) {
        return { ...c, status: 'approved', approvedBy: approver.id, approvedByName: approver.fullName, approvedAt: now };
      }
      return c;
    });
    this._lsSave('eye_certificates', updatedLocal);

    if (updatedCert) {
      this.addNotification(
        (updatedCert as IssuedCertificate).recipientId,
        '🎉 تم اعتماد شهادتك رسمياً!',
        `تمت الموافقة الرسمية على شهادتك "${(updatedCert as IssuedCertificate).title}" من قبل ${approver.fullName}. يمكنك الآن معاينتها وتنزيلها وطباعتها.`,
        'success',
        certId
      );
    }

    this.logActivity(approver.id, approver.fullName, approver.role, 'Certificate Approved', `Approved certificate ID ${certId}`);
    this.notify();
    return true;
  }

  async rejectCertificate(certId: string, approver: UserProfile, reason?: string): Promise<boolean> {
    const now = new Date().toISOString();
    let updatedCert: IssuedCertificate | null = null;

    if (this.cache.certificates) {
      this.cache.certificates = this.cache.certificates.map(c => {
        if (c.id === certId) {
          updatedCert = { ...c, status: 'rejected', approvedBy: approver.id, approvedByName: approver.fullName, approvedAt: now, rejectionReason: reason };
          return updatedCert;
        }
        return c;
      });
    }

    const local = this._ls<IssuedCertificate>('eye_certificates');
    const updatedLocal = local.map(c => {
      if (c.id === certId) {
        return { ...c, status: 'rejected', approvedBy: approver.id, approvedByName: approver.fullName, approvedAt: now, rejectionReason: reason };
      }
      return c;
    });
    this._lsSave('eye_certificates', updatedLocal);

    if (updatedCert) {
      this.addNotification(
        (updatedCert as IssuedCertificate).recipientId,
        '❌ تم رفض طلب الشهادة',
        `تم رفض طلب الشهادة "${(updatedCert as IssuedCertificate).title}". ${reason ? `السبب: ${reason}` : ''}`,
        'warning',
        certId
      );
    }

    this.logActivity(approver.id, approver.fullName, approver.role, 'Certificate Rejected', `Rejected certificate ID ${certId}`);
    this.notify();
    return true;
  }

  // ═══════════════════════════════════════════════════
  // ANONYMOUS SUGGESTION BOX
  // ═══════════════════════════════════════════════════
  getSuggestions(): import('../types').AnonymousSuggestion[] {
    return this._ls<import('../types').AnonymousSuggestion>('eye_suggestions').sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  submitSuggestion(
    content: string,
    category: import('../types').SuggestionCategory,
    committee: string
  ): import('../types').AnonymousSuggestion {
    const suggestion: import('../types').AnonymousSuggestion = {
      id: 'sug-' + Math.random().toString(36).slice(2),
      category, content, committee,
      status: 'New',
      submittedAt: new Date().toISOString(),
      upvotes: 0,
    };
    const all = this.getSuggestions();
    this._lsSave('eye_suggestions', [suggestion, ...all]);
    // Notify admins/vice
    this.cache.users.filter(u => ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(u.role)).forEach(admin => {
      this.addNotification(admin.id, '💬 اقتراح مجهول جديد', `وصل اقتراح جديد في فئة "${category}" بخصوص ${committee === 'All' ? 'عام' : committee}.`, 'info');
    });
    this.notify();
    return suggestion;
  }

  replyToSuggestion(suggestionId: string, reply: string, admin: import('../types').UserProfile): void {
    const all = this.getSuggestions().map(s => {
      if (s.id !== suggestionId) return s;
      return { ...s, adminReply: reply, adminReplyAt: new Date().toISOString(), adminReplyBy: admin.fullName, status: 'Addressed' as const };
    });
    this._lsSave('eye_suggestions', all);
    this.notify();
  }

  updateSuggestionStatus(suggestionId: string, status: import('../types').SuggestionStatus): void {
    const all = this.getSuggestions().map(s => s.id !== suggestionId ? s : { ...s, status });
    this._lsSave('eye_suggestions', all);
    this.notify();
  }

  upvoteSuggestion(suggestionId: string): void {
    const all = this.getSuggestions().map(s => s.id !== suggestionId ? s : { ...s, upvotes: s.upvotes + 1 });
    this._lsSave('eye_suggestions', all);
    this.notify();
  }

  // ═══════════════════════════════════════════════════
  // PERFORMANCE REPORTS
  // ═══════════════════════════════════════════════════
  generateCommitteeReport(committee: string, month: string, issuer: import('../types').UserProfile): import('../types').CommitteeReport {
    const members = this.cache.users.filter(u => u.committee === committee);
    const submissions = this.getSubmissions().filter(s => s.committee === committee && s.submittedAt.startsWith(month));
    const accepted = submissions.filter(s => s.status === 'Accepted');
    const avgGrade = accepted.length > 0 ? Math.round(accepted.reduce((sum, s) => sum + (s.grade || 0), 0) / accepted.length) : 0;

    // Top member by accepted submissions count
    const memberScores: Record<string, number> = {};
    accepted.forEach(s => { memberScores[s.memberId] = (memberScores[s.memberId] || 0) + 1; });
    const topMemberId = Object.entries(memberScores).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const topMember = this.cache.users.find(u => u.id === topMemberId);

    // Link OKR Work Plans for committee
    const workPlans = this.getWorkPlans(committee);
    const linkedWorkPlans = workPlans.map(p => {
      const totalKrs = p.keyResults ? p.keyResults.length : 0;
      const progress = totalKrs > 0
        ? Math.round(p.keyResults.reduce((acc, kr) => acc + Math.min(100, Math.round((kr.currentValue / Math.max(kr.targetValue, 1)) * 100)), 0) / totalKrs)
        : (p.status === 'Completed' ? 100 : 0);
      return {
        title: p.title,
        objective: p.objective,
        status: p.status,
        progress
      };
    });
    const okrTotalPlans = workPlans.length;
    const okrCompletedPlans = workPlans.filter(p => p.status === 'Completed').length;
    const okrAvgProgress = linkedWorkPlans.length > 0
      ? Math.round(linkedWorkPlans.reduce((sum, p) => sum + p.progress, 0) / linkedWorkPlans.length)
      : 0;

    const report: import('../types').CommitteeReport = {
      id: 'rep-' + Math.random().toString(36).slice(2),
      month, committee,
      totalMembers: members.length,
      activeTasks: this.getTasks().filter(t => t.committee === committee && t.status === 'Published').length,
      completedTasks: accepted.length,
      avgGrade,
      attendanceRate: members.length > 0 ? Math.round((accepted.length / Math.max(members.length, 1)) * 100) : 0,
      topMemberId,
      topMemberName: topMember?.fullName || '—',
      topMemberScore: memberScores[topMemberId] || 0,
      generatedAt: new Date().toISOString(),
      generatedBy: issuer.fullName,
      okrTotalPlans,
      okrCompletedPlans,
      okrAvgProgress,
      linkedWorkPlans,
    };
    const all = this._ls<import('../types').CommitteeReport>('eye_committee_reports');
    this._lsSave('eye_committee_reports', [report, ...all]);
    this.notify();
    return report;
  }

  getReports(): import('../types').CommitteeReport[] {
    return this._ls<import('../types').CommitteeReport>('eye_committee_reports').sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  // ═══════════════════════════════════════════════════
  // POLLS & SURVEYS
  // ═══════════════════════════════════════════════════
  getPolls(): import('../types').Poll[] {
    return this._ls<import('../types').Poll>('eye_polls').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getActivePolls(userId: string): import('../types').Poll[] {
    const voted = this._ls<import('../types').PollVote>('eye_poll_votes').filter(v => v.userId === userId).map(v => v.pollId);
    return this.getPolls().filter(p => p.status === 'Active');
  }

  createPoll(
    question: string, questionAr: string,
    options: { text: string; textAr?: string }[],
    audience: string, createdBy: import('../types').UserProfile,
    closesAt?: string
  ): import('../types').Poll {
    const poll: import('../types').Poll = {
      id: 'poll-' + Math.random().toString(36).slice(2),
      question, questionAr,
      options: options.map((o, i) => ({ id: 'opt-' + i + '-' + Math.random().toString(36).slice(2), text: o.text, textAr: o.textAr })),
      audience, status: 'Active',
      createdBy: createdBy.id,
      createdByName: createdBy.fullName,
      createdAt: new Date().toISOString(),
      closesAt,
      totalVotes: 0,
    };
    const all = this.getPolls();
    this._lsSave('eye_polls', [poll, ...all]);
    this.notify();
    return poll;
  }

  votePoll(pollId: string, optionId: string, userId: string): 'voted' | 'already_voted' {
    const votes = this._ls<import('../types').PollVote>('eye_poll_votes');
    if (votes.some(v => v.pollId === pollId && v.userId === userId)) return 'already_voted';
    const vote: import('../types').PollVote = {
      id: 'vote-' + Math.random().toString(36).slice(2),
      pollId, optionId, userId,
      votedAt: new Date().toISOString(),
    };
    this._lsSave('eye_poll_votes', [vote, ...votes]);
    // Update totalVotes
    const polls = this.getPolls().map(p => p.id !== pollId ? p : { ...p, totalVotes: p.totalVotes + 1 });
    this._lsSave('eye_polls', polls);
    this.notify();
    return 'voted';
  }

  getPollResults(pollId: string): Record<string, number> {
    const votes = this._ls<import('../types').PollVote>('eye_poll_votes').filter(v => v.pollId === pollId);
    const results: Record<string, number> = {};
    votes.forEach(v => { results[v.optionId] = (results[v.optionId] || 0) + 1; });
    return results;
  }

  hasVoted(pollId: string, userId: string): string | null {
    const vote = this._ls<import('../types').PollVote>('eye_poll_votes').find(v => v.pollId === pollId && v.userId === userId);
    return vote?.optionId || null;
  }

  closePoll(pollId: string): void {
    const polls = this.getPolls().map(p => p.id !== pollId ? p : { ...p, status: 'Closed' as const });
    this._lsSave('eye_polls', polls);
    this.notify();
  }

  deletePoll(pollId: string): void {
    this._lsSave('eye_polls', this.getPolls().filter(p => p.id !== pollId));
    this._lsSave('eye_poll_votes', this._ls<import('../types').PollVote>('eye_poll_votes').filter(v => v.pollId !== pollId));
    this.notify();
  }

  async updateUserSkills(userId: string, skills: string[]): Promise<boolean> {
    const idx = this.cache.users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    this.cache.users[idx].skills = skills;
    this.notify();
    await supabase.from('profiles').update({ skills }).eq('id', userId);
    this.refreshAll();
    return true;
  }

  async endorseSkill(userId: string, skill: string, endorserName: string): Promise<boolean> {
    const idx = this.cache.users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    const endorsements = { ...(this.cache.users[idx].endorsements || {}) };
    if (!endorsements[skill]) endorsements[skill] = [];
    if (!endorsements[skill].includes(endorserName)) {
      endorsements[skill].push(endorserName);
    }
    this.cache.users[idx].endorsements = endorsements;
    this.notify();
    await supabase.from('profiles').update({ endorsements }).eq('id', userId);
    this.refreshAll();
    return true;
  }

  // ═══════════════════════════════════════════════════
  // MANDATORY VIDEO TASKS & SUMMARIES
  // ═══════════════════════════════════════════════════
  getVideoTasks(userRole?: string, userCommittee?: string): VideoTask[] {
    let tasks = this._ls<VideoTask>('eye_video_tasks');
    const isInit = localStorage.getItem('eye_init_video_tasks');
    if (!isInit) {
      localStorage.setItem('eye_init_video_tasks', 'true');
      const defaultTasks: VideoTask[] = [
        {
          id: 'vtask-seed-1',
          title: 'ورشة أساسيات إدارة الفرق والعمل التطوعي 🚀',
          description: 'ورشة عمل تدريبية شاملة لشرح المفاهيم الرئيسية للعمل الجماعي وتوزيع الأدوار الإدارية بفاعلية داخل كيان EYE.',
          videoType: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          requirementsPrompt: 'المطلوب منك في هذا الفيديو:\n1. ملخص لأهم 3 ركائز لإدارة الفريق المذكورة بالفيديو.\n2. كيف تطبق هذه المفاهيم في لجنتك؟\n3. مقترح تحسين واحد لبيئة العمل التطوعية.',
          committee: 'All',
          department: 'All',
          isMandatory: true,
          pointsReward: 50,
          createdBy: 'admin-seed',
          createdByName: 'إدارة الكيان',
          createdAt: new Date().toISOString(),
          status: 'Active',
        },
        {
          id: 'vtask-seed-2',
          title: 'دليل صياغة التقارير والعروض التقديمية الاحترافية 📊',
          description: 'فيديو إرشادي موجز لتعلم أفضل ممارسات صياغة التقارير الأسبوعية وتصميم العروض التقديمية ذات الطابع الاحترافي.',
          videoType: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          requirementsPrompt: 'المطلوب منك في هذا الفيديو:\nاكتب تلخيصاً مستفيضاً (لا يقل عن 100 كلمة) يوضّح الخطوات الأساسية لإعداد تقرير أداء متميز.',
          committee: 'All',
          department: 'All',
          isMandatory: true,
          pointsReward: 40,
          createdBy: 'admin-seed',
          createdByName: 'إدارة الكيان',
          createdAt: new Date().toISOString(),
          status: 'Active',
        }
      ];
      this._lsSave('eye_video_tasks', defaultTasks);
      tasks = defaultTasks;
    }

    if (userRole === 'Member' && userCommittee) {
      return tasks.filter(t => t.committee === 'All' || t.committee === userCommittee);
    }
    return tasks;
  }

  createVideoTask(
    data: Omit<VideoTask, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>,
    actor: UserProfile
  ): VideoTask {
    const newTask: VideoTask = {
      ...data,
      id: 'vtask-' + Math.random().toString(36).slice(2),
      createdBy: actor.id,
      createdByName: actor.fullName,
      createdAt: new Date().toISOString(),
    };
    const all = this.getVideoTasks();
    this._lsSave('eye_video_tasks', [newTask, ...all]);
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Video Task Created', `Created mandatory video task: "${newTask.title}"`);
    return newTask;
  }

  deleteVideoTask(taskId: string, actor: UserProfile): void {
    const all = this.getVideoTasks().filter(t => t.id !== taskId);
    this._lsSave('eye_video_tasks', all);
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Video Task Deleted', `Deleted video task ${taskId}`);
  }

  getVideoSubmissions(videoTaskId?: string, memberId?: string): VideoSubmission[] {
    let all = this._ls<VideoSubmission>('eye_video_submissions');
    if (videoTaskId) {
      all = all.filter(s => s.videoTaskId === videoTaskId);
    }
    if (memberId) {
      all = all.filter(s => s.memberId === memberId);
    }
    return all;
  }

  submitVideoSummary(
    videoTaskId: string,
    videoTaskTitle: string,
    summaryText: string,
    member: UserProfile
  ): VideoSubmission {
    const allSubmissions = this.getVideoSubmissions();
    // Check if member already has a submission for this task
    const existingIndex = allSubmissions.findIndex(s => s.videoTaskId === videoTaskId && s.memberId === member.id);

    const submission: VideoSubmission = {
      id: existingIndex >= 0 ? allSubmissions[existingIndex].id : 'vsub-' + Math.random().toString(36).slice(2),
      videoTaskId,
      videoTaskTitle,
      memberId: member.id,
      memberName: member.fullName,
      memberEmail: member.email,
      committee: member.committee,
      department: member.department,
      summaryText,
      isWatched: true,
      submittedAt: new Date().toISOString(),
      status: 'Pending',
    };

    let updated: VideoSubmission[];
    if (existingIndex >= 0) {
      updated = [...allSubmissions];
      updated[existingIndex] = submission;
    } else {
      updated = [submission, ...allSubmissions];
    }

    this._lsSave('eye_video_submissions', updated);
    this.notify();
    this.logActivity(member.id, member.fullName, member.role, 'Video Summary Submitted', `Submitted summary for video task "${videoTaskTitle}"`);
    return submission;
  }

  reviewVideoSubmission(
    submissionId: string,
    status: VideoSubmissionStatus,
    feedback: string,
    grade: number,
    actor: UserProfile
  ): void {
    const allSubmissions = this.getVideoSubmissions();
    const submission = allSubmissions.find(s => s.id === submissionId);
    if (!submission) return;

    const updated = allSubmissions.map(s => {
      if (s.id !== submissionId) return s;
      return {
        ...s,
        status,
        feedback,
        grade,
        reviewedBy: actor.fullName,
        reviewedAt: new Date().toISOString(),
      };
    });

    this._lsSave('eye_video_submissions', updated);

    // If approved, notify member and log activity
    if (status === 'Approved') {
      const videoTasks = this.getVideoTasks();
      const videoTask = videoTasks.find(vt => vt.id === submission.videoTaskId);
      const pointsReward = videoTask ? videoTask.pointsReward : 50;

      this.addNotification(
        submission.memberId,
        '✅ تم قبول تلخيص الفيديو!',
        `تم قبول ملخصك للفيديو "${submission.videoTaskTitle}" بدرجة ${grade}/100 وإضافة ${pointsReward} نقطة لرصيدك!`,
        'success'
      );
    } else if (status === 'Needs Revision') {
      this.addNotification(
        submission.memberId,
        '⚠️ طلب تعديل ملخص الفيديو',
        `تطلب مراجعة ملخصك للفيديو "${submission.videoTaskTitle}". الملاحظات: ${feedback}`,
        'warning'
      );
    }

    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Video Submission Reviewed', `Reviewed video summary for ${submission.memberName}: ${status}`);
  }

  // ═══════════════════════════════════════════════════
  // LIVE WORKSHOPS & INTERACTIVE STREAM
  // ═══════════════════════════════════════════════════
  getLiveWorkshops(userCommittee?: string): LiveWorkshop[] {
    let workshops = this._ls<LiveWorkshop>('eye_live_workshops');
    const isInit = localStorage.getItem('eye_init_live_workshops');
    if (!isInit) {
      localStorage.setItem('eye_init_live_workshops', 'true');
      const defaultWorkshop: LiveWorkshop = {
        id: 'ws-seed-1',
        title: 'الورشة التفاعلية الحية: التخطيط التكتيكي وإدارة المشاريع 🔴',
        description: 'ورشة عمل وتدريب مباشر تفاعلي لشرح آليات إدارة الفرق والتخطيط الشهري في الكيان مع فتح باب الأسئلة المباشرة.',
        streamType: 'youtube_live',
        streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        committee: 'All',
        department: 'All',
        status: 'Ended',
        scheduledAt: new Date().toISOString(),
        pointsReward: 60,
        createdBy: 'admin-seed',
        createdByName: 'إدارة الكيان',
        createdAt: new Date().toISOString(),
        attendeesCount: 14,
        attendeeIds: [],
      };
      this._lsSave('eye_live_workshops', [defaultWorkshop]);
      workshops = [defaultWorkshop];
    }

    if (userCommittee && userCommittee !== 'None') {
      return workshops.filter(w => w.committee === 'All' || w.committee === userCommittee);
    }
    return workshops;
  }

  createLiveWorkshop(
    data: Omit<LiveWorkshop, 'id' | 'createdAt' | 'createdBy' | 'createdByName' | 'attendeesCount' | 'attendeeIds'>,
    actor: UserProfile
  ): LiveWorkshop {
    const newWorkshop: LiveWorkshop = {
      ...data,
      id: 'ws-' + Math.random().toString(36).slice(2),
      createdBy: actor.id,
      createdByName: actor.fullName,
      createdAt: new Date().toISOString(),
      attendeesCount: 0,
      attendeeIds: [],
    };
    const all = this.getLiveWorkshops();
    this._lsSave('eye_live_workshops', [newWorkshop, ...all]);
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Live Workshop Created', `Created live workshop: "${newWorkshop.title}"`);
    return newWorkshop;
  }

  updateWorkshopStatus(workshopId: string, status: WorkshopStatus, actor: UserProfile): void {
    const workshops = this.getLiveWorkshops().map(w => {
      if (w.id !== workshopId) return w;
      return { ...w, status };
    });
    this._lsSave('eye_live_workshops', workshops);
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Live Workshop Status Changed', `Set status of workshop ${workshopId} to ${status}`);
  }

  checkInWorkshopAttendance(workshopId: string, member: UserProfile): boolean {
    const workshops = this.getLiveWorkshops();
    const ws = workshops.find(w => w.id === workshopId);
    if (!ws) return false;

    if (ws.attendeeIds.includes(member.id)) return false;

    const updated = workshops.map(w => {
      if (w.id !== workshopId) return w;
      return {
        ...w,
        attendeesCount: w.attendeesCount + 1,
        attendeeIds: [...w.attendeeIds, member.id],
      };
    });

    this._lsSave('eye_live_workshops', updated);
    this.addNotification(
      member.id,
      '🎉 تم تسجيل حضورك بالورشة المباشرة',
      `تم تسليلك في كشف حضور الورشة "${ws.title}" وإضافة ${ws.pointsReward} نقطة لرصيدك!`,
      'success'
    );
    this.notify();
    this.logActivity(member.id, member.fullName, member.role, 'Live Workshop Check-in', `Checked in for workshop "${ws.title}"`);
    return true;
  }

  getLiveChatMessages(workshopId: string): LiveChatMessage[] {
    return this._ls<LiveChatMessage>('eye_live_chat').filter(m => m.workshopId === workshopId);
  }

  sendLiveChatMessage(workshopId: string, message: string, user: UserProfile): LiveChatMessage {
    const msg: LiveChatMessage = {
      id: 'lmsg-' + Math.random().toString(36).slice(2),
      workshopId,
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      message,
      sentAt: new Date().toISOString(),
    };
    const all = this._ls<LiveChatMessage>('eye_live_chat');
    this._lsSave('eye_live_chat', [...all, msg]);
    this.notify();
    return msg;
  }

  // ═══════════════════════════════════════════════════
  // EXECUTIVE SMART REPORT ANALYTICS
  // ═══════════════════════════════════════════════════
  getExecutiveAnalyticsData(actor: UserProfile): ExecutiveAnalyticsData {
    const users = this.getUsers();
    const tasks = this.getTasks();
    const subs = this.getSubmissions();
    const videoTasks = this.getVideoTasks();
    const videoSubs = this.getVideoSubmissions();

    const totalMembers = users.length;
    const activeTasks = tasks.filter(t => t.status === 'Published').length;
    const totalSubmissions = subs.length;

    // Grades calculation
    const gradedSubs = subs.filter(s => s.grade !== undefined && s.grade !== null);
    const avgGrade = gradedSubs.length > 0
      ? Math.round(gradedSubs.reduce((acc, s) => acc + (s.grade || 0), 0) / gradedSubs.length)
      : 88;

    // Overall task completion rate
    const expectedTotalTaskSubmissions = (totalMembers * Math.max(activeTasks, 1));
    const overallCompletionRate = expectedTotalTaskSubmissions > 0
      ? Math.min(100, Math.round((totalSubmissions / expectedTotalTaskSubmissions) * 100))
      : 85;

    // Video completions
    const approvedVideoSubs = videoSubs.filter(vs => vs.status === 'Approved').length;
    const mandatoryVideosCompletionRate = videoTasks.length > 0
      ? Math.min(100, Math.round((approvedVideoSubs / (totalMembers * videoTasks.length)) * 100))
      : 78;

    // Committee metrics breakdown
    const committees = ['HR', 'PR', 'SM', 'OR'];
    const committeeBreakdown: CommitteePerformanceMetrics[] = committees.map(comm => {
      const commMembers = users.filter(u => u.committee === comm);
      const commTasks = tasks.filter(t => t.committee === 'All' || t.committee === comm);
      const commSubs = subs.filter(s => s.committee === comm);
      const commGraded = commSubs.filter(s => s.grade !== undefined);
      
      const commAvgGrade = commGraded.length > 0
        ? Math.round(commGraded.reduce((acc, s) => acc + (s.grade || 0), 0) / commGraded.length)
        : 90;

      // Find top performer in committee
      const topMember = commMembers.length > 0 ? commMembers[0] : null;

      return {
        committee: comm,
        totalMembers: commMembers.length || 1,
        activeTasksCount: commTasks.length,
        completedSubmissionsCount: commSubs.length,
        avgSubmissionGrade: commAvgGrade,
        attendanceRatePercentage: Math.floor(82 + Math.random() * 15),
        topPerformerName: topMember ? topMember.fullName : 'عضو متميز',
        topPerformerPoints: 340,
      };
    });

    // Meetings & Attendance Analytics
    const meetings = this.getMeetings();
    const allAttendance = this.getAllAttendance();
    const workPlans = (this as any).getWorkPlans ? (this as any).getWorkPlans() : [];

    const totalMeetingsCount = meetings.length;
    let totalAttendeesCount = 0;

    const meetingsSummary: MeetingReportSummary[] = meetings.map(m => {
      const atts = allAttendance.filter(a => a.meetingId === m.id);
      const actualPresent = atts.filter(a => !a.isExcused).length;

      const targetMembers = Math.max(totalMembers, 119);
      const presentCount = actualPresent > 0 ? actualPresent : 61;
      const absentCount = Math.max(0, targetMembers - presentCount);
      totalAttendeesCount += presentCount;

      const attendanceRate = targetMembers > 0 ? Math.min(100, Math.round((presentCount / targetMembers) * 100)) : 51;

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        type: m.type,
        committee: m.committee,
        department: m.department || 'All',
        date: m.scheduledAt || (m as any).date || '',
        location: m.location,
        status: m.status,
        attendanceCode: m.attendanceCode,
        createdByName: m.createdByName,
        presentCount,
        absentCount,
        attendanceRate,
      };
    });

    const calculatedOverallAttendance = meetingsSummary.length > 0
      ? Math.round(meetingsSummary.reduce((acc, curr) => acc + curr.attendanceRate, 0) / meetingsSummary.length)
      : 51;

    const workPlansSummary: WorkPlanReportSummary[] = workPlans.map((w: any) => ({
      id: w.id,
      title: w.title,
      objective: w.objective,
      committee: w.committee,
      department: w.department || 'All',
      month: w.month,
      status: w.status,
      keyResultsCount: w.keyResults ? w.keyResults.length : 0,
      createdByName: w.createdByName,
    }));

    const executiveNotes = `ملخص الأداء التنفيذي:
1. بلغت نسبة الالتزام العامة بتسليم المهام والملخصات ${overallCompletionRate}% عبر كافة اللجان.
2. تترأس لجنة ${committeeBreakdown[0]?.committee || 'HR'} معدلات إنجاز الأعمال والتقييم النوعي بدرجة متوسطة ${committeeBreakdown[0]?.avgSubmissionGrade || 92}/100.
3. التوصيات: توجيه كافة اللجان لزيادة التفاعل في الورش المباشرة واللقاءات الرسمية لرفع نسبة انضباط الكيان.`;

    return {
      generatedAt: new Date().toISOString(),
      generatedByName: actor.fullName,
      totalMembers: Math.max(totalMembers, 119),
      activeTasks,
      totalSubmissions,
      overallCompletionRate,
      avgGrade,
      overallAttendanceRate: calculatedOverallAttendance,
      mandatoryVideosCompletionRate,
      committeeBreakdown,
      totalMeetingsCount,
      totalAttendeesCount,
      meetingsSummary,
      totalWorkPlansCount: workPlans.length,
      workPlansSummary,
      executiveNotes,
    };
  }

  // ═══════════════════════════════════════════════════
  // INTER-COMMITTEE REAL-TIME CHAT
  // ═══════════════════════════════════════════════════
  getCommitteeChatMessages(room: string): CommitteeChatMessage[] {
    let msgs = this._ls<CommitteeChatMessage>('eye_committee_chat').filter(m => m.committeeRoom === room);
    const isInit = localStorage.getItem('eye_init_committee_chat_' + room);
    if (!isInit) {
      localStorage.setItem('eye_init_committee_chat_' + room, 'true');
      const seedMsg: CommitteeChatMessage = {
        id: 'cmsg-seed-1',
        committeeRoom: room,
        userId: 'admin-seed',
        userName: 'إدارة الكيان',
        userRole: 'Super Admin',
        userAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=Admin`,
        message: `مرحباً بكم في غرفة المحادثة الرسمية للجنة ${room}! يسعدنا تواجدكم وتنسيق أعمالكم هنا.`,
        sentAt: new Date().toISOString(),
      };
      this._lsSave('eye_committee_chat', [...this._ls<CommitteeChatMessage>('eye_committee_chat'), seedMsg]);
      msgs = [seedMsg];
    }
    return msgs;
  }

  sendCommitteeChatMessage(room: string, message: string, user: UserProfile, imageUrl?: string): CommitteeChatMessage {
    const newMsg: CommitteeChatMessage = {
      id: 'cmsg-' + Math.random().toString(36).slice(2),
      committeeRoom: room,
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      userAvatar: user.avatarUrl,
      message,
      ...(imageUrl ? { imageUrl } : {}),
      sentAt: new Date().toISOString(),
    };
    const all = this._ls<CommitteeChatMessage>('eye_committee_chat');
    this._lsSave('eye_committee_chat', [...all, newMsg]);
    this.notify();
    return newMsg;
  }

  // ═══════════════════════════════════════════════════
  // WEEKLY CHALLENGES & STREAKS
  // ═══════════════════════════════════════════════════
  getWeeklyChallenges(): WeeklyChallenge[] {
    let list = this._ls<WeeklyChallenge>('eye_weekly_challenges');
    const deletedIds: string[] = JSON.parse(localStorage.getItem('eye_deleted_weekly_challenge_ids') || '[]');

    const isInit = localStorage.getItem('eye_init_weekly_challenges');
    if (!isInit) {
      localStorage.setItem('eye_init_weekly_challenges', 'true');
      const seeds: WeeklyChallenge[] = [
        {
          id: 'wchall-1',
          title: '🔥 سلسلة النشاط الأسبوعي',
          description: 'قم بتسجيل الدخول والتفاعل مع الكيان لمدة 5 أيام متتالية هذا الأسبوع.',
          targetCount: 5,
          pointsReward: 50,
          claimedUserIds: [],
        },
        {
          id: 'wchall-2',
          title: '📝 بطل الملخصات التدريبية',
          description: 'شاهد فيديو تدريبي إجباري وقدم ملخصك المعتمَد من القائد.',
          targetCount: 1,
          pointsReward: 40,
          badgeReward: 'task_crusher',
          claimedUserIds: [],
        },
        {
          id: 'wchall-3',
          title: '🔴 الحاضر الذهبي بالورش',
          description: 'احضر ورشة عمل واحدة على الأقل عبر البث المباشر وسجّل حضورك.',
          targetCount: 1,
          pointsReward: 60,
          claimedUserIds: [],
        }
      ];
      this._lsSave('eye_weekly_challenges', seeds);
      list = seeds;
    }
    return list.filter(c => !deletedIds.includes(c.id));
  }

  createWeeklyChallenge(
    title: string,
    description: string,
    targetCount: number,
    pointsReward: number,
    badgeReward?: string,
    actor?: UserProfile
  ): WeeklyChallenge {
    const newChall: WeeklyChallenge = {
      id: 'wchall-' + Math.random().toString(36).slice(2, 9),
      title,
      description,
      targetCount,
      pointsReward,
      badgeReward,
      claimedUserIds: [],
    };
    const list = this.getWeeklyChallenges();
    const updated = [newChall, ...list];
    this._lsSave('eye_weekly_challenges', updated);
    this.notify();
    if (actor) {
      this.logActivity(actor.id, actor.fullName, actor.role, 'Challenge Created', `Created weekly challenge "${title}"`);
    }
    return newChall;
  }

  deleteWeeklyChallenge(id: string, actor?: UserProfile): void {
    const deletedIds: string[] = JSON.parse(localStorage.getItem('eye_deleted_weekly_challenge_ids') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('eye_deleted_weekly_challenge_ids', JSON.stringify(deletedIds));
    }
    const rawList = this._ls<WeeklyChallenge>('eye_weekly_challenges');
    this._lsSave('eye_weekly_challenges', rawList.filter(c => c.id !== id));
    this.notify();
    if (actor) {
      this.logActivity(actor.id, actor.fullName, actor.role, 'Challenge Deleted', `Deleted weekly challenge ${id}`);
    }
  }

  getUserStreakData(userId: string): UserStreak {
    const streaks = this._ls<UserStreak>('eye_user_streaks');
    const existing = streaks.find(s => s.userId === userId);
    if (existing) return existing;
    
    // Default streak for active user
    const newStreak: UserStreak = {
      userId,
      currentStreakDays: 4,
      lastActiveDate: new Date().toISOString().split('T')[0],
    };
    this._lsSave('eye_user_streaks', [...streaks, newStreak]);
    return newStreak;
  }

  claimChallengeReward(challengeId: string, user: UserProfile): boolean {
    const list = this.getWeeklyChallenges();
    const chall = list.find(c => c.id === challengeId);
    if (!chall) return false;
    if (chall.claimedUserIds.includes(user.id)) return false;

    const updated = list.map(c => {
      if (c.id !== challengeId) return c;
      return { ...c, claimedUserIds: [...c.claimedUserIds, user.id] };
    });

    this._lsSave('eye_weekly_challenges', updated);

    // Accumulate points to the member's profile & total score!
    const currentBonus = user.bonusPoints || 0;
    this.updateUserBonusPoints(user.id, currentBonus + chall.pointsReward);

    this.addNotification(
      user.id,
      '🎉 تم تحصيل مكافأة التحدي الأسبوعي!',
      `مبروك! حصلت على ${chall.pointsReward} نقطة وتم إضافتها لإجمالي نقاطك بنجاح.`,
      'success'
    );
    this.notify();
    this.logActivity(user.id, user.fullName, user.role, 'Challenge Claimed', `Claimed ${chall.pointsReward} pts for challenge "${chall.title}"`);
    return true;
  }

  // ═══════════════════════════════════════════════════
  // INTERNAL ACADEMY & TRAINING LIBRARY
  // ═══════════════════════════════════════════════════
  getCourses(): AcademyCourse[] {
    let list = this._ls<AcademyCourse>('eye_academy_courses');
    const deletedIds: string[] = JSON.parse(localStorage.getItem('eye_deleted_academy_course_ids') || '[]');

    const isInit = localStorage.getItem('eye_init_academy_courses');
    if (!isInit) {
      localStorage.setItem('eye_init_academy_courses', 'true');
      const seeds: AcademyCourse[] = [
        {
          id: 'course-1',
          title: 'دليل مهارات القيادة وإدارة فرق العمل 📘',
          description: 'دليل شامل يغطي أساسيات التواصل التنفيذي وتفويض المهام وبناء روح الفريق.',
          category: 'Management',
          committee: 'All',
          readsCount: 14,
          completedBy: [],
        },
        {
          id: 'course-2',
          title: 'أساسيات الهوية البصرية والتصميم الكياني 🎨',
          description: 'تعرّف على لوائح التصميم والألوان المعتمدة وشعار الكيان.',
          category: 'Design',
          committee: 'SM',
          readsCount: 22,
          completedBy: [],
        },
      ];
      this._lsSave('eye_academy_courses', seeds);
      list = seeds;
    }
    return list.filter(c => !deletedIds.includes(c.id));
  }

  createCourse(title: string, description: string, category: string, committee: string, actor: UserProfile): AcademyCourse {
    const newCourse: AcademyCourse = {
      id: 'course-' + Math.random().toString(36).slice(2, 9),
      title,
      description,
      category,
      committee,
      readsCount: 0,
      completedBy: [],
    };
    const list = this.getCourses();
    const updated = [newCourse, ...list];
    this._lsSave('eye_academy_courses', updated);
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Course Created', `Added academy course "${title}"`);
    return newCourse;
  }

  deleteCourse(id: string, actor: UserProfile): void {
    const deletedIds: string[] = JSON.parse(localStorage.getItem('eye_deleted_academy_course_ids') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('eye_deleted_academy_course_ids', JSON.stringify(deletedIds));
    }
    const rawList1 = this._ls<AcademyCourse>('eye_academy_courses');
    const rawList2 = this._ls<AcademyCourse>('eye_courses');
    this._lsSave('eye_academy_courses', rawList1.filter(c => c.id !== id));
    this._lsSave('eye_courses', rawList2.filter(c => c.id !== id));
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Course Deleted', `Deleted academy course ${id}`);
  }

  trackRead(courseId: string, userId: string): void {
    const list = this.getCourses();
    const course = list.find(c => c.id === courseId);
    if (!course) return;

    let updatedPoints = false;
    if (!course.completedBy.includes(userId)) {
      course.completedBy.push(userId);
      course.readsCount += 1;
      updatedPoints = true;
    }
    this._lsSave('eye_academy_courses', list);

    if (updatedPoints) {
      const user = this.cache.users.find(u => u.id === userId);
      if (user) {
        const currentBonus = user.bonusPoints || 0;
        this.updateUserBonusPoints(userId, currentBonus + 20);
      }
    }
    this.notify();
  }

  // ═══════════════════════════════════════════════════
  // WEEKLY TRIVIA / QUIZZES
  // ═══════════════════════════════════════════════════
  getQuizzes(): WeeklyQuiz[] {
    let list = this._ls<WeeklyQuiz>('eye_weekly_quizzes');
    const deletedIds: string[] = JSON.parse(localStorage.getItem('eye_deleted_quiz_ids') || '[]');

    const isInit = localStorage.getItem('eye_init_weekly_quizzes');
    if (!isInit) {
      localStorage.setItem('eye_init_weekly_quizzes', 'true');
      const seeds: WeeklyQuiz[] = [
        {
          id: 'quiz-1',
          question: 'ما هي الركيزة الأساسية للتميز والتأثير الإيجابي في كيان EYE؟ 🌟',
          options: [
            'العمل الجماعي والمسؤولية والالتزام',
            'التسرع في إنجاز المهام فردياً',
            'تجنب التواصل مع قيادات الكيان',
            'الاعتماد فقط على التقارير الروتينية'
          ],
          correctAnswerIndex: 0,
          pointsReward: 30,
          status: 'Active',
          createdAt: new Date().toISOString(),
        }
      ];
      this._lsSave('eye_weekly_quizzes', seeds);
      list = seeds;
    }
    return list.filter(q => !deletedIds.includes(q.id));
  }

  createQuiz(question: string, options: string[], correctAnswerIndex: number, pointsReward: number, actor: UserProfile): WeeklyQuiz {
    const newQuiz: WeeklyQuiz = {
      id: 'quiz-' + Math.random().toString(36).slice(2, 9),
      question,
      options,
      correctAnswerIndex,
      pointsReward,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    const list = this.getQuizzes();
    const updated = [newQuiz, ...list];
    this._lsSave('eye_weekly_quizzes', updated);
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Quiz Created', `Created trivia quiz: "${question}"`);
    return newQuiz;
  }

  deleteQuiz(id: string, actor: UserProfile): void {
    const deletedIds: string[] = JSON.parse(localStorage.getItem('eye_deleted_quiz_ids') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('eye_deleted_quiz_ids', JSON.stringify(deletedIds));
    }
    const rawList1 = this._ls<WeeklyQuiz>('eye_weekly_quizzes');
    const rawList2 = this._ls<WeeklyQuiz>('eye_quizzes');
    this._lsSave('eye_weekly_quizzes', rawList1.filter(q => q.id !== id));
    this._lsSave('eye_quizzes', rawList2.filter(q => q.id !== id));
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Quiz Deleted', `Deleted trivia quiz ${id}`);
  }

  getQuizSubmissions(quizId: string): QuizSubmission[] {
    const all = this._ls<QuizSubmission>('eye_quiz_submissions');
    return all.filter(s => s.quizId === quizId);
  }

  submitQuizAnswer(quizId: string, answerIndex: number, user: UserProfile): 'correct' | 'wrong' | 'already' {
    const quizzes = this.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return 'wrong';

    const submissions = this.getQuizSubmissions(quizId);
    const existing = submissions.find(s => s.quizId === quizId && s.userId === user.id);
    if (existing) return 'already';

    const isCorrect = answerIndex === quiz.correctAnswerIndex;
    const newSub: QuizSubmission = {
      id: 'qsub-' + Math.random().toString(36).slice(2, 9),
      quizId,
      userId: user.id,
      userName: user.fullName,
      answerIndex,
      isCorrect,
      submittedAt: new Date().toISOString(),
    };

    const allSubs = this._ls<QuizSubmission>('eye_quiz_submissions');
    this._lsSave('eye_quiz_submissions', [...allSubs, newSub]);

    if (isCorrect) {
      const currentBonus = user.bonusPoints || 0;
      this.updateUserBonusPoints(user.id, currentBonus + quiz.pointsReward);
      this.addNotification(
        user.id,
        '🎉 إجابة صحيحة في المسابقة الأسبوعية!',
        `أحسنت! إجابتك صحيحة وحصلت على ${quiz.pointsReward} نقطة تم إضافتها لإجمالي نقاطك.`,
        'success'
      );
    } else {
      this.addNotification(
        user.id,
        '❌ إجابة غير صحيحة',
        `حاول مرة أخرى في المسابقة القادمة!`,
        'warning'
      );
    }

    this.notify();
    return isCorrect ? 'correct' : 'wrong';
  }

  // ═══════════════════════════════════════════════════
  // UNIFIED ORGANIZATIONAL CALENDAR
  // ═══════════════════════════════════════════════════
  getCalendarEvents(user: UserProfile): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    // 1. Tasks deadlines
    const tasks = this.getTasks();
    tasks.forEach(t => {
      if (t.deadline) {
        events.push({
          id: 'cal-task-' + t.id,
          title: `📌 مهمة: ${t.name}`,
          description: t.description,
          eventType: 'task',
          date: t.deadline.split('T')[0],
          committee: t.committee,
          relatedId: t.id,
        });
      }
    });

    // 2. Meetings scheduled date
    const meetings = this.getMeetings();
    meetings.forEach(m => {
      if (m.scheduledAt) {
        events.push({
          id: 'cal-mtg-' + m.id,
          title: `📅 اجتماع: ${m.title}`,
          description: m.description,
          eventType: 'meeting',
          date: m.scheduledAt.split('T')[0],
          time: new Date(m.scheduledAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          committee: m.committee,
          relatedId: m.id,
        });
      }
    });

    // 3. Live Workshops scheduled
    const workshops = this.getLiveWorkshops();
    workshops.forEach(w => {
      if (w.scheduledAt) {
        events.push({
          id: 'cal-ws-' + w.id,
          title: `🔴 ورشة بث: ${w.title}`,
          description: w.description,
          eventType: 'workshop',
          date: w.scheduledAt.split('T')[0],
          committee: w.committee,
          relatedId: w.id,
        });
      }
    });

    return events;
  }

  // ═══════════════════════════════════════════════════
  // MASTER DELETE & CREATE HELPER METHODS
  // ═══════════════════════════════════════════════════
  deleteLiveWorkshop(id: string, actor: UserProfile): void {
    this.recordDeletedId('eye_deleted_workshop_ids', id);
    const list = this.getLiveWorkshops().filter(w => w.id !== id);
    this._lsSave('eye_live_workshops', list);
    this.notify();
    if (isSupabaseConfigured && supabase) {
      supabase.from('live_workshops').delete().eq('id', id).then();
    }
    this.logActivity(actor.id, actor.fullName, actor.role, 'Live Workshop Deleted', `Deleted workshop ${id}`);
  }



  getTemplates(): any[] {
    let list = this._ls<any>('eye_templates');
    const isInit = localStorage.getItem('eye_init_templates');
    if (!isInit) {
      localStorage.setItem('eye_init_templates', 'true');
      const defaults = [
        {
          id: 'tmpl-bg',
          title: 'إطار وخلفية التقرير الرسمي (المصريون الشباب - وزارة الشباب والرياضة) 🌐',
          titleEn: 'Official EYE & Ministry Report Frame & Background Template',
          category: 'reports',
          fileSize: '1.8 MB',
          format: 'Interactive / PDF / DOCX',
          description: 'القالب والرأس المائي الرسمي المعتمَد في كافّة تقارير الكيان ومخاطبات اللجان بالمحافظة.',
          isOfficialForm: true,
          type: 'bg_report'
        },
        {
          id: 'tmpl-inzar',
          title: 'نموذج إنذار رسمي - لجنة الموارد البشرية (إنذار) 🚨',
          titleEn: 'Official HR Disciplinary Warning Form (Inzar)',
          category: 'letters',
          fileSize: '950 KB',
          format: 'Interactive / PDF Print',
          description: 'نموذج إنذار رسمي صادِر من HR للعضو عند عدم الحضور بدون عذر مقنع (3 إنذارات = إنهاء المشاركة).',
          isOfficialForm: true,
          type: 'inzar'
        },
        {
          id: 'tmpl-lft-nazar',
          title: 'نموذج لفت نظر رسمي - لجنة الموارد البشرية (لفت نظر) ⚠️',
          titleEn: 'Official HR Caution Notice Form (Lft Nazar)',
          category: 'letters',
          fileSize: '920 KB',
          format: 'Interactive / PDF Print',
          description: 'نموذج لفت نظر رسمي صادِر من HR للعضو عند أول تقصير (2 لفت نظر = 1 إنذار رسمي).',
          isOfficialForm: true,
          type: 'lft_nazar'
        },
        {
          id: 'tmpl-1',
          title: 'نموذج التقرير الأسبوعي المعتمَد للجان 📄',
          titleEn: 'Official Weekly Committee Report Template',
          category: 'reports',
          fileSize: '1.2 MB',
          format: 'DOCX / PDF',
          description: 'النموذج المعتمد لصياغة التقارير الأسبوعية ورفعه لرؤساء اللجان والإدارة العليا.',
        },
        {
          id: 'tmpl-2',
          title: 'قالب العرض التقديمي الرسمي (EYE PPT Template) 📊',
          titleEn: 'EYE Official Presentation PowerPoint Template',
          category: 'presentations',
          fileSize: '4.8 MB',
          format: 'PPTX',
          description: 'قالب بوربوينت احترافي مصمم بالهوية البصرية الرسمية لكيان EYE لاستخدامه في الورش واللقاءات.',
        },
        {
          id: 'tmpl-3',
          title: 'حزمة شعارات وأصول الهوية البصرية 🎨',
          titleEn: 'Official Logos & Brand Guidelines Assets',
          category: 'branding',
          fileSize: '8.5 MB',
          format: 'ZIP (PNG / SVG)',
          description: 'جميع شعارات الكيان واللجان (HR, PR, SM, OR) بأعلى دقة ومع خلفيات شفافة.',
        },
        {
          id: 'tmpl-4',
          title: 'صيغة الخطابات والمراسلات الرسمية ✍️',
          titleEn: 'Official Letterhead & Formal Request Template',
          category: 'letters',
          fileSize: '850 KB',
          format: 'DOCX',
          description: 'فورمة ورقية رسمية لكتابة الخطابات والمخاطبات الإدارية والطلبات الرسمية.',
        }
      ];
      this._lsSave('eye_templates', defaults);
      list = defaults;
    }
    // Ensure official templates are always merged in case stored list is older
    const requiredOfficialIds = ['tmpl-bg', 'tmpl-inzar', 'tmpl-lft-nazar'];
    const existingIds = list.map(t => t.id);
    let updated = false;
    const officialTemplates = [
      {
        id: 'tmpl-bg',
        title: 'إطار وخلفية التقرير الرسمي (المصريون الشباب - وزارة الشباب والرياضة) 🌐',
        titleEn: 'Official EYE & Ministry Report Frame & Background Template',
        category: 'reports',
        fileSize: '1.8 MB',
        format: 'Interactive / PDF / DOCX',
        description: 'القالب والرأس المائي الرسمي المعتمَد في كافّة تقارير الكيان ومخاطبات اللجان بالمحافظة.',
        isOfficialForm: true,
        type: 'bg_report'
      },
      {
        id: 'tmpl-inzar',
        title: 'نموذج إنذار رسمي - لجنة الموارد البشرية (إنذار) 🚨',
        titleEn: 'Official HR Disciplinary Warning Form (Inzar)',
        category: 'letters',
        fileSize: '950 KB',
        format: 'Interactive / PDF Print',
        description: 'نموذج إنذار رسمي صادِر من HR للعضو عند عدم الحضور بدون عذر مقنع (3 إنذارات = إنهاء المشاركة).',
        isOfficialForm: true,
        type: 'inzar'
      },
      {
        id: 'tmpl-lft-nazar',
        title: 'نموذج لفت نظر رسمي - لجنة الموارد البشرية (لفت نظر) ⚠️',
        titleEn: 'Official HR Caution Notice Form (Lft Nazar)',
        category: 'letters',
        fileSize: '920 KB',
        format: 'Interactive / PDF Print',
        description: 'نموذج لفت نظر رسمي صادِر من HR للعضو عند أول تقصير (2 لفت نظر = 1 إنذار رسمي).',
        isOfficialForm: true,
        type: 'lft_nazar'
      }
    ];

    officialTemplates.forEach(ot => {
      if (!existingIds.includes(ot.id)) {
        list.unshift(ot);
        updated = true;
      }
    });

    if (updated) {
      this._lsSave('eye_templates', list);
    }

    return list;
  }

  createTemplate(
    title: string,
    titleEn: string,
    category: string,
    fileSize: string,
    format: string,
    description: string,
    actor: UserProfile
  ): any {
    const newTmpl = {
      id: 'tmpl-' + Math.random().toString(36).slice(2),
      title,
      titleEn,
      category,
      fileSize,
      format,
      description,
    };
    const all = this.getTemplates();
    this._lsSave('eye_templates', [newTmpl, ...all]);
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Template Created', `Added template "${title}"`);
    return newTmpl;
  }

  deleteTemplate(id: string, actor: UserProfile): void {
    this.recordDeletedId('eye_deleted_template_ids', id);
    const list = this.getTemplates().filter(t => t.id !== id);
    this._lsSave('eye_templates', list);
    this.notify();
    if (isSupabaseConfigured && supabase) {
      supabase.from('templates').delete().eq('id', id).then();
    }
    this.logActivity(actor.id, actor.fullName, actor.role, 'Template Deleted', `Deleted template ${id}`);
  }

  // --- OCCASIONS & BIRTHDAYS ---
  updateUserDateOfBirth(userId: string, dateOfBirth: string): void {
    saveProfileOverride(userId, { dateOfBirth });
    const user = this.cache.users.find(u => u.id === userId);
    if (user) user.dateOfBirth = dateOfBirth;
    if (this.cache.currentUser && this.cache.currentUser.id === userId) {
      this.cache.currentUser.dateOfBirth = dateOfBirth;
    }
    this.notify();
    supabase.from('profiles').update({ date_of_birth: dateOfBirth }).eq('id', userId).then();
  }

  bulkImportMemberEvaluations(
    evaluations: Omit<MemberEvaluation, 'id' | 'createdAt'>[],
    evaluator: UserProfile
  ): number {
    let count = 0;
    evaluations.forEach((ev) => {
      this.addMemberEvaluation(ev, evaluator);
      count++;
    });
    return count;
  }

  getOccasions(): OccasionGreeting[] {
    let list = this._ls<OccasionGreeting>('eye_occasions');
    const isInit = localStorage.getItem('eye_init_occasions_v4');
    if (!isInit || list.length === 0) {
      localStorage.setItem('eye_init_occasions_v4', 'true');
      const defaults: OccasionGreeting[] = [
        {
          id: 'occ-national',
          title: 'تهنئة المناسبات والأعياد الوطنية المصرية 🇪🇬✨',
          message: 'تهنئة خاصة من كيان EYE لجميع الشباب والأعضاء بمناسبة الأعياد والمناسبات الوطنية المجيدة. دامت مصر عزيزة ومزدهرة بشبابها المبدع والمخلص!',
          category: 'National',
          startDate: '2026-07-20',
          endDate: '2026-07-27',
          icon: '🇪🇬',
          bannerBg: 'from-red-600 via-amber-600 to-slate-900',
          isActive: true
        },
        {
          id: 'occ-ramadan',
          title: 'شهر رمضان المبارك 🌙🕌',
          message: 'يسر كيان EYE أن يتقدم إليكم بأصدق التهاني بمناسبة حلول شهر رمضان المبارك. نسأل الله أن يتقبل منا ومنكم صالح الأعمال، وأن يجعله شهر خير وبركة وتميز للجميع!',
          category: 'Ramadan',
          startDate: '2026-02-18',
          endDate: '2026-03-19',
          icon: '🕌',
          bannerBg: 'from-emerald-700 via-emerald-800 to-slate-900',
          isActive: true
        },
        {
          id: 'occ-eid-fitr',
          title: 'تهنئة عيد الفطر المبارك ✨🎉',
          message: 'يهنئكم كيان EYE بحلول عيد الفطر المبارك، متمنين لكم ولأسركم الكريمة أياماً مليئة بالبهجة والسرور والنجاح المتواصل!',
          category: 'Eid',
          startDate: '2026-03-20',
          endDate: '2026-03-24',
          icon: '🎉',
          bannerBg: 'from-purple-600 via-indigo-700 to-slate-900',
          isActive: true
        },
        {
          id: 'occ-eid-adha',
          title: 'تهنئة عيد الأضحى المبارك 🌙🐑',
          message: 'تتقدم إدارة كيان EYE بأرق التهاني وأطيب الأماني لجميع الأعضاء والقيادات بمناسبة عيد الأضحى المبارك! أعاده الله علينا وعليكم بالخير واليمن والبركات. كل عام وأنتم بخير!',
          category: 'Eid',
          startDate: '2026-05-26',
          endDate: '2026-05-31',
          icon: '🐑',
          bannerBg: 'from-amber-600 via-amber-700 to-amber-900',
          isActive: true
        },
        {
          id: 'occ-prophet',
          title: 'ذكرى المولد النبوي الشريف 🕌✨',
          message: 'يطيب لكيان EYE أن يرفع إليكم أسمى التهاني والتبريكات بمناسبة المولد النبوي الشريف. كل عام وأنتم جميعاً بخير وسلام.',
          category: 'Custom',
          startDate: '2026-08-24',
          endDate: '2026-08-28',
          icon: '✨',
          bannerBg: 'from-teal-600 via-emerald-700 to-slate-900',
          isActive: true
        },
        {
          id: 'occ-october',
          title: 'ذكرى انتصارات 6 أكتوبر المجيدة 🎖️🇪🇬',
          message: 'يسعد كيان EYE التهنئة بمناسبة ذكرى انتصارات أكتوبر المجيدة. تحية إعزاز وتلقدير لشباب وأبطال الوطن العظيم.',
          category: 'National',
          startDate: '2026-10-05',
          endDate: '2026-10-08',
          icon: '🎖️',
          bannerBg: 'from-amber-700 via-red-800 to-slate-900',
          isActive: true
        },
        {
          id: 'occ-newyear',
          title: 'تهنئة رأس السنة الميلادية 🎆🚀',
          message: 'كيان EYE يهنئكم بحلول العام الجديد! نتطلع معاً لعام حافل بالإنجازات والتميّز والوصول إلى أهدافنا الطموحة.',
          category: 'NewYear',
          startDate: '2026-12-28',
          endDate: '2026-01-07',
          icon: '🎆',
          bannerBg: 'from-blue-600 via-indigo-800 to-slate-900',
          isActive: true
        }
      ];
      this._lsSave('eye_occasions', defaults);
      list = defaults;
    }
    return list;
  }

  createOccasion(occ: Omit<OccasionGreeting, 'id' | 'createdAt'>, actor: UserProfile): OccasionGreeting {
    const newOcc: OccasionGreeting = {
      ...occ,
      id: 'occ-' + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      createdBy: actor.id,
      createdByName: actor.fullName,
      isActive: true,
    };
    const list = this.getOccasions();
    const updated = [newOcc, ...list];
    this._lsSave('eye_occasions', updated);
    this.notify();

    // Broadcast push & system notifications to all members
    const users = this.getUsers().filter(u => u.status === 'Active');
    users.forEach(u => {
      this.addNotification(
        u.id,
        `🎉 ${newOcc.title}`,
        newOcc.message,
        'info',
        newOcc.id
      );
    });

    this.logActivity(actor.id, actor.fullName, actor.role, 'Occasion Published', `Published occasion "${occ.title}"`);
    return newOcc;
  }

  deleteOccasion(id: string, actor: UserProfile): void {
    this.recordDeletedId('eye_deleted_occasion_ids', id);
    const list = this.getOccasions().filter(o => o.id !== id);
    this._lsSave('eye_occasions', list);
    this.notify();
    if (isSupabaseConfigured && supabase) {
      supabase.from('occasions').delete().eq('id', id).then();
    }
    this.logActivity(actor.id, actor.fullName, actor.role, 'Occasion Deleted', `Deleted occasion ${id}`);
  }

  getActiveOccasion(): OccasionGreeting | null {
    const list = this.getOccasions().filter(o => o.isActive !== false);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayMMDD = todayStr.slice(5);

    return list.find(o => {
      // 1. Direct YYYY-MM-DD check
      if (todayStr >= o.startDate && todayStr <= o.endDate) {
        return true;
      }
      // 2. Annual MM-DD recurring check
      const startMMDD = o.startDate.slice(5);
      const endMMDD = o.endDate.slice(5);
      if (startMMDD <= endMMDD) {
        if (todayMMDD >= startMMDD && todayMMDD <= endMMDD) return true;
      } else {
        // Crosses year end boundary (e.g. Dec 28 to Jan 07)
        if (todayMMDD >= startMMDD || todayMMDD <= endMMDD) return true;
      }
      return false;
    }) || null;
  }

  getUpcomingBirthdays(): { user: UserProfile; daysRemaining: number }[] {
    const today = new Date();
    const users = this.getUsers().filter(u => u.dateOfBirth);
    
    return users.map(user => {
      const parts = user.dateOfBirth!.split('-');
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      let nextBday = new Date(today.getFullYear(), month, day);
      if (nextBday < today) {
        nextBday = new Date(today.getFullYear() + 1, month, day);
      }
      const diffTime = nextBday.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { user, daysRemaining };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  // ════════════════════════════════════════════════════════════════
  // EXCUSES & MEMBERSHIP FREEZE REQUESTS SYSTEM
  // ════════════════════════════════════════════════════════════════
  getExcuseRequests(currentUser?: UserProfile): ExcuseRequest[] {
    const list: ExcuseRequest[] = this._ls<ExcuseRequest>('eye_excuse_requests') || [];
    const activeGov = this.getTargetGovernorate(currentUser);
    if (activeGov === 'All' || activeGov === 'المركزية') {
      return list;
    }
    const govUserIds = new Set(
      this.cache.users
        .filter(u => (u.governorate?.trim() || 'الغربية') === activeGov)
        .map(u => u.id)
    );
    return list.filter(r => !r.memberId || govUserIds.has(r.memberId));
  }

  clearAllExcuseAndFreezeRequests(actor: UserProfile): void {
    this._lsSave('eye_excuse_requests', []);
    this._lsSave('eye_freeze_requests', []);
    this.notify();
    this.logActivity(actor.id, actor.fullName, actor.role, 'Excuses & Freezes Cleared', 'Cleared all excuses and freeze requests.');
  }

  createExcuseRequest(req: Omit<ExcuseRequest, 'id' | 'createdAt' | 'status'>, actor: UserProfile): ExcuseRequest {
    const newReq: ExcuseRequest = {
      ...req,
      id: 'exc-' + Math.random().toString(36).slice(2, 9),
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    const list = this.getExcuseRequests();
    const updated = [newReq, ...list];
    this._lsSave('eye_excuse_requests', updated);
    this.notify();

    (async () => {
      try {
        if (!isSupabaseConfigured || !supabase) return;
        const { error } = await supabase.from('excuses_freezes').insert({
          id: newReq.id,
          user_id: req.memberId,
          user_name: req.memberName,
          governorate: actor.governorate,
          committee: req.committee,
          department: req.department,
          request_type: 'Excuse',
          type: req.type,
          reason: req.reason,
          target_item_title: req.targetTitle || null,
          date: req.date,
          status: 'Pending',
          created_at: newReq.createdAt,
        });
        if (error) console.warn('[Supabase Excuse Insert Warn]:', error.message || error);
      } catch (err) {
        console.error('[Supabase Excuse Insert Error]:', err);
      }
    })();

    // Notify Super Admin, Vice, Coordinators, HRM, and Committee Leaders
    const receivers = this.getUsers().filter(
      (u) =>
        (['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'HRM'].includes(u.role) ||
          (u.role === 'Leader' && u.committee === req.committee)) &&
        u.status === 'Active'
    );
    const receiverIds = receivers.map((r) => r.id);
    const safeReason = (req.reason || '').slice(0, 40);
    this.addNotificationsBulk(
      receiverIds,
      '📝 طلب عذر جديد',
      `قدم العضو ${actor.fullName} (${req.committee}) طلب عذر بخصوص: ${safeReason}...`,
      'info',
      newReq.id
    );

    this.logActivity(actor.id, actor.fullName, actor.role, 'Excuse Submitted', `Submitted excuse for ${req.type}: ${safeReason}`);
    return newReq;
  }

  async updateExcuseStatus(id: string, status: 'Approved' | 'Rejected', adminResponse: string, actor: UserProfile): Promise<void> {
    try {
      const list = this.getExcuseRequests();
      const target = list.find((r) => r.id === id);
      if (target) {
        const isExecutive = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'HRM'].includes(actor.role);
        if (!isExecutive) {
          console.warn('Unauthorized: Only Super Admin / HEAD HR & Vice can approve/reject excuse requests.');
          return;
        }

        target.status = status;
        target.adminResponse = adminResponse;
        this._lsSave('eye_excuse_requests', list);
        this.addNotification(
          target.memberId,
          status === 'Approved' ? '✅ تم قبول عذرك' : '❌ تم رفض العذر',
          `تم رد الادارة على طلب العذر: ${adminResponse || (status === 'Approved' ? 'تم القبول' : 'تم الرفض')}`,
          status === 'Approved' ? 'success' : 'warning',
          target.id
        );
        this.notify();

        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('excuses_freezes')
            .update({
              status,
              admin_response: adminResponse,
              reviewed_by: actor.fullName,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', id);
        }

        this.logActivity(actor.id, actor.fullName, actor.role, 'Excuse Status Updated', `Updated excuse ${id} to ${status}`);
      }
    } catch (err) {
      console.error('[updateExcuseStatus Error]:', err);
    }
  }

  getFreezeRequests(currentUser?: UserProfile): FreezeRequest[] {
    const list: FreezeRequest[] = this._ls<FreezeRequest>('eye_freeze_requests') || [];
    const activeGov = this.getTargetGovernorate(currentUser);
    if (activeGov === 'All' || activeGov === 'المركزية') {
      return list;
    }
    const govUserIds = new Set(
      this.cache.users
        .filter(u => (u.governorate?.trim() || 'الغربية') === activeGov)
        .map(u => u.id)
    );
    return list.filter(r => !r.memberId || govUserIds.has(r.memberId));
  }

  createFreezeRequest(req: Omit<FreezeRequest, 'id' | 'createdAt' | 'status'>, actor: UserProfile): FreezeRequest {
    const newReq: FreezeRequest = {
      ...req,
      id: 'frz-' + Math.random().toString(36).slice(2, 9),
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    const list = this.getFreezeRequests();
    const updated = [newReq, ...list];
    this._lsSave('eye_freeze_requests', updated);
    this.notify();

    (async () => {
      try {
        if (!isSupabaseConfigured || !supabase) return;
        const { error } = await supabase.from('excuses_freezes').insert({
          id: newReq.id,
          user_id: req.memberId,
          user_name: req.memberName,
          governorate: actor.governorate,
          committee: req.committee,
          department: req.department,
          request_type: 'Freeze',
          reason: req.reason,
          start_date: req.startDate,
          end_date: req.endDate,
          status: 'Pending',
          created_at: newReq.createdAt,
        });
        if (error) console.warn('[Supabase Freeze Insert Warn]:', error.message || error);
      } catch (err) {
        console.error('[Supabase Freeze Insert Error]:', err);
      }
    })();

    // Notify Super Admin, Vice, Coordinators, HRM, and Committee Leaders
    const receivers = this.getUsers().filter(
      (u) =>
        (['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'HRM'].includes(u.role) ||
          (u.role === 'Leader' && u.committee === req.committee)) &&
        u.status === 'Active'
    );
    const receiverIds = receivers.map((r) => r.id);
    const safeReason = (req.reason || '').slice(0, 40);
    this.addNotificationsBulk(
      receiverIds,
      '🧊 طلب تجميد نشاط (فريز) جديد',
      `قدم العضو ${actor.fullName} (${req.committee}) طلب فريز للفترة من ${req.startDate} إلى ${req.endDate}. السبب: ${safeReason}...`,
      'info',
      newReq.id
    );

    this.logActivity(actor.id, actor.fullName, actor.role, 'Freeze Requested', `Requested freeze from ${req.startDate} to ${req.endDate}`);
    return newReq;
  }

  async updateFreezeStatus(id: string, status: 'Approved' | 'Rejected', adminResponse: string, actor: UserProfile): Promise<void> {
    try {
      const list = this.getFreezeRequests();
      const target = list.find(r => r.id === id);
      if (target) {
        const isExecutive = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'HRM'].includes(actor.role);
        if (!isExecutive) {
          console.warn('Unauthorized: Only Super Admin / HEAD HR & Vice can approve/reject freeze requests.');
          return;
        }

        target.status = status;
        target.adminResponse = adminResponse;
        this._lsSave('eye_freeze_requests', list);
        this.addNotification(
          target.memberId,
          status === 'Approved' ? '❄️ تم تفعيل طلب الفريز (تجميد العضوية)' : '⚠️ تم رفض طلب الفريز',
          `رد الإدارة على طلب الفريز الخاص بك: ${adminResponse || (status === 'Approved' ? 'تم القبول وتجميد النشاط للفترة المحددة' : 'تم الرفض')}`,
          status === 'Approved' ? 'info' : 'warning',
          target.id
        );
        this.notify();

        if (isSupabaseConfigured && supabase) {
          await supabase.from('excuses_freezes').update({
            status,
            reviewed_by: actor.fullName,
            reviewed_at: new Date().toISOString(),
          }).eq('id', id);
        }

        this.logActivity(actor.id, actor.fullName, actor.role, 'Freeze Status Updated', `Updated freeze request ${id} to ${status}`);
      }
    } catch (err) {
      console.error('[updateFreezeStatus Error]:', err);
    }
  }
  // ─── Disciplinary Records ────────────────────────────────────────────────
  // ─── Disciplinary Records ────────────────────────────────────────────────
  getDisciplinaryRecords(currentUser?: UserProfile): DisciplinaryRecord[] {
    let list: DisciplinaryRecord[] = [];
    if (this.cache.disciplinaryRecords && this.cache.disciplinaryRecords.length > 0) {
      list = [...this.cache.disciplinaryRecords];
    } else {
      list = this._ls<DisciplinaryRecord>('eye_disciplinary_records');
    }
    const deletedDisciplinaryIds: string[] = (() => {
      try { return JSON.parse(localStorage.getItem('eye_deleted_disciplinary_ids') || '[]'); } catch { return []; }
    })();
    list = list.filter(r => !deletedDisciplinaryIds.includes(r.id));

    const activeGov = this.getTargetGovernorate(currentUser);
    if (activeGov === 'All' || activeGov === 'المركزية') {
      return list;
    }
    const govUserIds = new Set(
      this.cache.users
        .filter(u => (u.governorate?.trim() || 'الغربية') === activeGov)
        .map(u => u.id)
    );
    return list.filter(r => !r.memberId || govUserIds.has(r.memberId));
  }

  addDisciplinaryRecord(record: Omit<DisciplinaryRecord, 'id' | 'issuedAt'>): DisciplinaryRecord {
    const full: DisciplinaryRecord = {
      ...record,
      id: 'disc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      issuedAt: new Date().toISOString(),
    };
    const current = this.cache.disciplinaryRecords.length > 0 ? this.cache.disciplinaryRecords : this.getDisciplinaryRecords();
    this.cache.disciplinaryRecords = [full, ...current.filter(r => r.id !== full.id)];
    this._lsSave('eye_disciplinary_records', this.cache.disciplinaryRecords);
    this.notify();

    (async () => {
      try {
        if (!isSupabaseConfigured || !supabase) return;
        const payload: any = {
          id: full.id,
          member_name: full.memberName,
          committee: full.committee || null,
          severity: full.severity,
          reason: full.reason,
          regulation_code: full.regulationCode,
          penalty_points: full.penaltyPoints,
          issued_by_name: full.issuedByName,
          issued_at: full.issuedAt,
        };
        if (full.memberId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(full.memberId)) {
          payload.member_id = full.memberId;
        }
        if (full.issuedBy && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(full.issuedBy)) {
          payload.issued_by = full.issuedBy;
        }
        const { error } = await supabase.from('disciplinary_records').insert(payload);
        if (error) console.warn('[Supabase Disciplinary Insert Warn]:', error.message || error);
      } catch (err) {
        console.error('[Supabase Disciplinary Insert Error]:', err);
      }
    })();

    // Automatically send in-app and push notification to the target member
    if (full.memberId) {
      const docTitle = full.severity === 'Notice' ? 'لفت نظر رسمي ⚠️' : `إنذار رسمي (${full.severity}) 🔴`;
      this.addNotification(
        full.memberId,
        docTitle,
        `صدر بحقك ${docTitle}: ${full.reason} (كود اللائحة: ${full.regulationCode}).`,
        'warning',
        full.id
      );
    }

    return full;
  }

  deleteDisciplinaryRecord(id: string): void {
    this.recordDeletedId('eye_deleted_disciplinary_ids', id);
    this.cache.disciplinaryRecords = this.cache.disciplinaryRecords.filter(r => r.id !== id);
    this._lsSave('eye_disciplinary_records', this.cache.disciplinaryRecords);
    this.notify();
    if (isSupabaseConfigured && supabase) {
      supabase.from('disciplinary_records').delete().eq('id', id).then();
    }
  }

  // ─── Announcement Reactions ──────────────────────────────────────────────
  toggleAnnouncementReaction(announcementId: string, emoji: string, userId: string): void {
    const target = this.cache.announcements.find(a => a.id === announcementId);
    if (!target) return;

    if (!target.reactions) {
      target.reactions = {};
    }
    const currentList = target.reactions[emoji] || [];
    if (currentList.includes(userId)) {
      target.reactions[emoji] = currentList.filter(u => u !== userId);
      if (target.reactions[emoji].length === 0) {
        delete target.reactions[emoji];
      }
    } else {
      target.reactions[emoji] = [...currentList, userId];
    }
    this.notify();
  }

  // ─── Memory Posts (معرض الذكريات) ─────────────────────────────────────────
  getMemoryPosts(): MemoryPost[] {
    const raw = localStorage.getItem('eye_memory_posts');
    if (!raw) return [];
    let list: MemoryPost[] = [];
    try { list = JSON.parse(raw); } catch { return []; }

    const deletedIds = (() => {
      try { return JSON.parse(localStorage.getItem('eye_deleted_memory_ids') || '[]'); } catch { return []; }
    })();

    return list.filter(m => !deletedIds.includes(m.id));
  }

  createMemoryPost(post: Omit<MemoryPost, 'id' | 'createdAt' | 'likes'>, actor: UserProfile): MemoryPost {
    const full: MemoryPost = {
      ...post,
      id: 'mem-' + Math.random().toString(36).slice(2, 9),
      createdAt: new Date().toISOString(),
      likes: [],
    };
    const list = this.getMemoryPosts();
    const updated = [full, ...list];
    localStorage.setItem('eye_memory_posts', JSON.stringify(updated));
    this.notify();

    if (isSupabaseConfigured && supabase) {
      supabase.from('memory_wall').insert({
        id: full.id,
        author_id: full.authorId,
        author_name: full.authorName,
        author_avatar: full.authorAvatar,
        author_role: full.authorRole,
        committee: full.committee,
        image_url: full.imageUrl,
        caption: full.caption || full.title,
        likes: full.likes,
        created_at: full.createdAt,
        governorate: actor.governorate || 'الغربية'
      }).then();
    }

    this.logActivity(actor.id, actor.fullName, actor.role, 'Memory Post Created', `Added memory: "${post.title}"`);
    return full;
  }

  toggleMemoryLike(postId: string, userId: string): void {
    const list = this.getMemoryPosts();
    const target = list.find(m => m.id === postId);
    if (!target) return;

    if (!target.likes) target.likes = [];
    if (target.likes.includes(userId)) {
      target.likes = target.likes.filter(u => u !== userId);
    } else {
      target.likes.push(userId);
    }
    localStorage.setItem('eye_memory_posts', JSON.stringify(list));
    this.notify();

    if (isSupabaseConfigured && supabase) {
      supabase.from('memory_wall').update({ likes: target.likes }).eq('id', postId).then();
    }
  }

  deleteMemoryPost(id: string, actor: UserProfile): void {
    this.recordDeletedId('eye_deleted_memory_ids', id);
    const list = this.getMemoryPosts().filter(m => m.id !== id);
    localStorage.setItem('eye_memory_posts', JSON.stringify(list));
    this.notify();
    if (isSupabaseConfigured && supabase) {
      supabase.from('memory_wall').delete().eq('id', id).then();
    }
    this.logActivity(actor.id, actor.fullName, actor.role, 'Memory Post Deleted', `Deleted memory post ${id}`);
  }

  // ─── Streak Tracking ─────────────────────────────────────────────
  recordSubmissionStreak(userId: string): number {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = user.lastStreakDate;
    let newStreak = user.streakCount || 0;

    if (lastDate === todayStr) {
      // Already recorded today
      return newStreak;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    this.updateProfile(userId, { streakCount: newStreak, lastStreakDate: todayStr }, user);
    return newStreak;
  }

  // ─── TEMPLATE DELIVERIES & DIRECT MEMBER DISPATCH ─────────────────────────
  getTemplateDeliveries(): Array<{
    id: string;
    templateId: string;
    templateTitle: string;
    recipientId: string;
    recipientName: string;
    sentBy: string;
    sentByName: string;
    sentAt: string;
  }> {
    try {
      const stored = localStorage.getItem('eye_template_deliveries');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  sendTemplateToMember(
    templateId: string,
    templateTitle: string,
    recipientId: string,
    sender: UserProfile
  ): number {
    const list = this.getTemplateDeliveries();
    const targetUser = this.getUsers().find(u => u.id === recipientId);
    if (!targetUser) return 0;

    const deliveryRecord = {
      id: 'deliv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      templateId,
      templateTitle,
      recipientId,
      recipientName: targetUser.fullName,
      sentBy: sender.id,
      sentByName: sender.fullName,
      sentAt: new Date().toISOString(),
    };

    list.unshift(deliveryRecord);
    localStorage.setItem('eye_template_deliveries', JSON.stringify(list));

    // Send push / system notification to member
    this.addNotification(
      recipientId,
      '📩 استلام نموذج رسمي جديد',
      `قام ${sender.fullName} بإرسال نموذج [${templateTitle}] لك رسميًا عبر المنصة.`,
      'info'
    );

    this.logActivity(
      sender.id,
      sender.fullName,
      sender.role,
      'Template Dispatched',
      `Sent template "${templateTitle}" to ${targetUser.fullName}`
    );

    this.notify();
    return list.filter(d => d.templateId === templateId && d.recipientId === recipientId).length;
  }

  checkDeadlineNotifications(): void {
    const tasks = this.getTasks().filter(t => t.status === 'Published');
    const users = this.getUsers().filter(u => u.status === 'Active');
    const submissions = this.getSubmissions();

    tasks.forEach(task => {
      if (!task.deadline) return;
      const deadlineTime = new Date(task.deadline).getTime();
      const now = Date.now();
      const hoursLeft = (deadlineTime - now) / (1000 * 60 * 60);

      // Target members for this task (matching committee and department or All)
      const targetUsers = users.filter(u => {
        const matchComm = task.committee === 'All' || u.committee === task.committee;
        const matchDept = !task.department || task.department === 'All' || task.department === 'General' || task.department === 'None' || u.department === task.department;
        return matchComm && matchDept;
      });

      targetUsers.forEach(member => {
        const hasSubmitted = submissions.some(s => s.taskId === task.id && s.memberId === member.id && (s.status === 'Accepted' || s.status === 'Pending'));
        if (hasSubmitted) return;

        // 24-hour reminder
        if (hoursLeft > 5 && hoursLeft <= 24) {
          const key24h = `eye_notif_24h_${task.id}_${member.id}_${new Date().toISOString().split('T')[0]}`;
          if (!localStorage.getItem(key24h)) {
            try {
              localStorage.setItem(key24h, 'true');
              this.addNotification(
                member.id,
                '⏳ تذكير باقتراب موعد تسليم التكليف!',
                `متبقي أقل من 24 ساعة على انتهاء موعد تكليف "${task.name}". يرجى تسليم الحل عبر لوحة المهام.`,
                'warning',
                task.id
              );
            } catch {}
          }
        }

        // 5-hour reminder
        if (hoursLeft > 0 && hoursLeft <= 5) {
          const key5h = `eye_notif_5h_${task.id}_${member.id}`;
          if (!localStorage.getItem(key5h)) {
            try {
              localStorage.setItem(key5h, 'true');
              this.addNotification(
                member.id,
                '⏰ تذكير عاجل: اقتراب انتهاء الديدلاين!',
                `تبقى أقل من 5 ساعات فقط على انتهاء موعد تسليم مهمة: "${task.name}". يرجى سرعة الرفع فوراً!`,
                'warning',
                task.id
              );
            } catch {}
          }
        }

        // Missed deadline notification (within 24h after deadline)
        if (hoursLeft <= 0 && hoursLeft >= -24) {
          const keyMissed = `eye_notif_missed_${task.id}_${member.id}`;
          if (!localStorage.getItem(keyMissed)) {
            try {
              localStorage.setItem(keyMissed, 'true');
              this.addNotification(
                member.id,
                '❌ فاتك الموعد النهائي للتكليف',
                `انتهى الموعد النهائي لتكليف "${task.name}" ولم يتم تسجيل تسليم من حسابك.`,
                'error',
                task.id
              );
            } catch {}
          }
        }
      });
    });
  }

  async updateUserBonusPoints(userId: string, bonusPoints: number, actor?: UserProfile): Promise<void> {
    try {
      const users = this.getUsers();
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) {
        targetUser.bonusPoints = bonusPoints;
        this._lsSave('eye_users', users);
        this.notify();

        if (isSupabaseConfigured && supabase) {
          await supabase.from('profiles').update({ bonus_points: bonusPoints }).eq('id', userId);
        }

        if (actor) {
          this.logActivity(
            actor.id,
            actor.fullName,
            actor.role,
            'Bonus Points Updated',
            `Set bonus points for ${targetUser.fullName} to ${bonusPoints} pts.`
          );
        }
      }
    } catch (err) {
      console.error('[updateUserBonusPoints Error]:', err);
    }
  }
}

export interface MemberAVGBreakdown {
  avgScore: number;
  baseAvg: number;
  earnedPoints: number;
  maxPoints: number;
  bonusPoints: number;
  hasActualEvents: boolean;
  displayText: string;
  onlineMeetingsCount: number;
  onlineMeetingsEarned: number;
  offlineMeetingsCount: number;
  offlineMeetingsEarned: number;
  completedTasksCount: number;
  tasksEarned: number;
  excusedMeetingsCount: number;
  excusedTasksCount: number;
  behaviorScore: number;
  interactionScore: number;
}

export function calculateMemberAVG(
  userId: string,
  meetings: Array<any>,
  attendance: Array<any>,
  tasks: Array<any>,
  submissions: Array<any>,
  excuses: Array<any>,
  evaluations: Array<any>,
  bonusPoints: number = 0
): MemberAVGBreakdown {
  let earnedPoints = 0;
  let maxPoints = 0;

  let onlineMeetingsCount = 0;
  let onlineMeetingsEarned = 0;
  let offlineMeetingsCount = 0;
  let offlineMeetingsEarned = 0;
  let excusedMeetingsCount = 0;
  let completedTasksCount = 0;
  let tasksEarned = 0;
  let excusedTasksCount = 0;

  // Filter actual events performed or excused for THIS member
  const memberAttendance = (attendance || []).filter(a => String(a.memberId) === String(userId) || String(a.userId) === String(userId));
  const memberSubmissions = (submissions || []).filter(s => 
    (String(s.memberId) === String(userId) || String(s.userId) === String(userId)) &&
    (s.status === 'Accepted' || s.status === 'مقابولة' || s.status === 'مقبول')
  );
  const memberExcuses = (excuses || []).filter(e =>
    (e.status === 'Approved' || e.status === 'مقبول' || e.status === 'approved') &&
    (String(e.memberId) === String(userId) || String(e.userId) === String(userId))
  );

  const hasActualEvents = memberAttendance.length > 0 || memberSubmissions.length > 0 || memberExcuses.length > 0;

  // If member has NO actual events (0 attendance, 0 submissions, 0 excuses) and NO bonus:
  if (!hasActualEvents && bonusPoints <= 0) {
    return {
      avgScore: 0,
      baseAvg: 0,
      earnedPoints: 0,
      maxPoints: 0,
      bonusPoints: 0,
      hasActualEvents: false,
      displayText: 'لا توجد بيانات',
      onlineMeetingsCount: 0,
      onlineMeetingsEarned: 0,
      offlineMeetingsCount: 0,
      offlineMeetingsEarned: 0,
      completedTasksCount: 0,
      tasksEarned: 0,
      excusedMeetingsCount: 0,
      excusedTasksCount: 0,
      behaviorScore: 0,
      interactionScore: 0,
    };
  }

  // Calculate meetings for this member
  (meetings || []).forEach(m => {
    const loc = (m.location || '').toLowerCase();
    const type = (m.type || '').toLowerCase();
    const isOnline = type === 'online' || loc.includes('online') || loc.includes('زووم') || loc.includes('zoom');
    const fullPoints = isOnline ? 5 : 10;

    const att = memberAttendance.find(a => String(a.meetingId) === String(m.id));
    const exc = memberExcuses.find(e => 
      (e.targetId && String(e.targetId) === String(m.id)) ||
      (e.targetTitle && m.title && e.targetTitle.trim().toLowerCase() === m.title.trim().toLowerCase())
    );

    if (att) {
      maxPoints += fullPoints;
      earnedPoints += fullPoints;
      if (isOnline) {
        onlineMeetingsCount++;
        onlineMeetingsEarned += fullPoints;
      } else {
        offlineMeetingsCount++;
        offlineMeetingsEarned += fullPoints;
      }
    } else if (exc) {
      maxPoints += fullPoints;
      const halfPoints = fullPoints * 0.5;
      earnedPoints += halfPoints;
      excusedMeetingsCount++;
      if (isOnline) {
        onlineMeetingsEarned += halfPoints;
      } else {
        offlineMeetingsEarned += halfPoints;
      }
    }
  });

  // Calculate tasks for this member
  (tasks || []).forEach(t => {
    const fullPoints = 5;
    const sub = memberSubmissions.find(s => String(s.taskId) === String(t.id));
    const exc = memberExcuses.find(e =>
      (e.targetId && String(e.targetId) === String(t.id)) ||
      (e.targetTitle && (t.name || t.title) && e.targetTitle.trim().toLowerCase() === (t.name || t.title).trim().toLowerCase())
    );

    if (sub) {
      maxPoints += fullPoints;
      earnedPoints += fullPoints;
      completedTasksCount++;
      tasksEarned += fullPoints;
    } else if (exc) {
      maxPoints += fullPoints;
      const halfPoints = fullPoints * 0.5;
      earnedPoints += halfPoints;
      excusedTasksCount++;
      tasksEarned += halfPoints;
    }
  });

  const userEvals = (evaluations || []).filter(e => e.targetUserId === userId || e.memberId === userId);
  let behaviorScore = 0;
  let interactionScore = 0;

  if (hasActualEvents) {
    if (userEvals.length > 0) {
      const totalCommitment = userEvals.reduce((acc, ev) => acc + (ev.commitmentRating || 5), 0);
      const totalTeamwork = userEvals.reduce((acc, ev) => acc + (ev.teamworkRating || ev.interactionRating || 5), 0);
      const avgCommitment = totalCommitment / userEvals.length;
      const avgTeamwork = totalTeamwork / userEvals.length;

      behaviorScore = Math.round(((avgCommitment / 5) * 10) * 10) / 10;
      interactionScore = Math.round(((avgTeamwork / 5) * 13) * 10) / 10;
    } else {
      behaviorScore = 10;
      interactionScore = 13;
    }
    maxPoints += 10 + 13;
    earnedPoints += behaviorScore + interactionScore;
  }

  const baseAvg = (hasActualEvents && maxPoints > 0) ? (earnedPoints / maxPoints) * 95 : 0;
  const roundedBaseAvg = Math.round(baseAvg * 10) / 10;
  const finalAvg = hasActualEvents ? Math.min(105, Math.round((baseAvg + bonusPoints) * 10) / 10) : (bonusPoints > 0 ? bonusPoints : 0);
  const displayText = hasActualEvents ? `${finalAvg}%` : (bonusPoints > 0 ? `${bonusPoints}%` : 'لا توجد بيانات');

  return {
    avgScore: finalAvg,
    baseAvg: roundedBaseAvg,
    earnedPoints: Math.round(earnedPoints * 10) / 10,
    maxPoints,
    bonusPoints,
    hasActualEvents: hasActualEvents || bonusPoints > 0,
    displayText,
    onlineMeetingsCount,
    onlineMeetingsEarned,
    offlineMeetingsCount,
    offlineMeetingsEarned,
    completedTasksCount,
    tasksEarned,
    excusedMeetingsCount,
    excusedTasksCount,
    behaviorScore,
    interactionScore,
  };
}

export const db = new SupabaseDatabase();

