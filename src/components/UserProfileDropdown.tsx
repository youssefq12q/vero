import React from "react";
import { UserProfile, Reward } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  LogOut,
  Award,
  Shield,
  Gift,
  Clipboard,
  CreditCard,
  ChevronRight,
  X,
  Sparkles,
  Check,
  Copy,
} from "lucide-react";
import UserAvatar from "./UserAvatar";

interface UserProfileDropdownProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenOrders?: () => void;
  onUpdateUser: (profile: UserProfile) => void;
}

export default function UserProfileDropdown({
  user,
  isOpen,
  onClose,
  onLogout,
  onUpdateUser,
}: UserProfileDropdownProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<
    "overview" | "rewards"
  >("overview");
  const [userOrders, setUserOrders] = React.useState<any[]>([]);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );
  const [rewards, setRewards] = React.useState<Reward[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      fetch("/api/rewards")
        .then((res) => res.json())
        .then((data) => setRewards(data))
        .catch((err) => console.error("Error loading rewards:", err));
    }
  }, [isOpen]);

  // Daily Check-In state
  const todayStr = new Date().toDateString();
  const checkInKey = `vero_checkin_${user.email}`;
  const [hasCheckedInToday, setHasCheckedInToday] = React.useState(() => {
    return localStorage.getItem(checkInKey) === todayStr;
  });

  React.useEffect(() => {
    if (isOpen) {
      const savedOrders = localStorage.getItem("vero_orders");
      if (savedOrders) {
        try {
          const allOrders = JSON.parse(savedOrders);
          const filtered = allOrders.filter((o: any) => o.email === user.email);
          setUserOrders(filtered);
        } catch (e) {
          // ignore
        }
      } else {
        const mockOrder = {
          orderNumber: "VR-82937",
          date: "Yesterday",
          total: 1850,
          status: "In Transit from Florence",
          itemsCount: 1,
          itemName: "Lucent Chain Bracelet",
        };
        setUserOrders([mockOrder]);
      }
    }
  }, [isOpen, user.email]);

  if (!isOpen) return null;

  const handleDailyCheckIn = () => {
    if (hasCheckedInToday) return;

    const updatedUser: UserProfile = {
      ...user,
      loyaltyPoints: (user.loyaltyPoints || 0) + 250,
    };

    localStorage.setItem(checkInKey, todayStr);
    setHasCheckedInToday(true);
    onUpdateUser(updatedUser);

    setSuccessMessage(
      "تم تسجيل الحضور اليومي وحصلت على +250 نقطة! / Daily check-in complete! +250 PTS",
    );
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleRedeemReward = (reward: Reward) => {
    if ((user.loyaltyPoints || 0) < reward.cost) return;

    const currentRedeemed = user.redeemedRewards || [];
    const updatedUser: UserProfile = {
      ...user,
      loyaltyPoints: (user.loyaltyPoints || 0) - reward.cost,
      redeemedRewards: [
        ...currentRedeemed,
        `${reward.titleEn} (Code: ${reward.code})`,
      ],
    };

    onUpdateUser(updatedUser);
    setSuccessMessage(
      `تم استرداد الجائزة بنجاح! الكود الخاص بك هو: ${reward.code}`,
    );
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      {/* Click-outside backdrop to close */}
      <div
        id="user-dropdown-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-transparent"
      />

      {/* Dropdown Container */}
      <div
        id="user-dropdown-container"
        className="absolute right-0 mt-3 w-[350px] md:w-[420px] rounded-2xl bg-[#fff8f3] border border-[#c5a880]/30 shadow-[0_12px_40px_rgba(21,16,10,0.12)] p-5 text-brand-dark z-50 text-left">
        <div className="flex justify-between items-center pb-3 border-b border-[#c5a880]/15">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#c5a880]" />
            <span className="text-[9px] uppercase tracking-[0.25em] font-semibold text-[#c5a880]">
              VERO Elite Vault
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-brand-outline/60 hover:text-brand-gold hover:bg-[#c5a880]/5 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Member Profile */}
        <div className="mt-4 flex items-center gap-3">
          <UserAvatar
            name={user.name}
            avatar={user.avatar}
            className="w-12 h-12"
            borderClassName="border-2 border-[#c5a880]/35 shadow"
          />
          <div className="space-y-0.5">
            <h4 className="font-serif text-xs md:text-sm tracking-wide font-medium uppercase text-brand-dark">
              {user.name}
            </h4>
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3 text-[#c5a880]" />
              <span className="text-[8.5px] uppercase tracking-wider font-semibold text-brand-gold">
                {user.tier}
              </span>
            </div>
            <p className="text-[9px] text-brand-outline truncate max-w-[200px]">
              {user.email}
            </p>
          </div>
        </div>

        {/* Inner Tabs Navigation */}
        {user?.email?.toLowerCase() === "vero2026@vero.com" && (
          <div className="flex border-b border-[#c5a880]/10 mt-4 text-[10px] font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveSubTab("overview")}
              className={`flex-1 pb-2 text-center border-b ${
                activeSubTab === "overview"
                  ? "text-brand-dark border-brand-gold"
                  : "text-brand-outline/60 border-transparent hover:text-brand-dark"
              }`}>
              الملف التعريفي / Profile
            </button>
            <button
              onClick={() => setActiveSubTab("rewards")}
              className={`flex-1 pb-2 text-center border-b ${
                activeSubTab === "rewards"
                  ? "text-brand-dark border-brand-gold"
                  : "text-brand-outline/60 border-transparent hover:text-brand-dark"
              }`}>
              متجر الجوائز / Rewards Vault
            </button>
          </div>
        )}

        {/* Global Feedback notification */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 bg-[#c5a880]/10 text-[#a3855a] border border-[#c5a880]/20 rounded-xl px-3 py-2 text-[10px] text-center font-semibold">
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 1: Overview */}
        {activeSubTab === "overview" && (
          <div className="space-y-4 mt-4">
            {/* Elegant Membership Card */}
            {(() => {
              const spent = user.totalSpent || 0;
              const tier = user.tier || "Bronze";

              // Dynamic card styles
              let cardBg =
                "bg-gradient-to-br from-[#aa7c11] via-[#dfc5a6] to-[#8c5e00] border border-amber-600/30";
              let cardText = "text-amber-50";
              let titleText = "🥉 BRONZE COLLECTOR";
              let isDiamond = false;
              let isSilver = false;

              if (tier === "Silver") {
                cardBg =
                  "bg-gradient-to-br from-slate-300 via-slate-50 to-slate-400 border border-slate-300";
                cardText = "text-slate-800";
                titleText = "🥈 SILVER COLLECTOR";
                isSilver = true;
              } else if (tier === "Gold") {
                cardBg =
                  "bg-gradient-to-br from-amber-400 via-yellow-100 to-amber-600 border border-amber-400";
                cardText = "text-amber-950";
                titleText = "🥇 GOLD COLLECTOR ✨";
              } else if (tier === "Platinum") {
                cardBg =
                  "bg-gradient-to-br from-indigo-950 via-teal-900 to-indigo-900 border border-teal-500/20";
                cardText = "text-teal-100";
                titleText = "💎 PLATINUM ELITE";
              } else if (tier === "Diamond") {
                cardBg =
                  "bg-gradient-to-br from-slate-950 via-cyan-950 to-blue-950 border border-cyan-400/40";
                cardText = "text-cyan-100";
                titleText = "💠 DIAMOND EXCLUSIVE";
                isDiamond = true;
              }

              return (
                <div
                  className={`p-4 rounded-xl ${cardBg} relative overflow-hidden shadow-lg transition-all duration-300`}>
                  {/* Sweep/Shimmer metallic highlight */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer pointer-events-none" />

                  {/* Diamond Floating Particles */}
                  {isDiamond && (
                    <>
                      <div
                        className="absolute top-2 right-12 w-2 h-2 bg-cyan-300 rounded-full animate-float-diamonds pointer-events-none opacity-60"
                        style={{ animationDelay: "0s" }}
                      />
                      <div
                        className="absolute bottom-4 right-4 w-1.5 h-1.5 bg-cyan-200 rounded-full animate-float-diamonds pointer-events-none opacity-75"
                        style={{ animationDelay: "1.5s" }}
                      />
                      <div
                        className="absolute top-6 left-16 w-2 h-2 bg-blue-300 rounded-full animate-float-diamonds pointer-events-none opacity-40"
                        style={{ animationDelay: "3.3s" }}
                      />
                    </>
                  )}

                  {/* Card Content */}
                  <div className="relative z-10 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span
                          className={`text-[8px] font-bold tracking-[0.2em] uppercase opacity-75 ${cardText}`}>
                          VERO Elite Club
                        </span>
                        <h5
                          className={`font-serif text-sm font-bold tracking-wide mt-0.5 ${cardText}`}>
                          {titleText}
                        </h5>
                      </div>
                      <span
                        className={`text-[10px] font-mono tracking-wider font-semibold bg-white/10 px-2 py-0.5 rounded ${cardText}`}>
                        EGP {spent.toLocaleString()} Spent
                      </span>
                    </div>

                    <div className="pt-2 flex justify-between items-end border-t border-white/10">
                      <div>
                        <p
                          className={`text-[8px] uppercase tracking-widest opacity-60 ${cardText}`}>
                          Collector Signature
                        </p>
                        <p
                          className={`font-serif text-xs italic tracking-wider mt-0.5 ${cardText}`}>
                          {user.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-[8px] uppercase tracking-widest opacity-60 ${cardText}`}>
                          Point Balance
                        </p>
                        <p
                          className={`text-xs font-bold font-mono tracking-widest mt-0.5 ${cardText}`}>
                          {user.loyaltyPoints || 0} PTS
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Loyalty Balance & Progress Bar */}
            <div className="p-4 rounded-xl bg-[#c5a880]/5 border border-[#c5a880]/10 space-y-2">
              {/* Dynamic progress bar and tier text according to user specification */}
              {(() => {
                const spent = user.totalSpent || 0;
                let pct = 0;
                let textAr = "";
                let textEn = "";
                if (spent < 10000) {
                  pct = (spent / 10000) * 100;
                  textAr = `الفئة البرونزية. اجمع ${(10000 - spent).toLocaleString()} EGP إضافية للوصول للفئة الفضية!`;
                  textEn = `Bronze Tier. Spend ${(10000 - spent).toLocaleString()} EGP more for Silver Tier (+25% Points)!`;
                } else if (spent < 30000) {
                  pct = ((spent - 10000) / 20000) * 100;
                  textAr = `الفئة الفضية. اجمع ${(30000 - spent).toLocaleString()} EGP للوصول للفئة الذهبية!`;
                  textEn = `Silver Tier. Spend ${(30000 - spent).toLocaleString()} EGP more for Gold Tier (Free permanent shipping)!`;
                } else if (spent < 70000) {
                  pct = ((spent - 30000) / 40000) * 100;
                  textAr = `الفئة الذهبية. اجمع ${(70000 - spent).toLocaleString()} EGP لفتح صالة البلاتينيوم!`;
                  textEn = `Gold Tier. Spend ${(70000 - spent).toLocaleString()} EGP more for Platinum Lounge!`;
                } else if (spent < 150000) {
                  pct = ((spent - 70000) / 80000) * 100;
                  textAr = `الفئة البلاتينية. اجمع ${(150000 - spent).toLocaleString()} EGP للوصول لفئة الدايموند النخبة!`;
                  textEn = `Platinum Lounge Active. Spend ${(150000 - spent).toLocaleString()} EGP more for Diamond Tier!`;
                } else {
                  pct = 100;
                  textAr =
                    "فئة دايموند 💠. لقد وصلت لقمة النخبة الفاخرة! تم تمكين كافة المميزات الاستثنائية.";
                  textEn =
                    "Exclusive Diamond Tier 💠. Absolute highest tier unlocked! Enjoy luxury travel invites!";
                }

                return (
                  <>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-brand-dark">
                      <span>التقدم للفئة التالية / Next Tier Progress</span>
                      <span className="font-mono text-[9px] text-brand-gold">
                        {Math.round(pct)}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-[#c5a880]/15 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-gold rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1 gap-2">
                      <div className="text-[8.5px] text-brand-outline leading-relaxed max-w-[200px]">
                        <p className="font-semibold text-[#a3855a]">{textAr}</p>
                        <p className="mt-0.5 opacity-80">{textEn}</p>
                      </div>
                      {/* Checkin button */}
                      <button
                        onClick={handleDailyCheckIn}
                        disabled={hasCheckedInToday}
                        className={`px-2.5 py-1.5 rounded-lg text-[8.5px] uppercase font-bold tracking-wider transition-all active:scale-95 shrink-0 ${
                          hasCheckedInToday
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-[#1a1510] text-white hover:bg-black"
                        }`}>
                        {hasCheckedInToday
                          ? "✓ تم تسجيل اليوم"
                          : "حضور يومي +250 PTS"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Member Privileges */}
            <div className="space-y-2">
              <h5 className="text-[9px] uppercase tracking-[0.2em] text-brand-outline/65 font-bold">
                ميزات ومكافآت الفئة الفعالة / Active Tier Perks
              </h5>
              {(() => {
                const tier = user.tier || "Bronze";
                const list = [
                  { text: "Birthday Celebration Gift 🎁" },
                  { text: "Members Only Private Offers 🏷️" },
                ];

                if (tier === "Bronze") {
                  list.push({ text: "Standard VERO Packaging 📦" });
                  list.push({ text: "1.00 Point per 100 EGP Spent 🪙" });
                } else if (tier === "Silver") {
                  list.push({ text: "1.25 Point per 100 EGP Spent 🪙" });
                  list.push({ text: "Free Shipping once per month 🚚" });
                  list.push({ text: "Small Surprise Box per 5 orders 🎁" });
                  list.push({ text: "24h Early Access to Discounts ⏱️" });
                  list.push({ text: "Priority Support Line 📞" });
                } else if (tier === "Gold") {
                  list.push({ text: "1.50 Point per 100 EGP Spent 🪙" });
                  list.push({ text: "Permanent Free Shipping 🚚" });
                  list.push({ text: "Premium Packaging Upgrade 📦" });
                  list.push({ text: "Monthly Mystery Box Delivery 🎁" });
                  list.push({ text: "24h Early Access to Collections ⏱️" });
                } else if (tier === "Platinum") {
                  list.push({ text: "2.00 Point per 100 EGP Spent 🪙" });
                  list.push({ text: "Permanent Free Shipping 🚚" });
                  list.push({ text: "Personal Shopping Assistant 🛍️" });
                  list.push({ text: "Access to Private Platinum Lounge 💎" });
                  list.push({ text: "Priority Air Freight Delivery ✈️" });
                } else if (tier === "Diamond") {
                  list.push({ text: "2.50 Point per 100 EGP Spent 🪙" });
                  list.push({ text: "Permanent Free Shipping 🚚" });
                  list.push({ text: "Private Luxury Invites (Florence) ✈️" });
                  list.push({ text: "Annual Custom Luxury Creation Gift 💎" });
                  list.push({ text: "Absolute Production Priority ⚜️" });
                }

                return (
                  <div className="grid grid-cols-2 gap-1.5 text-[8.5px] font-semibold">
                    {list.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-[#c5a880]/10 text-brand-dark shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-brand-gold/30 transition-all">
                        <Check className="w-2.5 h-2.5 text-brand-gold shrink-0" />
                        <span className="truncate leading-normal">
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Order History */}
            <div className="pt-2 border-t border-[#c5a880]/15 space-y-2">
              <div className="flex justify-between items-center text-[9px] uppercase tracking-[0.2em] font-bold text-brand-outline/65">
                <span>الطلبات الأخيرة / Recent Orders</span>
                <span className="font-sans text-[8px] text-brand-gold font-semibold uppercase">
                  {userOrders.length} Completed
                </span>
              </div>

              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {userOrders.length === 0 ? (
                  <p className="text-[9px] text-brand-outline/60 italic text-center py-2">
                    لا توجد طلبات مسجلة بعد.
                  </p>
                ) : (
                  userOrders.map((order, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-white border border-[#c5a880]/10 rounded-lg p-2 text-[9.5px]">
                      <div>
                        <p className="font-semibold text-brand-dark uppercase tracking-wider">
                          {order.itemName || "Boutique Order"}
                        </p>
                        <p className="text-[8px] text-brand-outline/60 mt-0.5">
                          {order.orderNumber} • {order.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-brand-gold">
                          ${order.total}
                        </p>
                        <p className="text-[7.5px] uppercase font-bold text-emerald-600 tracking-wider mt-0.5">
                          {order.status || "Completed"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Rewards Vault */}
        {activeSubTab === "rewards" &&
          user?.email?.toLowerCase() === "vero2026@vero.com" && (
            <div className="space-y-4 mt-4">
              {/* Header info */}
              <div className="bg-[#c5a880]/5 border border-[#c5a880]/10 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="text-[9px] text-brand-outline font-semibold uppercase">
                    نقاطك المتاحة / Available Points
                  </p>
                  <p className="text-sm font-bold text-brand-gold">
                    {user.loyaltyPoints || 0} PTS
                  </p>
                </div>
                <p className="text-[8px] text-brand-outline/70 text-right max-w-[150px]">
                  استبدل نقاطك بكوبونات خصم أو ميزات جوية فورية.
                </p>
              </div>

              {/* Rewards Catalogue */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {rewards.length === 0 ? (
                  <div className="text-center py-8 text-brand-outline font-light text-xs bg-brand-gold/5 border border-dashed border-[#c5a880]/20 rounded-xl p-4">
                    لا توجد جوائز متاحة حالياً في الخزنة. يرجى مراجعة المشرف
                    لاحقاً.
                    <span className="block mt-1 text-[10px] font-mono text-brand-gold">
                      No rewards currently available. Check back later!
                    </span>
                  </div>
                ) : (
                  rewards.map((reward) => {
                    const canAfford = (user.loyaltyPoints || 0) >= reward.cost;
                    return (
                      <div
                        key={reward.id}
                        className="p-3 bg-white border border-[#c5a880]/15 rounded-xl space-y-1.5 text-left relative">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h6 className="font-serif text-[10.5px] font-bold text-brand-dark">
                              {reward.title}
                            </h6>
                            <span className="text-[8px] font-sans text-brand-outline/70 block">
                              {reward.titleEn}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[9px] font-semibold text-brand-gold bg-[#c5a880]/10 px-1.5 py-0.5 rounded-md text-center">
                              {reward.cost} PTS
                            </span>
                            <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md text-center">
                              {reward.discountPercent}% OFF
                            </span>
                          </div>
                        </div>

                        <p className="text-[8.5px] text-brand-outline leading-relaxed">
                          {reward.description}
                        </p>

                        <div className="flex justify-between items-center pt-1 border-t border-[#c5a880]/5">
                          <span className="text-[8px] text-brand-outline/65">
                            Code: {reward.code}
                          </span>
                          <button
                            onClick={() => handleRedeemReward(reward)}
                            disabled={!canAfford}
                            className={`px-3 py-1 rounded-lg text-[8px] uppercase font-bold tracking-wider transition-all ${
                              canAfford
                                ? "bg-brand-gold hover:bg-[#b0936e] text-white active:scale-95"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}>
                            {canAfford ? "استرداد الجائزة" : "نقاط غير كافية"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* My Redeemed Rewards Vouchers */}
              {user.redeemedRewards && user.redeemedRewards.length > 0 && (
                <div className="pt-2 border-t border-[#c5a880]/15 space-y-2">
                  <h5 className="text-[9px] uppercase tracking-[0.2em] text-brand-outline/65 font-bold">
                    جوائزي المستردة / My Redeemed Awards
                  </h5>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {user.redeemedRewards.map((item, idx) => {
                      const codeMatch = item.match(/Code:\s*([A-Z0-9]+)/);
                      const code = codeMatch ? codeMatch[1] : "";
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-[#fdfaf7] border border-[#c5a880]/10 rounded-lg p-2 text-[9px]">
                          <span className="truncate max-w-[200px] text-brand-dark font-medium">
                            {item.split(" (Code:")[0]}
                          </span>
                          {code && (
                            <button
                              onClick={() => handleCopyCode(code)}
                              className="flex items-center gap-1 text-[8.5px] font-mono text-brand-gold hover:text-[#b0936e] bg-white border border-[#c5a880]/20 px-1.5 py-0.5 rounded-md active:scale-95 transition-all">
                              {copiedCode === code ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>{code}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-[#c5a880]/15">
          <button
            id="btn-logout"
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 border border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 hover:text-red-700 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all active:scale-[0.98]">
            <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
            Exit Private Vault
          </button>
        </div>
      </div>
    </>
  );
}
