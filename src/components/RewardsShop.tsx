import React, { useState, useEffect } from 'react';
import { db } from '../db/localDb';
import { RewardItem, RewardPurchase, UserProfile } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { Gift, Coins, Check, CheckCircle2, Clock, ShieldAlert, Award } from 'lucide-react';

interface RewardsShopProps {
  currentUser: UserProfile;
}

export const RewardsShop: React.FC<RewardsShopProps> = ({ currentUser }) => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';
  const isAdminOrLeader = ['Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator'].includes(currentUser.role);

  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [purchases, setPurchases] = useState<RewardPurchase[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [activeTab, setActiveTab] = useState<'shop' | 'purchases'>('shop');
  const [purchaseResult, setPurchaseResult] = useState<'ok' | 'no_points' | 'no_stock' | null>(null);

  // Create Reward state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPoints, setNewPoints] = useState(100);
  const [newStock, setNewStock] = useState(5);

  const [pointsBreakdown, setPointsBreakdown] = useState({
    earnedTasks: 0,
    earnedAttendance: 0,
    bonusPoints: 0,
    triviaPoints: 0,
    ideasPoints: 0,
    totalEarned: 0,
    spentPurchases: 0,
    availablePoints: 0,
  });

  const [rejectingPurchaseId, setRejectingPurchaseId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const calculateUserPoints = () => {
    const bd = db.getMemberPointsBreakdown(currentUser.id);
    setPointsBreakdown(bd);
    setUserPoints(bd.availablePoints);
  };

  const load = () => {
    setRewards(db.getRewards());
    setPurchases(db.getPurchases());
    calculateUserPoints();
  };

  useEffect(() => {
    load();
    const unsub = db.onChange(load);
    return () => unsub();
  }, [currentUser.id]);

  const handlePurchase = (rewardId: string) => {
    const res = db.purchaseReward(rewardId, currentUser);
    setPurchaseResult(res);
    setTimeout(() => setPurchaseResult(null), 4000);
    load();
  };

  const handleApprove = (purchaseId: string) => {
    db.approvePurchase(purchaseId, currentUser);
    load();
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPurchaseId) return;
    db.rejectPurchase(rejectingPurchaseId, rejectReason, currentUser);
    setRejectingPurchaseId(null);
    setRejectReason('');
    load();
  };

  const handleCreateReward = (e: React.FormEvent) => {
    e.preventDefault();
    db.createRewardItem(newTitle, newDesc, newPoints, newStock, currentUser);
    setShowCreate(false);
    setNewTitle('');
    setNewDesc('');
    setNewPoints(100);
    setNewStock(5);
    load();
  };

  // Filter purchases: members only see their own, leaders/admins see all
  const visiblePurchases = isAdminOrLeader
    ? purchases
    : purchases.filter(p => p.memberId === currentUser.id);

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 p-6 sm:p-8 rounded-3xl border border-pink-200/50 dark:border-slate-800 shadow-md">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-bold text-xs uppercase tracking-widest">
            <Gift className="w-4 h-4" />
            <span>{isAr ? 'منظومة المكافآت والحوافز المعتمدة' : 'Official Rewards & Perks System'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isAr ? 'متجر المكافآت واستبدال النقاط 🎁' : 'Points Exchange & Rewards Store 🎁'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold max-w-2xl leading-relaxed">
            {isAr ? 'اجمع النقاط من إنجاز المهام، حضور الاجتماعات، التقييمات الشهرية والمشاركات التطوعية، واستبدلها بمكافآت وشهادات رسمية فورية!' : 'Earn points from tasks, meetings attendance, leader evaluations, and volunteer initiatives, then redeem them for exclusive perks!'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdminOrLeader && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-2xl text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>+</span>
              <span>{isAr ? 'إضافة مكافأة جديدة' : 'Add New Reward'}</span>
            </button>
          )}

          {/* Points Balance Card */}
          <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/40 text-center shadow-lg flex items-center gap-3.5 font-mono">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Coins className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-amber-600 dark:text-amber-400 font-black text-2xl leading-none">{userPoints}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-bold mt-1">{isAr ? 'رصيدك المتاح للاستبدال' : 'Available Balance'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Points Detailed Breakdown Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <span>📝</span>
            <span>{isAr ? 'تسليم المهام' : 'Tasks'}</span>
          </div>
          <div className="text-lg font-black text-blue-600 font-mono">+{pointsBreakdown.earnedTasks}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <span>📅</span>
            <span>{isAr ? 'حضور اللقاءات' : 'Attendance'}</span>
          </div>
          <div className="text-lg font-black text-emerald-600 font-mono">+{pointsBreakdown.earnedAttendance}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <span>⭐</span>
            <span>{isAr ? 'نقاط إضافية وتقييمات' : 'Bonus & Evals'}</span>
          </div>
          <div className="text-lg font-black text-purple-600 font-mono">+{pointsBreakdown.bonusPoints + pointsBreakdown.triviaPoints + pointsBreakdown.ideasPoints}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <span>🛒</span>
            <span>{isAr ? 'المستبدل بالمتجر' : 'Spent in Shop'}</span>
          </div>
          <div className="text-lg font-black text-rose-600 font-mono">-{pointsBreakdown.spentPurchases}</div>
        </div>

        <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-3.5 shadow-md space-y-1 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-amber-100 flex items-center gap-1.5">
            <span>🪙</span>
            <span>{isAr ? 'الصافي المتاح' : 'Net Available'}</span>
          </div>
          <div className="text-xl font-black font-mono">{pointsBreakdown.availablePoints} pts</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('shop')}
          className={`pb-3 text-xs sm:text-sm font-black px-2 relative transition-colors cursor-pointer ${
            activeTab === 'shop' ? 'text-pink-600 dark:text-pink-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          {isAr ? 'المعروضات والمكافآت المتاحة 🎁' : 'Available Rewards 🎁'}
          {activeTab === 'shop' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-pink-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 text-xs sm:text-sm font-black px-2 relative transition-colors cursor-pointer ${
            activeTab === 'purchases' ? 'text-pink-600 dark:text-pink-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          {isAr ? 'سجل الاستبدال والطلبات 📜' : 'Redemption History 📜'}
          {activeTab === 'purchases' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-pink-600 rounded-full" />}
        </button>
      </div>

      {activeTab === 'shop' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map(reward => {
            const canAfford = userPoints >= reward.costPoints;
            const inStock = reward.stock > 0;

            return (
              <div key={reward.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-pink-300 dark:hover:border-pink-900 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-950/40 dark:to-rose-950/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                      🎁
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black ${
                      inStock ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {inStock ? (isAr ? `متاح: ${reward.stock}` : `Stock: ${reward.stock}`) : (isAr ? 'نفذت الكمية' : 'Out of Stock')}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-800 dark:text-white leading-snug">{reward.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{reward.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'التكلفة المطلوبة' : 'Required Points'}</span>
                    <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">{reward.costPoints} pts</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdminOrLeader && (
                      <button
                        onClick={() => {
                          if (window.confirm(isAr ? `هل تريد حذف مكافأة "${reward.title}"؟` : `Delete reward "${reward.title}"?`)) {
                            db.deleteRewardItem(reward.id, currentUser);
                            load();
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all cursor-pointer"
                        title={isAr ? 'حذف المكافأة' : 'Delete Reward'}
                      >
                        🗑️
                      </button>
                    )}
                    <button
                      disabled={!canAfford || !inStock}
                      onClick={() => handlePurchase(reward.id)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        canAfford && inStock
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {!inStock ? (isAr ? 'نفذت الكمية' : 'Out of Stock') : !canAfford ? (isAr ? 'نقاطك لا تكفي' : 'Need More Pts') : (isAr ? 'استبدال الآن 🎁' : 'Redeem Now 🎁')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Purchases Log */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">
              {isAr ? 'سجل طلبات ومكافآت الأعضاء' : 'Members Points Redemption Log'}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visiblePurchases.map(p => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">{p.rewardTitle}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    {isAr ? 'العضو' : 'Member'}: <span className="font-bold text-slate-800 dark:text-slate-200">{p.memberName}</span> · {new Date(p.purchasedAt).toLocaleDateString('ar-EG')}
                  </p>
                  {(p as any).rejectionReason && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                      {isAr ? 'سبب الرفض' : 'Reason'}: {(p as any).rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-black text-amber-500 font-mono">-{p.costPoints} pts</span>
                  {p.status === 'Approved' ? (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isAr ? 'معتمد ومستلم' : 'Approved'}
                    </span>
                  ) : p.status === 'Rejected' ? (
                    <span className="text-xs bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-3 py-1 rounded-full font-black flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {isAr ? 'مرفوض ومسترجع' : 'Rejected'}
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full font-black flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {isAr ? 'قيد المراجعة' : 'Pending'}
                    </span>
                  )}

                  {isAdminOrLeader && p.status === 'Pending' && (
                    <button
                      onClick={() => handleApprove(p.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {isAr ? 'اعتماد' : 'Approve'}
                    </button>
                  )}
                  {isAdminOrLeader && p.status === 'Pending' && (
                    <button
                      onClick={() => setRejectingPurchaseId(p.id)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {isAr ? 'رفض واسترجاع' : 'Reject & Refund'}
                    </button>
                  )}
                  {isAdminOrLeader && (
                    <button
                      onClick={() => {
                        if (window.confirm(isAr ? 'هل تريد حذف هذا السجل نهائياً؟' : 'Delete this record?')) {
                          db.deletePurchase(p.id, currentUser);
                          load();
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-all text-xs cursor-pointer"
                      title={isAr ? 'حذف السجل' : 'Delete Record'}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}

            {visiblePurchases.length === 0 && (
              <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Gift className="w-10 h-10 text-pink-200 dark:text-pink-900" />
                <p className="font-bold text-sm">{isAr ? 'لا يوجد طلبات استبدال حتى الآن.' : 'No exchange history found.'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result feedback Toast */}
      {purchaseResult === 'ok' && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 animate-bounce">
          <div className="bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {isAr ? 'تهانينا! تم استبدال النقاط وحصولك على المكافأة بنجاح! 🎁' : 'Points exchanged successfully!'}
          </div>
        </div>
      )}
      {purchaseResult === 'no_points' && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50">
          <div className="bg-red-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            {isAr ? 'نقاطك الحالية غير كافية لاستبدال هذه المكافأة.' : 'Insufficient points for this reward.'}
          </div>
        </div>
      )}

      {/* Reject Purchase Modal */}
      {rejectingPurchaseId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <span>{isAr ? 'رفض طلب الاستبدال واسترجاع النقاط' : 'Reject & Refund Points'}</span>
            </h3>
            <form onSubmit={handleReject} className="space-y-4">
              <textarea
                required
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder={isAr ? 'اكتب سبب الرفض ليصل للعضو...' : 'Rejection reason...'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-red-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingPurchaseId(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-xs font-bold text-slate-500"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-xs font-black shadow-md"
                >
                  {isAr ? 'تأكيد الرفض والاسترجاع' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create Reward Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-pink-500" />
                <span>{isAr ? 'إضافة مكافأة جديدة' : 'Add New Reward'}</span>
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <ShieldAlert className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateReward} className="space-y-4">
              <input
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={isAr ? 'عنوان المكافأة' : 'Reward Title'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-pink-500"
              />
              <textarea
                required
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={3}
                placeholder={isAr ? 'وصف المكافأة وكيفية استلامها...' : 'Description of the reward...'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-pink-500 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{isAr ? 'تكلفة النقاط' : 'Points Cost'}</label>
                  <input
                    required
                    type="number"
                    value={newPoints}
                    onChange={e => setNewPoints(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-center focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{isAr ? 'الكمية المتوفرة (الستوك)' : 'Available Stock'}</label>
                  <input
                    required
                    type="number"
                    value={newStock}
                    onChange={e => setNewStock(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-center focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-slate-250 dark:border-slate-700 rounded-xl py-2.5 text-xs font-bold text-slate-500">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="flex-1 bg-pink-600 hover:bg-pink-700 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm">
                  {isAr ? 'إضافة' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
