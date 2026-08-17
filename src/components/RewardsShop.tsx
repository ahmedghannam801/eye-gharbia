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

  const calculateUserPoints = () => {
    // Total points earned
    const submissions = db.getSubmissions().filter(s => s.memberId === currentUser.id);
    const tasks = db.getTasks();
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
    // Deduct approved purchases
    const approved = db.getPurchases().filter(p => p.memberId === currentUser.id && p.status === 'Approved');
    const spent = approved.reduce((acc, p) => acc + p.costPoints, 0);
    setUserPoints(pts - spent);
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
  }, []);

  const handlePurchase = (rewardId: string) => {
    const res = db.purchaseReward(rewardId, currentUser);
    setPurchaseResult(res);
    setTimeout(() => setPurchaseResult(null), 3000);
    load();
  };

  const handleApprove = (purchaseId: string) => {
    db.approvePurchase(purchaseId, currentUser);
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
    <div className="p-6 space-y-6 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-pink-50 to-rose-50/40 dark:from-slate-900 dark:to-slate-850 p-6 rounded-3xl border border-pink-200/40 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-bold text-xs uppercase tracking-widest">
            <Gift className="w-4 h-4" />
            <span>{isAr ? 'متجر المكافآت والحوافز' : 'Rewards Shop'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'متجر الحوافز والمكافآت 🎁' : 'Points Exchange Store 🎁'}
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            {isAr ? 'استبدل النقاط التي جمعتها بميزات وشهادات شكر معنوية مميزة' : 'Redeem your hard-earned volunteer points for exclusive perks or featured status'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdminOrLeader && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {isAr ? 'إضافة مكافأة' : 'Add Reward'}
            </button>
          )}
          <div className="bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm flex items-center gap-2 font-mono">
            <Coins className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-amber-600 font-black text-lg leading-none">{userPoints}</p>
              <p className="text-[9px] text-slate-400 font-sans font-bold mt-1">{isAr ? 'نقاطي المتاحة' : 'Points Available'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('shop')}
          className={`pb-3 text-xs font-black px-2 relative transition-colors ${
            activeTab === 'shop' ? 'text-pink-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {isAr ? 'المعروضات' : 'Available Perks'}
          {activeTab === 'shop' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-pink-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 text-xs font-black px-2 relative transition-colors ${
            activeTab === 'purchases' ? 'text-pink-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {isAr ? 'سجل الطلبات' : 'Exchange Requests'}
          {activeTab === 'purchases' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-pink-600 rounded-full" />}
        </button>
      </div>

      {activeTab === 'shop' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rewards.map(reward => {
            const canAfford = userPoints >= reward.costPoints;
            const inStock = reward.stock > 0;

            return (
              <div key={reward.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-xl shrink-0">
                    🎁
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">{reward.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{reward.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'التكلفة' : 'Points Cost'}</span>
                    <span className="text-sm font-black text-amber-500 font-mono">{reward.costPoints} pts</span>
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
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all"
                        title={isAr ? 'حذف المكافأة' : 'Delete Reward'}
                      >
                        🗑️
                      </button>
                    )}
                    <button
                      disabled={!canAfford || !inStock}
                      onClick={() => handlePurchase(reward.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        canAfford && inStock
                          ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {!inStock ? (isAr ? 'نفذت الكمية' : 'Out of Stock') : (isAr ? 'استبدال' : 'Redeem')}
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
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">
              {isAr ? 'طلبات الاستبدال والمكافآت' : 'Points Exchange History'}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visiblePurchases.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{p.rewardTitle}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isAr ? 'بواسطة' : 'By'}: {p.memberName} · {new Date(p.purchasedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-black text-amber-500 font-mono">-{p.costPoints} pts</span>
                  {p.status === 'Approved' ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isAr ? 'تم التسليم' : 'Delivered'}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {isAr ? 'قيد الانتظار' : 'Pending'}
                    </span>
                  )}

                  {isAdminOrLeader && p.status === 'Pending' && (
                    <button
                      onClick={() => handleApprove(p.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all"
                    >
                      {isAr ? 'اعتماد وتسليم' : 'Approve'}
                    </button>
                  )}
                  {isAdminOrLeader && (
                    <button
                      onClick={() => {
                        if (window.confirm(isAr ? 'هل تريد سحب/إلغاء هذا الطلب؟' : 'Delete this purchase request?')) {
                          db.deletePurchase(p.id, currentUser);
                          load();
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-all text-xs"
                      title={isAr ? 'سحب / إلغاء الطلب' : 'Delete Request'}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}

            {visiblePurchases.length === 0 && (
              <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Gift className="w-8 h-8 text-pink-200" />
                <p>{isAr ? 'لا يوجد طلبات استبدال حتى الآن.' : 'No exchange history found.'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result feedback */}
      {purchaseResult === 'ok' && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {isAr ? 'تم تقديم طلب الاستبدال بنجاح! سيراجعه القائد.' : 'Exchange request placed successfully!'}
          </div>
        </div>
      )}
      {purchaseResult === 'no_points' && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50">
          <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            {isAr ? 'نقاطك غير كافية لإتمام هذا الاستبدال.' : 'Insufficient points for this reward.'}
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
