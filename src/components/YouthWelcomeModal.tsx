import React, { useEffect, useState } from 'react';
import { UserProfile, getActiveGovernorate, formatGovernorateWelcomeAr, formatGovernorateAr } from '../types';
import { Sparkles, Flame, Rocket, Star, Heart, X, Zap, Calendar } from 'lucide-react';

interface YouthWelcomeModalProps {
  currentUser: UserProfile;
}

const EGYPTIAN_MOTIVATIONAL_QUOTES = [
  "صباح ومساء الفل يا بطل! ☀️ يوم جديد وفرصة جديدة تثبت فيها نفسك وتعمل حاجة تفخر بيها ف كيان المصريون الشباب!",
  "منور المنصة يا نجم! 🚀 افتكر إن خطوة صغيرة كل يوم هي اللي بتعمل الفرق الكبيرة.. عافر وحلمك مستنيك!",
  "أشطر وأجدع شباب في مصر! 🇪🇬 وجودك وطاقتك بيفرقوا جداً معانا.. كمل وسيب بصمتك ف كل تاسك بتعمله!",
  "النجاح مش صدفة، النجاح إصرار! 💪 يسعد يومك يا وحش الكيان، يلا بينا نعمل حاجة عظمة النهاردة!",
  "طاقتك هي سر تميزنا! 🔥 خلي شغفك هو اللي يسوقك النهاردة، ومفيش حد يقدر يوقفك لما تؤمن بنفسك.",
  "يا مرحب بصناع المستقبل! ✨ المكان بيحلو بوجودك، وثقتنا فيك كبيرة إنك قد كل تحدي وتكليف في الكيان.",
  "ساعة السعي مابتروحش هدر! 🌟 كل مجهود بتعمله النهاردة هو استثمار حقيقي في مستقبلك، عاش يا بطل!",
  "خليك دايماً السابق والمختلف! 🏆 كيان المصريون الشباب بيكبر بالعقول والأيادي العظيمة زي عقولكم وشغفكم.",
  "صباح الطاقة والإيجابية! ⚡ خلي ضحكتك وشغفك سر قوتك النهاردة، ويلا نكسر الدنيا مع بعض!",
  "اللي يعافر في طريقه يوصل! 🎯 خلي هدفك واضح قدام عينيك وتأكد إن فريق الكيان كله في ظهرك وبيشجعك.",
  "عاش يا نجم مصر! 🌟 حلمك مستاهل تعبك، وكيانك فخور بوجود عضو مجتهد ومتميز زيك معانا.",
  "بصمتك بتلهم غيرك! 💡 ركز ف خطوتك النهاردة وافتكر إن التغيير الحقيقي بيبدأ من شغف الشباب اللي زيك.",
  "يا هلا بقائد المستقبل! 🦁 الإنجاز مابيجايش بالنوم، بييجي بالسعي والتركيز.. يلا ابدأ يومك بقوة!",
  "يا صباح التفاؤل والعمل! 🌺 مفيش حاجة صعبة على شباب عندهم إرادة وشغف زي شباب كيان المصريون الشباب.",
  "ثق ف قدرتك وبلاش تقارن نفسك بحد! 👑 أنت نسخة فريدة ووجودك معانا ف الكيان إضافة كبيرة جداً.",
  "كل يوم هو بداية جديدة! 🌅 انسى أي تقصير فات وابدأ النهاردة بصفحة جديدة مليانة حماس وطاقة!",
  "أجدع شباب غالية علينا! 💎 المجهود اللي بتعمله ف صمت النهاردة، هو اللي هيتكلم عنك بكرة بفخر.",
  "عاش يا وحش المهام! 🎯 مفيش تحدي صعب على عقليتك، واصل وسيب البصمة اللي تميزك دايماً.",
  "الإبداع ملوش حدود معانا! 🎨 فكر خارج الصندوق، وقدم أفكارك بكل جرأة.. المكان دا معمول عشانك!",
  "الشباب هما قلب الوطن النابض! 🇪🇬 كمل يا بطل، مصر بتكبر وتبنى بشباب مخلصين وشغوفين زيك.",
  "ابتسم وخلي عندك يقين ف الله! 😊 السعي بتاعك مقدر، وكل خطوة بتخطوها بتقربك من قمة حلمك.",
  "يا بطل الكيان ويا سند الفريق! 🤝 روحك الحلوة وتعاونك هما السبب ف نجاح كل فاعلية وتكليف.",
  "مفيش قمة من غير تعب! 🏔️ استحمل الطريق وتأكد إن لحظة الوصول للهدف تنسيك كل نقطة عرق.",
  "يا صباح الهمة والنشاط! ⚡ افتكر إن الطاقة الإيجابية معدية، فأنشر إيجابيتك ف كل حتة تدخلها.",
  "نجم النهاردة وكل يوم! 🌟 عافر عشان خاطرك وعشان الناس اللي بتثق ف قدراتك وبتحبك.",
  "اللي يحب شغله ويبدع فيه يوصل لأبعد مما يتخيل! ✨ خلي حبك للتطوع والتطوير هو المحرك بتاعك.",
  "ركز ف التفاصيل الصغيرة، هي دي سر الاحترافية! 🔍 عاش على دقتك واهتمامك بجودة شغلك.",
  "يا مرحب بالأبطال ف بيتكوا الثاني! 🏛️ كيان المصريون الشباب بيجمعنا ويكبر بينا وبإنجازاتكم.",
  "بطل اليوم وكل يوم! 🚀 مفيش حاجة تقدر توقف شغفك، واصل وانطلق بكل قوة وحماس.",
  "الشغف هو الوقود اللي بيحرك الأساطير! ⛽ خلي شغفك شغال وورنيا الإبداع النهاردة ف التكليفات.",
  "عاش يا صاحب الإرادة الحديدية! 🛡️ الصعاب بتصنع الأبطال، وأنت أثبت إنك قدها ف كل موقف.",
  "يوم جديد وبداية مشرقة! 🌞 توكل على الله وابدأ يومك بروح قوية ونفس راضية ومقبلة على الإنجاز.",
  "صانع الأثر الإيجابي! 🍃 كمل ف طريقك، أثرك الطيب بيثبت ويدوم ف كل مكان تترك فيه بصمتك.",
  "يا هلا بالروح الشبابية العظيمة! 💫 خلي حماسك المعدي يلهم زمايلك ف اللجنة ويحرك الكل للنجاح.",
  "عافر وثابر، مفيش حاجة مستحيلة! 💎 التعب بيروح والإنجاز بيتحفر ف تاريخك ف الكيان.",
  "النجاح رحلة مش محطة الوصول بس! 🛤️ استمتع برحلتك وتعلّم ف كل خطوة بتخوضها ف الكيان.",
  "يا نجم الكيان الساطع! ✨ الاستمرارية هي السر.. كمل ف نفس اتجاهك وثقتنا فيك ملهاش حدود.",
  "طموحك ملوش سقف! 🌌 احلم براحتك واسعى واشتغل على نفسك ف الكيان، إحنا معاك وبندعمك دايماً.",
  "أنت قوة التأثير والإنجاز! ⚡ خليك دايماً صاحب المبادرة الأولى والخطوة الشجاعة.",
  "ختامها مسك وحماس دائم! 🎉 منور المنصة يا بطل، ويلا بينا نخلي النهاردة يوم استثنائي بكل المقاييس!"
];

