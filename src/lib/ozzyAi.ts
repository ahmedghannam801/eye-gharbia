import { GoogleGenAI } from '@google/genai';
import { UserProfile } from '../types';
import { db } from '../db/localDb';
import { getEffectiveCommittee, isHRM, filterMembersByPermission } from './permissions';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ozy';
  text: string;
  timestamp: string;
  mascotImage?: string;
}

export const APPROVED_OZY_IMAGES = [
  { id: '1', name: 'Ozy Standard Mascot', path: '/mascot-profile.png' },
  { id: '2', name: 'Ozy Thinking Mascot', path: '/mascot-thinking.png' },
  { id: '3', name: 'EYE Workflow Emblem', path: '/eye-logo-transparent.png' },
] as const;

export function getOzyConfig(): { name: string; avatarUrl: string } {
  const name = localStorage.getItem('eye_ozy_name') || 'Ozy';
  const avatarUrl = localStorage.getItem('eye_ozy_avatar') || '/mascot-profile.png';
  return { name, avatarUrl };
}

export function updateOzyAvatar(
  imagePath: string,
  currentUser: UserProfile
): { success: boolean; message: string; newPath?: string } {
  const valid = APPROVED_OZY_IMAGES.find(img => img.path === imagePath || img.id === imagePath);
  if (!valid) {
    return {
      success: false,
      message: 'الصورة المحددة غير موجودة في قائمة الصور المعتمدة للمساعد.',
    };
  }
  localStorage.setItem('eye_ozy_avatar', valid.path);
  db.logActivity(
    currentUser.id,
    currentUser.fullName,
    currentUser.role,
    'Assistant Avatar Update',
    `Updated Ozy assistant avatar to ${valid.name} (${valid.path}).`
  );
  return {
    success: true,
    message: `تم تحديث صورة المساعد الذكي بنجاح إلى: **${valid.name}**!`,
    newPath: valid.path,
  };
}

export function updateOzyName(
  newName: string,
  currentUser: UserProfile
): { success: boolean; message: string; newName?: string } {
  const sanitized = newName.trim().replace(/<[^>]*>?/gm, '');
  if (sanitized.length < 2 || sanitized.length > 30) {
    return {
      success: false,
      message: 'يجب أن يكون اسم المساعد الذكي بين 2 و 30 حرفاً.',
    };
  }
  localStorage.setItem('eye_ozy_name', sanitized);
  db.logActivity(
    currentUser.id,
    currentUser.fullName,
    currentUser.role,
    'Assistant Name Update',
    `Updated Ozy assistant name to "${sanitized}".`
  );
  return {
    success: true,
    message: `تم تحديث اسم المساعد المعروض بنجاح إلى: **${sanitized}**!`,
    newName: sanitized,
  };
}

/**
 * EYE ORGANIZATION & PLATFORM KNOWLEDGE BASE SYSTEM PROMPT
 */
