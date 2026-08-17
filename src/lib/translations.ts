export type Language = 'ar' | 'en';

export const translations = {
  ar: {
    // Brand & General
    brandName: 'EYE',
    tagline: 'المنصة الرقمية المتكاملة لإدارة أعمال لجان EYE',
    switchLanguage: 'English',
    languageLabel: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    rtl: true,
    
    // Auth & Landing
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    forgotPassword: 'نسيت كلمة المرور؟',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    fullName: 'الاسم الكامل',
    phoneNumber: 'رقم الهاتف',
    role: 'الدور / المنصب',
    committee: 'اللجنة',
    department: 'القسم',
    confirmPassword: 'تأكيد كلمة المرور',
    alreadyHaveAccount: 'لديك حساب بالفعل؟ سجل دخولك',
    dontHaveAccount: 'ليس لديك حساب؟ سجل الآن',
    backToHome: 'العودة للرئيسية',
    registerSuccess: 'تم إنشاء حسابك وتفعيله بنجاح لتتمكن من الدخول فوراً!',
    loginFailed: 'فشل تسجيل الدخول. يرجى التحقق من البيانات.',
    pendingApprovalMsg: 'حسابك في انتظار تفعيل هيد لجنة الموارد البشرية.',
    
    // Sidebar
    dashboard: 'القائمة الرئيسية',
    members: 'الأعضاء',
    leaders: 'القيادات',
    committees: 'اللجان',
    departments: 'الأقسام',
    tasks: 'المهام الإدارية',
    taskTemplates: 'قوالب المهام',
    submissions: 'التسليمات والمتابعة',
    attendance: 'الحضور والغياب',
    events: 'الفعاليات والأنشطة',
    announcements: 'الإعلانات والتعاميم',
    reports: 'التقارير الإدارية',
    analytics: 'التحليلات والمؤشرات',
    settings: 'الإعدادات العامة',
    notifications: 'الإشعارات والمنبهات',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج',
    
     // Roles
    'Super Admin': 'مسئول لجنة الموارد البشرية',
    'Leader': 'قائد لجنة (Leader)',
    'Member': 'عضو (Member)',
    'Vice': 'نائب رئيس اللجنة (Vice Head)',
    'Coordinator': 'منسق (Coordinator)',
    'Deputy Coordinator': 'نائب منسق (Deputy Coordinator)',
    'Central': 'المركزية (Central)',
    
    // Tasks Statuses
    'Draft': 'مسودة',
    'Published': 'منشورة',
    'Closed': 'مغلقة',
    
    // Task Priorities
    'Low': 'منخفضة',
    'Medium': 'متوسطة',
    'High': 'عالية',
    'Urgent': 'عاجلة جداً',

    // Submission Statuses
    'Pending': 'قيد المراجعة',
    'Accepted': 'مقبولة',
    'Rejected': 'مرفوضة',
    'Resubmission Requested': 'إعادة تسليم مطلوبة',

    // Status Badge Helpers
    status: 'الحالة',
    priority: 'الأولوية',
    deadline: 'الموعد النهائي',
    assignee: 'المستلم',
    createdBy: 'أنشئت بواسطة',
    actions: 'الإجراءات',
    
    // Landing Sections
    home: 'الرئيسية',
    aboutUs: 'من نحن',
    ourVision: 'رؤيتنا',
    ourMission: 'رسالتنا',
    achievements: 'الإنجازات',
    stats: 'الإحصائيات',
    upcomingEvents: 'الفعاليات القادمة',
    latestNews: 'آخر الأخبار',
    faq: 'الأسئلة الشائعة',
    contactUs: 'تواصل معنا',
    
    // Landing Page Content
    landingTitle: 'كيان EYE الرقمي',
    landingSubtitle: 'المنصة الرقمية الرسمية لإدارة لجان وأقسام EYE - نبتكر للمستقبل ونصنع القادة بالعمل المؤسسي الذكي والمنظم.',
    getStarted: 'ابدأ الآن',
    learnMore: 'اكتشف المزيد',
    aboutText: 'كيان EYE هو بيئة شبابية علمية تهدف لتطوير الكوادر والمهارات القيادية والتقنية عبر هيكل تنظيمي متكامل يشبه بيئة الشركات الاحترافية.',
    visionText: 'أن نكون المنصة والكيان الرائد وطنياً في تمكين الشباب تقنياً وإدارياً وفق أعلى معايير الجودة والعمل المؤسسي المستدام.',
    missionText: 'توفير بيئة تدريبية وتنظيمية تفاعلية تمكن الأعضاء من قيادة وتطوير المشاريع بكفاءة عالية، وتعزيز التميز الأكاديمي والمهاري.',
    
    // Common Actions
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    create: 'إنشاء جديد',
    add: 'إضافة',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    search: 'بحث بالاسم، الأولوية أو المستلم...',
    filter: 'تصفية',
    exportExcel: 'تصدير Excel',
    importExcel: 'استيراد من Excel',
    approve: 'اعتماد وموافقة',
    reject: 'رفض',
    promoteToLeader: 'ترقية إلى قائد',
    demoteToMember: 'تخفيض إلى عضو',
    addNote: 'إضافة ملاحظة',
    noData: 'لا توجد بيانات متاحة حالياً.',
    
    // Dashboard Stats
    totalMembers: 'إجمالي الأعضاء الكلي',
    activeTasks: 'المهام النشطة الآن',
    pendingApprovals: 'طلبات الانضمام المعلقة',
    completionRate: 'معدل إنجاز المهام',
    recentSubmissions: 'آخر التسليمات الواردة',
    activeCommittees: 'اللجان الفعالة',
    quickOverview: 'نظرة عامة على الأداء والمؤشرات العامة',

    // Specific Headers & Fields
    excelExportBtn: 'تصدير التقارير',
    excelImportBtn: 'تحديث البيانات',
    approveMember: 'تفعيل الحساب',
    rejectMember: 'تعطيل الحساب',
  },
  en: {
    // Brand & General
    brandName: 'EYE Hub',
    tagline: 'Integrated digital workflow management platform for EYE committees',
    switchLanguage: 'العربية',
    languageLabel: 'Language',
    arabic: 'Arabic',
    english: 'English',
    rtl: false,
    
    // Auth & Landing
    login: 'Sign In',
    register: 'Create New Account',
    forgotPassword: 'Forgot Password?',
    email: 'Email Address',
    password: 'Password',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    role: 'Position / Role',
    committee: 'Committee',
    department: 'Department',
    confirmPassword: 'Confirm Password',
    alreadyHaveAccount: 'Already have an account? Sign in',
    dontHaveAccount: "Don't have an account? Register now",
    backToHome: 'Back to home',
    registerSuccess: 'Your account was registered and activated successfully!',
    loginFailed: 'Login failed. Please check your credentials.',
    pendingApprovalMsg: 'Your account is pending activation by the HR Head.',
    
    // Sidebar
    dashboard: 'Dashboard',
    members: 'Members',
    leaders: 'Leaders',
    committees: 'Committees',
    departments: 'Departments',
    tasks: 'Tasks',
    taskTemplates: 'Task Templates',
    submissions: 'Submissions',
    attendance: 'Attendance',
    events: 'Events',
    announcements: 'Announcements',
    reports: 'Reports',
    analytics: 'Analytics',
    settings: 'Settings',
    notifications: 'Notifications',
    profile: 'Profile',
    logout: 'Log Out',
    
    // Roles
    'Super Admin': 'HR HEAD',
    'Leader': 'Committee Leader',
    'Member': 'Member',
    'Vice': 'Committee Vice Head',
    'Coordinator': 'Coordinator',
    'Deputy Coordinator': 'Deputy Coordinator',
    'Central': 'Central Official',
    
    // Tasks Statuses
    'Draft': 'Draft',
    'Published': 'Published',
    'Closed': 'Closed',
    
    // Task Priorities
    'Low': 'Low',
    'Medium': 'Medium',
    'High': 'High',
    'Urgent': 'Urgent',

    // Submission Statuses
    'Pending': 'Pending Review',
    'Accepted': 'Accepted',
    'Rejected': 'Rejected',
    'Resubmission Requested': 'Resubmission Requested',

    // Status Badge Helpers
    status: 'Status',
    priority: 'Priority',
    deadline: 'Deadline',
    assignee: 'Assignee',
    createdBy: 'Created By',
    actions: 'Actions',
    
    // Landing Sections
    home: 'Home',
    aboutUs: 'About Us',
    ourVision: 'Our Vision',
    ourMission: 'Our Mission',
    achievements: 'Achievements',
    stats: 'Statistics',
    upcomingEvents: 'Upcoming Events',
    latestNews: 'Latest News',
    faq: 'FAQ',
    contactUs: 'Contact Us',
    
    // Landing Page Content
    landingTitle: 'EYE Digital Hub',
    landingSubtitle: 'The official digital platform for managing EYE committees and departments - leading the future with organized and smart workflow.',
    getStarted: 'Get Started',
    learnMore: 'Learn More',
    aboutText: 'EYE is a scientific and youth community aiming to develop leaders and technical skills through an integrated corporate-like structure.',
    visionText: 'To be the leading national organization empowering youth in tech and management with highest quality and sustainable standards.',
    missionText: 'To provide a training and interactive workspace enabling members to manage projects efficiently while promoting academic and skill growth.',
    
    // Common Actions
    save: 'Save Changes',
    cancel: 'Cancel',
    create: 'Create New',
    add: 'Add',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search by title, priority, assignee...',
    filter: 'Filter',
    exportExcel: 'Export Excel',
    importExcel: 'Import Excel',
    approve: 'Approve',
    reject: 'Reject',
    promoteToLeader: 'Promote to Leader',
    demoteToMember: 'Demote to Member',
    addNote: 'Add Note',
    noData: 'No data available.',
    
    // Dashboard Stats
    totalMembers: 'Total Active Members',
    activeTasks: 'Active Tasks Now',
    pendingApprovals: 'Pending Approvals',
    completionRate: 'Task Completion Rate',
    recentSubmissions: 'Recent Submissions',
    activeCommittees: 'Active Committees',
    quickOverview: 'General performance overview and statistics',

    // Specific Headers & Fields
    excelExportBtn: 'Export Reports',
    excelImportBtn: 'Import/Update Data',
    approveMember: 'Approve & Activate',
    rejectMember: 'Reject & Disable',
  }
};

