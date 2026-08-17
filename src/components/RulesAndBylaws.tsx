import React, { useState } from 'react';
import { UserProfile } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { 
  BookOpen, 
  Shield, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Lock, 
  Sparkles, 
  X, 
  Info,
  Download,
  FileCheck,
  Building,
  Users,
  PieChart,
  TrendingUp,
  Scale,
  ShieldAlert,
  FolderDown,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Layers,
  UserCheck,
  FileType
} from 'lucide-react';

interface RuleItem {
  id: string;
  title: string;
  category: 'general' | 'conduct' | 'points' | 'attendance' | 'discipline' | 'eval360' | 'bylaws85';
  badgeType: 'mandatory' | 'organizational' | 'advisory' | 'reward';
  summary: string;
  clauses: string[];
  updatedAt: string;
  updatedBy: string;
}

interface OfficialDocumentFile {
  id: string;
  title: string;
  titleEn: string;
  size: string;
  format: string;
  pages: number;
  description: string;
  version: string;
  type: 'unified_discipline' | 'volunteer_charter' | 'comprehensive_bylaws';
}

const OFFICIAL_FILES: OfficialDocumentFile[] = [
  {
    id: 'doc-1',
    title: 'الائحة الموحدة للتقييم والمتابعة والتدرج التأديبي 📜',
    titleEn: 'Unified Evaluation, Tracking & Disciplinary Bylaw 2026',
    size: '1.4 MB',
    format: 'PDF / Word (.docx)',
    pages: 6,
    description: 'الوثيقة الموحدة الشاملة لكافة قواعد التقييم الدوري 360°، لفت النظر، الإنذارات، والتدرج التأديبي لجميع المستويات والعضويات.',
    version: 'إصدار 2026 معتمد',
    type: 'unified_discipline'
  },
  {
    id: 'doc-2',
    title: 'ميثاق السلوك والالتزام للمتطوعين 🛡️',
    titleEn: 'Volunteer Code of Conduct & Commitment Charter',
    size: '1.1 MB',
    format: 'PDF / Word (.docx)',
    pages: 4,
    description: 'دليل الأفعال المنهي عنها، تصنيف المخالفات (خفيفة/متوسطة/جسيمة)، الخطوط الحمراء المستوجبة للاستبعاد، ونموذج إقرار المتطوع.',
    version: 'نسخة موائمة 2026',
    type: 'volunteer_charter'
  },
  {
    id: 'doc-3',
    title: 'اللائحة التنظيمية الشاملة وهيكل الصلاحيات (85 صفحة) 🏛️',
    titleEn: 'Comprehensive EYE Organizational Bylaws & Governance Framework',
    size: '5.8 MB',
    format: 'PDF / Word (.docx)',
    pages: 85,
    description: 'الدليل الهيكلي العام الكامل للكيان متضمناً الرؤية والرسالة، البنود الأساسية 1-8، الأحكام العامة 1-25، صلاحيات الإدارة العليا والـ 8 وحدات والمركز الإعلامي وغرفة العمليات.',
    version: 'النسخة الأصلية الكاملة 2026',
    type: 'comprehensive_bylaws'
  }
];