export const YouthWelcomeModal: React.FC<YouthWelcomeModalProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quote, setQuote] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    // Get today's YYYY-MM-DD string
    const todayStr = new Date().toISOString().slice(0, 10);

    // Key to track if shown today for this specific user
    const dailyStorageKey = `eye_welcome_shown_${currentUser.id}_${todayStr}`;
    const alreadyShownToday = localStorage.getItem(dailyStorageKey);

    if (!alreadyShownToday) {
      // Non-repeating quote selection algorithm using seen history
      const historyKey = `eye_seen_quotes_${currentUser.id}`;
      let seenIndices: number[] = [];
      try {
        const raw = localStorage.getItem(historyKey);
        if (raw) seenIndices = JSON.parse(raw);
      } catch {}

      // Find indices that haven't been shown yet
      let availableIndices = EGYPTIAN_MOTIVATIONAL_QUOTES.map((_, i) => i).filter(i => !seenIndices.includes(i));

      // If all quotes have been seen, reset history for a fresh new cycle!
      if (availableIndices.length === 0) {
        seenIndices = [];
        availableIndices = EGYPTIAN_MOTIVATIONAL_QUOTES.map((_, i) => i);
      }

      // Pick a random un-seen quote index
      const selectedIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      setQuote(EGYPTIAN_MOTIVATIONAL_QUOTES[selectedIndex]);

      // Update seen history in localStorage
      seenIndices.push(selectedIndex);
      localStorage.setItem(historyKey, JSON.stringify(seenIndices));

      // Mark modal as shown for today
      setIsOpen(true);
      localStorage.setItem(dailyStorageKey, 'true');
    }
  }, [currentUser]);

  const [activeGov, setActiveGov] = useState<string>(() => getActiveGovernorate(currentUser));

  useEffect(() => {
    const handleGovChange = () => {
      setActiveGov(getActiveGovernorate(currentUser));
    };
    window.addEventListener('eye_governorate_changed', handleGovChange);
    window.addEventListener('storage', handleGovChange);
    return () => {
      window.removeEventListener('eye_governorate_changed', handleGovChange);
      window.removeEventListener('storage', handleGovChange);
    };
  }, [currentUser]);

  if (!isOpen) return null;

  const firstName = currentUser.fullName.split(' ')[0] || currentUser.fullName;
  const userGovAr = formatGovernorateAr(activeGov);
  const userGovWelcomeAr = formatGovernorateWelcomeAr(activeGov);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-b from-[#0b1b3d] via-[#0f285c] to-[#0b1b3d] border-2 border-amber-400/40 text-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center animate-scale-up">
        
        {/* Background Ambient Glows & Floating Emojis */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-blue-500/25 rounded-full blur-3xl pointer-events-none" />

        <div className="absolute top-4 left-5 text-2xl animate-bounce">🔥</div>
        <div className="absolute top-8 right-6 text-2xl animate-pulse">✨</div>
        <div className="absolute bottom-5 left-6 text-2xl animate-pulse">🚀</div>

        {/* Close Icon */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Mascot / Emblem */}
        <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32 mb-4">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 rounded-full blur-lg opacity-80 animate-pulse" />
          <div className="relative w-full h-full bg-slate-900/90 border-2 border-amber-400 rounded-full p-2 flex items-center justify-center shadow-2xl overflow-hidden">
            <img
              src="/mascot-announcements.png"
              alt="أوزي متحدث الكيان"
              className="w-full h-full object-contain drop-shadow-xl hover:scale-110 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Daily Youth Header Tag */}
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-black px-3.5 py-1 rounded-full mb-3 shadow-inner max-w-full truncate">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">جرعة إيجابية يومية — كيان EYE {userGovWelcomeAr} 🇪🇬</span>
        </div>

        {/* Welcome Name */}
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
          أهلاً بك في كيان EYE <span className="text-amber-400 drop-shadow-sm">{userGovWelcomeAr}</span>! 👋
        </h2>
        <p className="text-amber-200/90 font-bold text-xs sm:text-sm mb-2">
          منور المنصة يا <span className="text-white underline decoration-amber-400 font-black">{firstName}</span> ✨
        </p>

        {/* Egyptian Motivational Quote Card */}
        <div className="p-4.5 rounded-2xl bg-white/10 dark:bg-slate-900/70 border border-amber-400/35 text-xs sm:text-sm font-extrabold text-amber-100 leading-relaxed my-4 shadow-inner">
          <p className="drop-shadow-xs">{quote}</p>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all cursor-pointer transform hover:scale-[1.02]"
        >
          <Rocket className="w-4 h-4 fill-current" />
          <span>يلا بينا نكسر الدنيا النهاردة! 🚀</span>
        </button>

        <p className="text-[10px] text-slate-400 font-bold mt-3">
          معاً لصناعة مستقبل أفضل لشباب مصر 🇪🇬✨
        </p>
      </div>
    </div>
  );
};
