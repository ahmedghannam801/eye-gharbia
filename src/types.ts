/**
 * EYE Workflow Hub - System Type Declarations
 */

export type UserRole = 'Member' | 'Leader' | 'Super Admin' | 'HRM' | 'Vice' | 'Head' | 'Coordinator' | 'Deputy Coordinator' | 'Central';

export type UserStatus = 'Pending Approval' | 'Active' | 'Disabled';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  committee: string; // HR, PR, SM, OR, or 'None' (for Super Admin)
  department: string; // HRM, EPR, Graphic Design, VIP, etc.
  membershipCode: string; // e.g. EYE-HRM-0023
  avatarUrl?: string;
  joinedDate: string;
  dateOfBirth?: string; // YYYY-MM-DD
  bio?: string;
  skills?: string[];
  endorsements?: Record<string, string[]>;
  isAvatarProtected?: boolean;
  linkedInUrl?: string;        // LinkedIn profile URL
  facebookUrl?: string;        // Facebook profile URL
  showPhoneToOthers?: boolean; // false = hide phone from others (default: true)
  showAvatarToOthers?: boolean; // false = hide avatar from others (default: true)
  lftNazarCount?: number;  // عدد لفتات النظر الصادرة بحق العضو
  inzarCount?: number;     // عدد الإنذارات الصادرة بحق العضو
  streakCount?: number;    // عدد الأيام المتتالية لتسليم المهام
  lastStreakDate?: string; // YYYY-MM-DD
  rating?: number;         // معدل التقييم العام
  bonusPoints?: number;    // نقاط البونص المضافة على تقييم AVG
  governorate?: string;    // المحافظة التابع لها العضو (e.g. 'الغربية')
  subCommittee?: string;   // اللجنة الفرعية (e.g. 'HR OF OR')
}

export const EGYPTIAN_GOVERNORATES = [
  'القاهرة',
  'الإسكندرية',
  'الجيزة',
  'الغربية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'الإسماعيلية',
  'بورسعيد',
  'السويس',
  'دمياط',
  'شمال سيناء',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'المركزية',
] as const;

export const GOVERNORATE_PREFIXES: Record<string, string> = {
  'القاهرة': 'CAI',
  'الإسكندرية': 'ALX',
  'الجيزة': 'GZA',
  'القليوبية': 'QLB',
  'الشرقية': 'SHR',
  'الدقهلية': 'DKH',
  'المنوفية': 'MNF',
  'البحيرة': 'BHR',
  'كفر الشيخ': 'KFR',
  'الإسماعيلية': 'ISM',
  'بورسعيد': 'PSD',
  'السويس': 'SWZ',
  'دمياط': 'DMT',
  'شمال سيناء': 'SIN',
  'الفيوم': 'FYM',
  'بني سويف': 'BSW',
  'المنيا': 'MNY',
  'أسيوط': 'AST',
  'سوهاج': 'SHG',
  'قنا': 'QNA',
  'الأقصر': 'LXR',
  'أسوان': 'ASW',
  'البحر الأحمر': 'RED',
  'الغربية': 'GHB',
  'المركزية': 'CTR',
};

export const GOVERNORATE_NAMES_EN: Record<string, string> = {
  'الغربية': 'GHARBIA',
  'القاهرة': 'CAIRO',
  'الإسكندرية': 'ALEXANDRIA',
  'الجيزة': 'GIZA',
  'القليوبية': 'QALYUBIA',
  'الشرقية': 'SHARQIA',
  'الدقهلية': 'DAKAHLIA',
  'المنوفية': 'MONUFIA',
  'البحيرة': 'BEHEIRA',
  'كفر الشيخ': 'KAFR EL-SHEIKH',
  'الإسماعيلية': 'ISMAILIA',
  'بورسعيد': 'PORT SAID',
  'السويس': 'SUEZ',
  'دمياط': 'DAMIETTA',
  'شمال سيناء': 'NORTH SINAI',
  'جنوب سيناء': 'SOUTH SINAI',
  'الفيوم': 'FAYOUM',
  'بني سويف': 'BENI SUEF',
  'المنيا': 'MINYA',
  'أسيوط': 'ASYUT',
  'سوهاج': 'SOHAG',
  'قنا': 'QENA',
  'الأقصر': 'LUXOR',
  'أسوان': 'ASWAN',
  'البحر الأحمر': 'RED SEA',
  'الوادي الجديد': 'NEW VALLEY',
  'مطروح': 'MATROUH',
  'المركزية': 'CENTRAL',
};