const DEFAULT_RULES: RuleItem[] = [
  {
    id: 'rule-eval-360',
    title: 'الائحة الموحدة للتقييم والمتابعة والتدرج التأديبي (إصدار 2026)',
    category: 'eval360',
    badgeType: 'mandatory',
    summary: 'الوثيقة الموحدة التي تجمع قواعد التقييم الدوري 360° ومستويات لفت النظر والإنذارات والاستبعاد لكافة الأعضاء بالمحافظات والإدارة المركزية.',
    clauses: [
      'الهدف: مرجع موحد يعرف منه كل عضو ومسؤول: ما المخالفة؟ وما الإجراء المتدرج المرتبط بها؟ وكيف يُحتسب التقييم؟ وكيف يُتظلم من القرار؟',
      'المبادئ الحاكمة: العدالة والحياد، الشفافية المطلقة، التدرج التأديبي، التوثيق الإداري المكتوب، سرية التحقيقات، وحق التظلم خلال 48 ساعة.',
      'سيادة اللائحة: القرار النهائي بالاستبعاد أو العزل يبقى دائماً للجهة المختصة (رئيس الكيان/لجنة الموارد البشرية المركزية)، ولا يجوز لأي مسؤول تنفيذ عزل من تلقاء نفسه.',
      'نطاق التطبيق: تسري هذه اللائحة على جميع مسؤولي اللجان والمنسقين والمستشارين والأعضاء بالمحافظات والإدارة المركزية دون استثناء.',
    ],
    updatedAt: '2026-01-01',
    updatedBy: 'رئيس الكيان ومسئول الموارد البشرية العليا',
  },
  {
    id: 'rule-charter-conduct',
    title: 'ميثاق السلوك والالتزام للمتطوعين والخطوط الحمراء',
    category: 'conduct',
    badgeType: 'mandatory',
    summary: 'تحديد الضوابط الأخلاقية والمخالفات الجسيمة التي تستوجب الاستبعاد الفوري المباشر دون انتظار استنفاد الإنذارات.',
    clauses: [
      'المخالفات الجسيمة (استبعاد فوري): الإساءة لسمعة الكيان أو رئيسه أو الوزارة، الاختالس أو الرشوة أو التزوير، جمع تبرعات بدون تصريح رسمي، إفشاء أسرار الكيان، استخدام بيانات المتطوعين لأغراض شخصية، الترويج لآراء سياسية/دينية متطرفة، وسوء استخدام الصلاحيات.',
      'المخالفات المتوسطة (إنذار رسمي): التغيب عن اجتماعين+ شهرياً بدون عذر، عدم تسليم مهمتين+ بدون عذر، التصرف الفردي بدون الرجوع للقيادة المختصة، إعطاء وعود/التزامات باسم الكيان لجهات خارجية، والتحدث للإعلام بدون تكليف رسمي.',
      'المخالفات الخفيفة (لفت نظر): التأخر المتكرر في الرد أو الحضور، الضعف البسيط في تنفيذ المهام، عدم الالتزام بالزي الرسمي (بنطلون أسود - قميص/بلوزة بيضاء - طرحة بيضاء).',
      'إقرار المتطوع: يُوقع كل عضو عند انضمامه إقراراً رسمياً بعلمه التام بكافة بنود الميثاق والتزامه الكامل بها طوال فترة انتسابه للكيان.',
    ],
    updatedAt: '2026-01-10',
    updatedBy: 'لجنة الموارد البشرية المركزية',
  },
  {
    id: 'rule-eval-weights',
    title: 'نظام التقييم الدوري الثلاثي الستيني (نموذج 360°)',
    category: 'points',
    badgeType: 'reward',
    summary: 'الأوزان النسبية الدقيقة المعتمدة لقياس الأداء الشهري للأعضاء والقيادات من 4 مصادر متكاملة.',
    clauses: [
      'المسؤول المباشر (40%): تنفيذ المهام والخطة الشهرية، الالتزام بالمواعيد، جودة العمل الميداني (السيشنز والتارجت داخل المحافظة)، واحترام التدرج الوظيفي.',
      'الإدارة المركزية (30%): حضور السيشنز المركزية، تقديم التاسكات المركزية، تسليم التقارير الشهرية الموثقة بالصور، وتصعيد الكوادر ومؤشرات الأداء.',
      'التقييم الذاتي (15%): تقييم العضو/المسؤول لنفسه: إنجازاته الشخصية، التزامه الذاتي، وخاطته للتطوير المستمر.',
      'تقييم فريق العمل (15%): تقييم الفريق التابع للمسؤول: مهارات القيادة، المشورة والأخذ برأي الجماعة، عدم الانفراد بالقرار، والتعاون الفعال.',
    ],
    updatedAt: '2026-02-01',
    updatedBy: 'إدارة التقييم والأداء المركزي',
  },
  {
    id: 'rule-discipline-ladder',
    title: 'عتبات النجاح وسُلم التدرج التأديبي الخماسي',
    category: 'discipline',
    badgeType: 'advisory',
    summary: 'تحديد درجات التقييم وتدرج العقوبات الإدارية من التنبيه الشفهي حتى إنهاء المشاركة.',
    clauses: [
      'عتبات التقدير: ممتاز (85%+ ترقية وشارة كفاءة) | جيد جداً (75%-84% أداء قوي) | مقبول (65%-74% حد النجاح) | تحت الملاحظة (55%-64% لفت نظر وخطة تحسين) | راسب (أقل من 55% إنذار رسمي).',
      'المرحلة 1 - لفت نظر شفهي: للمخالفة الخفيفة لأول مرة (تأخر أو غياب مرة واحدة) - تنبيه غير مسجل رسمياً.',
      'المرحلة 2 - لفت نظر رسمي (أقصى 2): تقصير واضح في المهام/السلوك أو أداء 55%-64% - يُسجل في الملف، ولفتان نظر يُعالان 1 إنذار.',
      'المرحلة 3 - إنذار رسمي (أقصى 3): تكرار التقصير، غياب اجتماعين+ أو عدم تسليم مهمتين+ شهرياً، أو أداء أقل من 55% - تحذير نهائي مسجل.',
      'المرحلة 4 - تجميد مؤقت: إنذاران في دورة/شهر واحد، أو مخالفة جسيمة، أو استمرار الأداء الضعيف - تعليق العضوية (أسبوع إلى شهر).',
      'المرحلة 5 - إنهاء المشاركة: الوصول إلى 3 إنذارات رسمية، أو مخالفة جسيمة، أو انخفاض التقييم الشهري عن 55% لثلاثة أشهر متتالية - خروج نهائي من الكيان.',
    ],
    updatedAt: '2026-02-15',
    updatedBy: 'مكتب رئيس الكيان ولجنة الانضباط',
  },
  {
    id: 'rule-bylaws-structure',
    title: 'اللائحة التنظيمية الشاملة والهيكل الإداري (85 صفحة)',
    category: 'bylaws85',
    badgeType: 'organizational',
    summary: 'الأحكام الهيكلية العامة الصادرة بتاريخ 2 سبتمبر 2023 بموافقة وزارة الشباب والرياضة برئاسة الأستاذ محمد متولي.',
    clauses: [
      'البنود الأساسية: وزارة الشباب والرياضة منوطة بجميع الاعتمادات، منسق المحافظة لا يتدخل في الشؤون المالية للسيشنز، تسليم أجندات وتقارير أسبوعية، واسترجاع أي فائض مالي.',
      'الهيكل الإداري والصلاحيات: رئيس الكيان، المكتب الفني، وحدة الرقابة والتدقيق، وحدة قياس الأداء والشغف، وحدة ضمان جودة العمليات، وحدة رصد المبادرات.',
      'هيكل المشاريع الشبابية الـ 8: وحدة البيئة، الطب النفسي، المرأة، الجامعات، الخدمة المجتمعية، السياحة والأثار، الأمن القومي، وريادة الأعمال.',
      'الوحدات المركزية الـ 6: الرصد والمتابعة والتطوير، السياسات، التدريبات، تنمية شباب الصعيد، انتقاء الكوادر الشبابية، والتسويق الهوية البصرية.',
      'اللجان النوعية ورؤسائها: لجنة الموارد البشرية (HR)، لجنة العلاقات العامة (PR)، لجنة التنظيم (OR)، لجنة السوشيال ميديا (SM)، المركز الإعلامي، وغرفة العمليات المركزية.',
    ],
    updatedAt: '2026-03-01',
    updatedBy: 'المكتب التنفيذي الأعلى',
  },
];