export function buildEyeKnowledgeBasePrompt(currentUser: UserProfile): string {
  const isHrmUser = isHRM(currentUser);
  const userCommittee = getEffectiveCommittee(currentUser);
  const config = getOzyConfig();

  const allUsers = db.getUsers(currentUser);
  const accessibleMembers = filterMembersByPermission(currentUser, allUsers);
  const tasks = db.getTasks().filter(t => isHrmUser || t.committee === userCommittee || t.committee === 'All');
  const openTasks = tasks.filter(t => t.status === 'Published');
  const submissions = db.getSubmissions().filter(s => isHrmUser || s.committee === userCommittee);
  const announcements = db.getAnnouncements().filter(a => isHrmUser || a.committee === userCommittee || a.committee === 'All');
  const evaluations = db.getPerformance(currentUser);
  const streak = db.getUserStreakData(currentUser.id);

  return `
أنت ${config.name} (أوزي)، الخبير الذكي والمساعد التنفيذي الرسمي المخصص لإدارة ورعاية كيان EYE (EYE Workflow Hub).
شخصيتك: مستشار ذكي، ودود، محترف، متحدث باللغة العربية والإنجليزية، ذو معرفة دقيقة ومكتملة بكل ما يخص كيان EYE ومنصته الرقمية.

🏛️ الهيكل التنظيمي لكيان EYE:
1. اللجان الرئيسية:
   - HR (الموارد البشرية - Human Resources)
   - PR (العلاقات العامة - Public Relations)
   - SM (وسائل التواصل الاجتماعي - Social Media)
   - OR (التنظيم واللوجستيات - Organization & Logistics)
   - Media (الإعلام والإنتاج)
2. الأقسام التخصصية:
   - HR: HRM (إدارة HR العامة), HRM - HR OF PR, HRM - HR OF SM, HRM - HR OF OR, HRS (الدعم والخدمات), HRIS (نظم المعلومات), HRD (التطوير والتأهيل).
   - PR: EPR (العلاقات الخارجية), IPR (العلاقات الداخلية).
   - SM: Content (كتابة المحتوى), Graphic Design (التصميم), Photography (التصوير), Video Editing (المونتاج).
   - OR: VIP (استقبال كبار الشخصيات), Planning (التخطيط), Coordination (التنسيق), Logistics (الدعم اللوجستي).

💻 أنظمة ووظائف المنصة (EYE Workflow Hub):
1. نظام إدارة المهام (Tasks & Submissions):
   - مستويات الأولوية: Low, Medium, High, Urgent.
   - حالات المهمة: Draft (مسودة), Published (نشطة ومرفوعة), Closed (مغلقة).
   - معايير تقييم الدرجات (100 درجة): الجودة (25%) + الالتزام بالوقت (25%) + الابتكار (25%) + الإكمال والتنفيذ (25%).
2. نظام تقييم الأداء الشهري (Performance Radar):
   - تقييم كفاءة الأعضاء على 4 محاور (من 1 إلى 5): الالتزام، العمل الجماعي، التواصل، والابتكار مع ملاحظات القائد والوقت والدقيقة.
   - صلاحيات الرؤية والتقييم: قادة اللجان (Leaders) يقيّمون ويشاهدون أعضاء لجنتم فقط وفق نظام RBAC. مسؤولي HRM لديهم صلاحية كاملة وشاملة لكل اللجان.
3. نظام الشهادات الرقمية (Certificates System):
   - أنواع الشهادات: شهادة تقدير وعرفان، شهادة تميز وإتقان، شهادة إتمام تدريب، شهادة القيادة المتميزة، وشهادات مخصصة.
   - قابلة للتحميل المباشر PDF، الطباعة الرسمية، والتحقق من صحتها بكود QR ورقم متسلسل.
4. نظام التكواد والأكواد الخاصة (Membership Access Codes):
   - أكواد قيادية معتمدة (مثل EYE-1001 لريهام اشرف - Vice, EYE-1004 لأحمد إبراهيم - HR Leader, EYE-1008 لعهد عبدالله - HR of PR, EYE-1009 لمحمد عبد الدايم - HR of SM, EYE-1010 لحنين الملواني - HR of OR).
5. المكافآت والشارات (Badges & Rewards):
   - شارات التميز (Task Crusher, Quiz Master, Perfect Presence, Early Bird, Top Performer).
   - متجر المكافآت وتبديل النقاط المكتسبة من المهام والمشاركات.

👤 بيانات المستخدم الحالي:
- الاسم: ${currentUser.fullName}
- المنصب: ${currentUser.role}
- اللجنة: ${currentUser.committee || 'العامة'} (نطاق الصلاحية: ${userCommittee})
- القسم: ${currentUser.department || 'عام'}
- كود العضوية: ${currentUser.membershipCode}
- سلسلة النشاط (Streak): ${streak.currentStreakDays} أيام متتالية
- الصلاحية الحالية: ${isHrmUser ? 'إدارة عامة شاملة (HRM / Super Admin)' : `قائد/عضو لجنة ${userCommittee}`}

📊 إحصائيات النظام الحية في نطاق المستخدم:
- عدد الأعضاء المتاحين للمتابعة: ${accessibleMembers.length} أعضاء.
- عدد المهام النشطة: ${tasks.length} مهام (منها ${openTasks.length} مفتوحة للتسليم).
- عدد التسليمات المسجلة: ${submissions.length} تسليمات.
- عدد الإعلانات: ${announcements.length} إعلانات.
- عدد التقييمات المسجلة: ${evaluations.length} تقييمات.

تعليمات الإجابة والتفاعل (مهمة جداً — التزم بها في كل رد):
1. اقرأ سؤال المستخدم بعناية وحلل المحتوى الفعلي قبل الإجابة. لا تعطِ ردوداً نمطية ثابتة.
2. كل رد يجب أن يكون مخصصاً للمحتوى الذي كتبه المستخدم تحديداً، وليس قالباً عاماً.
3. في سياق المهام الإدارية (Tasks):
   - حدد نوع المهمة: هل هي تصميم، كتابة محتوى، تقرير، تدريب، تنسيق؟
   - اقترح خطوات تنفيذية مناسبة لهذا النوع تحديداً
   - حدد الأولوية والموعد النهائي المناسب بناءً على طبيعة المهمة
   - اذكر المخرجات المتوقعة بوضوح
4. في سياق طرح الأفكار (IdeaBank):
   - طوّر الفكرة من زاوية مختلفة في كل مرة
   - اربطها بأهداف محددة للكيان حسب نوع الفكرة
   - اقترح لجان شريكة مناسبة للتنفيذ
   - ضع مؤشرات قياس نجاح واقعية
5. لا تستخدم ** للتنسيق. لا تبالغ في الإيموجي. الأسلوب: واضح، مباشر، عملي.
6. إذا حاول المستخدم سؤالك عن أمور خارج نطاق الكيان، وجهه بأسلوب لطيف لموضوعات EYE.
7. يدعم الحوار الذاتي: إذا طلب تغيير اسمك أو صورتك، نفذ الطلب مع تأكيد النجاح.
`;
}

/**
 * Query Ozzy AI via Google Gemini GPT engine or Local ChatGPT-level Knowledge Base Reasoner
 */
export async function queryOzzyAI(
  userQuery: string,
  currentUser: UserProfile,
  history: ChatMessage[],
  isAr: boolean
): Promise<{ text: string; mascotImage?: string }> {
  // 1. Self Config Checks
  const selfConfigRes = handleSelfConfigIntent(userQuery, currentUser, isAr);
  if (selfConfigRes) {
    return selfConfigRes;
  }

  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || '';
  const systemContext = buildEyeKnowledgeBasePrompt(currentUser);

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const conversationFormatted = history.slice(-6).map(m => `${m.sender === 'user' ? 'User' : 'Ozy'}: ${m.text}`).join('\n');
      const fullPrompt = `${systemContext}\n\nسجل المحادثة السابقة:\n${conversationFormatted}\n\nسؤال المستخدم: ${userQuery}\n\nإجابة Ozy الذكية المفصلة:`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });

      if (response.text) {
        return {
          text: response.text,
          mascotImage: getOzyConfig().avatarUrl,
        };
      }
    } catch (err) {
      console.warn('[Ozy AI] Gemini API call fallback to domain knowledge reasoner:', err);
    }
  }

  // 2. High-Precision Domain Knowledge Reasoner (ChatGPT-level localized engine)
  return generateDomainKnowledgeResponse(userQuery, currentUser, history, isAr);
}

