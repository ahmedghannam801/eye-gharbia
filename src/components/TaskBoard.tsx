import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { db } from '../db/localDb';
import { supabase, getPermanentStorageUrl } from '../lib/supabaseClient';
import { Task, Submission, UserProfile, COMMITTEE_STRUCTURE, TaskPriority, TaskStatus, SubmissionStatus } from '../types';
import {
  FolderKanban, CheckSquare, Plus, FileText, Calendar, ShieldAlert, ArrowUpRight,
  UploadCloud, CheckCircle2, XCircle, RefreshCw, Send, Paperclip, MessageSquare,
  AlertTriangle, File, HelpCircle, ChevronRight, CornerDownRight, Download, Trash2, Search,
  Star, Award, Users, Video, Target, UserCheck, Check, Clock, Eye, Layers, Filter, X
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { downloadCertificate } from '../lib/certificateGenerator';
import { TaskComments } from './TaskComments';

interface TaskBoardProps {
  currentUser: UserProfile;
  selectedTaskIdFromNotification?: string;
  onNavigateToView?: (view: string, targetId?: string) => void;
}

// Error Boundary specifically for TaskBoard to guarantee no white screen ever
class TaskBoardErrorBoundary extends Component<{ children: ReactNode; language: string }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; language: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TaskBoard Error Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900 my-6 space-y-4 max-w-xl mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
            {this.props.language === 'ar' ? 'حدث خطأ مؤقت أثناء عرض المهام' : 'A temporary error occurred while displaying tasks'}
          </h3>
          <p className="text-xs text-slate-500">{this.state.error?.message || 'Unexpected rendering error'}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all cursor-pointer"
          >
            {this.props.language === 'ar' ? 'إعادة تحميل اللوحة' : 'Reload Board'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const getYouTubeEmbedUrl = (url?: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11)
    ? `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0`
    : url;
};

const getCountdown = (deadline?: string) => {
  if (!deadline) return { text: 'غير محدد', className: 'text-slate-400' };
  const time = new Date(deadline).getTime();
  if (isNaN(time)) return { text: 'غير محدد', className: 'text-slate-400' };

  const diff = time - new Date().getTime();
  if (diff <= 0) return { text: 'انتهى الوقت!', className: 'text-red-500 font-bold' };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 2) return { text: `متبقي ${days} يوم`, className: 'text-slate-500' };
  if (days > 0) return { text: `متبقي ${days} يوم و ${hours} ساعة`, className: 'text-amber-600 font-medium' };
  if (hours > 2) return { text: `متبقي ${hours} ساعة`, className: 'text-orange-500 font-bold' };
  return { text: `متبقي ${hours} ساعة و ${minutes} دقيقة!`, className: 'text-red-600 font-bold animate-pulse' };
};