export const RulesAndBylaws: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';

  const [rules, setRules] = useState<RuleItem[]>(() => {
    try {
      const saved = localStorage.getItem('eye_rules_and_bylaws_v2');
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(DEFAULT_RULES[0].id);

  // Document Reader Modal State
  const [selectedDocFile, setSelectedDocFile] = useState<OfficialDocumentFile | null>(null);

  // Modal State for Adding/Editing Rules
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<RuleItem['category']>('general');
  const [formBadgeType, setFormBadgeType] = useState<RuleItem['badgeType']>('mandatory');
  const [formSummary, setFormSummary] = useState('');
  const [formClausesText, setFormClausesText] = useState('');

  const isAdminOrLeader = ['Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Leader'].includes(currentUser.role);

  const saveRulesToStorage = (updated: RuleItem[]) => {
    setRules(updated);
    try {
      localStorage.setItem('eye_rules_and_bylaws_v2', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save rules to localStorage', e);
    }
  };

  const handleOpenAddModal = () => {
    setEditingRule(null);
    setFormTitle('');
    setFormCategory('general');
    setFormBadgeType('mandatory');
    setFormSummary('');
    setFormClausesText('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: RuleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRule(rule);
    setFormTitle(rule.title);
    setFormCategory(rule.category);
    setFormBadgeType(rule.badgeType);
    setFormSummary(rule.summary);
    setFormClausesText(rule.clauses.join('\n'));
    setIsModalOpen(true);
  };

  const handleDeleteRule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(isAr ? 'هل أنت متأكد من حذف هذه اللائحة؟' : 'Are you sure you want to delete this rule?')) {
      const updated = rules.filter(r => r.id !== id);
      saveRulesToStorage(updated);
    }
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const clausesArray = formClausesText
      .split('\n')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const nowStr = new Date().toISOString().split('T')[0];

    if (editingRule) {
      const updated = rules.map(r => r.id === editingRule.id ? {
        ...r,
        title: formTitle.trim(),
        category: formCategory,
        badgeType: formBadgeType,
        summary: formSummary.trim(),
        clauses: clausesArray.length > 0 ? clausesArray : [formSummary.trim()],
        updatedAt: nowStr,
        updatedBy: currentUser.fullName,
      } : r);
      saveRulesToStorage(updated);
    } else {
      const newRule: RuleItem = {
        id: 'rule-' + Date.now(),
        title: formTitle.trim(),
        category: formCategory,
        badgeType: formBadgeType,
        summary: formSummary.trim(),
        clauses: clausesArray.length > 0 ? clausesArray : [formSummary.trim()],
        updatedAt: nowStr,
        updatedBy: currentUser.fullName,
      };
      saveRulesToStorage([newRule, ...rules]);
    }

    setIsModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenPDFDocument = (doc: OfficialDocumentFile) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(isAr ? 'يرجى السماح بالنوافذ المنبثقة لفتح وتنزيل وثيقة الـ PDF' : 'Please allow popups to view/download PDF');
      return;
    }

    let bodyContent = '';
    if (doc.type === 'unified_discipline') {
      bodyContent = `
        <div class="pdf-header text-center">
          <h1 style="color: #0284c7; font-size: 24px; font-weight: 900; margin-bottom: 5px;">كيان المصريون الشباب</h1>
          <div style="font-size: 14px; font-weight: 800;">وزارة الشباب والرياضة — الإدارة المركزية — لجنة الموارد البشرية العليا</div>
          <h2 style="font-size: 20px; font-weight: 900; border-bottom: 2px solid #000; padding-bottom: 8px; margin-top: 15px;">
            الائحة الموحدة للتقييم والمتابعة والتدرج التأديبي (إصدار 2026)
          </h2>
          <div style="font-size: 13px; font-weight: 700; color: #0284c7; margin-top: 5px;">#معا_نحو_مستقبل_أفضل</div>
        </div>

        <div style="font-size: 13px; line-height: 1.9; margin-top: 25px; text-align: justify;">
          <p><b>تمهيد:</b> تجمع هذه اللائحة كل قواعد التقييم ولفت النظر والإنذارات والاستبعاد في وثيقة واحدة موحدة تسري على جميع أعضاء ومسؤولي الكيان بلا استثناء. <b>الهدف:</b> مرجع واحد واضح يعرف منه كل مسؤول: ما المخالفة؟ وما الإجراء المتدرج المرتبط بها؟ وكيف يُحتسب التقييم؟ وكيف يُتظلم من القرار؟</p>

          <h3 style="font-size: 16px; font-weight: 900; color: #0f172a; border-right: 4px solid #0284c7; padding-right: 8px;">الباب الأول — الغرض والمبادئ العامة</h3>
          <p>العدالة والحياد | الشفافية | التدرج | التوثيق الإداري | السرية | حق التظلم خلال 48 ساعة | سيادة اللائحة.</p>

          <h3 style="font-size: 16px; font-weight: 900; color: #0f172a; border-right: 4px solid #0284c7; padding-right: 8px;">الباب الثالث — نظام التقييم (نموذج 360°)</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: right;">
                <th style="border: 1px solid #cbd5e1; padding: 8px;">مصدر التقييم</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">الوزن</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">ماذا يقيس</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">المسؤول المباشر</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">40%</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">تنفيذ المهام، الخطة الشهرية، الالتزام بالمواعيد، جودة العمل الميداني</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">الإدارة المركزية</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">30%</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">حضور السيشنز المركزية، تقديم التاسكات، تسليم التقارير الموثقة بالصور</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">التقييم الذاتي</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">15%</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">تقييم المسؤول لنفسه: إنجازاته، التزامه، وخاطته للتطوير</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">تقييم فريق العمل</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">15%</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">القيادة، المشورة وعدم الانفراد بالقرار، التعاون والتواصل</td>
              </tr>
            </tbody>
          </table>

          <h3 style="font-size: 16px; font-weight: 900; color: #0f172a; border-right: 4px solid #0284c7; padding-right: 8px;">الباب الرابع والخامس — عتبات النجاح وسُلم التدرج التأديبي</h3>
          <p>1. <b>لفت نظر شفهي:</b> تنبيه غير مسجل للمخالفة الخفيفة لأول مرة.</p>
          <p>2. <b>لفت نظر رسمي (أقصى 2):</b> يُسجل في الملف. لفتان نظر خلال دورة واحدة = إنذار.</p>
          <p>3. <b>إنذار رسمي (أقصى 3):</b> تكرار التقصير، غياب اجتماعين+ شهرياً أو أداء أقل من 55%.</p>
          <p>4. <b>تجميد مؤقت:</b> تعليق العضوية (أسبوع إلى شهر) عند إنذارين أو مخالفة جسيمة.</p>
          <p>5. <b>إنهاء المشاركة:</b> الوصول إلى 3 إنذارات رسمية أو انخفاض التقييم عن 55% لثلاثة أشهر متتالية.</p>

          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #000; padding-top: 15px;">
            <div>مسؤول لجنة الموارد البشرية: أ. أحمد إبراهيم</div>
            <div>رئيس الكيان: أ. محمد متولي</div>
          </div>
        </div>
      `;
    } else if (doc.type === 'volunteer_charter') {
      bodyContent = `
        <div class="pdf-header text-center">
          <h1 style="color: #0284c7; font-size: 24px; font-weight: 900; margin-bottom: 5px;">كيان المصريون الشباب</h1>
          <div style="font-size: 14px; font-weight: 800;">وزارة الشباب والرياضة — الإدارة المركزية — لجنة الموارد البشرية المركزية</div>
          <h2 style="font-size: 20px; font-weight: 900; border-bottom: 2px solid #000; padding-bottom: 8px; margin-top: 15px; color: #dc2626;">
            ميثاق السلوك والالتزام للمتطوعين (الأمور المنهي عنها والتدّرج التأديبي)
          </h2>
          <div style="font-size: 13px; font-weight: 700; color: #0284c7; margin-top: 5px;">#معا_نحو_مستقبل_أفضل</div>
        </div>

        <div style="font-size: 13px; line-height: 1.9; margin-top: 25px; text-align: justify;">
          <h3 style="font-size: 16px; font-weight: 900; color: #dc2626;">أولاً: مخالفات جسيمة — استبعاد فوري (من غير استنفاد الإنذارات)</h3>
          <ul style="color: #991b1b; font-weight: bold;">
            <li>الإساءة لصورة الكيان أو رئيسه أو أحد الزملاء أو المساس بسمعة الكيان أو وزارة الشباب والرياضة.</li>
            <li>الاختلاس في أموال الكيان أو تصرف مالي غير مصرح به أو الرشوة أو التزوير.</li>
            <li>جمع تبرعات بدون تصريح رسمي وقنوات معتمدة.</li>
            <li>إفشاء أسرار الكيان أو تسريب أوراق أو بيانات داخلية خارج الكيان.</li>
            <li>استخدام بيانات المتطوعين أو المستفيدين لأغراض شخصية.</li>
            <li>الترويج لآراء سياسية أو دينية متطرفة أو تكوين أحزاب داخل الكيان.</li>
          </ul>

          <h3 style="font-size: 16px; font-weight: 900; color: #d97706;">ثانياً: مخالفات متوسطة — إنذار رسمي (التكرار يصعد للتجميد ثم الاستبعاد)</h3>
          <ul>
            <li>التغيب عن اجتماعين أو أكثر شهرياً، أو عدم تسليم مهمتين بدون عذر.</li>
            <li>التصرف الفردي في مهمة رسمية أو تنظيم فعالية بدون الرجوع للقيادة.</li>
            <li>التحدث للإعلام أو الجهات الرسمية باسم الكيان بدون تكليف واضح.</li>
          </ul>

          <div style="margin-top: 35px; border: 2px solid #000; padding: 15px; background-color: #f8fafc;">
            <h4 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 900; text-align: center;">إقرار والتزام المتطوع</h4>
            <p style="margin: 0; font-size: 13px; font-weight: bold;">أقر أنا .................................... بأنني اطلعت على ميثاق السلوك والالتزام الخاص بكيان المصريون الشباب وفهمت البنود والإجراءات وألتزم بها طوال فترة انتسابي.</p>
            <div style="margin-top: 20px; display: flex; justify-content: space-between; font-weight: bold;">
              <div>الاسم: ..............................</div>
              <div>اللجنة/المحافظة: ..............................</div>
              <div>التاريخ: ..............................</div>
            </div>
          </div>
        </div>
      `;
    } else {
      bodyContent = `
        <div class="pdf-header text-center">
          <h1 style="color: #0284c7; font-size: 24px; font-weight: 900; margin-bottom: 5px;">المصريون الشباب – وزارة الشباب والرياضة</h1>
          <h2 style="font-size: 20px; font-weight: 900; border-bottom: 2px solid #000; padding-bottom: 8px; margin-top: 15px;">
            اللائحة التنظيمية الشاملة وهيكل الصلاحيات (85 صفحة)
          </h2>
          <div style="font-size: 13px; font-weight: 700; color: #0284c7; margin-top: 5px;">#معا_نحو_مستقبل_أفضل</div>
        </div>

        <div style="font-size: 13px; line-height: 1.9; margin-top: 25px; text-align: justify;">
          <p><b>نبذة عن الكيان:</b> تم إطلاق الكيان في 2 سبتمبر 2023 بمبادرة وجهد مخلص من مؤسسه داخل الوزارة الأستاذ محمد متولي، بهدف إنشاء مظلة تنظيمية تجمع الطاقات الشبابية بالمحافظات وتتماشى مع رؤية مصر 2030.</p>

          <h3 style="font-size: 15px; font-weight: 900; color: #0f172a;">فهرس الأبواب الرئيسية للائحة:</h3>
          <ul>
            <li><b>الباب الأول:</b> التعريف بالكيان، البنود الأساسية 1-8، الأحكام والأعراف العامة 1-25.</li>
            <li><b>الباب الثاني:</b> الضوابط العامة لمسؤولي المحافظات، الهيكل التنظيمي والصلاحيات.</li>
            <li><b>الباب الثالث:</b> لائحة اللجان وصلاحياتها (السوشيال ميديا، العلاقات العامة، الموارد البشرية، التنظيم، المركز الإعلامي، غرفة العمليات).</li>
            <li><b>الباب الرابع:</b> العضويات، الحقوق والواجبات، والالتزام التنظيمي.</li>
          </ul>
        </div>
      `;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${doc.title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Cairo', sans-serif; direction: rtl; text-align: right; color: #000; background: #fff; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .text-center { text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${bodyContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
  };

  const handleDownloadDocWord = (doc: OfficialDocumentFile) => {
    const titleText = doc.title;
    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40' dir='rtl'>
      <head>
        <meta charset='utf-8'>
        <title>${titleText}</title>
        <style>
          body { font-family: 'Segoe UI', 'Arial', sans-serif; direction: rtl; text-align: right; margin: 30px; color: #000; }
          .h1 { font-size: 22pt; font-weight: bold; color: #0284c7; text-align: center; border-bottom: 2pt solid #000; padding-bottom: 10px; }
          .meta { font-size: 11pt; color: #475569; text-align: center; margin-bottom: 25px; }
          .section { margin-top: 20px; font-size: 12pt; line-height: 1.8; }
          .box { border: 1pt dashed #dc2626; background: #fff5f5; padding: 15px; margin: 20px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="h1">${doc.title}</div>
        <div class="meta">وزارة الشباب والرياضة — كيان المصريون الشباب | ${doc.version} (${doc.pages} صفحة)</div>
        <div class="section">
          <p><b>وصف الوثيقة الرسمية:</b> ${doc.description}</p>
          <div class="box">
            تنبيه إداري: هذه النسخة المعتمدة والمحفوظة ضمن السجلات الرسمية لكيان المصريون الشباب برئاسة الأستاذ محمد متولي ومسئولي لجنة الموارد البشرية العليا.
          </div>
          <h3>أبرز بنود الوثيقة:</h3>
          <ul>
            ${DEFAULT_RULES.map(r => `<li><b>${r.title}:</b> ${r.summary}</li>`).join('')}
          </ul>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title.replace(/[^a-zA-Z0-9أ-ي]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredRules = rules.filter(r => {
    const matchesCat = selectedCategory === 'all' || r.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      r.title.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.clauses.some(c => c.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  const getBadgeStyle = (badge: RuleItem['badgeType']) => {
    switch (badge) {
      case 'mandatory':
        return { label: isAr ? 'إلزامي ⚠️' : 'Mandatory ⚠️', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'organizational':
        return { label: isAr ? 'تنظيمي ⚙️' : 'Organizational ⚙️', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
      case 'reward':
        return { label: isAr ? 'مكافآت 🏆' : 'Rewards 🏆', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'advisory':
      default:
        return { label: isAr ? 'إرشادي 💡' : 'Advisory 💡', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isAr ? 'الدليل التنظيمي الرسمي الموحد 2026' : 'Official Bylaws Directory 2026'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <span>{isAr ? 'اللوائح والقوانين وإرشادات العمل 📜' : 'Rules, Regulations & Bylaws 📜'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/80 font-medium max-w-3xl leading-relaxed">
            {isAr
              ? 'المرجع الرسمي العام للائحة التقييم الموحدة 360°، سُلم التدرج التأديبي، ميثاق السلوك والالتزام للمتطوعين، واللائحة الهيكلية الشاملة (85 صفحة) لكيان المصريون الشباب - وزارة الشباب والرياضة.'
              : 'Official reference for EYE entity evaluation bylaws 360°, volunteer charter, and comprehensive governance structure.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة / التصدير' : 'Print / Export'}</span>
          </button>

          {isAdminOrLeader && (
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black transition-all shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة بند جديد' : 'Add New Rule'}</span>
            </button>
          )}
        </div>
      </div>

      {/* QUICK HIGHLIGHT CARDS FOR CORE BYLAWS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 360 Evaluation Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
              <PieChart className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full uppercase">
              360° Weighting
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {isAr ? 'نظام التقييم الدوري 360°' : '360° Evaluation System'}
          </h3>
          <ul className="text-xs text-slate-600 dark:text-slate-300 font-medium space-y-1.5 list-disc list-inside">
            <li><b>40%</b> المسؤول المباشر (العمل الميداني)</li>
            <li><b>30%</b> الإدارة المركزية (السيشنز والتاسكات)</li>
            <li><b>15%</b> التقييم الذاتي للعضو</li>
            <li><b>15%</b> تقييم فريق العمل والتفاعل</li>
          </ul>
        </div>

        {/* Disciplinary Progression Ladder */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-full uppercase">
              5 Steps Ladder
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {isAr ? 'سُلم التدرج التأديبي' : 'Disciplinary Ladder'}
          </h3>
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 1. لفت نظر شفهي (تنبيه)</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 2. لفت نظر رسمي (أقصى 2)</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 3. إنذار رسمي (أقصى 3)</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500"></span> 4. تجميد مؤقت (أسبوع - شهر)</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-700"></span> 5. إنهاء المشاركة رسمياً</div>
          </div>
        </div>

        {/* Red Line Violations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full uppercase">
              Immediate Dismissal
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {isAr ? 'مخالفات الخطوط الحمراء' : 'Red Line Violations'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            {isAr 
              ? 'توجب الاستبعاد الفوري دون إنذارات: الإساءة لسمعة الكيان، الاختلاس، إفشاء الأسرار، جمع تبرعات بدون تصريح، والترويج لأفكار متطرفة.' 
              : 'Direct dismissal for severe misconduct, fundraising without approval, and leaking internal documents.'}
          </p>
        </div>
      </div>

      {/* Controls Bar: Search & Category Filter */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full lg:w-auto">
          {[
            { id: 'all', label: isAr ? 'كل اللوائح' : 'All Rules' },
            { id: 'eval360', label: isAr ? 'لائحة التقييم 360°' : '360 Evaluation' },
            { id: 'conduct', label: isAr ? 'ميثاق السلوك' : 'Code of Conduct' },
            { id: 'discipline', label: isAr ? 'سُلم الجزاءات' : 'Disciplinary Ladder' },
            { id: 'bylaws85', label: isAr ? 'اللائحة الهيكلية (85 صفحة)' : '85 Page Bylaws' },
            { id: 'points', label: isAr ? 'النقاط والدرجات' : 'Points' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث في اللوائح والبنود...' : 'Search bylaws...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 font-bold focus:outline-none focus:border-blue-500"
          />
          <Search className="absolute end-3.5 top-3 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Rules List Accordion */}
      <div className="space-y-4">
        {filteredRules.map(rule => {
          const isExpanded = expandedRuleId === rule.id;
          const badgeStyle = getBadgeStyle(rule.badgeType);

          return (
            <div
              key={rule.id}
              className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-300 overflow-hidden ${
                isExpanded
                  ? 'border-blue-500/40 shadow-lg ring-1 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              {/* Accordion Header */}
              <div
                onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    rule.badgeType === 'mandatory'
                      ? 'bg-rose-500/10 text-rose-500'
                      : rule.badgeType === 'reward'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    <Shield className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${badgeStyle.bg}`}>
                        {badgeStyle.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {rule.updatedAt}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-base font-black text-slate-900 dark:text-white leading-snug break-words">
                      {rule.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isAdminOrLeader && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => handleOpenEditModal(rule, e)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={isAr ? 'تعديل اللائحة' : 'Edit Rule'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => handleDeleteRule(rule.id, e)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={isAr ? 'حذف اللائحة' : 'Delete Rule'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="px-5 pb-6 pt-2 sm:px-6 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {rule.summary}
                  </p>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      {isAr ? 'بنود وضوابط اللائحة التفصيلية:' : 'Detailed Clauses:'}
                    </h4>
                    <div className="space-y-2">
                      {rule.clauses.map((clause, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
                            {clause}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800">
                    <span>{isAr ? `تاريخ الاعتماد: ${rule.updatedAt}` : `Updated: ${rule.updatedAt}`}</span>
                    <span>{isAr ? `جهة الاعتماد: ${rule.updatedBy}` : `Authority: ${rule.updatedBy}`}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* SECTION AT THE END: OFFICIAL FILES & DOCUMENTS DOWNLOAD AREA */}
      {/* ============================================================ */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 rounded-3xl text-white shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest">
              <FolderDown className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'الأرشيف الرقمي للوثائق الرسمية' : 'Official Documents Digital Archive'}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black">
              {isAr ? 'الملفات والوثائق الرسمية المعتمَدة 📁' : 'Approved Official Files & Documents 📁'}
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              {isAr ? 'عرض وتنزيل النسخ الأصلية المعتمدة بصيغة PDF وطباعتها مباشرة أو تحميل ملف وورد Word.' : 'View and download official approved PDF and Word copies of entity bylaws.'}
            </p>
          </div>
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {OFFICIAL_FILES.map(file => (
            <div
              key={file.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                    <FileType className="w-3 h-3" />
                    <span>PDF / Word</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{file.size} • {file.pages} صفحة</span>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 transition-colors">
                  {file.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {file.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {/* PRIMARY PDF DOWNLOAD / VIEW BUTTON */}
                <button
                  onClick={() => handleOpenPDFDocument(file)}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-500/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'تنزيل/عرض وثيقة PDF رسمية 📄' : 'View / Download PDF'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedDocFile(file)}
                    className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isAr ? 'قراءة متصفح' : 'Read'}</span>
                  </button>

                  <button
                    onClick={() => handleDownloadDocWord(file)}
                    className="py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isAr ? 'وورد Word' : 'Word'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DOCUMENT READER PREVIEW MODAL */}
      {selectedDocFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedDocFile.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {selectedDocFile.version} • {selectedDocFile.pages} صفحة رسمية
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDocFile(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Full Text Content */}
            <div className="space-y-4 overflow-y-auto pr-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2">
                <Info className="w-5 h-5 shrink-0" />
                <span>هذه هي النسخة النصية الكاملة المعتمدة رسمياً من اللائحة المسجلة لدى مكتب الإدارة العليا ولجنة الموارد البشرية.</span>
              </div>

              {selectedDocFile.type === 'unified_discipline' ? (
                <div className="space-y-4 font-medium">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white border-b pb-2">
                    الباب الأول والثاني: الغرض والمبادئ العامة ونطاق التطبيق
                  </h4>
                  <p>تمهيد: تجمع هذه اللائحة كل قواعد التقييم ولفت النظر والإنذارات والاستبعاد في وثيقة واحدة موحدة تسري على جميع أعضاء ومسؤولي الكيان بلا استثناء. الهدف: مرجع واحد واضح يعرف منه كل مسؤول: ما المخالفة؟ وما الإجراء المتدرج المرتبط بها؟ وكيف يُحتسب التقييم؟ وكيف يُتظلم من القرار؟</p>
                  
                  <h4 className="text-sm font-black text-slate-900 dark:text-white border-b pb-2">
                    الباب الثالث: نظام التقييم الثلاثي الستيني (نموذج 360°)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 font-bold">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">1. المسؤول المباشر: 40% (تنفيذ المهام، الالتزام بالمواعيد، جودة العمل الميداني)</div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">2. الإدارة المركزية: 30% (حضور السيشنز المركزية، تسليم التاسكات)</div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">3. التقييم الذاتي: 15% (تقييم العضو لنفسه وإنجازاته)</div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">4. تقييم فريق العمل: 15% (القيادة والتعاون وعدم الانفراد)</div>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 dark:text-white border-b pb-2">
                    الباب الرابع والخامس: عتبات النجاح وسُلم التدرج التأديبي
                  </h4>
                  <p>• ممتاز (85%+): مؤهل لشارة الكفاءة والترقية وتصعيد الكادر.</p>
                  <p>• جيد جداً (75%-84%): أداء قوي مستقر.</p>
                  <p>• مقبول (65%-74%): اجتياز التقييم.</p>
                  <p>• تحت الملاحظة (55%-64%): يُوجه لفت نظر رسمي وخطة تحسين.</p>
                  <p>• راسب (أقل من 55%): يُوجه إنذار رسمي وتكراره يُصعد للتجميد أو الاستبعاد.</p>
                </div>
              ) : selectedDocFile.type === 'volunteer_charter' ? (
                <div className="space-y-4 font-medium">
                  <h4 className="text-sm font-black text-rose-600 border-b pb-2">
                    أولاً: مخالفات جسيمة — استبعاد فوري (من غير استنفاد الإنذارات)
                  </h4>
                  <p>• الإساءة لصورة الكيان أو رئيسه أو أحد الزملاء، أو المساس بسمعة الكيان أو وزارة الشباب والرياضة.</p>
                  <p>• الاختلاس في أموال الكيان أو أي تصرف مالي غير مصرح به، أو الرشوة أو التزوير.</p>
                  <p>• جمع تبرعات أو أموال باسم الكيان بدون تصريح رسمي وقنوات معتمدة.</p>
                  <p>• إفشاء أسرار الكيان أو تسريب أي معلومة أو بيانات داخلية.</p>

                  <h4 className="text-sm font-black text-amber-600 border-b pb-2">
                    ثانياً: مخالفات متوسطة — إنذار رسمي (التكرار يصعد للتجميد ثم الاستبعاد)
                  </h4>
                  <p>• التغيب عن اجتماعين أو أكثر شهرياً، أو عدم تسليم مهمتين أو أكثر بدون عذر.</p>
                  <p>• التصرف الفردي في أي مهمة رسمية بدون الرجوع للقيادة المختصة.</p>
                  <p>• التحدث للإعلام أو الجهات الرسمية باسم الكيان بدون تكليف واضح.</p>
                </div>
              ) : (
                <div className="space-y-4 font-medium">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white border-b pb-2">
                    الملخص التنفيذي للائحة التنظيمية الشاملة (85 صفحة)
                  </h4>
                  <p>تاريخ الإنطلاق المعتمد: 2 سبتمبر 2023 بمبادرة وجهد مخلص من مؤسسه داخل الوزارة الأستاذ محمد متولي.</p>
                  <p>تتكون اللائحة من 3 أبواب رئيسية تشمل البنود الأساسية 1-8، الأحكام والأعراف العامة 1-25، الهيكل التنظيمي لمساعدي المحافظات واللجان العليا، صلاحيات رئيس الكيان، المكتب الفني، الـ 8 وحدات الشبابية، والـ 6 وحدات المركزية.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedDocFile(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-500"
              >
                إغلاق
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadDocWord(selectedDocFile)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل وورد Word</span>
                </button>

                <button
                  onClick={() => handleOpenPDFDocument(selectedDocFile)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>تنزيل / عرض وثيقة PDF رسمية 📄</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT RULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                <span>{editingRule ? (isAr ? 'تعديل بند لائحة' : 'Edit Rule') : (isAr ? 'إضافة بند لائحة جديد' : 'Add Rule')}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block mb-1 text-slate-700 dark:text-slate-300">{isAr ? 'عنوان البند / اللائحة *' : 'Title *'}</label>
                <input
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder={isAr ? 'عنوان اللائحة...' : 'Rule title...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-700 dark:text-slate-300">{isAr ? 'الفئة' : 'Category'}</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="general">{isAr ? 'لوائح عامة' : 'General'}</option>
                    <option value="eval360">{isAr ? 'لائحة التقييم 360°' : '360 Eval'}</option>
                    <option value="conduct">{isAr ? 'السلوك والالتزام' : 'Conduct'}</option>
                    <option value="discipline">{isAr ? 'سُلم الجزاءات' : 'Discipline'}</option>
                    <option value="bylaws85">{isAr ? 'اللائحة الهيكلية (85 صفحة)' : '85 Page Bylaws'}</option>
                    <option value="points">{isAr ? 'النقاط والتقييم' : 'Points'}</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-slate-700 dark:text-slate-300">{isAr ? 'نوع الشارة' : 'Badge'}</label>
                  <select
                    value={formBadgeType}
                    onChange={e => setFormBadgeType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="mandatory">{isAr ? 'إلزامي ⚠️' : 'Mandatory'}</option>
                    <option value="organizational">{isAr ? 'تنظيمي ⚙️' : 'Organizational'}</option>
                    <option value="advisory">{isAr ? 'إرشادي 💡' : 'Advisory'}</option>
                    <option value="reward">{isAr ? 'مكافآت 🏆' : 'Reward'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-700 dark:text-slate-300">{isAr ? 'الملخص العام' : 'Summary'}</label>
                <textarea
                  rows={2}
                  value={formSummary}
                  onChange={e => setFormSummary(e.target.value)}
                  placeholder={isAr ? 'ملخص موجز للبند...' : 'Rule summary...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium resize-none"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-700 dark:text-slate-300">{isAr ? 'البنود التفصيلية (كل سطر بند مستقل)' : 'Clauses (One per line)'}</label>
                <textarea
                  rows={4}
                  value={formClausesText}
                  onChange={e => setFormClausesText(e.target.value)}
                  placeholder={isAr ? 'البند الأول...\nالبند الثاني...' : 'Clause 1...\nClause 2...'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border rounded-xl text-xs font-bold text-slate-500">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20">{isAr ? 'حفظ البند' : 'Save Rule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