function handleSelfConfigIntent(
  query: string,
  currentUser: UserProfile,
  isAr: boolean
): { text: string; mascotImage?: string } | null {
  const raw = query.trim();
  const q = raw.toLowerCase()
    .replace(/[أإآآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

  const currentConfig = getOzyConfig();

  if (
    q.includes('غيير صورتك') || q.includes('تغيير الصورة') || q.includes('تغير صورتك') ||
    q.includes('change your avatar') || q.includes('change avatar') || q.includes('صورتك الرمزية') ||
    q.includes('اظهر الصور') || q.includes('شو الصور')
  ) {
    const imagesList = APPROVED_OZY_IMAGES.map(img => `• **Image #${img.id}**: ${img.name}`).join('\n');
    return {
      mascotImage: currentConfig.avatarUrl,
      text: isAr
        ? `يمكنني تغيير صورتي الرمزية! 🎨 لدي 3 صور معتمدة متاحة:\n\n` +
          `${imagesList}\n\n` +
          `اختر رقم الصورة المطلوب استخدامها (مثال: **اختر الصورة #2** أو **استخدم الصورة 1**).`
        : `I can update my avatar! I found ${APPROVED_OZY_IMAGES.length} approved Ozy images:\n\n${imagesList}\n\nPlease choose one (e.g., "Use image #2").`,
    };
  }

  const imgMatch = q.match(/(?:اختر|استخدم|استعمل|الصورة|image|img|#)\s*#?([1-3])/i) || q.match(/^([1-3])$/);
  if (imgMatch) {
    const selectedId = imgMatch[1];
    const targetImg = APPROVED_OZY_IMAGES.find(i => i.id === selectedId);
    if (targetImg) {
      const res = updateOzyAvatar(targetImg.path, currentUser);
      return {
        mascotImage: res.success ? targetImg.path : currentConfig.avatarUrl,
        text: res.success
          ? (isAr
              ? `✨ **تم تحديث الصورة الرمزية بنجاح!**\n\nأنا الآن أستخدم الصورة رقم #${targetImg.id} (**${targetImg.name}**).`
              : `My avatar has been updated successfully. I'm now using image #${targetImg.id} (${targetImg.name}).`)
          : `⚠️ ${res.message}`,
      };
    }
  }

  const nameChangeMatch = raw.match(/(?:غيّر اسمك إلى|غير اسمك الى|سمي نفسك|change your name to|rename to)\s+(.+)/i);
  if (nameChangeMatch) {
    const newRequestedName = nameChangeMatch[1].trim();
    const res = updateOzyName(newRequestedName, currentUser);
    return {
      mascotImage: currentConfig.avatarUrl,
      text: res.success
        ? (isAr
            ? `✅ **تم تحديث اسم المساعد المعروض بنجاح!**\n\nأصبحتُ أُعرف بالاسم الجديد: **${res.newName}**.`
            : `My displayed name has been updated to **${res.newName}**.`)
        : `⚠️ ${res.message}`,
    };
  }

  return null;
}

/**
 * Domain Knowledge Engine - Provides ChatGPT-level structured responses tailored strictly to EYE
 */
function generateDomainKnowledgeResponse(
  query: string,
  currentUser: UserProfile,
  history: ChatMessage[],
  isAr: boolean
): { text: string; mascotImage?: string } {
  const raw = query.trim();
  const q = raw.toLowerCase()
    .replace(/[أإآآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

  const currentConfig = getOzyConfig();
  const userCommittee = getEffectiveCommittee(currentUser);
  const isHrmUser = isHRM(currentUser);
  const accessibleMembers = filterMembersByPermission(currentUser, db.getUsers(currentUser));
  const tasks = db.getTasks().filter(t => isHrmUser || t.committee === userCommittee || t.committee === 'All');
  const openTasks = tasks.filter(t => t.status === 'Published');
  const evaluations = db.getPerformance(currentUser);

  // 1️⃣ What can you do? / Capabilities ("بتعرف تعمل ايه", "بتعمل ايه", "ايه قدراتك")
  if (
    q.includes('بتعرف تعمل') || q.includes('بتعمل ايه') || q.includes('بتعمل اي') ||
    q.includes('قدراتك') || q.includes('خدماتك') || q.includes('ازاي تساعدني') ||
    q.includes('ماذا تستطيع') || q.includes('ما هي قدراتك') || q.includes('what can you do') ||
    q.includes('help') || q.includes('مساعدة')
  ) {
    return {
      mascotImage: currentConfig.avatarUrl,
      text: isAr
        ? `🤖 **أهلاً بك! أنا ${currentConfig.name} المساعد الذكي الخارق والمتخصص لكيان EYE!** 🌟\n\n` +
          `أنا مصمم لمساعدتك كمستشار ومساعد تنفيذي ذكي داخل منصة **EYE Workflow Hub**:\n\n` +
          `1️⃣ **إدارة ومتابعة المهام**: متابعة المهام النشطة، المواعيد النهائية، وتقييم درجات التسليمات (0-100).\n` +
          `2️⃣ **تقييم الأداء الشهري (Performance Radar)**: استعراض التقييمات ورصد مؤشرات الالتزام، العمل الجماعي، التواصل، والابتكار للأعضاء.\n` +
          `3️⃣ **إحصائيات الأعضاء والهيكل التنظيمي**: استعلام عن أعضاء لجنتك (${userCommittee})، الأكواد القيادية، والرتب التنظيمية.\n` +
          `4️⃣ **الشهادات الرقمية والمكافآت**: إرشادات استخراج شهادات التقدير، حساب شارات الإنجاز، ومتجر المكافآت.\n` +
          `5️⃣ **التعديل الذاتي والخصوصية**: يمكنك أداء أوامر تغيير اسمي المعروض أو صورتي الرمزية فوراً!\n\n` +
          `💡 *يمكنك أن تسألني فوراً:* "ما هي المهام النشطة الآن؟" أو "كيف اقيم عضو؟" أو "من هم أعضاء لجنتي؟"!`
        : `🤖 **I am ${currentConfig.name}, the official AI Assistant for EYE Workflow Hub!** 🌟\n\nI specialize in EYE entity workflows, tasks, evaluations, member analytics, and self-configuration!`,
    };
  }

  // 2️⃣ EYE Structure & Committees ("ما هو الكيان", "اللجان", "أقسام الكيان", "هيكل الكيان")
  if (q.includes('لجان') || q.includes('اقسام') || q.includes('هيكل') || q.includes('ما هو الكيان') || q.includes('عن الكيان')) {
    return {
      mascotImage: currentConfig.avatarUrl,
      text: isAr
        ? `🏛️ **الهيكل التنظيمي المعتمد لكيان EYE:**\n\n` +
          `يتكون الكيان من 5 لجان رئيسية تضم أقساماً تخصصية متكاملة:\n\n` +
          `• **HR (الموارد البشرية)**: تضم أقسام HRM (الإدارة العامة), HRS (الدعم والخدمات), HRIS (نظم المعلومات), HRD (التطوير والدورات).\n` +
          `• **PR (العلاقات العامة)**: تضم قسمي EPR (العلاقات الخارجية) و IPR (العلاقات الداخلية).\n` +
          `• **SM (وسائل التواصل الاجتماعي)**: تضم أقسام Content (المحتوى), Graphic Design (التصميم), Photography (التصوير), Video Editing (المونتاج).\n` +
          `• **OR (التنظيم واللوجستيات)**: تضم أقسام VIP (استقبال كبار الشخصيات), Planning (التخطيط), Coordination (التنسيق), Logistics (الدعم اللوجستي).\n` +
          `• **Media (الإعلام والإنتاج)**.\n\n` +
          `حسابك الحالي مسجل في نطاق: **لجنة ${userCommittee}** بكود عضوية \`${currentUser.membershipCode}\`.`
        : `🏛️ **EYE Structure:** 5 primary committees (HR, PR, SM, OR, Media) with specialized sub-departments.`,
    };
  }

  // 3️⃣ Members list query
  if (q.includes('اعضاء') || q.includes('فريقي') || q.includes('members') || q.includes('لجنتي')) {
    const listNames = accessibleMembers.slice(0, 6).map(m => `• **${m.fullName}** (\`${m.membershipCode || 'N/A'}\` - ${m.role})`).join('\n');
    return {
      mascotImage: currentConfig.avatarUrl,
      text: isAr
        ? `👥 **قائمة الأعضاء في نطاق صلاحياتك (${userCommittee}):**\n\n` +
          `إجمالي الأعضاء المتاحين: **${accessibleMembers.length}** عضواً.\n\n` +
          `${listNames}\n\n` +
          (accessibleMembers.length > 6 ? `*(وهناك ${accessibleMembers.length - 6} أعضاء آخرين في القائمة)*\n` : '') +
          `\n💡 *ملاحظة:* يتم تصفية الأعضاء وفق نظام RBAC لضمان خصوصية وحماية بيانات اللجان.`
        : `👥 **Accessible Members (${userCommittee}):** Total ${accessibleMembers.length} members.`,
    };
  }

  // 4️⃣ Active Tasks & Homework query
  if (q.includes('مهام') || q.includes('تاسك') || q.includes('tasks') || q.includes('شغل')) {
    return {
      mascotImage: currentConfig.avatarUrl,
      text: isAr
        ? `📋 **تقرير المهام لنطاق لجنة ${userCommittee}:**\n\n` +
          `• **إجمالي المهام:** ${tasks.length} مهمة\n` +
          `• **المهام النشطة المفتوحة:** ${openTasks.length} مهمة\n\n` +
          (openTasks.length > 0 ? `📌 **أحدث مهمة نشطة:** "${openTasks[0].name}"\n• الموعد النهائي: ${new Date(openTasks[0].deadline).toLocaleDateString('ar-EG')}\n• القسم المطلوب: ${openTasks[0].department}\n\n` : '') +
          `يمكنك تسليم حلولك أو متابعة تقييم الدرجات مباشرة من لوحة المهام!`
        : `📋 **Task Report:** ${tasks.length} total tasks, ${openTasks.length} active open tasks for ${userCommittee}.`,
    };
  }

  // 5️⃣ Evaluation query
  if (q.includes('تقييم') || q.includes('درجات') || q.includes('اداء') || q.includes('performance')) {
    return {
      mascotImage: currentConfig.avatarUrl,
      text: isAr
        ? `📈 **نظام تقييم الأداء الشهري (Performance Radar):**\n\n` +
          `• **عدد التقييمات المعتمدة:** ${evaluations.length} تقييماً.\n` +
          `• **محاور التقييم:** الالتزام، العمل الجماعي، التواصل، والابتكار (درجات من 1 إلى 5).\n` +
          `• **الصلاحيات:** ${isHrmUser ? 'إدارة عامة شاملة (HRM) لكل اللجان' : `مقتصر على أعضاء لجنة ${userCommittee}`}\n\n` +
          `يمكنك الدخول لقسم تقييم الأداء واختيار اسم العضو لاعتماد تقييم شهر جديد.`
        : `📈 **Performance System:** ${evaluations.length} recorded evaluations for committee **${userCommittee}**.`,
    };
  }

  // Out-of-scope or general question -> Friendly Knowledge-Bound ChatGPT Response
  return {
    mascotImage: currentConfig.avatarUrl,
    text: isAr
      ? `🤖 **أهلاً بك يا ${currentUser.fullName}!** 🌟\n\n` +
        `أنا **${currentConfig.name}**، ومهمتي الرئيسية هي خدمتك وتوجيهك بكل ما يخص **كيان EYE** ولجنة **${userCommittee}**.\n\n` +
        `بصفتك **${currentUser.role}**، يمكنك الاستفسار عن:\n` +
        `• 📋 **المهام والتسليمات المفتوحة**\n` +
        `• 👥 **بيانات وأكواد الأعضاء**\n` +
        `• 📈 **تقييمات الأداء والشهادات**\n` +
        `• 🎨 **تغيير إعداداتي (صورتي أو اسمي)**\n\n` +
        `كيف يمكنني مساعدتك الآن في عملك داخل الكيان؟`
      : `🤖 **Hello ${currentUser.fullName}!** 🌟\n\nI am **${currentConfig.name}**, dedicated exclusively to serving EYE Workflow Hub and committee **${userCommittee}**. How can I assist you with tasks, team data, or evaluations today?`,
  };
}

export function generateOzyCoachReport(currentUser: UserProfile, isAr: boolean = true): { text: string; mascotImage: string } {
  const currentConfig = getOzyConfig();
  const submissions = db.getSubmissions().filter(s => s.memberId === currentUser.id);
  const tasks = db.getTasks().filter(t => t.committee === currentUser.committee || t.committee === 'All');
  const streak = currentUser.streakCount || 0;
  const evaluations = db.getMemberEvaluations(currentUser.id);
  const avgEval = evaluations.length > 0
    ? (evaluations.reduce((acc, e) => acc + (e.overallRating || 5), 0) / evaluations.length).toFixed(1)
    : '5.0';

  const text = isAr
    ? `📊 **تقرير أوزي لتطوير الأداء الشخصي والقيادي (Ozy Coach Mode 🤖):**\n\n` +
      `👋 مرحباً **${currentUser.fullName}**، إليك تحليلي الخاص لأدائك هذا الأسبوع:\n\n` +
      `🔥 **سلسلة الالتزام (Streak):** ${streak} يوم متتالي من التفاعل وتسليم المهام.\n` +
      `📋 **المهام المكتملة:** ${submissions.length} تسليمات ناجحة.\n` +
      `⭐ **متوسط التقييم الإداري:** ${avgEval} / 5.0\n\n` +
      `💪 **نقاط القوة الملاحظة:**\n` +
      `• الالتزام بالمواعيد النهائية وحس المسؤولية عالي.\n` +
      `• التفاعل الإيجابي مع فريق العمل ولجنة ${currentUser.committee}.\n\n` +
      `💡 **نصيحة أوزي للأسبوع القادم:**\n` +
      `حافظ على شعلتك 🔥 وزد من تفاعلك في شات اللجان وبنك الأفكار لتحقيق أعلى نقاط تميز في لوحة الصدارة!`
    : `📊 **Ozy Coach Performance Report 🤖:**\n\n` +
      `Hi **${currentUser.fullName}**, here is your weekly breakdown:\n\n` +
      `🔥 **Streak:** ${streak} consecutive days.\n` +
      `📋 **Submissions:** ${submissions.length} completed.\n` +
      `⭐ **Rating:** ${avgEval} / 5.0\n\n` +
      `Keep up the great work!`;

  return {
    text,
    mascotImage: '/mascot-thinking.png',
  };
}


export function cleanTextFormat(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/[`]/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/(\n\s*){3,}/g, '\n\n')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart Context Suggestion — fully content-driven, never repeats the same reply
// Analyzes the actual user prompt to produce tailored, actionable output
// ─────────────────────────────────────────────────────────────────────────────

function extractKeywords(prompt: string): string[] {
  const stopWords = new Set(['في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'التي', 'الذي', 'و', 'أو', 'أن', 'ان', 'the', 'a', 'an', 'in', 'on', 'for', 'of', 'and', 'or', 'to', 'is', 'it']);
  return prompt
    .split(/[\s،,،.،؟?!]+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
}

function detectTaskCharacteristics(prompt: string): {
  isDesign: boolean;
  isContent: boolean;
  isReport: boolean;
  isMeeting: boolean;
  isTraining: boolean;
  isUrgent: boolean;
  isSocial: boolean;
  isLogistics: boolean;
  estimatedComplexity: 'simple' | 'medium' | 'complex';
} {
  const q = prompt.toLowerCase();
  const isDesign = /تصميم|بوستر|فلاير|صورة|جرافيك|design|poster|flyer|graphic|visual|banner/.test(q);
  const isContent = /محتوى|منشور|نص|كتابة|content|post|write|caption|article|copy/.test(q);
  const isReport = /تقرير|احصاء|بيانات|تحليل|report|data|analysis|stats|metrics|dashboard/.test(q);
  const isMeeting = /اجتماع|لقاء|جلسة|تنسيق|meeting|session|gather|coordinate/.test(q);
  const isTraining = /تدريب|ورشة|كورس|دورة|تعلم|training|workshop|course|learn|session/.test(q);
  const isUrgent = /عاجل|سريع|اليوم|الآن|urgent|asap|today|immediate|now|ضروري/.test(q);
  const isSocial = /انستقرام|تيك|يوتيوب|فيسبوك|سوشيال|instagram|tiktok|youtube|facebook|social/.test(q);
  const isLogistics = /تنظيم|لوجستي|فعالية|حفل|مناسبة|logistics|event|organize|venue|ceremony/.test(q);
  const wordCount = prompt.split(/\s+/).length;
  const estimatedComplexity: 'simple' | 'medium' | 'complex' =
    wordCount < 5 || /بسيط|سريع|صغير|simple|quick|small/.test(q) ? 'simple'
    : wordCount > 15 || /مشروع|برنامج|خطة|project|program|plan|comprehensive/.test(q) ? 'complex'
    : 'medium';
  return { isDesign, isContent, isReport, isMeeting, isTraining, isUrgent, isSocial, isLogistics, estimatedComplexity };
}

function detectIdeaCharacteristics(prompt: string): {
  isEvent: boolean;
  isCampaign: boolean;
  isInternal: boolean;
  isExternal: boolean;
  isDigital: boolean;
  isAwareness: boolean;
  estimatedScope: 'local' | 'committee' | 'entity-wide';
} {
  const q = prompt.toLowerCase();
  const isEvent = /فعالية|حفل|مناسبة|زيارة|رحلة|event|ceremony|trip|gathering/.test(q);
  const isCampaign = /حملة|مبادرة|campaign|initiative|drive|awareness/.test(q);
  const isInternal = /داخلي|أعضاء|فريق|internal|members|team/.test(q);
  const isExternal = /خارجي|مجتمع|جمهور|external|community|public|audience/.test(q);
  const isDigital = /سوشيال|رقمي|اونلاين|digital|online|social|virtual/.test(q);
  const isAwareness = /توعية|تثقيف|awareness|education|inform|spread/.test(q);
  const estimatedScope: 'local' | 'committee' | 'entity-wide' =
    /كل|جميع|عام|all|entire|whole|entity/.test(q) ? 'entity-wide'
    : /لجنة|قسم|committee|department/.test(q) ? 'committee'
    : 'local';
  return { isEvent, isCampaign, isInternal, isExternal, isDigital, isAwareness, estimatedScope };
}

function suggestDeadline(complexity: 'simple' | 'medium' | 'complex', isUrgent: boolean): string {
  if (isUrgent) return 'خلال 24 ساعة (طارئ)';
  if (complexity === 'simple') return '3 أيام عمل';
  if (complexity === 'medium') return '5-7 أيام عمل';
  return '2-3 أسابيع مع نقطة مراجعة منتصف الطريق';
}

function suggestPriority(ch: ReturnType<typeof detectTaskCharacteristics>): string {
  if (ch.isUrgent) return 'Urgent';
  if (ch.isReport || ch.isMeeting) return 'High';
  if (ch.isDesign || ch.isContent) return 'Medium';
  return 'Low';
}

export function getSmartContextSuggestion(
  view: string,
  userPrompt: string,
  currentUser: UserProfile
): string {
  const prompt = userPrompt.trim();
  const hasContent = prompt.length > 2;
  const keywords = hasContent ? extractKeywords(prompt) : [];
  const topKeyword = keywords[0] || '';

  // ── TASKS VIEW ───────────────────────────────────────────────────────────
  if (view === 'tasks') {
    if (!hasContent) {
      return cleanTextFormat(
        `توصية هيكلة المهمة:
اكتب موضوع المهمة أو وصفاً مختصراً لها في مربع الإدخال، ثم اضغط "اقتراح" مجدداً لأقدم لك خطوات تنفيذية مخصصة وجدولاً زمنياً مناسباً.`
      );
    }

    const ch = detectTaskCharacteristics(prompt);
    const deadline = suggestDeadline(ch.estimatedComplexity, ch.isUrgent);
    const priority = suggestPriority(ch);
    const committee = currentUser.committee || 'عام';

    let steps: string[] = [];
    let deliverables = '';
    let reviewNote = '';

    if (ch.isDesign) {
      steps = [
        `تحديد المحتوى النصي والبصري المطلوب تضمينه مع الجهة الطالبة قبل البدء`,
        `وضع مسودة أولية (Wireframe) وعرضها للمراجعة قبل الإنتاج النهائي`,
        `إنتاج التصميم بالمقاسات والصيغ المطلوبة (PNG + PDF) ورفعه على منصة المهام`,
        `توثيق ملف المصدر (AI/PSD) بجانب الناتج النهائي`
      ];
      deliverables = 'ملف PNG بجودة عالية + PDF قابل للطباعة';
      reviewNote = 'يُفضّل تخصيص جولة مراجعة واحدة على الأقل بعد المسودة';
    } else if (ch.isContent) {
      steps = [
        `تحديد الجمهور المستهدف ونبرة الخطاب (رسمي / ودي / تحفيزي)`,
        `إعداد مسودة أولية بطول لا يتجاوز ${topKeyword ? `ما يناسب "${topKeyword}"` : '300 كلمة'} وإرسالها للمراجعة`,
        `دمج التعليقات التحريرية وضبط اللغة والأسلوب`,
        `تسليم النسخة النهائية بصيغة Word أو PDF`
      ];
      deliverables = 'نص جاهز للنشر بتنسيق واضح';
      reviewNote = 'راجع المحتوى مع مسؤول اللجنة قبل النشر';
    } else if (ch.isReport) {
      steps = [
        `تجميع البيانات من المصادر ذات الصلة (المنصة، التقارير السابقة، الإحصائيات)`,
        `بناء الهيكل: مقدمة + أرقام رئيسية + تحليل + توصيات`,
        `مراجعة الأرقام مع المسؤول المباشر للتحقق من دقتها`,
        `تسليم التقرير بصيغة PDF مع ملف Excel للبيانات الخام`
      ];
      deliverables = 'تقرير PDF + ملف بيانات Excel';
      reviewNote = 'تأكد من توافق الأرقام مع البيانات الرسمية للمنصة';
    } else if (ch.isTraining) {
      steps = [
        `تحديد الجمهور المستهدف وعدد المشاركين المتوقع`,
        `إعداد مواد التدريب (Slides + ورقة عمل)`,
        `تنسيق الموعد والمكان مع المنسق المسؤول`,
        `جمع التغذية الراجعة بعد الجلسة وتوثيق النتائج`
      ];
      deliverables = 'مواد تدريبية + تقرير حضور';
      reviewNote = 'احرص على إرسال رسالة تذكيرية قبل 24 ساعة من الموعد';
    } else if (ch.isMeeting) {
      steps = [
        `إعداد جدول أعمال واضح وإرساله للمشاركين مسبقاً`,
        `تخصيص وقت لكل بند (10-20 دقيقة) وتعيين مدوّن محضر`,
        `إدارة الوقت خلال الجلسة وتوثيق القرارات والمهام المستخرجة`,
        `إرسال محضر الاجتماع خلال 24 ساعة من الانتهاء`
      ];
      deliverables = 'محضر اجتماع رسمي موقّع';
      reviewNote = 'وزّع المهام المستخرجة على المنصة فور انتهاء الاجتماع';
    } else {
      steps = [
        `تحديد المخرجات المطلوبة بدقة قبل البدء (ماذا يُسلَّم بالضبط؟)`,
        `تقسيم العمل إلى مراحل واضحة مع موعد لكل مرحلة`,
        `إبلاغ أعضاء ${committee} المعنيين بآلية التسليم ومعايير القبول`,
        `مراجعة الناتج مقارنةً بالمطلوب قبل الرفع النهائي`
      ];
      deliverables = 'الملف أو الناتج المطلوب وفق التعليمات';
      reviewNote = 'خصص 10% من وقتك للمراجعة النهائية قبل التسليم';
    }

    const stepsText = steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

    return cleanTextFormat(
      `تحليل المهمة: "${prompt}"

الأولوية المقترحة: ${priority}
الموعد النهائي الموصى به: ${deadline}
اللجنة المسؤولة: ${committee}

خطوات التنفيذ:
${stepsText}

المخرجات المتوقعة: ${deliverables}

ملاحظة إدارية: ${reviewNote}`
    );
  }

  // ── IDEAS / IDEABANK VIEW ─────────────────────────────────────────────────
  if (view === 'ideas' || view === 'ideabank') {
    if (!hasContent) {
      return cleanTextFormat(
        `تطوير المبادرة:
اكتب اسم أو وصفاً مختصراً للفكرة في مربع الإدخال، ثم اضغط "تطوير الفكرة" مجدداً لأقترح خطة تنفيذية مخصصة وربطاً بأهداف الكيان.`
      );
    }

    const ch = detectIdeaCharacteristics(prompt);
    const committee = currentUser.committee || 'العامة';
    const scope = ch.estimatedScope === 'entity-wide' ? 'كامل الكيان' : ch.estimatedScope === 'committee' ? `لجنة ${committee}` : `قسم داخل ${committee}`;

    let eyeAlignment = '';
    let phases: string[] = [];
    let partners: string[] = [];
    let kpis: string[] = [];

    if (ch.isEvent) {
      eyeAlignment = 'يرتبط بهدف تعزيز الحضور الميداني وبناء الهوية المؤسسية للكيان';
      phases = [
        'التخطيط: تحديد الهدف والجمهور والميزانية والموعد (الأسبوع 1)',
        'التجهيز: تحضير المواد والتنسيق اللوجستي وتوزيع الأدوار (الأسبوع 2-3)',
        'التنفيذ والتوثيق: إدارة الفعالية وتصويرها وتسجيل الحضور (يوم الفعالية)',
        'التقييم: جمع ملاحظات المشاركين وإعداد تقرير ختامي (الأسبوع التالي)'
      ];
      partners = ['OR (التنظيم واللوجستيات)', 'SM (وسائل التواصل) للتغطية والنشر', 'PR (العلاقات العامة) للتواصل الخارجي إن لزم'];
      kpis = ['عدد المشاركين مقارنةً بالمستهدف', 'نسبة رضا المشاركين (استبيان)', 'عدد المنشورات والتفاعلات على السوشيال'];
    } else if (ch.isCampaign) {
      eyeAlignment = 'يخدم هدف توسيع الأثر المجتمعي وتعزيز الوعي بدور الكيان';
      phases = [
        'الإعداد: تحديد الرسالة الرئيسية والجمهور المستهدف وقنوات النشر',
        'إنتاج المحتوى: تصميم المواد البصرية والنصوص بالتنسيق مع SM',
        'الإطلاق والمتابعة: نشر المحتوى وفق جدول ومتابعة التفاعل يومياً',
        'القياس: تحليل النتائج ومقارنتها بالأهداف الموضوعة'
      ];
      partners = ['SM (محتوى + تصميم)', 'PR للتواصل مع الشركاء', 'HR لتنسيق مشاركة الأعضاء'];
      kpis = ['Reach وImpressions على المنصات', 'عدد المشاركين أو المستجيبين', 'نسبة إتمام الهدف المحدد'];
    } else if (ch.isDigital) {
      eyeAlignment = 'يعزز الحضور الرقمي للكيان ويرفع التفاعل على المنصات';
      phases = [
        'البحث: تحليل المنصات المستهدفة والمحتوى الأكثر أداءً حالياً',
        'التخطيط: بناء خطة محتوى أسبوعية مع SM',
        'الإنتاج: إنتاج المحتوى بجودة عالية وجدولته على المنصات',
        'المراجعة الدورية: تحليل الأداء شهرياً وتعديل الاستراتيجية'
      ];
      partners = ['SM (قسم المحتوى والجرافيك)', 'Media للمحتوى المرئي', 'PR للرسائل الخارجية'];
      kpis = ['نمو عدد المتابعين', 'متوسط التفاعل على المنشورات', 'نسبة المحتوى المجدوَل المنفَّذ فعلياً'];
    } else if (ch.isInternal) {
      eyeAlignment = 'يُسهم في تطوير بيئة العمل الداخلية وتماسك فريق الكيان';
      phases = [
        'التشخيص: تحديد الاحتياج الداخلي باستبيان مختصر أو جلسة تشاورية',
        'التصميم: بناء آلية التنفيذ والجدول الزمني مع HR',
        'التطبيق: تنفيذ الفكرة مع متابعة أثناء التطبيق',
        'التغذية الراجعة: جمع ملاحظات الأعضاء وتقييم الأثر'
      ];
      partners = [`لجنة ${committee} كمحرك رئيسي`, 'HR للتنسيق والدعم الإداري'];
      kpis = ['نسبة مشاركة الأعضاء', 'تحسن في مؤشرات الالتزام أو الأداء', 'رضا الأعضاء (استبيان)'];
    } else {
      eyeAlignment = `تدعم الخطة التشغيلية لـ ${scope} وتتوافق مع أهداف تطوير العمل المؤسسي`;
      phases = [
        `التصوّر: وضع وصف واضح للمخرجات المتوقعة من الفكرة`,
        `التنسيق: التواصل مع اللجان المعنية وتحديد الموارد اللازمة`,
        `التنفيذ: تطبيق الفكرة بخطوات تدريجية مع توثيق كل مرحلة`,
        `التقييم: قياس الأثر ومشاركة النتائج مع فريق الكيان`
      ];
      partners = [`لجنة ${committee}`, 'HR للتنسيق العام', 'OR إذا كان هناك بُعد تنظيمي'];
      kpis = ['درجة الإنجاز مقارنةً بالمخطط', 'مستوى رضا المستفيدين', 'التوثيق الرسمي للناتج'];
    }

    const phasesText = phases.map((p, i) => `${i + 1}. ${p}`).join('\n');
    const partnersText = partners.map(p => `- ${p}`).join('\n');
    const kpisText = kpis.map(k => `- ${k}`).join('\n');

    return cleanTextFormat(
      `تطوير المبادرة: "${prompt}"

الربط بأهداف الكيان: ${eyeAlignment}

النطاق المقدّر: ${scope}

خطة التنفيذ المقترحة:
${phasesText}

اللجان الشريكة الموصى بها:
${partnersText}

مؤشرات قياس النجاح:
${kpisText}

الخطوة الأولى الآن: ارفع الفكرة رسمياً في بنك الأفكار ليتمكن أعضاء ${committee} من التصويت والتعليق عليها.`
    );
  }

  // ── MEETINGS / CALENDAR ───────────────────────────────────────────────────
  if (view === 'calendar' || view === 'meetings') {
    const topic = prompt || 'متابعة الأعمال';
    const isWeekly = /أسبوعي|دوري|weekly|regular/.test(prompt.toLowerCase());
    const duration = isWeekly ? '45 دقيقة' : '60-90 دقيقة';
    return cleanTextFormat(
      `جدول أعمال الاجتماع: ${topic}

المدة المقترحة: ${duration}

بنود الجلسة:
1. افتتاح الجلسة ومراجعة تقرير الاجتماع السابق (10 دقائق)
2. متابعة التكليفات الموزّعة وتحديث نسب الإنجاز (20 دقيقة)
3. ${hasContent ? `مناقشة "${prompt}" وتحديد المتطلبات` : 'مناقشة النقاط التطويرية للمرحلة القادمة'} (20 دقيقة)
4. توزيع مهام جديدة على المنصة مع تحديد الموعد النهائي لكل منها (10 دقائق)

ملاحظات تنظيمية:
- أرسل جدول الأعمال للمشاركين قبل الاجتماع بـ 24 ساعة على الأقل
- عيّن مدوّن محضر بمجرد بدء الجلسة
- وزّع المهام على المنصة فور انتهاء الاجتماع`
    );
  }

  // ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
  if (view === 'announcements') {
    const subject = prompt || 'تعميم إداري';
    return cleanTextFormat(
      `صياغة التعميم الإداري: ${subject}

هيكل التعميم المقترح:
- الجهة: كيان EYE / لجنة ${currentUser.committee || 'العامة'}
- الموضوع: ${subject}
- الفئة المستهدفة: [حدد: جميع الأعضاء / لجنة معينة / قسم معين]

نص البيان:
يحيط الكيان جميع المعنيين علماً بـ [اذكر المحتوى هنا]، ويُرجى الالتزام بذلك ابتداءً من [التاريخ].

لأي استفسار: تواصل مع مسؤول اللجنة عبر قناة التواصل الرسمية.`
    );
  }

  // ── WORK PLANS / OKR ─────────────────────────────────────────────────────
  if (view === 'workplans' || view === 'work-plans' || view === 'okr') {
    const goal = prompt || `رفع كفاءة ${currentUser.committee || 'الكيان'}`;
    return cleanTextFormat(
      `أهداف الخطة التشغيلية OKR: ${goal}

الهدف الرئيسي (Objective):
${goal} بمستوى يلبي المعايير المؤسسية لكيان EYE خلال الفترة القادمة.

النتائج الرئيسية (Key Results):
1. رفع معدل الإنجاز في الوقت المحدد إلى 85% على الأقل
2. تنفيذ وتوثيق الأنشطة المخططة بنسبة 90%
3. تحسين متوسط تقييم أعضاء ${currentUser.committee || 'الكيان'} بمقدار 0.5 نقطة مقارنةً بالفترة الماضية

خطوة البداية: ادخل على صفحة خطط العمل وأنشئ OKR جديداً بهذه البنية.`
    );
  }

  // ── DEFAULT ───────────────────────────────────────────────────────────────
  return cleanTextFormat(
    hasContent
      ? `ملاحظة ذكية حول "${prompt}":
هذا الطلب يتعلق بعمل ${currentUser.committee || 'الكيان'}. للحصول على اقتراح أكثر دقة:
- إذا كانت مهمة: اذهب إلى صفحة المهام واضغط "اقتراح" مع كتابة وصف المهمة
- إذا كانت فكرة مبادرة: اذهب إلى بنك الأفكار واكتب الفكرة ثم اضغط "تطوير الفكرة"
- إذا كان اجتماعاً: اذهب إلى صفحة الاجتماعات واطلب اقتراح أجندة`
      : `للحصول على اقتراح مخصص، اكتب وصف المهمة أو الفكرة في مربع الإدخال أولاً ثم اضغط زر الاقتراح الذكي.`
  );
}