export function getActiveGovernorate(currentUser?: { role?: string; governorate?: string } | null): string {
  // Governorate switching across branches is exclusively allowed for Super Admin
  if (currentUser?.role === 'Super Admin') {
    if (typeof window !== 'undefined') {
      try {
        const savedGov = localStorage.getItem('eye_current_governorate');
        if (savedGov && savedGov.trim()) return savedGov.trim();
      } catch {}
    }
  }
  return currentUser?.governorate?.trim() || 'الغربية';
}

export function formatGovernorateAr(governorate?: string): string {
  if (!governorate) return 'الغربية';
  const clean = governorate.replace(/^محافظة\s*/, '').trim();
  return clean || 'الغربية';
}

export function formatGovernorateWelcomeAr(governorate?: string): string {
  const clean = formatGovernorateAr(governorate);
  if (clean === 'المركزية' || clean === 'اللجنة المركزية') {
    return 'بالمركزية';
  }
  return `بمحافظة ${clean}`;
}

export function getGovernorateNameEn(governorate?: string): string {
  if (!governorate) return 'GHARBIA';
  const clean = formatGovernorateAr(governorate);
  return GOVERNORATE_NAMES_EN[clean] || clean.toUpperCase();
}

export function generateGovernorateLeaderCode(governorate: string, existingUsers: UserProfile[]): string {
  const cleanGov = (governorate || '').trim();
  const prefix = GOVERNORATE_PREFIXES[cleanGov] || 'EYE';

  const existingCodes = existingUsers
    .map(u => u.membershipCode || '')
    .filter(c => c.startsWith(`EYE-${prefix}-LDR-`));

  let maxNum = 100;
  existingCodes.forEach(code => {
    const numPart = parseInt(code.replace(`EYE-${prefix}-LDR-`, ''), 10);
    if (!isNaN(numPart) && numPart > maxNum) {
      maxNum = numPart;
    }
  });

  return `EYE-${prefix}-LDR-${maxNum + 1}`;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TaskStatus = 'Draft' | 'Published' | 'Closed';

export interface Task {
  id: string;
  name: string;
  description: string;
  instructions: string;
  priority: TaskPriority;
  deadline: string;
  committee: string;
  department: string;
  status: TaskStatus;
  createdBy: string; // User ID of Leader or Admin
  createdByName: string;
  createdDate: string;
  allowedFileTypes: string[]; // e.g. ['pdf', 'png', 'zip']
  maxUploadSizeMb: number;
  allowResubmission: boolean;
  attachments?: { name: string; url: string; size: string }[];
  subtasks?: { id: string; text: string }[];
  isTeamTask?: boolean;
  isVideoTask?: boolean;
  videoUrl?: string;
  assignedMemberIds?: string[]; // IDs of specific members assigned to this task
  targetAudience?: 'all_committee' | 'department' | 'specific_members';
  governorate?: string;
  comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
  isPinned?: boolean;
}

export type SubmissionStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Resubmission Requested';

export interface GradingCriteria {
  quality: number;      // 0-25
  timeliness: number;   // 0-25
  innovation: number;   // 0-25
  completeness: number; // 0-25
}

export interface Submission {
  id: string; // TASK-000001-USR123 etc
  taskId: string;
  taskName: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  committee: string;
  department: string;
  submittedAt: string;
  status: SubmissionStatus;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  comment?: string;
  rejectionReason?: string;
  submissionIdCode: string; // e.g. SUB-000001
  grade?: number;           // 0-100 overall grade
  gradingCriteria?: GradingCriteria;
  reviewedBy?: string;      // reviewer full name
  reviewedAt?: string;
  completedSubtasks?: string[];
  history?: {
    status: SubmissionStatus;
    changedAt: string;
    changedBy: string;
    comment?: string;
  }[];
}

export type AnnouncementCategory = 'General' | 'New Feature' | 'Occasion' | 'Urgent';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  committee: string; // 'All' or specific committee
  createdBy: string;
  createdByName: string;
  createdDate: string;
  isPinned: boolean;
  category?: AnnouncementCategory;
  targetUrl?: string; // App view to open when clicking "Try Feature Now"
  reactions?: Record<string, string[]>; // { '👍': ['user1', 'user2'], '🔥': ['user3'] }
}