const TaskBoardInner: React.FC<TaskBoardProps> = ({ currentUser, selectedTaskIdFromNotification, onNavigateToView }) => {
  const { language } = useLanguage();

  const translateCommittee = (c?: string) => {
    if (!c) return language === 'ar' ? 'الكل' : 'All';
    const map: Record<string, string> = {
      'HR': language === 'ar' ? 'الموارد البشرية' : 'HR',
      'PR': language === 'ar' ? 'العلاقات العامة' : 'PR',
      'SM': language === 'ar' ? 'التسويق والميديا' : 'Social Media',
      'OR': language === 'ar' ? 'التنظيم واللوجستيات' : 'Organization',
      'All': language === 'ar' ? 'جميع اللجان' : 'All Committees',
    };
    return map[c] || c;
  };

  const translateDepartment = (d?: string) => {
    if (!d || d === 'All') return language === 'ar' ? 'جميع الأقسام' : 'All Departments';
    if (d === 'None' || d === 'General') return language === 'ar' ? 'عام' : 'General';
    return d;
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Filter States
  const [filterCommittee, setFilterCommittee] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; url: string } | null>(null);
  const [showExtendDeadlineModal, setShowExtendDeadlineModal] = useState(false);
  const [extendDeadlineValue, setExtendDeadlineValue] = useState('');
  const [isExtendingDeadline, setIsExtendingDeadline] = useState(false);

  // Create Task States
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskInst, setNewTaskInst] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Medium');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskCommittee, setNewTaskCommittee] = useState('HR');
  const [newTaskDepartment, setNewTaskDepartment] = useState('HRM');
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('Published');
  const [allowedPdf, setAllowedPdf] = useState(true);
  const [allowedZip, setAllowedZip] = useState(true);
  const [allowedImages, setAllowedImages] = useState(true);
  const [newTaskSizeMb, setNewTaskSizeMb] = useState(25);
  const [newTaskResubmit, setNewTaskResubmit] = useState(true);
  const [newTaskIsVideo, setNewTaskIsVideo] = useState(false);
  const [newTaskVideoUrl, setNewTaskVideoUrl] = useState('');
  const [isNewTaskTeam, setIsNewTaskTeam] = useState(false);
  const [newTaskSubtasks, setNewTaskSubtasks] = useState<string[]>([]);
  const [tempSubtaskText, setTempSubtaskText] = useState('');

  // Target Audience States
  const [targetAudienceMode, setTargetAudienceMode] = useState<'all_committee' | 'department' | 'specific_members'>('all_committee');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Member Upload States
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [customFileSize, setCustomFileSize] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [localCompletedSubtasks, setLocalCompletedSubtasks] = useState<string[]>([]);

  // Leader Review States & Sub-committee Grouping
  const [selectedReviewSub, setSelectedReviewSub] = useState<Submission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<SubmissionStatus>('Accepted');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRejectionReason, setReviewRejectionReason] = useState('');
  const [gradeQuality, setGradeQuality] = useState<number>(20);
  const [gradeTimeliness, setGradeTimeliness] = useState<number>(20);
  const [gradeInnovation, setGradeInnovation] = useState<number>(20);
  const [gradeCompleteness, setGradeCompleteness] = useState<number>(20);
  const [enableGrading, setEnableGrading] = useState(false);
  const [reviewDeptFilter, setReviewDeptFilter] = useState<string>('all');
  const [reviewViewMode, setReviewViewMode] = useState<'grouped' | 'list'>('grouped');

  useEffect(() => {
    loadData();
    // Wrap async loadData in a sync callback for event listeners
    const handleStorageChange = () => { loadData(); };
    window.addEventListener('storage', handleStorageChange);
    const unsub = db.onChange(handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsub();
    };
  }, [currentUser]);

  useEffect(() => {
    if (selectedTaskIdFromNotification && tasks.length > 0) {
      const target = tasks.find(t => t.id === selectedTaskIdFromNotification);
      if (target) setSelectedTask(target);
    }
  }, [selectedTaskIdFromNotification, tasks]);

  useEffect(() => {
    if (selectedTask) {
      const userSub = (submissions || []).find(s => s.taskId === selectedTask.id && s.memberId === currentUser?.id);
      setLocalCompletedSubtasks(userSub?.completedSubtasks || []);
    } else {
      setLocalCompletedSubtasks([]);
    }
  }, [selectedTask, submissions, currentUser?.id]);

  const loadData = async () => {
    try {
      // Fetch tasks directly from Supabase so all devices/users see the same data.
      const { data: rawTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_date', { ascending: false });

      if (tasksError) {
        console.error('[TaskBoard] Supabase tasks fetch error:', tasksError.message);
      }

      // Fetch submissions from Supabase as well for cross-device consistency
      const { data: rawSubs, error: subsError } = await supabase
        .from('submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (subsError) {
        console.error('[TaskBoard] Supabase submissions fetch error:', subsError.message);
      }

      const usersList = db.getUsers();

      // Map Supabase snake_case rows to the app's camelCase Task/Submission types
      const allTasks: Task[] = (rawTasks || []).map((r: any): Task => ({
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
        attachments: r.attachments || [],
        subtasks: r.subtasks || [],
        isTeamTask: r.is_team_task || false,
        isVideoTask: r.is_video_task || false,
        videoUrl: r.video_url || undefined,
        assignedMemberIds: r.assigned_member_ids || [],
        targetAudience: r.target_audience || undefined,
        governorate: r.governorate || undefined,
      }));

      const allSubs: Submission[] = (rawSubs || []).map((r: any): Submission => {
        const memberProfile = usersList.find(u => u.id === r.member_id);
        return {
          id: r.id,
          taskId: r.task_id,
          taskName: r.task_name,
          memberId: r.member_id,
          memberName: r.member_name || memberProfile?.fullName || 'عضو',
          memberEmail: r.member_email || memberProfile?.email || '',
          committee: r.committee || memberProfile?.committee || 'General',
          department: r.department || memberProfile?.department || 'General',
          submittedAt: r.submitted_at,
          status: r.status,
          fileUrl: r.file_url,
          fileName: r.file_name,
          fileSize: r.file_size,
          comment: r.comment,
          rejectionReason: r.rejection_reason,
          submissionIdCode: r.submission_id_code,
          grade: r.grade,
          gradingCriteria: r.grading_criteria || undefined,
          completedSubtasks: r.completed_subtasks || [],
          history: r.history || [],
        };
      });

      let filteredTasks = allTasks;
      let filteredSubs = allSubs;

      if (currentUser?.role === 'Member') {
        filteredTasks = allTasks.filter(t => {
          if (!t) return false;
          if (t.status !== 'Published') return false;

          // 1. Organization-wide task (All committees) -> visible to all existing & newly registered members!
          if (!t.committee || t.committee === 'All' || t.committee === 'None' || t.committee === 'General') {
            return true;
          }

          // 2. Specific individual member targeting mode
          if (t.targetAudience === 'specific_members') {
            return Array.isArray(t.assignedMemberIds) && t.assignedMemberIds.includes(currentUser.id);
          }

          // 3. Committee matching
          const userComm = currentUser.committee || 'All';
          const matchComm = userComm === 'All' || userComm === t.committee;
          if (!matchComm) return false;

          // 4. Whole Committee scope -> all members in this committee see it
          if (
            t.targetAudience === 'all_committee' ||
            !t.department ||
            t.department === 'All' ||
            t.department === 'General' ||
            t.department === 'None'
          ) {
            return true;
          }

          // 5. Specific Sub-committee / Department targeting
          const userDept = (currentUser.department || '').trim().toLowerCase();
          const taskDept = (t.department || '').trim().toLowerCase();
          if (!userDept || userDept === 'general' || userDept === 'none' || userDept === 'all') return true;
          return taskDept === userDept;
        });
        filteredSubs = allSubs.filter(s => s && s.memberId === currentUser.id);
      } else if (currentUser && ['Leader', 'Head', 'HRM'].includes(currentUser.role)) {
        filteredTasks = allTasks.filter(t => t && (t.committee === 'All' || !t.committee || t.committee === 'None' || t.committee === currentUser.committee || t.createdBy === currentUser.id));
        filteredSubs = allSubs.filter(s => s && (s.committee === currentUser.committee || allTasks.some(t => t.id === s.taskId && t.createdBy === currentUser.id) || s.memberId === currentUser.id));
      } else {
        filteredTasks = allTasks.filter(t => Boolean(t));
      }

      setTasks(filteredTasks);
      setSubmissions(filteredSubs);

      if (selectedTask) {
        const refreshed = allTasks.find(t => t && t.id === selectedTask.id);
        if (refreshed) setSelectedTask(refreshed);
      } else if (filteredTasks.length > 0 && !selectedTask) {
        setSelectedTask(filteredTasks[0]);
      }
    } catch (err) {
      console.error('Error loading taskboard data:', err);
    }
  };

  const handleAddSubtask = () => {
    if (tempSubtaskText.trim()) {
      setNewTaskSubtasks(prev => [...prev, tempSubtaskText.trim()]);
      setTempSubtaskText('');
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setNewTaskSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    const types: string[] = [];
    if (allowedPdf) types.push('pdf', 'docx', 'xlsx');
    // Always respect what the user selected in the dropdown — no role override
    const effectiveCommittee = newTaskCommittee;

    db.createTask({
      name: newTaskName,
      description: newTaskDesc,
      instructions: newTaskInst,
      priority: newTaskPriority,
      deadline: newTaskDeadline,
      committee: effectiveCommittee,
      department: targetAudienceMode === 'all_committee' ? 'All' : newTaskDepartment,
      status: newTaskStatus,
      allowedFileTypes: types.length > 0 ? types : ['pdf', 'docx', 'zip', 'png', 'jpg'],
      maxUploadSizeMb: newTaskSizeMb || 25,
      allowResubmission: newTaskResubmit,
      subtasks: newTaskSubtasks.map((text, idx) => ({ id: `sub-${idx}-${Date.now()}`, text })),
      isTeamTask: isNewTaskTeam,
      isVideoTask: newTaskIsVideo,
      videoUrl: newTaskVideoUrl.trim() || undefined,
      assignedMemberIds: targetAudienceMode === 'specific_members' ? selectedMemberIds : [],
      targetAudience: targetAudienceMode,
    }, currentUser);

    // Notify all members in the same governorate
    try {
      const { data: members } = await supabase
        .from('profiles')
        .select('id')
        .eq('governorate', currentUser.governorate)
        .eq('status', 'Active')
        .neq('id', currentUser.id);

      if (members && members.length > 0) {
        const notifications = members.map(member => ({
          user_id: member.id,
          title: 'مهمة جديدة',
          message: `تم إضافة مهمة جديدة: ${newTaskName}`,
          type: 'info',
          is_read: false
        }));
        await supabase.from('notifications').insert(notifications);
      }
    } catch (err) {
      console.error('Notification error:', err);
    }

    setShowCreateTaskModal(false);
    setNewTaskName('');
    setNewTaskDesc('');
    setNewTaskInst('');
    setIsNewTaskTeam(false);
    setNewTaskIsVideo(false);
    setNewTaskVideoUrl('');
    setNewTaskSubtasks([]);
    setTempSubtaskText('');
    setTargetAudienceMode('all_committee');
    setSelectedMemberIds([]);
    setMemberSearchQuery('');
    loadData();
  };

  const handleReviewSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewSub) return;

    const criteria = enableGrading ? {
      quality: gradeQuality,
      timeliness: gradeTimeliness,
      innovation: gradeInnovation,
      completeness: gradeCompleteness,
    } : undefined;
    const totalGrade = enableGrading
      ? gradeQuality + gradeTimeliness + gradeInnovation + gradeCompleteness
      : (reviewStatus === 'Accepted' ? 100 : 0);

    // 1. Direct Supabase update for immediate cross-device sync
    try {
      await supabase
        .from('submissions')
        .update({
          status: reviewStatus,
          comment: reviewComment,
          rejection_reason: reviewStatus === 'Rejected' ? reviewRejectionReason : null,
          grade: totalGrade,
          grading_criteria: criteria,
        })
        .eq('id', selectedReviewSub.id);

      // Notify the member
      await supabase.from('notifications').insert({
        user_id: selectedReviewSub.memberId,
        title: reviewStatus === 'Accepted' ? 'اعتماد وتقييم تسليمك ⭐' : 'تحديث على تسليم المهمة ⚠️',
        message: reviewStatus === 'Accepted'
          ? `تم اعتماد تسليمك لمهمة "${selectedReviewSub.taskName}" ورصد الدرجة (${totalGrade}/100)`
          : `تم طلب تعديل على تسليمك لمهمة "${selectedReviewSub.taskName}": ${reviewComment || reviewRejectionReason || ''}`,
        type: reviewStatus === 'Accepted' ? 'success' : 'warning',
        is_read: false,
        related_id: selectedReviewSub.taskId,
      });
    } catch (err) {
      console.warn('[TaskBoard] Supabase review update warning:', err);
    }

    db.reviewSubmission(
      selectedReviewSub.id,
      reviewStatus,
      currentUser,
      reviewComment,
      reviewStatus === 'Rejected' ? reviewRejectionReason : undefined,
      totalGrade,
      criteria
    );

    setShowReviewModal(false);
    setSelectedReviewSub(null);
    setReviewComment('');
    setReviewRejectionReason('');
    loadData();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setCustomFileName(file.name);
      setCustomFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      setUploadError('');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadFile(file);
      setCustomFileName(file.name);
      setCustomFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      setUploadError('');
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !uploadFile) {
      setUploadError(language === 'ar' ? 'يرجى اختيار ملف التسليم أولاً' : 'Please select a file to upload');
      return;
    }

    const maxSize = selectedTask.maxUploadSizeMb || 25;
    const sizeMb = uploadFile.size / (1024 * 1024);
    if (sizeMb > maxSize) {
      setUploadError(language === 'ar' ? `حجم الملف يتجاوز الحد الأقصى (${maxSize} MB)` : `File exceeds max size (${maxSize} MB)`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      // ── Step 1: Upload file to Supabase Storage ──────────────────────────
      let fileUrl = '';
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `submissions/${currentUser.id}/${fileName}`;

      setUploadProgress(40);
      const { error: uploadErr } = await supabase.storage
        .from('task-submissions')
        .upload(filePath, uploadFile);

      if (uploadErr) {
        console.error('[TaskBoard] Storage upload error:', uploadErr.message);
        throw new Error(
          language === 'ar'
            ? `فشل رفع الملف: ${uploadErr.message}`
            : `File upload failed: ${uploadErr.message}`
        );
      }

      const { data: urlData } = supabase.storage
        .from('task-submissions')
        .getPublicUrl(filePath);
      fileUrl = urlData?.publicUrl || '';

      setUploadProgress(65);

      // ── Step 2: Insert submission row directly into Supabase ─────────────
      // We bypass db.submitTask() which reads from the in-memory cache and
      // throws 'Task not found' when a member opens the app on a fresh device
      // (cache is empty). selectedTask is already loaded from Supabase above.
      const submittedFileName = customFileName || uploadFile.name;
      const submittedFileSize = customFileSize || `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`;
      const now = new Date().toISOString();

      // Check for an existing submission (for resubmission flow)
      const { data: existingRows } = await supabase
        .from('submissions')
        .select('id, submission_id_code, history')
        .eq('task_id', selectedTask.id)
        .eq('member_id', currentUser.id)
        .maybeSingle();

      if (existingRows && !selectedTask.allowResubmission) {
        throw new Error(
          language === 'ar'
            ? 'هذه المهمة لا تسمح بإعادة التسليم'
            : 'This task does not allow resubmission'
        );
      }

      const historyEntry = {
        status: 'Pending',
        changedAt: now,
        changedBy: currentUser.id,
        comment: existingRows ? 'Resubmitted solution file.' : 'Initial solution submitted.',
      };

      // Automatically pull committee and department directly from the member's registered profile
      const userComm = currentUser.committee && currentUser.committee !== 'All' && currentUser.committee !== 'None'
        ? currentUser.committee
        : (selectedTask.committee !== 'All' ? selectedTask.committee : 'General');
      
      const userDept = currentUser.department && currentUser.department !== 'All' && currentUser.department !== 'None' && currentUser.department !== 'General'
        ? currentUser.department
        : (selectedTask.department !== 'All' ? selectedTask.department : 'General');

      const submissionRow = {
        task_id: selectedTask.id,
        task_name: selectedTask.name,
        member_id: currentUser.id,
        member_name: currentUser.fullName,
        member_email: currentUser.email,
        committee: userComm,
        department: userDept,
        status: 'Pending',
        file_url: fileUrl,
        file_name: submittedFileName,
        file_size: submittedFileSize,
        submitted_at: now,
        completed_subtasks: localCompletedSubtasks,
        history: existingRows
          ? [...(existingRows.history || []), historyEntry]
          : [historyEntry],
      };

      let submissionError: any = null;
      if (existingRows) {
        const { error } = await supabase
          .from('submissions')
          .update(submissionRow)
          .eq('id', existingRows.id);
        submissionError = error;
      } else {
        const nextCode = `TASK-${String(Date.now()).slice(-6)}`;
        const { error } = await supabase
          .from('submissions')
          .insert({ ...submissionRow, submission_id_code: nextCode });
        submissionError = error;
      }

      if (submissionError) {
        console.error('[TaskBoard] Submission insert/update error:', submissionError.message);
        throw new Error(
          language === 'ar'
            ? `فشل حفظ التسليم: ${submissionError.message}`
            : `Submission save failed: ${submissionError.message}`
        );
      }

      setUploadProgress(85);

      // ── Step 3: Notify all leaders/admins + task creator ─────────────────
      try {
        const notifyRoles = ['Super Admin', 'Coordinator', 'Deputy Coordinator', 'Leader', 'Head', 'HRM', 'Central', 'Vice'];
        const { data: recipients } = await supabase
          .from('profiles')
          .select('id')
          .eq('governorate', currentUser.governorate)
          .eq('status', 'Active')
          .in('role', notifyRoles)
          .neq('id', currentUser.id);

        const creatorId = selectedTask.createdBy;
        const recipientIds: string[] = (recipients || []).map((r: any) => r.id);
        if (creatorId && !recipientIds.includes(creatorId) && creatorId !== currentUser.id) {
          recipientIds.push(creatorId);
        }

        if (recipientIds.length > 0) {
          await supabase.from('notifications').insert(
            recipientIds.map((uid: string) => ({
              user_id: uid,
              title: 'تسليم مهمة جديد 📥',
              message: `قام ${currentUser.fullName} بتسليم المهمة: "${selectedTask.name}"`,
              type: 'info',
              is_read: false,
              related_id: selectedTask.id,
            }))
          );
        }
      } catch (notifErr) {
        // Notification failure must NOT block the submission success
        console.error('[TaskBoard] Notification send failed:', notifErr);
      }

      setUploadProgress(100);
      setIsUploading(false);
      setUploadFile(null);
      setCustomFileName('');
      setCustomFileSize('');
      loadData();
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err.message || 'Upload failed');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذا التكليف؟' : 'Are you sure you want to delete this task?')) {
      db.deleteTask(taskId, currentUser);
      if (selectedTask?.id === taskId) setSelectedTask(null);
      loadData();
    }
  };

  const openExtendDeadlineModal = () => {
    if (!selectedTask) return;
    let initialDate = new Date();
    if (selectedTask.deadline) {
      const parsed = new Date(selectedTask.deadline);
      if (!isNaN(parsed.getTime())) {
        initialDate = parsed;
      }
    } else {
      initialDate.setDate(initialDate.getDate() + 2);
    }
    const tzOffset = initialDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(initialDate.getTime() - tzOffset).toISOString().slice(0, 16);
    setExtendDeadlineValue(localISOTime);
    setShowExtendDeadlineModal(true);
  };

  const addDaysToExtendDeadline = (days: number) => {
    const current = extendDeadlineValue ? new Date(extendDeadlineValue) : (selectedTask?.deadline ? new Date(selectedTask.deadline) : new Date());
    const target = isNaN(current.getTime()) ? new Date() : new Date(current);
    target.setDate(target.getDate() + days);
    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16);
    setExtendDeadlineValue(localISOTime);
  };

  const handleExtendDeadlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !extendDeadlineValue) return;
    setIsExtendingDeadline(true);
    try {
      const isoDate = new Date(extendDeadlineValue).toISOString();
      const { error } = await supabase
        .from('tasks')
        .update({ deadline: isoDate })
        .eq('id', selectedTask.id);

      if (error) {
        console.error('[TaskBoard] Extend deadline error:', error.message);
        throw error;
      }

      // Update local db cache
      db.updateTask(selectedTask.id, { deadline: isoDate }, currentUser);

      // Notify members in governorate about the extension
      try {
        const { data: members } = await supabase
          .from('profiles')
          .select('id')
          .eq('governorate', currentUser.governorate)
          .eq('status', 'Active')
          .neq('id', currentUser.id);

        if (members && members.length > 0) {
          const notifs = members.map(m => ({
            user_id: m.id,
            title: 'تمديد موعد التسليم ⏳',
            message: `تم تمديد موعد تسليم المهمة "${selectedTask.name}" إلى ${new Date(isoDate).toLocaleDateString('ar-EG')}`,
            type: 'info',
            is_read: false,
            related_id: selectedTask.id
          }));
          await supabase.from('notifications').insert(notifs);
        }
      } catch (notifErr) {
        console.warn('Deadline notification error:', notifErr);
      }

      setSelectedTask(prev => prev ? { ...prev, deadline: isoDate } : null);
      setShowExtendDeadlineModal(false);
      await loadData();
    } catch (err: any) {
      alert(language === 'ar' ? `فشل تمديد الموعد: ${err.message}` : `Failed to extend deadline: ${err.message}`);
    } finally {
      setIsExtendingDeadline(false);
    }
  };

  // Filtered task list calculation
  const filteredTasksList = (tasks || []).filter(task => {
    if (!task) return false;
    if (filterCommittee !== 'All' && task.committee !== filterCommittee) return false;
    if (filterDepartment !== 'All' && task.department !== filterDepartment) return false;
    if (filterPriority !== 'All' && task.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (task.name || '').toLowerCase().includes(q);
      const matchDesc = (task.description || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  const renderTaskDetails = () => {
    if (!selectedTask) return null;
    const userSubmission = (submissions || []).find(s => s && s.taskId === selectedTask.id && s.memberId === currentUser?.id);
    const taskSubmissions = (submissions || []).filter(s => s && s.taskId === selectedTask.id);
    const allowedTypes = Array.isArray(selectedTask.allowedFileTypes) && selectedTask.allowedFileTypes.length > 0
      ? selectedTask.allowedFileTypes
      : ['pdf', 'docx', 'zip', 'png', 'jpg'];
    const canManageTask = currentUser?.role !== 'Member' || selectedTask.createdBy === currentUser?.id;

    return (
      <div className="space-y-6 animate-fadeIn" id="task-detail-focused">
        {/* Header detail */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  {language === 'ar' ? `لجنة ${translateCommittee(selectedTask.committee)} • قسم ${translateDepartment(selectedTask.department)}` : `${selectedTask.committee} Committee • ${selectedTask.department} Dept`}
                </span>
                {selectedTask.assignedMemberIds && Array.isArray(selectedTask.assignedMemberIds) && selectedTask.assignedMemberIds.length > 0 && (
                  <span className="text-[10px] bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full font-bold">
                    🎯 {language === 'ar' ? `تكليف مخصص لـ (${selectedTask.assignedMemberIds.length}) أعضاء محددين بالاسم` : `Targeted to (${selectedTask.assignedMemberIds.length}) specific members`}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                {selectedTask.isTeamTask && <Users className="w-4 h-4 text-amber-500 shrink-0" />}
                <span>{selectedTask.name}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'ar'
                  ? `تم النشر بواسطة ${selectedTask.createdByName || 'الإدارة'} بتاريخ ${selectedTask.createdDate ? new Date(selectedTask.createdDate).toLocaleDateString('ar-EG') : ''}`
                  : `Published by ${selectedTask.createdByName || 'Admin'} on ${selectedTask.createdDate ? new Date(selectedTask.createdDate).toLocaleDateString() : ''}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canManageTask && (
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="p-2 rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-100 dark:bg-red-950/20 dark:border-red-900 transition-colors cursor-pointer"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${selectedTask.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' : 'bg-slate-100 text-slate-500 border border-slate-150 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}>
                {selectedTask.status === 'Published' ? (language === 'ar' ? 'منشورة' : 'Published') : selectedTask.status}
              </span>
            </div>
          </div>

          {/* Prominent Deadline & Extension Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-50/80 via-slate-50 to-amber-50/40 dark:from-amber-950/20 dark:via-slate-950 dark:to-amber-950/10 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? 'الموعد النهائي للتسليم (Deadline)' : 'Submission Deadline'}
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono">
                  {selectedTask.deadline
                    ? new Date(selectedTask.deadline).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })
                    : (language === 'ar' ? 'غير محدد' : 'Not specified')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono border shadow-sm ${getCountdown(selectedTask.deadline).className} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`}>
                {getCountdown(selectedTask.deadline).text}
              </span>

              {canManageTask && (
                <button
                  type="button"
                  onClick={openExtendDeadlineModal}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer hover:shadow"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تمديد الموعد' : 'Extend Deadline'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Task descriptions and instructions */}
          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{language === 'ar' ? 'تفاصيل المهمة' : 'Description'}</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 whitespace-pre-wrap">
                {selectedTask.description || (language === 'ar' ? 'لا يوجد تفاصيل إضافية' : 'No additional description')}
              </p>
            </div>

            {selectedTask.instructions && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{language === 'ar' ? 'إرشادات تسليم الحلول والمخرجات' : 'Submission Instructions'}</h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 whitespace-pre-wrap">
                  {selectedTask.instructions}
                </p>
              </div>
            )}

            {/* Checklist / Subtasks Section (Interactive for all users before submission) */}
            {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-amber-500" />
                    <span>{language === 'ar' ? 'قائمة المهام الفرعية والتحقق (Checklist)' : 'Task Checklist'}</span>
                  </h4>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    {localCompletedSubtasks.length} / {selectedTask.subtasks.length} ({Math.round((localCompletedSubtasks.length / selectedTask.subtasks.length) * 100)}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(localCompletedSubtasks.length / selectedTask.subtasks.length) * 100}%` }}
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  {selectedTask.subtasks.map((subtask, idx) => {
                    const isCompleted = localCompletedSubtasks.includes(subtask.id);
                    const isEditable = !userSubmission;

                    return (
                      <label
                        key={subtask.id || idx}
                        onClick={() => {
                          if (isEditable) {
                            if (isCompleted) {
                              setLocalCompletedSubtasks(prev => prev.filter(id => id !== subtask.id));
                            } else {
                              setLocalCompletedSubtasks(prev => [...prev, subtask.id]);
                            }
                          }
                        }}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all select-none ${isEditable ? 'cursor-pointer' : 'cursor-default'
                          } ${isCompleted
                            ? 'bg-emerald-50/60 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 line-through opacity-85'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}>
                          {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold">{subtask.text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Video Player */}
            {(selectedTask.isVideoTask || selectedTask.videoUrl) && selectedTask.videoUrl && (
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                <div className="flex items-center gap-2 text-xs font-black text-red-600 dark:text-red-400">
                  <Video className="w-4 h-4" />
                  <span>{language === 'ar' ? 'فيديو الشرح الإلزامي للتكليف' : 'Mandatory Explanation Video'}</span>
                </div>
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 bg-black">
                  <iframe
                    src={getYouTubeEmbedUrl(selectedTask.videoUrl)}
                    title={selectedTask.name}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 1. Everyone's Solution Submission Card (Both Members AND Leaders can submit!) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-amber-500" />
              <span>{language === 'ar' ? 'تسليم حل المهمة (خاص بحسابك)' : 'Submit Task Solution (Your Submission)'}</span>
            </h3>
            {userSubmission && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${userSubmission.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                  userSubmission.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                }`}>
                {userSubmission.status === 'Accepted' ? 'تم الاعتماد والقبول' : userSubmission.status === 'Rejected' ? 'مرفوض' : 'قيد المراجعة'}
              </span>
            )}
          </div>

          {userSubmission ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-start">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{userSubmission.fileName || 'ملف الحل'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">تم التسليم: {userSubmission.submittedAt ? new Date(userSubmission.submittedAt).toLocaleString('ar-EG') : ''}</p>
                  </div>
                </div>
                {userSubmission.fileUrl && (
                  <button
                    onClick={() => setPreviewAttachment({ name: userSubmission.fileName || 'الملف', url: userSubmission.fileUrl })}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-amber-50 text-amber-600 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>معاينة الملف</span>
                  </button>
                )}
              </div>
              {userSubmission.comment && (
                <p className="text-xs bg-white dark:bg-slate-900 p-3 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-150 dark:border-slate-800">
                  <strong>ملاحظات المراجعة:</strong> {userSubmission.comment}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleFileSubmit} className="space-y-4">
              {uploadError && <p className="p-3 text-xs font-semibold text-red-600 bg-red-50 rounded-xl border border-red-100">{uploadError}</p>}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-colors ${dragActive ? 'border-amber-500 bg-amber-50/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                  }`}
              >
                <input type="file" id="member-file-upload" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                <UploadCloud className="w-10 h-10 text-slate-400" />
                {uploadFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{customFileName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{customFileSize}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">اسحب وأفلت ملف الحل هنا أو <span className="text-amber-600 underline">تصفح جهازك</span></p>
                    <p className="text-[10px] text-slate-400">الصيغ المدعومة: {allowedTypes.join(', ').toUpperCase()}</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!uploadFile || isUploading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isUploading ? 'جاري رفع الحل...' : 'إرسال التسليم'}</span>
              </button>
            </form>
          )}
        </div>

        {/* 2. Leader & Admin Submissions Review Board (Auto-Grouped by Member Registered Committee & Sub-committee) */}
        {canManageTask && (() => {
          const isOrgWideTask = !selectedTask.committee || selectedTask.committee === 'All' || selectedTask.committee === 'None' || selectedTask.committee === 'General';
          
          // Committees to display
          const targetCommittees = isOrgWideTask
            ? Object.keys(COMMITTEE_STRUCTURE)
            : [selectedTask.committee];

          // Build hierarchical data: Committee -> Sub-committees -> Submissions
          const committeeTree: {
            committee: string;
            submissions: Submission[];
            acceptedCount: number;
            pendingCount: number;
            rejectedCount: number;
            avgGrade: number;
            subcommittees: {
              department: string;
              submissions: Submission[];
              acceptedCount: number;
              pendingCount: number;
              avgGrade: number;
            }[];
          }[] = [];

          targetCommittees.forEach(comm => {
            const commSubs = taskSubmissions.filter(s => (s.committee || '').trim().toUpperCase() === comm.toUpperCase());
            const commDepts = COMMITTEE_STRUCTURE[comm] || [];

            const subcommittees: {
              department: string;
              submissions: Submission[];
              acceptedCount: number;
              pendingCount: number;
              avgGrade: number;
            }[] = [];

            // Group by each defined department in this committee
            commDepts.forEach(dept => {
              const deptSubs = commSubs.filter(s => (s.department || '').trim().toLowerCase() === dept.trim().toLowerCase());
              const accepted = deptSubs.filter(s => s.status === 'Accepted').length;
              const pending = deptSubs.filter(s => s.status === 'Pending').length;
              const graded = deptSubs.filter(s => typeof s.grade === 'number' && s.grade > 0);
              const avg = graded.length > 0 ? Math.round(graded.reduce((acc, s) => acc + (s.grade || 0), 0) / graded.length) : 0;
              subcommittees.push({
                department: dept,
                submissions: deptSubs,
                acceptedCount: accepted,
                pendingCount: pending,
                avgGrade: avg,
              });
            });

            // Submissions belonging to this committee with General/unmatched department
            const generalSubs = commSubs.filter(s => !commDepts.some(d => d.trim().toLowerCase() === (s.department || '').trim().toLowerCase()));
            if (generalSubs.length > 0) {
              const accepted = generalSubs.filter(s => s.status === 'Accepted').length;
              const pending = generalSubs.filter(s => s.status === 'Pending').length;
              const graded = generalSubs.filter(s => typeof s.grade === 'number' && s.grade > 0);
              const avg = graded.length > 0 ? Math.round(graded.reduce((acc, s) => acc + (s.grade || 0), 0) / graded.length) : 0;
              subcommittees.push({
                department: 'عام',
                submissions: generalSubs,
                acceptedCount: accepted,
                pendingCount: pending,
                avgGrade: avg,
              });
            }

            const totalAccepted = commSubs.filter(s => s.status === 'Accepted').length;
            const totalPending = commSubs.filter(s => s.status === 'Pending').length;
            const totalRejected = commSubs.filter(s => s.status === 'Rejected').length;
            const totalGraded = commSubs.filter(s => typeof s.grade === 'number' && s.grade > 0);
            const commAvg = totalGraded.length > 0 ? Math.round(totalGraded.reduce((acc, s) => acc + (s.grade || 0), 0) / totalGraded.length) : 0;

            committeeTree.push({
              committee: comm,
              submissions: commSubs,
              acceptedCount: totalAccepted,
              pendingCount: totalPending,
              rejectedCount: totalRejected,
              avgGrade: commAvg,
              subcommittees,
            });
          });

          // Also capture any submissions from other/unmatched committees
          const otherCommSubs = taskSubmissions.filter(s => !targetCommittees.some(c => c.toUpperCase() === (s.committee || '').trim().toUpperCase()));
          if (otherCommSubs.length > 0) {
            const totalAccepted = otherCommSubs.filter(s => s.status === 'Accepted').length;
            const totalPending = otherCommSubs.filter(s => s.status === 'Pending').length;
            const totalRejected = otherCommSubs.filter(s => s.status === 'Rejected').length;
            const totalGraded = otherCommSubs.filter(s => typeof s.grade === 'number' && s.grade > 0);
            const avg = totalGraded.length > 0 ? Math.round(totalGraded.reduce((acc, s) => acc + (s.grade || 0), 0) / totalGraded.length) : 0;
            committeeTree.push({
              committee: 'لجان أخرى / عام',
              submissions: otherCommSubs,
              acceptedCount: totalAccepted,
              pendingCount: totalPending,
              rejectedCount: totalRejected,
              avgGrade: avg,
              subcommittees: [{
                department: 'عام',
                submissions: otherCommSubs,
                acceptedCount: totalAccepted,
                pendingCount: totalPending,
                avgGrade: avg,
              }],
            });
          }

          // Flat list of all available sub-committees across the selected committees
          const allFlatDepts = Array.from(new Set(
            committeeTree.flatMap(c => c.subcommittees.map(sc => sc.department))
          ));

          // Filter displayed submissions based on tab selection
          const displayedSubs = taskSubmissions.filter(s => {
            if (reviewDeptFilter === 'all') return true;
            return (s.department || '').trim().toLowerCase() === reviewDeptFilter.trim().toLowerCase() ||
                   (s.committee || '').trim().toUpperCase() === reviewDeptFilter.trim().toUpperCase();
          });

          return (
            <div className="bg-slate-900/95 dark:bg-slate-900/95 p-6 rounded-3xl border border-slate-800 text-slate-100 space-y-5 shadow-2xl backdrop-blur-xl">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>{language === 'ar' ? `متابعة ومراجعة تسليمات اللجان والأقسام (${taskSubmissions.length})` : `Team Submissions & Review (${taskSubmissions.length})`}</span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar'
                      ? 'يتم توزيع تسليمات الأعضاء تلقائياً بناءً على اللجان والأقسام المسجلين بها لسهولة وسرعة التقييم'
                      : 'Submissions are automatically routed by registered member committee and department for effortless grading'}
                  </p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setReviewViewMode('grouped')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      reviewViewMode === 'grouped'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'تقسيم اللجان والأقسام' : 'Grouped View'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewViewMode('list')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      reviewViewMode === 'list'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'جدول شامل' : 'Flat Table'}</span>
                  </button>
                </div>
              </div>

              {/* Committee & Sub-committee Quick-Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setReviewDeptFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                    reviewDeptFilter === 'all'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-amber-500/40 hover:text-white'
                  }`}
                >
                  <span>🌟 كل التسليمات</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    reviewDeptFilter === 'all' ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {taskSubmissions.length}
                  </span>
                </button>

                {/* Major Committees Buttons (if multiple committees exist) */}
                {committeeTree.map(comm => (
                  <button
                    key={comm.committee}
                    type="button"
                    onClick={() => setReviewDeptFilter(comm.committee)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                      reviewDeptFilter === comm.committee
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20 font-black'
                        : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-amber-500/40 hover:text-white'
                    }`}
                  >
                    <span>لجنة {translateCommittee(comm.committee)}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      reviewDeptFilter === comm.committee ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {comm.submissions.length}
                    </span>
                  </button>
                ))}

                {/* Specific Sub-committees / Departments Pills */}
                {allFlatDepts.map(dept => {
                  const count = taskSubmissions.filter(s => (s.department || '').trim().toLowerCase() === dept.trim().toLowerCase()).length;
                  if (count === 0 && !reviewDeptFilter.includes(dept)) return null;

                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setReviewDeptFilter(dept)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border font-mono ${
                        reviewDeptFilter === dept
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20 font-black'
                          : 'bg-slate-800/80 text-amber-300/90 border-slate-700 hover:border-amber-500/40 hover:text-amber-200'
                      }`}
                    >
                      <span>{dept}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        reviewDeptFilter === dept ? 'bg-black/30 text-white' : 'bg-slate-900 text-slate-300'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {taskSubmissions.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                  <UploadCloud className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">
                    {language === 'ar' ? 'لم يتم تقديم تسليمات لهذه المهمة حتى الآن.' : 'No submissions received for this task yet.'}
                  </p>
                </div>
              ) : reviewViewMode === 'grouped' ? (
                /* GROUPED BY COMMITTEE & SUB-COMMITTEE VIEW */
                <div className="space-y-5">
                  {committeeTree
                    .filter(comm => {
                      if (reviewDeptFilter === 'all') return true;
                      if (reviewDeptFilter === comm.committee) return true;
                      return comm.subcommittees.some(sc => sc.department.toLowerCase() === reviewDeptFilter.toLowerCase());
                    })
                    .map(comm => (
                      <div
                        key={comm.committee}
                        className="bg-slate-950/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-lg hover:border-slate-700 transition-all"
                      >
                        {/* Major Committee Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                              <Users className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white flex items-center gap-2">
                                <span>لجنة {translateCommittee(comm.committee)}</span>
                                <span className="text-[11px] font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                  {comm.committee}
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                {comm.submissions.length} تسليمات إجمالية • {comm.acceptedCount} معتمد • {comm.pendingCount} قيد المراجعة
                              </p>
                            </div>
                          </div>

                          {/* Committee Level Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {comm.avgGrade > 0 && (
                              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span>متوسط التقييم: {comm.avgGrade}/100</span>
                              </span>
                            )}
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                              {comm.acceptedCount} مقبول
                            </span>
                            {comm.pendingCount > 0 && (
                              <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                                {comm.pendingCount} بالانتظار
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sub-committee Breakdown Sections */}
                        <div className="space-y-3.5">
                          {comm.subcommittees
                            .filter(sc => {
                              if (reviewDeptFilter === 'all' || reviewDeptFilter === comm.committee) return true;
                              return sc.department.toLowerCase() === reviewDeptFilter.toLowerCase();
                            })
                            .map(sc => (
                              <div
                                key={sc.department}
                                className="bg-slate-900/90 rounded-xl border border-slate-800/90 p-3.5 space-y-2.5"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-black text-amber-300 bg-slate-800 px-2 py-0.5 rounded-md border border-amber-500/30">
                                      {sc.department}
                                    </span>
                                    <span className="text-xs font-bold text-slate-200">
                                      {translateDepartment(sc.department)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      ({sc.submissions.length} تسليمات)
                                    </span>
                                  </div>

                                  {sc.avgGrade > 0 && (
                                    <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                      ⭐ متوسط القسم: {sc.avgGrade}/100
                                    </span>
                                  )}
                                </div>

                                {sc.submissions.length === 0 ? (
                                  <p className="text-[10px] text-slate-500 py-1.5 px-2 bg-slate-950/40 rounded-lg">
                                    لم يقم أي عضو من هذا القسم بالتسليم بعد.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-start">
                                      <thead>
                                        <tr className="text-slate-400 font-bold text-[10px] uppercase border-b border-slate-800">
                                          <th className="py-2 text-start">العضو</th>
                                          <th className="py-2 text-start">الملف</th>
                                          <th className="py-2 text-start">تاريخ التسليم</th>
                                          <th className="py-2 text-start">الدرجة</th>
                                          <th className="py-2 text-start">الحالة</th>
                                          <th className="py-2 text-end">الإجراء</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/60">
                                        {sc.submissions.map(sub => (
                                          <tr key={sub.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="py-2.5 font-bold text-white">
                                              <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0 border border-amber-500/30">
                                                  {sub.memberName ? sub.memberName.slice(0, 1) : 'ع'}
                                                </div>
                                                <span>{sub.memberName}</span>
                                              </div>
                                            </td>
                                            <td className="py-2.5">
                                              {sub.fileUrl ? (
                                                <button
                                                  type="button"
                                                  onClick={() => setPreviewAttachment({ name: sub.fileName || 'الملف', url: sub.fileUrl })}
                                                  className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                                                >
                                                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                                                  <span className="truncate max-w-[130px]">{sub.fileName || 'ملف الحل'}</span>
                                                </button>
                                              ) : (
                                                <span className="text-slate-500 text-[10px]">لا يوجد ملف</span>
                                              )}
                                            </td>
                                            <td className="py-2.5 text-slate-400 font-mono text-[10px]">
                                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('ar-EG') : ''}
                                            </td>
                                            <td className="py-2.5">
                                              {typeof sub.grade === 'number' && sub.grade > 0 ? (
                                                <span className="font-mono font-black text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 text-[10px]">
                                                  ⭐ {sub.grade} / 100
                                                </span>
                                              ) : (
                                                <span className="text-slate-500 text-[10px] font-mono">لم يُرصد</span>
                                              )}
                                            </td>
                                            <td className="py-2.5">
                                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                sub.status === 'Accepted' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' :
                                                sub.status === 'Rejected' ? 'bg-red-950/60 text-red-300 border border-red-800/60' : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                              }`}>
                                                {sub.status === 'Accepted' ? 'مقبول' : sub.status === 'Rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                              </span>
                                            </td>
                                            <td className="py-2.5 text-end">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedReviewSub(sub);
                                                  setReviewStatus(sub.status || 'Accepted');
                                                  setReviewComment(sub.comment || '');
                                                  setReviewRejectionReason(sub.rejectionReason || '');
                                                  if (sub.gradingCriteria) {
                                                    setEnableGrading(true);
                                                    setGradeQuality(sub.gradingCriteria.quality ?? 20);
                                                    setGradeTimeliness(sub.gradingCriteria.timeliness ?? 20);
                                                    setGradeInnovation(sub.gradingCriteria.innovation ?? 20);
                                                    setGradeCompleteness(sub.gradingCriteria.completeness ?? 20);
                                                  } else if (typeof sub.grade === 'number' && sub.grade > 0) {
                                                    const part = Math.round(sub.grade / 4);
                                                    setEnableGrading(true);
                                                    setGradeQuality(part);
                                                    setGradeTimeliness(part);
                                                    setGradeInnovation(part);
                                                    setGradeCompleteness(sub.grade - (part * 3));
                                                  } else {
                                                    setEnableGrading(false);
                                                    setGradeQuality(20);
                                                    setGradeTimeliness(20);
                                                    setGradeInnovation(20);
                                                    setGradeCompleteness(20);
                                                  }
                                                  setShowReviewModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-[10px] transition-all cursor-pointer shadow hover:shadow-amber-500/20 inline-flex items-center gap-1"
                                              >
                                                <span>تقييم ورصد</span>
                                                <Star className="w-3 h-3 fill-white" />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                /* UNIFIED FLAT TABLE VIEW */
                <div className="overflow-x-auto bg-slate-950/80 rounded-2xl border border-slate-800 p-4">
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold text-[10px] uppercase">
                        <th className="py-2 text-start">صاحب التسليم</th>
                        <th className="py-2 text-start">اللجنة العامة</th>
                        <th className="py-2 text-start">اللجنة الفرعية / القسم</th>
                        <th className="py-2 text-start">الملف</th>
                        <th className="py-2 text-start">تاريخ التسليم</th>
                        <th className="py-2 text-start">الدرجة</th>
                        <th className="py-2 text-start">الحالة</th>
                        <th className="py-2 text-end">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {displayedSubs.map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0 border border-amber-500/30">
                                {sub.memberName ? sub.memberName.slice(0, 1) : 'ع'}
                              </div>
                              <span>{sub.memberName}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                              {translateCommittee(sub.committee)}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-amber-300 border border-amber-500/30 font-mono">
                              {sub.department || 'عام'}
                            </span>
                          </td>
                          <td className="py-3">
                            {sub.fileUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewAttachment({ name: sub.fileName || 'الملف', url: sub.fileUrl })}
                                className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-semibold"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-400" />
                                <span className="truncate max-w-[130px]">{sub.fileName || 'ملف الحل'}</span>
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[10px]">لا يوجد ملف</span>
                            )}
                          </td>
                          <td className="py-3 text-slate-400 font-mono text-[10px]">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('ar-EG') : ''}</td>
                          <td className="py-3">
                            {typeof sub.grade === 'number' && sub.grade > 0 ? (
                              <span className="font-mono font-black text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 text-[10px]">
                                ⭐ {sub.grade} / 100
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px] font-mono">-</span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'Accepted' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' :
                              sub.status === 'Rejected' ? 'bg-red-950/60 text-red-300 border border-red-800/60' : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                            }`}>
                              {sub.status === 'Accepted' ? 'مقبول' : sub.status === 'Rejected' ? 'مرفوض' : 'قيد المراجعة'}
                            </span>
                          </td>
                          <td className="py-3 text-end">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReviewSub(sub);
                                setReviewStatus(sub.status || 'Accepted');
                                setReviewComment(sub.comment || '');
                                setReviewRejectionReason(sub.rejectionReason || '');
                                if (sub.gradingCriteria) {
                                  setEnableGrading(true);
                                  setGradeQuality(sub.gradingCriteria.quality ?? 20);
                                  setGradeTimeliness(sub.gradingCriteria.timeliness ?? 20);
                                  setGradeInnovation(sub.gradingCriteria.innovation ?? 20);
                                  setGradeCompleteness(sub.gradingCriteria.completeness ?? 20);
                                } else if (typeof sub.grade === 'number' && sub.grade > 0) {
                                  const part = Math.round(sub.grade / 4);
                                  setEnableGrading(true);
                                  setGradeQuality(part);
                                  setGradeTimeliness(part);
                                  setGradeInnovation(part);
                                  setGradeCompleteness(sub.grade - (part * 3));
                                } else {
                                  setEnableGrading(false);
                                  setGradeQuality(20);
                                  setGradeTimeliness(20);
                                  setGradeInnovation(20);
                                  setGradeCompleteness(20);
                                }
                                setShowReviewModal(true);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-[10px] transition-all cursor-pointer shadow inline-flex items-center gap-1"
                            >
                              <span>تقييم ورصد</span>
                              <Star className="w-3 h-3 fill-white" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* Task Comments Section */}
        <TaskComments taskId={selectedTask.id} currentUser={currentUser} language={language as any} onNavigateToView={onNavigateToView} />
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-start">
      {/* Top Banner & Action Buttons */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2.5">
              <FolderKanban className="w-6 h-6" />
              <span>{language === 'ar' ? 'لوحة التكليفات والمهام الإدارية' : 'Administrative Tasks Hub'}</span>
            </h1>
            <p className="text-xs text-amber-100 font-medium">
              {language === 'ar' ? 'متابعة وتسليم ومراجعة التكليفات التشغيلية لكيان EYE' : 'Track, submit, and review operational tasks across committees.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentUser?.role !== 'Member' && (
              <button
                onClick={() => {
                  setTargetAudienceMode('all_committee');
                  setSelectedMemberIds([]);
                  setMemberSearchQuery('');
                  setNewTaskSubtasks([]);
                  setTempSubtaskText('');
                  setShowCreateTaskModal(true);
                }}
                className="px-4 py-2.5 bg-white hover:bg-amber-50 text-amber-700 font-bold rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'مهمة جديدة' : 'New Task'}</span>
              </button>
            )}

            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
              className="px-3.5 py-2.5 bg-amber-800/40 hover:bg-amber-800/60 text-white font-bold rounded-2xl text-xs transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>{viewMode === 'list' ? (language === 'ar' ? 'عرض الكانبان' : 'Kanban View') : (language === 'ar' ? 'عرض القائمة' : 'List View')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'ابحث في المهام...' : 'Search tasks...'}
            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl ps-9 pe-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCommittee}
            onChange={(e) => setFilterCommittee(e.target.value)}
            className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            <option value="All">{language === 'ar' ? 'كل اللجان' : 'All Committees'}</option>
            {Object.keys(COMMITTEE_STRUCTURE).map(c => <option key={c} value={c}>{translateCommittee(c)}</option>)}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            <option value="All">{language === 'ar' ? 'كل الأولويات' : 'All Priorities'}</option>
            <option value="Normal">متوسطة</option>
            <option value="High">عالية</option>
            <option value="Urgent">عاجلة</option>
          </select>
        </div>
      </div>

      {/* Main Board Layout */}
      {viewMode === 'kanban' ? (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Published', 'Completed', 'Draft'].map(status => {
            const colTasks = filteredTasksList.filter(t => status === 'Completed' ? t.status === 'Closed' : t.status === status);
            return (
              <div key={status} className="bg-slate-100/60 dark:bg-slate-900/60 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between px-2 py-1">
                  <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${status === 'Published' ? 'bg-emerald-500' : status === 'Completed' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                    <span>{status === 'Published' ? (language === 'ar' ? 'نشطة ومنشورة' : 'Active') : status === 'Completed' ? (language === 'ar' ? 'مكتملة ومغلقة' : 'Closed') : (language === 'ar' ? 'مسودة' : 'Draft')}</span>
                  </h3>
                  <span className="text-[10px] font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 border border-slate-200 dark:border-slate-700">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs font-semibold bg-white/50 dark:bg-slate-850/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      {language === 'ar' ? 'لا توجد مهام' : 'No tasks'}
                    </div>
                  ) : (
                    colTasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedTask(t);
                          setViewMode('list');
                        }}
                        className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 cursor-pointer shadow-sm transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-1 text-[9px] font-bold text-slate-400">
                          <span>{translateCommittee(t.committee)}</span>
                          <span className={getCountdown(t.deadline).className}>{getCountdown(t.deadline).text}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">{t.name}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{t.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST + DETAILS VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Task List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {language === 'ar' ? `قائمة المهام (${filteredTasksList.length})` : `Tasks (${filteredTasksList.length})`}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {filteredTasksList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs font-semibold">
                  {language === 'ar' ? 'لا توجد مهام مطابقة للشروط' : 'No matching tasks found'}
                </div>
              ) : (
                filteredTasksList.map(task => {
                  const isActive = selectedTask?.id === task.id;
                  const userSub = (submissions || []).find(s => s && s.taskId === task.id && s.memberId === currentUser?.id);

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${isActive
                          ? 'bg-amber-50/40 border-amber-500/50 dark:bg-amber-950/20 dark:border-amber-800 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${task.priority === 'High' || task.priority === 'Urgent'
                            ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:text-red-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                          {task.priority === 'High' ? 'عالية' : task.priority === 'Urgent' ? 'عاجلة' : 'متوسطة'}
                        </span>
                        <div className="flex items-center gap-1">
                          {task.assignedMemberIds && Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.length > 0 && (
                            <span className="text-[9px] bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded font-bold">
                              🎯 {language === 'ar' ? `مخصص (${task.assignedMemberIds.length})` : `Targeted (${task.assignedMemberIds.length})`}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold uppercase tracking-wider">{translateDepartment(task.department)}</span>
                        </div>
                      </div>

                      <h4 className={`text-xs font-bold leading-tight mb-1 flex items-center gap-1.5 ${isActive ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {task.isTeamTask && <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <span>{task.name}</span>
                      </h4>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 font-mono">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {task.deadline ? new Date(task.deadline).toLocaleDateString('ar-EG') : 'غير محدد'}
                          </span>
                          <span className={`text-[8px] font-extrabold ${getCountdown(task.deadline).className}`}>
                            {getCountdown(task.deadline).text}
                          </span>
                        </div>

                        {currentUser?.role === 'Member' ? (
                          userSub ? (
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${userSub.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                userSub.status === 'Rejected' ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' :
                                  'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}>
                              {userSub.status === 'Accepted' ? 'مقبول' : userSub.status === 'Rejected' ? 'مرفوض' : 'قيد المراجعة'}
                            </span>
                          ) : (
                            <span className="text-amber-500 font-bold text-[9px]">لم تسلم</span>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Focused Task Details View */}
          <div className="lg:col-span-7">
            {selectedTask ? (
              renderTaskDetails()
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px] space-y-3">
                <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-bold">{language === 'ar' ? 'اختر مهمة من القائمة لعرض تفاصيلها وتسليم الحل' : 'Select a task from the list to view details and submit'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 text-start max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>{language === 'ar' ? 'إنشاء تكليف إداري جديد' : 'Create New Administrative Task'}</span>
              </h3>
              <button onClick={() => setShowCreateTaskModal(false)} className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'عنوان المهمة' : 'Task Title'}</label>
                <input
                  type="text" required value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: تقرير تقييم المتطوعين الشهري...' : 'e.g., Monthly Volunteer Report'}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'تفاصيل وشرح المهمة' : 'Description'}</label>
                <textarea
                  required value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'إرشادات التسليم والمخرجات المطلوبة' : 'Instructions'}</label>
                <textarea
                  value={newTaskInst}
                  onChange={(e) => setNewTaskInst(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'الأولوية' : 'Priority'}</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-bold"
                  >
                    <option value="Normal">متوسطة</option>
                    <option value="High">عالية</option>
                    <option value="Urgent">عاجلة</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'الموعد النهائي' : 'Deadline'}</label>
                  <input
                    type="datetime-local" required value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>
              </div>

              {/* Subtasks / Checklist Builder */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                    <span>{language === 'ar' ? 'قائمة مهام فرعية للتحقق (Checklist)' : 'Subtasks / Checklist'}</span>
                  </span>
                  <span className="text-[9px] text-slate-400">({newTaskSubtasks.length} بنود)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempSubtaskText}
                    onChange={(e) => setTempSubtaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder={language === 'ar' ? 'أضف بند أو خطوة فرعية واضغط إضافة...' : 'Add a subtask item...'}
                    className="flex-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={!tempSubtaskText.trim()}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة' : 'Add'}</span>
                  </button>
                </div>

                {newTaskSubtasks.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    {newTaskSubtasks.map((st, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800 text-xs">
                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                          <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span>{st}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(idx)}
                          className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Target Audience Scope Selector */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-500" />
                    <span>{language === 'ar' ? 'نطاق التوجيه وتحديد المستهدفين بالتكليف' : 'Target Audience Scope'}</span>
                  </label>
                  {targetAudienceMode === 'specific_members' && (
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      {language === 'ar' ? `تم تحديد ${selectedMemberIds.length} عضو` : `${selectedMemberIds.length} members selected`}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetAudienceMode('all_committee');
                      setNewTaskDepartment('All');
                      setSelectedMemberIds([]);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${targetAudienceMode === 'all_committee'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <span>🏢 {language === 'ar' ? 'اللجنة بالكامل' : 'Whole Committee'}</span>
                    <span className="text-[9px] font-normal opacity-75">{language === 'ar' ? 'لكل الأقسام' : 'All Departments'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetAudienceMode('department');
                      setSelectedMemberIds([]);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${targetAudienceMode === 'department'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <span>🏷️ {language === 'ar' ? 'قسم نوعي محدد' : 'Department'}</span>
                    <span className="text-[9px] font-normal opacity-75">{language === 'ar' ? 'قسم مخصص' : 'Specific Dept'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudienceMode('specific_members')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${targetAudienceMode === 'specific_members'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <span>👥 {language === 'ar' ? 'أعضاء بالاسم' : 'Specific Members'}</span>
                    <span className="text-[9px] font-normal opacity-75">
                      {selectedMemberIds.length > 0
                        ? (language === 'ar' ? `(${selectedMemberIds.length}) محددين` : `(${selectedMemberIds.length}) picked`)
                        : (language === 'ar' ? 'اختيار مخصص' : 'Custom Select')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Committee / Department selectors if not specific members */}
              {targetAudienceMode !== 'specific_members' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'نطاق اللجنة' : 'Committee Scope'}</label>
                      <select
                        value={newTaskCommittee}
                        onChange={(e) => {
                          setNewTaskCommittee(e.target.value);
                          setNewTaskDepartment('All');
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100"
                      >
                        <option value="All">{language === 'ar' ? '🌟 جميع اللجان (كل الأعضاء والكيان)' : 'All Committees'}</option>
                        {Object.keys(COMMITTEE_STRUCTURE).map(c => <option key={c} value={c}>{translateCommittee(c)}</option>)}
                      </select>
                    </div>

                    {targetAudienceMode === 'department' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ar' ? 'القسم النوعي' : 'Department'}</label>
                        <select
                          value={newTaskDepartment}
                          onChange={(e) => setNewTaskDepartment(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100"
                        >
                          {newTaskCommittee !== 'All' && COMMITTEE_STRUCTURE[newTaskCommittee] ? (
                            (COMMITTEE_STRUCTURE[newTaskCommittee] || []).map(d => (
                              <option key={d} value={d}>{translateDepartment(d)}</option>
                            ))
                          ) : (
                            <option value="All">عام / كل الأقسام واللجان الفرعية</option>
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Specific Member Multi-Selector */}
              {targetAudienceMode === 'specific_members' && (
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">تحديد الأعضاء المكلفين بالاسم</label>
                    <button
                      type="button"
                      onClick={() => {
                        const available = db.getUsers().filter(u => u.status === 'Active');
                        if (selectedMemberIds.length === available.length) {
                          setSelectedMemberIds([]);
                        } else {
                          setSelectedMemberIds(available.map(u => u.id));
                        }
                      }}
                      className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                    >
                      {selectedMemberIds.length > 0 ? 'إلغاء التحديد' : 'تحديد الكل'}
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم أو الكود أو اللجنة..."
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    {(() => {
                      const allMembers = db.getUsers().filter(u => u.status === 'Active');
                      const filtered = allMembers.filter(m => {
                        if (!memberSearchQuery.trim()) return true;
                        const q = memberSearchQuery.toLowerCase();
                        return (m.fullName || '').toLowerCase().includes(q) ||
                          (m.membershipCode || '').toLowerCase().includes(q) ||
                          (m.committee || '').toLowerCase().includes(q) ||
                          (m.department || '').toLowerCase().includes(q);
                      });

                      if (filtered.length === 0) {
                        return <p className="text-[11px] text-slate-400 text-center py-4">لا يوجد أعضاء مطابقين للبحث</p>;
                      }

                      return filtered.map(m => {
                        const isChecked = selectedMemberIds.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer select-none ${isChecked
                                ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-slate-900 dark:text-white'
                                : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-300'
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMemberIds(prev => [...prev, m.id]);
                                  } else {
                                    setSelectedMemberIds(prev => prev.filter(id => id !== m.id));
                                  }
                                }}
                                className="accent-amber-500"
                              />
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-800 dark:text-white">{m.fullName}</span>
                                <span className="text-[9px] text-slate-500">{m.membershipCode} • {m.committee}</span>
                              </div>
                            </div>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Policies & Video */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">سياسات وإعدادات التسليم</label>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={allowedPdf} onChange={e => setAllowedPdf(e.target.checked)} className="accent-amber-500" />
                    <span>PDF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={allowedZip} onChange={e => setAllowedZip(e.target.checked)} className="accent-amber-500" />
                    <span>ZIP / RAR</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={allowedImages} onChange={e => setAllowedImages(e.target.checked)} className="accent-amber-500" />
                    <span>PNG / JPG</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newTaskResubmit} onChange={e => setNewTaskResubmit(e.target.checked)} className="accent-amber-500" />
                    <span>السماح بإعادة التسليم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isNewTaskTeam} onChange={e => setIsNewTaskTeam(e.target.checked)} className="accent-amber-500" />
                    <span>مهمة جماعية</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newTaskIsVideo} onChange={e => setNewTaskIsVideo(e.target.checked)} className="accent-amber-500" />
                    <span className="text-red-500 font-bold">فيديو إلزامي</span>
                  </label>
                </div>
              </div>

              {newTaskIsVideo && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-red-500 uppercase tracking-widest">رابط فيديو الشرح (YouTube)</label>
                  <input
                    type="url"
                    value={newTaskVideoUrl}
                    onChange={(e) => setNewTaskVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>نشر وتعميم التكليف الآن</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EXTEND DEADLINE MODAL */}
      {showExtendDeadlineModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-start animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {language === 'ar' ? 'تمديد الموعد النهائي للتكليف' : 'Extend Task Deadline'}
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate max-w-xs">{selectedTask.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExtendDeadlineModal(false)}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExtendDeadlineSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 text-xs space-y-1">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  {language === 'ar' ? 'الموعد الحالي:' : 'Current Deadline:'}
                </span>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedTask.deadline
                    ? new Date(selectedTask.deadline).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })
                    : (language === 'ar' ? 'غير محدد' : 'Not set')}
                </p>
              </div>

              {/* Quick extension shortcuts */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {language === 'ar' ? 'تمديد سريع:' : 'Quick Extend:'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => addDaysToExtendDeadline(1)}
                    className="py-2 px-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all cursor-pointer text-center"
                  >
                    +24 ساعة
                  </button>
                  <button
                    type="button"
                    onClick={() => addDaysToExtendDeadline(2)}
                    className="py-2 px-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all cursor-pointer text-center"
                  >
                    +48 ساعة
                  </button>
                  <button
                    type="button"
                    onClick={() => addDaysToExtendDeadline(3)}
                    className="py-2 px-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all cursor-pointer text-center"
                  >
                    +3 أيام
                  </button>
                  <button
                    type="button"
                    onClick={() => addDaysToExtendDeadline(7)}
                    className="py-2 px-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all cursor-pointer text-center"
                  >
                    +أسبوع
                  </button>
                </div>
              </div>

              {/* Exact datetime selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {language === 'ar' ? 'الموعد الجديد المحدد:' : 'New Deadline Date & Time:'}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={extendDeadlineValue}
                  onChange={(e) => setExtendDeadlineValue(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isExtendingDeadline || !extendDeadlineValue}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isExtendingDeadline ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  <span>{isExtendingDeadline ? (language === 'ar' ? 'جاري تمديد الموعد...' : 'Saving...') : (language === 'ar' ? 'تأكيد وحفظ التمديد' : 'Confirm & Save Extension')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowExtendDeadlineModal(false)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW SUBMISSION MODAL */}
      {showReviewModal && selectedReviewSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-amber-500" />
                  <span>مراجعة وتقييم: {selectedReviewSub.memberName}</span>
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                  <span>لجنة {translateCommittee(selectedReviewSub.committee)}</span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                    قسم {translateDepartment(selectedReviewSub.department)}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmission} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">قرار التقييم</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('Accepted')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${reviewStatus === 'Accepted' ? 'bg-emerald-500 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                  >
                    قبول واعتماد التسليم
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('Rejected')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${reviewStatus === 'Rejected' ? 'bg-red-500 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                  >
                    طلب تعديل / رفض
                  </button>
                </div>
              </div>

              {reviewStatus === 'Accepted' && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">الدرجة الإجمالية: {gradeQuality + gradeTimeliness + gradeInnovation + gradeCompleteness} / 100</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={enableGrading} onChange={e => setEnableGrading(e.target.checked)} className="accent-amber-500" />
                      <span>تفعيل معايير التقييم الرباعية</span>
                    </label>
                  </div>

                  {enableGrading && (
                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">جودة المخرجات ({gradeQuality}/25)</label>
                        <input type="range" min={0} max={25} value={gradeQuality} onChange={e => setGradeQuality(Number(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">الالتزام بالوقت ({gradeTimeliness}/25)</label>
                        <input type="range" min={0} max={25} value={gradeTimeliness} onChange={e => setGradeTimeliness(Number(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">الابتكار والتميز ({gradeInnovation}/25)</label>
                        <input type="range" min={0} max={25} value={gradeInnovation} onChange={e => setGradeInnovation(Number(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">اكتمال العناصر ({gradeCompleteness}/25)</label>
                        <input type="range" min={0} max={25} value={gradeCompleteness} onChange={e => setGradeCompleteness(Number(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">الملاحظات والتغذية الراجعة</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="اكتب ملاحظاتك التشجيعية أو التوجيهية للعضو..."
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
                >
                  حفظ واعتماد التقييم
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCertificate({
                      memberName: selectedReviewSub.memberName,
                      taskName: selectedReviewSub.taskName,
                      grade: gradeQuality + gradeTimeliness + gradeInnovation + gradeCompleteness,
                      reviewerName: currentUser?.fullName || 'القائد',
                      committee: selectedReviewSub.committee,
                      department: selectedReviewSub.department,
                      date: new Date().toLocaleDateString('ar-EG'),
                    });
                  }}
                  className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Award className="w-4 h-4" />
                  <span>شهادة تقدير</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTACHMENT PREVIEW MODAL */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-sm">{previewAttachment.name}</h3>
              </div>
              <button onClick={() => setPreviewAttachment(null)} className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 min-h-[260px] flex flex-col items-center justify-center text-slate-300 space-y-3">
              {previewAttachment.name.endsWith('.png') || previewAttachment.name.endsWith('.jpg') || previewAttachment.url.startsWith('data:image') ? (
                <img src={previewAttachment.url} alt="Preview" className="max-h-72 object-contain rounded-xl" />
              ) : (
                <div className="text-center space-y-2">
                  <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-200">{previewAttachment.name}</p>
                  <p className="text-[10px] text-slate-400">{language === 'ar' ? 'معاينة ملف آمنة وسحابية' : 'Secured Document Preview'}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-slate-400 font-mono">EYE Cloud Storage</span>
              <div className="flex gap-2">
                {(previewAttachment.url.startsWith('http') || previewAttachment.url.startsWith('data:')) && (
                  <a
                    href={previewAttachment.url}
                    download={previewAttachment.name}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل الملف</span>
                  </a>
                )}
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TaskBoard: React.FC<TaskBoardProps> = (props) => {
  const { language } = useLanguage();
  return (
    <TaskBoardErrorBoundary language={language}>
      <TaskBoardInner {...props} />
    </TaskBoardErrorBoundary>
  );
};
