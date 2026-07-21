import React from "react";
import {
  X,
  Check,
  Loader2,
  Sparkles,
  Shield,
  Award,
  User,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, getTierFromSpent } from "../types";
import UserAvatar from "./UserAvatar";
import { isSupabaseConfigured, authService } from "../services/supabaseService";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

const PRESET_USERS = {
  google: {
    name: "Elena Rostova",
    email: "elena.rostova@gmail.com",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    provider: "google" as const,
    tier: "Bronze" as const,
    loyaltyPoints: 35,
    totalSpent: 3500,
    joinedDate: "July 2026",
  },
  facebook: {
    name: "Julian Sterling",
    email: "j.sterling@facebook.com",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    provider: "facebook" as const,
    tier: "Silver" as const,
    loyaltyPoints: 231,
    totalSpent: 18500,
    joinedDate: "June 2026",
  },
  apple: {
    name: "Alexander Mercer",
    email: "a.mercer@icloud.com",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200",
    provider: "apple" as const,
    tier: "Gold" as const,
    loyaltyPoints: 720,
    totalSpent: 48000,
    joinedDate: "January 2026",
  },
};

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: AuthModalProps) {
  const [step, setStep] = React.useState<
    "select" | "loading" | "customize" | "success"
  >("select");
  const [authMode, setAuthMode] = React.useState<"social" | "website">(
    "website",
  ); // Default to website login per user demand
  const [websiteSubMode, setWebsiteSubMode] = React.useState<
    "login" | "signup"
  >("login");
  const [selectedProvider, setSelectedProvider] = React.useState<
    "google" | "facebook" | "apple" | "email" | null
  >(null);

  // Custom states for website auth
  const [emailInput, setEmailInput] = React.useState("");
  const [passwordInput, setPasswordInput] = React.useState("");
  const [passwordVisible, setPasswordVisible] = React.useState(false);

  // Customize state
  const [customName, setCustomName] = React.useState("");
  const [customEmail, setCustomEmail] = React.useState("");
  const [customTier, setCustomTier] =
    React.useState<UserProfile["tier"]>("Bronze");
  const [customAvatar, setCustomAvatar] = React.useState("default");

  // Feedback states
  const [errorMessage, setErrorMessage] = React.useState("");

  // Reset modal state on open/close
  React.useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelectedProvider(null);
      setCustomName("");
      setCustomEmail("");
      setEmailInput("");
      setPasswordInput("");
      setErrorMessage("");
      setPasswordVisible(false);
    }
  }, [isOpen]);

  const handleProviderSelect = (provider: "google" | "facebook" | "apple") => {
    setSelectedProvider(provider);
    setErrorMessage("");

    if (isSupabaseConfigured() && provider === "google") {
      setStep("loading");
      authService.signInWithGoogle().catch((err) => {
        setErrorMessage(err.message || "Google Sign-In failed.");
        setStep("select");
      });
      return;
    }

    setStep("loading");
    // Simulate standard OAuth secure handshake
    setTimeout(() => {
      const preset = PRESET_USERS[provider];
      setCustomName(preset.name);
      setCustomEmail(preset.email);
      setCustomTier(preset.tier);
      setCustomAvatar(preset.avatar);
      setStep("customize");
    }, 1800);
  };

  const handleWebsiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!emailInput || !passwordInput) {
      setErrorMessage(
        "الرجاء ملء جميع الحقول المطلوبة / Please fill in all fields.",
      );
      return;
    }

    if (!emailInput.includes("@")) {
      setErrorMessage(
        "الرجاء إدخال بريد إلكتروني صحيح / Please enter a valid email address.",
      );
      return;
    }

    if (passwordInput.length < 6) {
      setErrorMessage(
        "يجب أن تكون كلمة المرور 6 أحرف على الأقل / Password must be at least 6 characters.",
      );
      return;
    }

    // Supabase Auth Path
    if (isSupabaseConfigured()) {
      setStep("loading");
      if (websiteSubMode === "signup") {
        setSelectedProvider("email");
        setCustomEmail(emailInput.trim());
        setCustomName(
          emailInput.split("@")[0].charAt(0).toUpperCase() +
            emailInput.split("@")[0].slice(1),
        );
        setCustomAvatar("default");
        setStep("customize");
      } else {
        authService
          .signIn(emailInput.trim(), passwordInput)
          .then((res) => {
            if (res.user) {
              setStep("success");
              setTimeout(() => {
                onLoginSuccess(res.user!);
                onClose();
              }, 1500);
            } else {
              setErrorMessage(
                "خطأ في جلب بيانات الحساب / Error loading profile.",
              );
              setStep("select");
            }
          })
          .catch((err: any) => {
            setErrorMessage(
              err.message ||
                "البريد الإلكتروني أو كلمة المرور غير صحيحة / Invalid credentials.",
            );
            setStep("select");
          });
      }
      return;
    }

    // Local Fallback Path
    const savedAccountsStr = localStorage.getItem("vero_website_accounts");
    let accounts: Record<
      string,
      {
        name: string;
        email: string;
        tier: UserProfile["tier"];
        avatar: string;
        pass: string;
      }
    > = {};
    if (savedAccountsStr) {
      try {
        accounts = JSON.parse(savedAccountsStr);
      } catch (e) {
        // ignore
      }
    }

    const emailKey = emailInput.trim().toLowerCase();

    if (websiteSubMode === "signup") {
      if (accounts[emailKey]) {
        setErrorMessage(
          "هذا البريد الإلكتروني مسجل بالفعل / This email is already registered.",
        );
        return;
      }

      // Propose customizable member configuration step
      setSelectedProvider("email");
      setCustomEmail(emailInput.trim());
      setCustomName(
        emailInput.split("@")[0].charAt(0).toUpperCase() +
          emailInput.split("@")[0].slice(1),
      );
      setCustomAvatar("default");
      setStep("customize");
    } else {
      // Login mode
      const userAccount = accounts[emailKey];
      if (!userAccount || userAccount.pass !== passwordInput) {
        setErrorMessage(
          "البريد الإلكتروني أو كلمة المرور غير صحيحة / Invalid email or password.",
        );
        return;
      }

      // Successful login
      setSelectedProvider("email");
      setStep("loading");

      setTimeout(() => {
        const savedSpent =
          (userAccount as any).totalSpent !== undefined
            ? Number((userAccount as any).totalSpent)
            : 0;
        const savedPoints =
          (userAccount as any).loyaltyPoints !== undefined
            ? Number((userAccount as any).loyaltyPoints)
            : 0;
        const finalTier = getTierFromSpent(savedSpent);

        const loggedInUser: UserProfile = {
          name: userAccount.name,
          email: userAccount.email,
          avatar: userAccount.avatar,
          provider: "email",
          tier: finalTier,
          loyaltyPoints: savedPoints,
          totalSpent: savedSpent,
          redeemedRewards: (userAccount as any).redeemedRewards || [],
          joinedDate: "July 2026",
        };
        setStep("success");
        setTimeout(() => {
          onLoginSuccess(loggedInUser);
          onClose();
        }, 1500);
      }, 1500);
    }
  };

  const handleCompleteSignIn = () => {
    const finalEmail = customEmail || emailInput.trim();
    const finalName = customName || "VERO Collector";

    // Supabase Sign-Up Execution
    if (
      isSupabaseConfigured() &&
      selectedProvider === "email" &&
      websiteSubMode === "signup"
    ) {
      setStep("loading");
      authService
        .signUp(finalEmail, passwordInput, finalName)
        .then(() => {
          const loggedInUser: UserProfile = {
            name: finalName,
            email: finalEmail,
            avatar: customAvatar,
            provider: "email",
            tier: "Bronze",
            loyaltyPoints: 0,
            totalSpent: 0,
            joinedDate: "July 2026",
            redeemedRewards: [],
          };
          setStep("success");
          setTimeout(() => {
            onLoginSuccess(loggedInUser);
            onClose();
          }, 1500);
        })
        .catch((err: any) => {
          setErrorMessage(
            err.message || "فشل إنشاء الحساب / Registration failed.",
          );
          setStep("customize");
        });
      return;
    }

    setStep("success");
    let initialSpent = 0;
    let initialPoints = 0;

    if (selectedProvider && selectedProvider !== "email") {
      initialSpent = Number(PRESET_USERS[selectedProvider].totalSpent);
      initialPoints = Number(PRESET_USERS[selectedProvider].loyaltyPoints);
    } else {
      if (customTier === "Silver") {
        initialSpent = 15000;
        initialPoints = 187;
      } else if (customTier === "Gold") {
        initialSpent = 45000;
        initialPoints = 675;
      } else if (customTier === "Platinum") {
        initialSpent = 95000;
        initialPoints = 1900;
      } else if (customTier === "Diamond") {
        initialSpent = 180000;
        initialPoints = 4500;
      } else {
        initialSpent = 2500;
        initialPoints = 25;
      }
    }

    const determinedTier = getTierFromSpent(initialSpent);

    // If website sign-up, persist the account details in localStorage
    if (selectedProvider === "email" && websiteSubMode === "signup") {
      const savedAccountsStr = localStorage.getItem("vero_website_accounts");
      let accounts: any = {};
      if (savedAccountsStr) {
        try {
          accounts = JSON.parse(savedAccountsStr);
        } catch (e) {
          // ignore
        }
      }
      accounts[finalEmail.toLowerCase()] = {
        name: finalName,
        email: finalEmail,
        tier: determinedTier,
        avatar: customAvatar,
        pass: passwordInput,
        loyaltyPoints: initialPoints,
        totalSpent: initialSpent,
        redeemedRewards: [],
      };
      localStorage.setItem("vero_website_accounts", JSON.stringify(accounts));
    }

    const loggedInUser: UserProfile = {
      name: finalName,
      email: finalEmail,
      avatar: customAvatar,
      provider: selectedProvider || "email",
      tier: determinedTier,
      loyaltyPoints: initialPoints,
      totalSpent: initialSpent,
      joinedDate: "July 2026",
      redeemedRewards: [],
    };

    setTimeout(() => {
      onLoginSuccess(loggedInUser);
      onClose();
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="auth-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Background Overlay */}
        <motion.div
          id="auth-modal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#15100a]/70 backdrop-blur-md"
        />

        {/* Modal Box */}
        <motion.div
          id="auth-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#fff8f3] text-brand-dark shadow-[0_20px_50px_rgba(21,16,10,0.15)] border border-[#c5a880]/30">
          {/* Subtle Golden Glow Header Decoration */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#c5a880] to-transparent" />

          {/* Close Button */}
          {step !== "loading" && step !== "success" && (
            <button
              id="close-auth-modal"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-brand-outline/60 hover:text-brand-gold hover:bg-[#c5a880]/5 rounded-full transition-all active:scale-95 duration-200">
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>
          )}

          {/* Content Wrapper */}
          <div className="px-8 py-10">
            {/* Step 1: Select or Website Login */}
            {step === "select" && (
              <motion.div
                key="step-select"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6">
                <div className="text-center space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-medium text-[#c5a880] flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#c5a880]" />
                    VERO Private Member Access
                  </span>
                  <h2 className="font-serif text-2xl tracking-[0.05em] font-medium text-brand-dark uppercase">
                    Welcome Back
                  </h2>
                  <p className="text-xs text-brand-outline max-w-[280px] mx-auto leading-relaxed">
                    Access your secure profile, saved collections, and exclusive
                    private member tiers.
                  </p>
                </div>

                {/* Secure Auth Toggle Tabs */}
                <div className="flex border-b border-[#c5a880]/15 text-xs font-semibold uppercase tracking-wider">
                  <button
                    onClick={() => {
                      setAuthMode("website");
                      setErrorMessage("");
                    }}
                    className={`flex-1 py-3 text-center transition-all ${
                      authMode === "website"
                        ? "text-brand-dark border-b-2 border-brand-gold font-bold"
                        : "text-brand-outline/60 hover:text-brand-dark"
                    }`}>
                    حساب الموقع / Website Account
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode("social");
                      setErrorMessage("");
                    }}
                    className={`flex-1 py-3 text-center transition-all ${
                      authMode === "social"
                        ? "text-brand-dark border-b-2 border-brand-gold font-bold"
                        : "text-brand-outline/60 hover:text-brand-dark"
                    }`}>
                    شبكات التواصل / Social
                  </button>
                </div>

                {/* Dynamic Error Messaging */}
                {errorMessage && (
                  <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-xs text-center font-medium animate-shake">
                    {errorMessage}
                  </div>
                )}

                {/* 1A: Custom Website Credentials Flow */}
                {authMode === "website" && (
                  <form onSubmit={handleWebsiteSubmit} className="space-y-4">
                    <div className="flex justify-center gap-3 text-[10px] uppercase tracking-widest font-semibold pb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setWebsiteSubMode("login");
                          setErrorMessage("");
                        }}
                        className={`px-3 py-1.5 rounded-full transition-all ${
                          websiteSubMode === "login"
                            ? "bg-[#1a1510] text-white"
                            : "bg-[#c5a880]/10 text-brand-outline hover:bg-[#c5a880]/20"
                        }`}>
                        تسجيل الدخول / Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWebsiteSubMode("signup");
                          setErrorMessage("");
                        }}
                        className={`px-3 py-1.5 rounded-full transition-all ${
                          websiteSubMode === "signup"
                            ? "bg-[#1a1510] text-white"
                            : "bg-[#c5a880]/10 text-brand-outline hover:bg-[#c5a880]/20"
                        }`}>
                        إنشاء حساب جديد / Sign Up
                      </button>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[9px] uppercase tracking-[0.2em] text-brand-outline font-semibold">
                        البريد الإلكتروني / Email Address
                      </label>
                      <input
                        id="input-website-email"
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full bg-white border border-[#c5a880]/20 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#c5a880] tracking-wide"
                        placeholder="yourname@domain.com"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[9px] uppercase tracking-[0.2em] text-brand-outline font-semibold">
                        كلمة المرور / Password
                      </label>
                      <div className="relative">
                        <input
                          id="input-website-password"
                          type={passwordVisible ? "text" : "password"}
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full bg-white border border-[#c5a880]/20 rounded-lg pl-3.5 pr-10 py-2.5 text-xs focus:outline-none focus:border-[#c5a880]"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setPasswordVisible(!passwordVisible)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-outline/60 hover:text-brand-dark text-[10px] font-semibold uppercase tracking-wider focus:outline-none">
                          {passwordVisible ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      id="btn-website-auth-submit"
                      className="w-full mt-2 py-3 bg-brand-gold hover:bg-[#b0936e] text-white text-xs font-semibold uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(197,168,128,0.2)] active:scale-[0.98]">
                      {websiteSubMode === "login"
                        ? "سجل الدخول للموقع / Authenticate Sign In"
                        : "متابعة إنشاء الحساب / Continue Registration"}
                    </button>
                  </form>
                )}

                {/* 1B: Social Sign-In Buttons */}
                {authMode === "social" && (
                  <div className="space-y-3 pt-2">
                    {/* Google */}
                    <button
                      id="btn-login-google"
                      onClick={() => handleProviderSelect("google")}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-white border border-[#c5a880]/15 rounded-xl hover:border-[#c5a880]/60 hover:shadow-[0_4px_12px_rgba(197,168,128,0.08)] active:scale-[0.99] transition-all duration-200 group">
                      <div className="flex items-center gap-3">
                        {/* High-fidelity Google SVG */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#EA4335"
                            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.764 1.058 15.036 0 12 0 7.33 0 3.33 2.69 1.386 6.614l3.88 3.151z"
                          />
                          <path
                            fill="#34A853"
                            d="M16.04 15.34c-1.04.74-2.4 1.18-4.04 1.18-2.9 0-5.36-1.96-6.24-4.59L1.88 15.08C3.82 18.99 7.82 21.68 12 21.68c2.94 0 5.61-.97 7.64-2.62l-3.6-3.72z"
                          />
                          <path
                            fill="#4285F4"
                            d="M23.49 12.275c0-.7-.06-1.4-.19-2.07H12v4.16h6.47c-.28 1.48-1.12 2.74-2.38 3.58l3.6 3.72c2.1-1.94 3.8-5.3 3.8-9.39z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.76 11.91c0-.44.07-.87.2-1.29l-3.88-3.15A11.95 11.95 0 0 0 0 12c0 1.63.32 3.19.92 4.62l3.86-3.04a7.06 7.06 0 0 1-.22-1.67z"
                          />
                        </svg>
                        <span className="text-xs font-semibold tracking-wider text-brand-dark uppercase">
                          Continue with Google
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-brand-outline/40 group-hover:text-[#c5a880] group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* Facebook */}
                    <button
                      id="btn-login-facebook"
                      onClick={() => handleProviderSelect("facebook")}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-white border border-[#c5a880]/15 rounded-xl hover:border-[#c5a880]/60 hover:shadow-[0_4px_12px_rgba(197,168,128,0.08)] active:scale-[0.99] transition-all duration-200 group">
                      <div className="flex items-center gap-3">
                        {/* High-fidelity Facebook SVG */}
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="#1877F2">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span className="text-xs font-semibold tracking-wider text-brand-dark uppercase">
                          Continue with Facebook
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-brand-outline/40 group-hover:text-[#c5a880] group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* iCloud / Apple */}
                    <button
                      id="btn-login-apple"
                      onClick={() => handleProviderSelect("apple")}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-[#15100a] rounded-xl hover:bg-black hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] active:scale-[0.99] transition-all duration-200 group">
                      <div className="flex items-center gap-3">
                        {/* High-fidelity Apple SVG */}
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="#fff">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.5-.63.73-1.18 1.87-1.03 2.97 1.12.09 2.27-.56 2.98-1.41z" />
                        </svg>
                        <span className="text-xs font-semibold tracking-wider text-white uppercase">
                          Sign in with Apple
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                )}

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-[#c5a880]/15"></div>
                  <span className="flex-shrink mx-4 text-[9px] uppercase tracking-[0.2em] text-brand-outline/50 font-medium">
                    Secure Luxury Gate
                  </span>
                  <div className="flex-grow border-t border-[#c5a880]/15"></div>
                </div>

                <div className="flex items-center gap-3 bg-[#c5a880]/5 rounded-xl p-3.5 border border-[#c5a880]/10 text-left">
                  <Shield className="w-5 h-5 text-[#c5a880] shrink-0" />
                  <p className="text-[10px] text-brand-outline leading-relaxed">
                    End-to-end encrypted protocol. Your personal credentials are
                    never stored on unauthorized public nodes.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Handshake Loading Overlay */}
            {step === "loading" && (
              <motion.div
                key="step-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-[#c5a880]/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#c5a880] animate-spin stroke-[1.25]" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full bg-[#c5a880]/5 filter blur-md"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-serif text-lg tracking-wider text-brand-dark uppercase">
                    Contacting Provider
                  </h3>
                  <p className="text-xs text-brand-outline max-w-[250px] leading-relaxed">
                    Connecting to the secure auth modules...
                  </p>
                </div>

                <div className="w-32 h-[2px] bg-[#c5a880]/15 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "linear",
                    }}
                    className="relative w-1/2 h-full bg-[#c5a880]"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Customize Member Card / Confirmation */}
            {step === "customize" && (
              <motion.div
                key="step-customize"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-left">
                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.25em] font-medium text-[#c5a880]">
                    Verify Member Card
                  </span>
                  <h3 className="font-serif text-xl tracking-wide font-medium text-brand-dark uppercase">
                    Personalize Account
                  </h3>
                </div>

                {/* Simulated Private Member Card */}
                <div className="relative bg-gradient-to-br from-[#1a1510] to-[#28211a] rounded-2xl p-5 border border-[#c5a880]/30 shadow-xl text-white overflow-hidden group">
                  {/* Watermark Logo */}
                  <div className="absolute right-[-20px] bottom-[-20px] font-serif text-[100px] text-white/[0.03] select-none uppercase tracking-[0.1em] pointer-events-none">
                    VERO
                  </div>

                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[8px] uppercase tracking-[0.3em] font-semibold text-[#c5a880]">
                        VERO PRIVATE MEMBER
                      </span>
                      <h4 className="font-serif text-sm tracking-wider uppercase text-[#fff8f3] mt-1 font-semibold">
                        {customName || "VERO Collector"}
                      </h4>
                    </div>
                    {/* Tiny Chip SVG */}
                    <div className="w-7 h-5 bg-[#c5a880]/20 rounded border border-[#c5a880]/30 flex items-center justify-center">
                      <div className="w-4 h-3 bg-gradient-to-r from-[#e5d5bc] to-[#c5a880] rounded-[2px]" />
                    </div>
                  </div>

                  {/* Avatar & Input */}
                  <div className="flex items-center gap-4">
                    <UserAvatar
                      name={customName}
                      avatar={customAvatar}
                      className="w-12 h-12"
                      borderClassName="border border-[#c5a880]/40 shadow-md shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-[8px] uppercase tracking-widest text-[#c5a880] block font-bold">
                        Exclusive Tier
                      </span>
                      <span className="text-[11px] font-semibold tracking-wider text-white flex items-center gap-1.5 uppercase">
                        <Award className="w-3.5 h-3.5 text-[#c5a880]" />
                        {customTier}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between items-end border-t border-white/[0.08] pt-3 text-[8px] tracking-[0.2em] text-[#e5d5bc]/70">
                    <div>
                      <p className="uppercase text-[6px] tracking-widest text-brand-outline-variant">
                        MEMBER ID
                      </p>
                      <p className="font-mono mt-0.5">
                        VR-2026-{Math.floor(1000 + Math.random() * 9000)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="uppercase text-[6px] tracking-widest text-brand-outline-variant">
                        ISSUE COUNTRY
                      </p>
                      <p className="font-mono mt-0.5">FLORENCE, IT</p>
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-brand-outline font-semibold">
                      الاسم الكامل / Full Name
                    </label>
                    <input
                      id="input-auth-name"
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-[#c5a880] tracking-wide"
                      placeholder="Enter name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-brand-outline font-semibold">
                      فئة العضوية / Private Collector Tier
                    </label>
                    <select
                      id="select-auth-tier"
                      value={customTier}
                      onChange={(e) =>
                        setCustomTier(e.target.value as UserProfile["tier"])
                      }
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-[#c5a880] tracking-wide text-brand-dark">
                      <option value="Bronze">🥉 Bronze (0 - 9,999 EGP)</option>
                      <option value="Silver">
                        🥈 Silver (10,000 - 29,999 EGP)
                      </option>
                      <option value="Gold">
                        🥇 Gold (30,000 - 69,999 EGP)
                      </option>
                      <option value="Platinum">
                        💎 Platinum (70,000 - 149,999 EGP)
                      </option>
                      <option value="Diamond">
                        💠 Diamond (150,000 - 299,999 EGP)
                      </option>
                    </select>
                  </div>
                </div>

                {/* Continue button */}
                <button
                  id="btn-auth-confirm"
                  onClick={handleCompleteSignIn}
                  className="w-full py-3 bg-brand-gold hover:bg-[#b0936e] active:scale-[0.98] text-white text-xs font-semibold uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(197,168,128,0.2)]">
                  تأكيد الحساب / Authorize Signature
                </button>
              </motion.div>
            )}

            {/* Step 4: Login Success Confirmation */}
            {step === "success" && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 flex flex-col items-center justify-center text-center space-y-5">
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 150 }}
                    className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500/30 flex items-center justify-center">
                    <Check className="w-8 h-8 text-emerald-600 stroke-[2.5]" />
                  </motion.div>
                  {/* Ring animations */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 rounded-full border-2 border-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-serif text-xl tracking-wider text-brand-dark uppercase">
                    تم التصديق بنجاح / Signature Certified
                  </h3>
                  <p className="text-xs text-brand-outline leading-relaxed max-w-[280px]">
                    مرحباً بك،{" "}
                    <span className="font-semibold text-brand-dark">
                      {customName}
                    </span>
                    . تم فتح الميزات الخاصة بك بالكامل.
                  </p>
                </div>

                <div className="text-[10px] text-[#c5a880] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#c5a880]" />
                  {customTier} Activated
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