export interface MemoryPost {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category?: string; // e.g. 'Event' | 'Achievement' | 'Gathering' | 'Workshop'
  committee?: string;
  date?: string;
  createdBy?: string;
  createdByName?: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  authorRole?: string;
  caption?: string;
  createdAt: string;
  likes?: string[]; // Array of user IDs
}

export interface OccasionGreeting {
  id: string;
  title: string;
  message: string;
  category: 'Eid' | 'Ramadan' | 'National' | 'NewYear' | 'Custom';
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  icon?: string;
  bannerBg?: string; // CSS background style/gradient
  targetCommittee?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface SystemNotification {
  id: string;
  userId: string; // Recipient
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  relatedId?: string; // ID of Task, Submission, etc.
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

export interface OrganizationSettings {
  orgName: string;
  orgLogoUrl: string;
  theme: 'Light' | 'Dark' | 'System';
  language: 'English' | 'Arabic';
  allowSelfRegistration: boolean;
  defaultMaxFileSizeMb: number;
  notificationChannels: {
    email: boolean;
    push: boolean;
    system: boolean;
  };
}

// Committee and Department mapping helper
export const COMMITTEE_STRUCTURE: Record<string, string[]> = {
  HR: ['HRM', 'HRS', 'HRIS', 'HRD'],
  PR: ['EPR', 'IPR'],
  SM: ['Content', 'Graphic Design', 'Photography', 'Video Editing'],
  OR: ['VIP', 'Planning', 'Coordination', 'Logistics'],
};

export const CENTRAL_DEPARTMENTS: { title: string; committee: string; department: string }[] = [
  { title: 'مسئول الموارد البشريه المركزيه', committee: 'HR', department: 'مسئول الموارد البشريه المركزيه' },
  { title: 'مسئول العلاقات العامه المركزيه', committee: 'PR', department: 'مسئول العلاقات العامه المركزيه' },
  { title: 'مسئول التنظيم المركزيه', committee: 'OR', department: 'مسئول التنظيم المركزيه' },
  { title: 'مسئول السوشيال ميديا المركزيه', committee: 'SM', department: 'مسئول السوشيال ميديا المركزيه' },
];

export const HRM_DEPARTMENTS: { title: string; committee: string; department: string }[] = [
  { title: 'مسئول HR لجنة العلاقات العامة (HR OF PR)', committee: 'HR', department: 'HRM - HR OF PR' },
  { title: 'مسئول HR لجنة السوشيال ميديا (HR OF SM)', committee: 'HR', department: 'HRM - HR OF SM' },
  { title: 'مسئول HR لجنة التنظيم (HR OF OR)', committee: 'HR', department: 'HRM - HR OF OR' },
  { title: 'إدارة الموارد البشرية العامة (HRM)', committee: 'HR', department: 'HRM' },
];

// ─────────────────────────────────────────────
// MEETINGS & ATTENDANCE
// ─────────────────────────────────────────────
export type MeetingType = 'General' | 'Committee' | 'Department' | 'Emergency';
export type MeetingStatus = 'Scheduled' | 'Open' | 'Closed';

export interface Meeting {
  id: string;
  title: string;
  description: string;
  type: MeetingType;
  committee: string;   // 'All' or specific
  department: string;  // 'All' or specific
  scheduledAt: string; // ISO date
  location: string;    // Physical or online link
  expectedAttendeesCount?: number; // عدد الحضور المستهدف / المتوقع
  createdBy: string;
  createdByName: string;
  createdAt: string;
  status: MeetingStatus;
  attendanceCode: string; // 4-6 char secret code members enter
  governorate?: string;  // المحافظة التي أُنشئ الاجتماع من خلالها
}

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  committee: string;
  department: string;
  checkedInAt: string;
  isExcused: boolean;
  excuseReason?: string;
}

// ─────────────────────────────────────────────
// 360° LEADER FEEDBACK
// ─────────────────────────────────────────────
export interface MemberEvaluation {
  id: string;
  targetUserId: string;
  targetUserName: string;
  targetUserRole: string;
  committee: string;
  department: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string;
  overallRating: number;
  commitmentRating: number;
  qualityRating: number;
  teamworkRating: number;
  activityRating: number;
  feedbackComment: string;
  createdAt: string;
}

export interface LeaderFeedback {
  id: string;
  leaderId: string;
  leaderName: string;
  committee: string;
  reviewerId: string;   // member who submitted
  rating: number;       // 1-5
  communication: number; // 1-5
  support: number;       // 1-5
  fairness: number;      // 1-5
  comment: string;
  submittedAt: string;
  isAnonymous: boolean;
}

// ─────────────────────────────────────────────
// OKR WORK PLANS
// ─────────────────────────────────────────────
export type OKRStatus = 'On Track' | 'At Risk' | 'Behind' | 'Completed';

export interface KeyResult {
  id: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;         // e.g. "tasks", "members", "%"
  status: OKRStatus;
}

export interface WorkPlan {
  id: string;
  title: string;
  objective: string;
  committee: string;
  department: string;
  month: string;        // e.g. "2026-07"
  keyResults: KeyResult[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  status: OKRStatus;
}

// ─────────────────────────────────────────────
// IDEA BANK & PITCH ROOM
// ─────────────────────────────────────────────
export interface VolunteerIdea {
  id: string;
  title: string;
  description: string;
  committee: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  upvotes: string[]; // array of userIds
  status: 'Pitching' | 'Approved' | 'Converted';
  comments: {
    id: string;
    userName: string;
    comment: string;
    createdAt: string;
  }[];
}

// ─────────────────────────────────────────────
// ACADEMY & TRAINING LIBRARY
// ─────────────────────────────────────────────
export interface AcademyCourse {
  id: string;
  title: string;
  description: string;
  category: string; // e.g. "Design", "Management", "General"
  pdfUrl?: string;
  videoUrl?: string;
  committee: string; // 'All' or specific
  readsCount: number;
  completedBy: string[]; // array of userIds
}

// ─────────────────────────────────────────────
// REWARDS SHOP
// ─────────────────────────────────────────────
export interface RewardItem {
  id: string;
  title: string;
  description: string;
  costPoints: number;
  stock: number;
  imageUrl?: string;
}

export interface RewardPurchase {
  id: string;
  rewardId: string;
  rewardTitle: string;
  costPoints: number;
  memberId: string;
  memberName: string;
  purchasedAt: string;
  status: 'Pending' | 'Approved';
}

// ─────────────────────────────────────────────
// PERFORMANCE RADAR
// ─────────────────────────────────────────────
export interface MonthlyPerformance {
  id: string;
  memberId: string;
  memberName: string;
  month: string; // e.g. "2026-07"
  commitment: number;   // 1-5
  teamwork: number;     // 1-5
  communication: number; // 1-5
  innovation: number;   // 1-5
  leaderComment: string;
  ratedBy: string;
  ratedByName: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// WEEKLY QUIZ & TRIVIA
// ─────────────────────────────────────────────
export interface WeeklyQuiz {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  pointsReward: number;
  status: 'Active' | 'Closed';
  createdAt: string;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  userId: string;
  userName: string;
  answerIndex: number;
  isCorrect: boolean;
  submittedAt: string;
}

// ─────────────────────────────────────────────
// CAREER COMPASS & PERSONAL GOALS
// ─────────────────────────────────────────────
export interface PersonalObjective {
  id: string;
  userId: string;
  title: string;
  targetDate: string;
  status: 'In Progress' | 'Achieved';
  notes: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// BADGES & STREAKS
// ─────────────────────────────────────────────
export type BadgeId =
  | 'task_crusher' | 'perfect_presence' | 'idea_generator'
  | 'quiz_master' | 'early_bird' | 'team_player'
  | 'streak_week_3' | 'streak_week_8' | 'top_performer' | 'first_submission';

export interface Badge {
  id: BadgeId;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  emoji: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  pointsBonus: number;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: BadgeId;
  awardedAt: string;
  awardedBySystem: boolean;
  note?: string;
}

// ─────────────────────────────────────────────
// CERTIFICATE GENERATOR
// ─────────────────────────────────────────────
export type CertificateType = 'appreciation' | 'excellence' | 'training' | 'leadership' | 'custom';
export type CertificateDesignStyle = 'style1' | 'style2' | 'style3' | 'style4' | 'style5';

export const getUserRoleTitle = (
  user?: { role: UserRole | string; committee?: string; department?: string },
  lang: 'ar' | 'en' = 'ar'
): string => {
  if (!user) return lang === 'ar' ? 'عضو' : 'Member';
  const isAr = lang === 'ar';
  const role = user.role;

  if (role === 'Super Admin') {
    return isAr ? 'مسئول لجنة الموارد البشرية' : 'HR HEAD';
  }
  if (role === 'Vice') {
    const commName = user.committee && user.committee !== 'None' ? user.committee : '';
    if (commName) {
      return isAr ? `نائب رئيس لجنة ${commName}` : `${commName} Committee Vice Head`;
    }
    return isAr ? 'نائب رئيس اللجنة' : 'Committee Vice Head';
  }
  if (role === 'Head') {
    return isAr ? 'رئيس اللجنة' : 'Committee Head';
  }
  if (role === 'Coordinator') {
    return isAr ? 'المنسق العام للكيان' : 'General Coordinator';
  }
  if (role === 'Deputy Coordinator') {
    return isAr ? 'نائب المنسق العام' : 'Deputy Coordinator';
  }
  if (role === 'HRM') {
    const dept = user.department || '';
    if (dept.includes('HR OF PR')) return isAr ? 'مسؤول الموارد البشرية لـ لجنة العلاقات العامة (HR OF PR)' : 'HR Manager for PR';
    if (dept.includes('HR OF SM')) return isAr ? 'مسؤول الموارد البشرية لـ لجنة السوشيال ميديا (HR OF SM)' : 'HR Manager for SM';
    if (dept.includes('HR OF OR')) return isAr ? 'مسؤول الموارد البشرية لـ لجنة التنظيم (HR OF OR)' : 'HR Manager for OR';
    return isAr ? 'مسؤول الموارد البشرية (HRM)' : 'HR Manager (HRM)';
  }
  if (role === 'Central') {
    return user.department || (isAr ? 'مسؤول المركزية' : 'Central Official');
  }

  const committeeMap: Record<string, { ar: string; en: string }> = {
    HR: { ar: 'الموارد البشرية', en: 'Human Resources' },
    PR: { ar: 'العلاقات العامة', en: 'Public Relations' },
    SM: { ar: 'السوشيال ميديا والتسويق', en: 'Social Media & Marketing' },
    OR: { ar: 'التنظيم والفعاليات', en: 'Organization & Events' },
    LOG: { ar: 'اللوجستيات والمعارض', en: 'Logistics' },
    MED: { ar: 'الإعلام والإنتاج', en: 'Media Production' },
  };

  const commKey = user.committee || '';
  const commLabel = committeeMap[commKey] ? committeeMap[commKey][isAr ? 'ar' : 'en'] : (commKey !== 'None' && commKey !== 'All' ? commKey : '');

  if (role === 'Leader') {
    if (commLabel) {
      return isAr ? `قائد لجنة ${commLabel}` : `Head of ${commLabel} Committee`;
    }
    return isAr ? 'قائد لجنة' : 'Committee Leader';
  }

  if (commLabel) {
    return isAr ? `عضو لجنة ${commLabel}` : `Member of ${commLabel} Committee`;
  }
  return isAr ? 'عضو بالكيان' : 'Member';
};

export interface IssuedCertificate {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  certType: CertificateType;
  title: string;
  body: string;
  issuedBy: string;
  issuedByName: string;
  issuedByTitle: string;
  issuedAt: string;
  committee: string;
  grade?: number;
  lang?: 'ar' | 'en';
  status?: 'pending' | 'approved' | 'rejected';
  designStyle?: CertificateDesignStyle;
  orientation?: 'landscape' | 'portrait';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  governorate?: string;  // المحافظة التابعة لها الشهادة
}

// ─────────────────────────────────────────────
// ANONYMOUS SUGGESTION BOX
// ─────────────────────────────────────────────
export type SuggestionStatus = 'New' | 'Under Review' | 'Addressed' | 'Dismissed';
export type SuggestionCategory = 'General' | 'Tasks' | 'Meetings' | 'Leadership' | 'Events' | 'Other';

export interface AnonymousSuggestion {
  id: string;
  category: SuggestionCategory;
  content: string;
  committee: string;
  status: SuggestionStatus;
  submittedAt: string;
  adminReply?: string;
  adminReplyAt?: string;
  adminReplyBy?: string;
  upvotes: number;
}

// ─────────────────────────────────────────────
// PERFORMANCE REPORTS
// ─────────────────────────────────────────────
export interface CommitteeReport {
  id: string;
  month: string;
  committee: string;
  totalMembers: number;
  activeTasks: number;
  completedTasks: number;
  avgGrade: number;
  attendanceRate: number;
  topMemberId: string;
  topMemberName: string;
  topMemberScore: number;
  generatedAt: string;
  generatedBy: string;
  // OKR Work Plans linkage
  okrTotalPlans?: number;
  okrCompletedPlans?: number;
  okrAvgProgress?: number;
  linkedWorkPlans?: { title: string; objective: string; status: string; progress: number }[];
}

// ─────────────────────────────────────────────
// POLLS & SURVEYS
// ─────────────────────────────────────────────
export type PollStatus = 'Active' | 'Closed';

export interface PollOption {
  id: string;
  text: string;
  textAr?: string;
}

export interface Poll {
  id: string;
  question: string;
  questionAr?: string;
  options: PollOption[];
  audience: string;
  status: PollStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  closesAt?: string;
  totalVotes: number;
}

export interface PollVote {
  id: string;
  pollId: string;
  optionId: string;
  userId: string;
  votedAt: string;
}

// ─────────────────────────────────────────────
// MANDATORY VIDEO TASKS & SUMMARIES
// ─────────────────────────────────────────────
export type VideoSourceType = 'youtube' | 'direct';
export type VideoSubmissionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Needs Revision';

export interface VideoTask {
  id: string;
  title: string;
  description: string;
  videoType: VideoSourceType;
  videoUrl: string; // YouTube URL or direct MP4 link
  requirementsPrompt: string; // Admin instructions on what to summarize/answer
  committee: string; // 'All' or specific committee (HR, PR, SM, OR)
  department: string; // 'All' or specific department
  isMandatory: boolean;
  deadline?: string;
  pointsReward: number; // Points awarded upon approval
  createdBy: string;
  createdByName: string;
  createdAt: string;
  status: 'Active' | 'Closed';
}

export interface VideoSubmission {
  id: string;
  videoTaskId: string;
  videoTaskTitle: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  committee: string;
  department: string;
  summaryText: string; // The response/summary submitted by member
  isWatched: boolean;
  submittedAt: string;
  status: VideoSubmissionStatus;
  feedback?: string; // Leader comments/feedback
  grade?: number; // 0-100
  reviewedBy?: string;
  reviewedAt?: string;
}

// ─────────────────────────────────────────────
// LIVE WORKSHOPS & BROADCAST STREAM
// ─────────────────────────────────────────────
export type WorkshopStreamType = 'youtube_live' | 'zoom' | 'meet' | 'direct';
export type WorkshopStatus = 'Scheduled' | 'Live' | 'Ended';

export interface LiveChatMessage {
  id: string;
  workshopId: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  sentAt: string;
}

export interface LiveWorkshop {
  id: string;
  title: string;
  description: string;
  streamType: WorkshopStreamType;
  streamUrl: string; // YouTube Live embed or meeting join link
  committee: string; // 'All' or specific
  department: string; // 'All' or specific
  status: WorkshopStatus;
  scheduledAt: string; // ISO date
  pointsReward: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  attendeesCount: number;
  attendeeIds: string[];
}

// ─────────────────────────────────────────────
// EXECUTIVE REPORT ANALYTICS
// ─────────────────────────────────────────────
export interface CommitteePerformanceMetrics {
  committee: string;
  totalMembers: number;
  activeTasksCount: number;
  completedSubmissionsCount: number;
  avgSubmissionGrade: number;
  attendanceRatePercentage: number;
  topPerformerName: string;
  topPerformerPoints: number;
}

export interface MeetingReportSummary {
  id: string;
  title: string;
  description: string;
  type: string;
  committee: string;
  department: string;
  date: string;
  location?: string;
  status: string;
  attendanceCode: string;
  createdByName: string;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface WorkPlanReportSummary {
  id: string;
  title: string;
  objective: string;
  committee: string;
  department: string;
  month: string;
  status: string;
  keyResultsCount: number;
  createdByName: string;
}

export interface ExecutiveAnalyticsData {
  generatedAt: string;
  generatedByName: string;
  totalMembers: number;
  activeTasks: number;
  totalSubmissions: number;
  overallCompletionRate: number;
  avgGrade: number;
  overallAttendanceRate: number;
  mandatoryVideosCompletionRate: number;
  committeeBreakdown: CommitteePerformanceMetrics[];
  totalMeetingsCount?: number;
  totalAttendeesCount?: number;
  meetingsSummary?: MeetingReportSummary[];
  totalWorkPlansCount?: number;
  workPlansSummary?: WorkPlanReportSummary[];
  executiveNotes: string;
}

// ─────────────────────────────────────────────
// INTER-COMMITTEE CHAT
// ─────────────────────────────────────────────
export interface CommitteeChatMessage {
  id: string;
  committeeRoom: string; // 'HR' | 'PR' | 'SM' | 'OR' | 'General'
  userId: string;
  userName: string;
  userRole: string;
  userAvatar?: string;
  message: string;
  imageUrl?: string;
  sentAt: string;
}

// ─────────────────────────────────────────────
// WEEKLY CHALLENGES & STREAKS
// ─────────────────────────────────────────────
export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  pointsReward: number;
  badgeReward?: string;
  claimedUserIds: string[];
}

export interface UserStreak {
  userId: string;
  currentStreakDays: number;
  lastActiveDate: string;
}

// ─────────────────────────────────────────────
// UNIFIED ORGANIZATIONAL CALENDAR
// ─────────────────────────────────────────────
export type CalendarEventType = 'task' | 'meeting' | 'workshop' | 'event';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: CalendarEventType;
  date: string; // YYYY-MM-DD
  time?: string;
  committee: string;
  relatedId?: string;
}

// ─────────────────────────────────────────────
// EXCUSES & MEMBERSHIP FREEZE REQUESTS
// ─────────────────────────────────────────────
export type ExcuseType = 'Meeting' | 'Task' | 'General';
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ExcuseRequest {
  id: string;
  memberId: string;
  memberName: string;
  committee: string;
  department: string;
  type: ExcuseType;
  targetTitle?: string;
  reason: string;
  date: string;
  status: RequestStatus;
  adminResponse?: string;
  createdAt: string;
}

export interface FreezeRequest {
  id: string;
  memberId: string;
  memberName: string;
  committee: string;
  department: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: RequestStatus;
  adminResponse?: string;
  createdAt: string;
}

// ─── Disciplinary Record ─────────────────────────────────────────────────────
export type DisciplinaryType = 'lft_nazar' | 'inzar';

export interface DisciplinaryRecord {
  id: string;
  type?: DisciplinaryType;           // 'lft_nazar' | 'inzar'
  memberName: string;               // اسم العضو
  memberId?: string;                // ID العضو (إن وُجد)
  committee: string;                // اللجنة
  governorate?: string;              // المحافظة
  noticeNumber?: string;             // رقم المعاملة
  meetingDay?: string;               // يوم الاجتماع
  meetingDate?: string;              // تاريخ الاجتماع DD/MM/YYYY
  issuedBy: string;                 // اسم مسئول لجنة الموارد البشرية
  issuedByName?: string;
  coordinator?: string;              // اسم المنسق
  issuedAt: string;                 // وقت إصدار الوثيقة ISO
  severity?: 'Notice' | 'First Warning' | 'Second Warning' | 'Final Warning';
  reason?: string;
  regulationCode?: string;
  penaltyPoints?: number;
}

// ─── Issued Social Poster Record ─────────────────────────────────────────────
export interface IssuedPosterRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberRole?: string;
  memberCommittee?: string;
  memberAvatarUrl?: string;
  title: string;
  customMsg: string;
  themeColor: 'blue' | 'gold' | 'emerald' | 'purple';
  sentBy: string;
  sentByName: string;
  createdAt: string;
  governorate?: string;
}