export const COMMITTEE_TRANSLATIONS: Record<Language, Record<string, string>> = {
  ar: {
    'HR': 'الموارد البشرية (HR)',
    'PR': 'العلاقات العامة (PR)',
    'SM': 'السوشيال ميديا وصناعة المحتوى (SM)',
    'OR': 'العلاقات التنظيمية واللوجستية (OR)',
    'None': 'الإدارة العليا',
    'All': 'جميع اللجان'
  },
  en: {
    'HR': 'Human Resources (HR)',
    'PR': 'Public Relations (PR)',
    'SM': 'Social Media & Content (SM)',
    'OR': 'Organizational & Logistics (OR)',
    'None': 'None / Executive',
    'All': 'All Committees'
  }
};

export const DEPARTMENT_TRANSLATIONS: Record<Language, Record<string, string>> = {
  ar: {
    'HRM': 'إدارة الموارد البشرية (HRM)',
    'HRS': 'لجنة الدعم والمساندة (HRS)',
    'HRIS': 'نظم معلومات الموارد البشرية (HRIS)',
    'HRD': 'التطوير والتدريب (HRD)',
    'EPR': 'العلاقات العامة الخارجية (EPR)',
    'IPR': 'العلاقات العامة الداخلية (IPR)',
    'FR': 'الفندرايزينج والرعايات (FR)',
    'CR': 'العلاقات الخارجية والشراكات (CR)',
    'IR': 'العلاقات والتواصل الداخلي (IR)',
    'Content': 'كتابة المحتوى وصناعته (Content)',
    'Content Writing': 'كتابة وصناعة المحتوى (Content Writing)',
    'Graphic Design': 'التصميم الجرافيكي والبصري (Graphic Design)',
    'Photography': 'التصوير الفني والتوثيق (Photography)',
    'Video Editing': 'المونتاج وصناعة الفيديو (Video Editing)',
    'Media Coverage': 'التغطية الإعلامية والميدانية (Media Coverage)',
    'VIP': 'إدارة كبار الشخصيات والبروتوكول (VIP)',
    'Protocol': 'البروتوكول والاستقبال (Protocol)',
    'Planning': 'التخطيط وإدارة الفعاليات (Planning)',
    'Event Management': 'إدارة وتنظيم الفعاليات (Event Management)',
    'Coordination': 'التنسيق والاتصال (Coordination)',
    'Logistics': 'الدعم اللوجستي والميداني (Logistics)',
    'HRM - HR OF PR': 'الموارد البشرية لـ لجنة العلاقات العامة (HR OF PR)',
    'HRM - HR OF SM': 'الموارد البشرية لـ لجنة السوشيال ميديا (HR OF SM)',
    'HRM - HR OF OR': 'الموارد البشرية لـ لجنة التنظيم (HR OF OR)',
    'HR OF PR': 'الموارد البشرية لـ لجنة العلاقات العامة (HR OF PR)',
    'HR OF SM': 'الموارد البشرية لـ لجنة السوشيال ميديا (HR OF SM)',
    'HR OF OR': 'الموارد البشرية لـ لجنة التنظيم (HR OF OR)',
    'Executive': 'المكتب التنفيذي والقيادة',
    'All': 'جميع الأقسام (اللجنة بالكامل)',
    'None': 'بدون قسم محدد / عام'
  },
  en: {
    'HRM': 'HR Management (HRM)',
    'HRS': 'Support Committee (HRS)',
    'HRIS': 'HR Information Systems (HRIS)',
    'HRD': 'HR Development (HRD)',
    'EPR': 'External PR (EPR)',
    'IPR': 'Internal PR (IPR)',
    'Content': 'Content Writing (Content)',
    'Graphic Design': 'Graphic Design',
    'Photography': 'Photography & Coverage',
    'Video Editing': 'Video Editing',
    'VIP': 'VIP Relations & Protocol',
    'Planning': 'Event Planning',
    'Coordination': 'Event Coordination',
    'Logistics': 'Logistics & Setup',
    'HRM - HR OF PR': 'HR for PR',
    'HRM - HR OF SM': 'HR for SM',
    'Executive': 'Executive Office',
    'All': 'All Departments (Entire Committee)',
    'None': 'General / None'
  }
};
