import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link, useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Home as HomeIcon, Search, Plus, MessageCircle, User, Heart, Bell, Settings, LogOut,
  Menu, X, ChevronLeft, ChevronRight, ChevronDown, Sparkles, MapPin, Clock, Eye, Zap,
  Send, Image as ImageIcon, Mic, MicOff, Paperclip, Flag, Shield, Star, Filter,
  Grid3X3, LayoutDashboard, Users, FileText, AlertTriangle, TrendingUp, Package,
  Trash2, Edit, Check, Loader2, ArrowRight, ArrowLeft, Phone, Mail, Calendar,
  Award, BookOpen, Palette, Upload, Save, Play, Pause, CheckCircle, XCircle,
  MoreVertical, Copy, ExternalLink, Globe, Type, Layout, Layers, Sliders, Ban,
  UserCheck, RefreshCw, PlusCircle, Laptop, Sofa, Car, Building2, Shirt, Book,
  Wrench, Home, Dumbbell, Baby, Dog, Sun, Box, AlertCircle, Minus, Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GOVERNORATES = ["دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "إدلب", "الرقة", "دير الزور", "الحسكة", "درعا", "السويداء", "القنيطرة"];
const CATEGORIES = [
  { name: "إلكترونيات", icon: Laptop }, { name: "أثاث", icon: Sofa }, { name: "سيارات", icon: Car },
  { name: "عقارات", icon: Building2 }, { name: "ملابس", icon: Shirt }, { name: "كتب", icon: Book },
  { name: "خدمات", icon: Wrench }, { name: "أجهزة منزلية", icon: Home }, { name: "رياضة", icon: Dumbbell },
  { name: "أطفال", icon: Baby }, { name: "حيوانات", icon: Dog }, { name: "طاقة شمسية", icon: Sun }, { name: "أخرى", icon: Box }
];

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);
const SettingsContext = createContext(null);
const useSettings = () => useContext(SettingsContext);

// Context للتحقق من التوثيق
const VerificationContext = createContext(null);
const useVerification = () => useContext(VerificationContext);

const useStickyState = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    if (saved) { try { return JSON.parse(saved); } catch { return defaultValue; } }
    return defaultValue;
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
};

const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({ site_name: "زون | zone", primary_color: "#8b5cf6", custom_font_name: "Tajawal" });
  
  const fetchSettings = async () => { try { const res = await axios.get(`${API}/settings`); setSettings(res.data); } catch (e) { console.error(e); } };
  
  useEffect(() => { fetchSettings(); }, []);
  
  return <SettingsContext.Provider value={{ settings, refreshSettings: fetchSettings }}>{children}</SettingsContext.Provider>;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useStickyState("badal_user", null);
  const [token, setToken] = useStickyState("badal_token", null);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [verificationMessage, setVerificationMessage] = useState(null);

  // إظهار الإشعار مع رسالة مخصصة
  const triggerVerificationBanner = (message = null) => {
    // لا تُظهر الإشعار إذا كان المستخدم موثقاً
    if (user?.verified) return;
    setVerificationMessage(message);
    setShowVerificationBanner(true);
  };

  // إخفاء مؤقت ثم إعادة الظهور بعد 5 ثواني (فقط إذا لم يكن موثقاً)
  const dismissVerificationBanner = () => {
    setShowVerificationBanner(false);
    setVerificationMessage(null);
    // لا تُعِد الإشعار إذا كان المستخدم موثقاً
    setTimeout(() => {
      // نتحقق من حالة المستخدم الحالية
      setShowVerificationBanner(prev => {
        // سيتم التحقق في VerificationBanner نفسه
        return true;
      });
    }, 5000);
  };

  const fetchUnreadCounts = async () => {
    if (!token) return;
    try {
      const [msgRes, notifRes] = await Promise.all([
        axios.get(`${API}/messages/unread-count`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUnreadMessages(msgRes.data.count);
      setUnreadNotifications(notifRes.data.count);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          setUser(res.data);
          fetchUnreadCounts();
        } catch { setUser(null); setToken(null); }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    setToken(res.data.access_token); setUser(res.data.user);
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/auth/register`, data);
    setToken(res.data.access_token); setUser(res.data.user);
    return res.data;
  };

  const logout = () => { setUser(null); setToken(null); setUnreadMessages(0); setUnreadNotifications(0); localStorage.removeItem("badal_user"); localStorage.removeItem("badal_token"); };
  
  // تحديث بيانات المستخدم من السيرفر
  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
      // إذا أصبح المستخدم موثقاً، نخفي الإشعار نهائياً
      if (res.data.verified) {
        setShowVerificationBanner(false);
      }
      return res.data;
    } catch (e) {
      console.error("Failed to refresh user:", e);
    }
  };
  
  // API مع معالجة خطأ التوثيق
  const api = axios.create({ baseURL: API, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  
  // Interceptor لمعالجة أخطاء التوثيق
  api.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 403 && error.response?.data?.detail?.includes("التحقق")) {
        triggerVerificationBanner("يجب تفعيل حسابك أولاً لإتمام هذا الإجراء");
      }
      return Promise.reject(error);
    }
  );

  return (
    <AuthContext.Provider value={{ 
      user, token, login, register, logout, loading, api, refreshUser,
      unreadMessages, unreadNotifications, fetchUnreadCounts,
      showVerificationBanner, dismissVerificationBanner, triggerVerificationBanner, verificationMessage
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.is_admin) return <Navigate to="/" replace />;
  return children;
};

// شريط تنبيه للمستخدمين غير المحققين - تصميم عائم إبداعي
const VerificationBanner = () => {
  const { user, showVerificationBanner, dismissVerificationBanner, verificationMessage } = useAuth();
  const navigate = useNavigate();
  
  // لا تظهر للأدمن أو المستخدمين المحققين أو غير المسجلين أو إذا تم إخفاؤه
  if (!user || user.is_admin || user.verified || !showVerificationBanner) return null;
  
  // تحديد إذا كانت رسالة خطأ (من محاولة إجراء)
  const isError = verificationMessage !== null;
  
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 100, opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      key={verificationMessage || "default"}
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50"
    >
      <div className={`rounded-2xl shadow-2xl overflow-hidden ${isError ? 'bg-gradient-to-r from-red-500 via-red-600 to-rose-600' : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500'}`}>
        {/* شريط متحرك علوي */}
        <div className="h-1 bg-white/30 overflow-hidden">
          <motion.div 
            className="h-full bg-white/60 w-1/3"
            animate={{ x: ["0%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </div>
        
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* أيقونة متحركة */}
            <motion.div 
              animate={isError ? { scale: [1, 1.2, 1] } : { rotate: [0, 10, -10, 0] }}
              transition={{ duration: isError ? 0.5 : 2, repeat: isError ? 3 : Infinity }}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isError ? 'bg-white/30' : 'bg-white/20'}`}
            >
              {isError ? <AlertCircle className="w-5 h-5 text-white" /> : <Shield className="w-5 h-5 text-white" />}
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-bold text-sm md:text-base">
                {isError ? "⚠️ تنبيه!" : "فعّل حسابك الآن! 🔐"}
              </h4>
              <p className="text-white/90 text-xs md:text-sm mt-1">
                {verificationMessage || "تحقق من WhatsApp لاستخدام جميع ميزات المنصة"}
              </p>
              
              <div className="flex items-center gap-2 mt-3">
                <Button 
                  size="sm" 
                  className={`shadow-lg text-xs md:text-sm h-8 px-3 ${isError ? 'bg-white text-red-600 hover:bg-red-50' : 'bg-white text-orange-600 hover:bg-orange-50'}`}
                  onClick={() => navigate("/verify-phone", { state: { phone: user.phone } })}
                >
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                  تفعيل الآن
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10 text-xs h-8 px-2"
                  onClick={dismissVerificationBanner}
                >
                  لاحقاً
                </Button>
              </div>
            </div>
            
            {/* زر الإغلاق */}
            <button 
              onClick={dismissVerificationBanner}
              className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TrustBadge = ({ score }) => {
  let color, label;
  if (score >= 75) { color = "bg-gradient-to-r from-gray-300 to-gray-400"; label = "بلاتيني"; }
  else if (score >= 50) { color = "bg-gradient-to-r from-yellow-400 to-yellow-500"; label = "ذهبي"; }
  else if (score >= 25) { color = "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700"; label = "فضي"; }
  else { color = "bg-gradient-to-r from-orange-300 to-orange-400"; label = "برونزي"; }
  return <Badge className={`${color} text-xs px-2 py-0.5`}><Star className="w-3 h-3 ml-1" />{label}</Badge>;
};

const GlassCard = ({ children, className = "", hover = true, ...props }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className={`bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-soft ${hover ? 'hover:shadow-hover' : ''} transition-all duration-300 ${className}`} {...props}>
    {children}
  </motion.div>
);

// Navbar
const Navbar = () => {
  const { user, logout, unreadMessages, unreadNotifications, fetchUnreadCounts } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMobileMenuOpen(false); setDesktopMenuOpen(false); }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const token = JSON.parse(localStorage.getItem("badal_token") || "null");
      if (!token) return;
      const res = await axios.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(res.data.slice(0, 5));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (user) { fetchNotifications(); fetchUnreadCounts(); } }, [user, fetchUnreadCounts]);

  const markNotificationsAsRead = async () => {
    try {
      const token = JSON.parse(localStorage.getItem("badal_token") || "null");
      if (!token) return;
      await axios.put(`${API}/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchUnreadCounts();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (e) { console.error(e); }
  };

  const markSingleNotificationRead = async (notifId) => {
    try {
      const token = JSON.parse(localStorage.getItem("badal_token") || "null");
      if (!token) return;
      await axios.put(`${API}/notifications/${notifId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchUnreadCounts();
      setNotifications(notifications.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (e) { console.error(e); }
  };

  // Default menu items
  const defaultMenuItems = [
    { id: "home", label: "الرئيسية", link: "/", icon: "home" },
    { id: "browse", label: "تصفح العروض", link: "/browse", icon: "search" },
    { id: "blog", label: "المدونة", link: "/blog", icon: "book" },
  ];

  // Get menu items from settings or use defaults
  const menuItems = (settings?.menu_items && settings.menu_items.length > 0) 
    ? settings.menu_items.filter(item => item.is_visible).sort((a, b) => a.order - b.order)
    : defaultMenuItems;

  const getMenuIcon = (iconName) => {
    const icons = {
      home: HomeIcon, search: Search, book: BookOpen, heart: Heart, user: User,
      mail: Mail, phone: Phone, star: Star, package: Package, settings: Settings,
      globe: Globe, calendar: Calendar, award: Award, zap: Zap, map: MapPin
    };
    const IconComponent = icons[iconName] || Globe;
    return <IconComponent className="w-5 h-5" />;
  };

  const guestNavItems = [
    { path: "/", icon: HomeIcon, label: "الرئيسية" },
    { path: "/browse", icon: Search, label: "تصفح" },
  ];

  const userNavItems = [
    { path: "/", icon: HomeIcon, label: "الرئيسية" },
    { path: "/browse", icon: Search, label: "تصفح" },
    { path: "/add-offer", icon: Plus, label: "أضف عرض", highlight: true },
    { path: "/messages", icon: MessageCircle, label: "الرسائل", badge: unreadMessages },
  ];

  const navItems = user ? userNavItems : guestNavItems;

  return (
    <>
      {/* Desktop Navbar */}
      <nav className={`hidden md:block sticky top-4 mx-auto max-w-7xl z-50 mt-4 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg' : 'bg-white/80 backdrop-blur-xl'} border border-white/40 rounded-full px-6 py-3`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/25 overflow-hidden">
                {settings?.site_logo ? (
                  <img src={settings.site_logo} alt={settings.site_name || "زون | zone"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-xl">ب</span>
                )}
              </motion.div>
              <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{settings?.site_name || "زون | zone"}</span>
            </Link>

            {/* Desktop Menu Button */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
                className="rounded-full px-4 py-2 hover:bg-purple-50 flex items-center gap-2"
              >
                <Menu className="w-5 h-5" />
                <span className="font-medium">القائمة</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${desktopMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              <AnimatePresence>
                {desktopMenuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setDesktopMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-purple-100 overflow-hidden z-50"
                    >
                      <div className="p-2">
                        {menuItems.map((item, idx) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            {item.link.startsWith('http') ? (
                              <a
                                href={item.link}
                                target={item.open_in_new_tab ? "_blank" : "_self"}
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-50 transition-colors group"
                                onClick={() => setDesktopMenuOpen(false)}
                              >
                                <span className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                  {getMenuIcon(item.icon)}
                                </span>
                                <span className="font-medium">{item.label}</span>
                                {item.open_in_new_tab && <ExternalLink className="w-4 h-4 text-muted-foreground mr-auto" />}
                              </a>
                            ) : (
                              <Link
                                to={item.link}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === item.link ? 'bg-primary text-white' : 'hover:bg-purple-50'}`}
                                onClick={() => setDesktopMenuOpen(false)}
                              >
                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${location.pathname === item.link ? 'bg-white/20' : 'bg-purple-100 group-hover:bg-primary group-hover:text-white'}`}>
                                  {getMenuIcon(item.icon)}
                                </span>
                                <span className="font-medium">{item.label}</span>
                              </Link>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${location.pathname === item.path ? "bg-primary text-white shadow-md shadow-primary/25" : item.highlight ? "bg-primary/10 text-primary hover:bg-primary hover:text-white" : "hover:bg-purple-50 text-muted-foreground hover:text-primary"}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.badge > 0 && <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">{item.badge}</span>}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/favorites" className="p-2 hover:bg-purple-50 rounded-full transition-colors relative group">
                  <Heart className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" onClick={markNotificationsAsRead}>
                      <Bell className="w-5 h-5" />
                      {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">{unreadNotifications}</span>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="p-3 font-semibold flex justify-between items-center">
                      <span>الإشعارات</span>
                      <Link to="/notifications" className="text-xs text-primary hover:underline">عرض الكل</Link>
                    </div>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-64">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">لا توجد إشعارات</div>
                      ) : (
                        notifications.map((n) => (
                          <DropdownMenuItem key={n.id} className={`p-3 cursor-pointer ${!n.is_read ? "bg-purple-50" : ""}`} onClick={() => { markSingleNotificationRead(n.id); n.link && navigate(n.link); }}>
                            <div><p className="font-medium">{n.title}</p><p className="text-sm text-muted-foreground line-clamp-1">{n.message}</p></div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 hover:bg-purple-50 rounded-full pr-2 pl-4">
                      <Avatar className="w-8 h-8 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary text-white">{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="p-3 border-b">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="mt-2"><TrustBadge score={user.trust_score} /></div>
                    </div>
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2"><User className="w-4 h-4" />الملف الشخصي</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-offers")} className="gap-2"><Package className="w-4 h-4" />عروضي</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/favorites")} className="gap-2"><Heart className="w-4 h-4" />المفضلة</DropdownMenuItem>
                    {user.is_admin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 text-primary"><LayoutDashboard className="w-4 h-4" />لوحة التحكم</DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="gap-2 text-destructive"><LogOut className="w-4 h-4" />تسجيل الخروج</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => navigate("/login")} className="rounded-full">دخول</Button>
                <Button onClick={() => navigate("/register")} className="rounded-full shadow-md shadow-primary/25">تسجيل جديد</Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - تصميم إبداعي جديد */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around h-16 px-2">
          {(user ? [
            { path: "/", icon: HomeIcon, label: "الرئيسية" },
            { path: "/browse", icon: Search, label: "تصفح" },
            { path: "/add-offer", icon: Plus, label: "أضف", highlight: true },
            { path: "/messages", icon: MessageCircle, label: "الرسائل", badge: unreadMessages },
            { action: () => setMobileMenuOpen(true), icon: User, label: "المزيد", isMenu: true },
          ] : [
            { path: "/", icon: HomeIcon, label: "الرئيسية" },
            { path: "/browse", icon: Search, label: "تصفح" },
            { path: "/add-offer", icon: Plus, label: "أضف", highlight: true },
            { action: () => setMobileMenuOpen(true), icon: Menu, label: "القائمة", isMenu: true },
            { path: "/login", icon: User, label: "دخول" },
          ]).map((item, idx) => (
            item.isMenu ? (
              <button key="menu" onClick={item.action}
                className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all text-gray-400 hover:text-purple-600 active:scale-95">
                <div className="w-6 h-6 flex items-center justify-center">
                  <item.icon className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ) : item.highlight ? (
              <Link key={item.path} to={item.path}
                className="relative flex items-center justify-center -mt-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/40 active:scale-95 transition-transform">
                  <item.icon className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
              </Link>
            ) : (
              <Link key={item.path} to={item.path}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${location.pathname === item.path ? "text-purple-600" : "text-gray-400 hover:text-purple-600"}`}>
                <div className="w-6 h-6 flex items-center justify-center">
                  <item.icon className="w-5 h-5" strokeWidth={location.pathname === item.path ? 2 : 1.8} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute top-0 right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            )
          ))}
        </div>
      </nav>

      {/* Mobile Full Screen Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[100] bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800"
          >
            {/* Decorative Background */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-40 right-10 w-48 h-48 bg-indigo-300/20 rounded-full blur-2xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
            </div>

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-6 left-6 w-12 h-12 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white z-10"
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="absolute top-6 right-6 flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center overflow-hidden">
                {settings?.site_logo ? (
                  <img src={settings.site_logo} alt={settings.site_name || "زون | zone"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-2xl">ب</span>
                )}
              </div>
              <span className="text-2xl font-bold text-white">{settings?.site_name || "زون | zone"}</span>
            </motion.div>

            {/* Menu Items */}
            <div className="absolute inset-0 flex flex-col justify-center px-8 pt-20 pb-32 overflow-y-auto">
              <div className="space-y-3">
                {menuItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                  >
                    {item.link.startsWith('http') ? (
                      <a
                        href={item.link}
                        target={item.open_in_new_tab ? "_blank" : "_self"}
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-colors group"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          {getMenuIcon(item.icon)}
                        </span>
                        <span className="text-xl font-medium">{item.label}</span>
                        {item.open_in_new_tab && <ExternalLink className="w-5 h-5 mr-auto opacity-50" />}
                      </a>
                    ) : (
                      <Link
                        to={item.link}
                        className={`flex items-center gap-4 p-4 backdrop-blur-xl rounded-2xl text-white transition-colors group ${location.pathname === item.link ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${location.pathname === item.link ? 'bg-white text-primary' : 'bg-white/20'}`}>
                          {getMenuIcon(item.icon)}
                        </span>
                        <span className="text-xl font-medium">{item.label}</span>
                      </Link>
                    )}
                  </motion.div>
                ))}

                {/* User Section */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + menuItems.length * 0.05 }}
                  className="pt-4 border-t border-white/20 mt-6"
                >
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-xl rounded-2xl">
                        <Avatar className="w-14 h-14 border-2 border-white/30">
                          <AvatarFallback className="bg-white text-primary text-xl">{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xl font-bold text-white">{user.name}</p>
                          <p className="text-white/70 text-sm">{user.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors">
                          <User className="w-5 h-5" /><span>حسابي</span>
                        </Link>
                        <Link to="/my-offers" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors">
                          <Package className="w-5 h-5" /><span>عروضي</span>
                        </Link>
                        <Link to="/favorites" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors">
                          <Heart className="w-5 h-5" /><span>المفضلة</span>
                        </Link>
                        {user.is_admin && (
                          <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 bg-yellow-500/20 rounded-xl text-yellow-300 hover:bg-yellow-500/30 transition-colors">
                            <LayoutDashboard className="w-5 h-5" /><span>الإدارة</span>
                          </Link>
                        )}
                      </div>
                      <button
                        onClick={() => { logout(); setMobileMenuOpen(false); }}
                        className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/20 rounded-xl text-red-300 hover:bg-red-500/30 transition-colors"
                      >
                        <LogOut className="w-5 h-5" /><span>تسجيل الخروج</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-4 bg-white text-primary rounded-xl font-bold">
                        <User className="w-5 h-5" /><span>تسجيل الدخول</span>
                      </Link>
                      <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-4 bg-white/20 text-white rounded-xl font-bold">
                        <Plus className="w-5 h-5" /><span>حساب جديد</span>
                      </Link>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Offer Card Component
const OfferCard = ({ offer, delay = 0, showActions = false, onStatusChange, onDelete }) => {
  const navigate = useNavigate();
  const { user, api } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const categoryIcon = CATEGORIES.find(c => c.name === offer.category)?.icon;
  const IconComponent = categoryIcon || Box;

  // Check if offer is favorited
  useEffect(() => {
    if (user && api) {
      api.get(`/favorites/check/${offer.id}`).then(res => setIsFavorite(res.data.is_favorite)).catch(() => {});
    }
  }, [offer.id, user]);

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${offer.id}`);
        setIsFavorite(false);
      } else {
        await api.post(`/favorites/${offer.id}`);
        setIsFavorite(true);
      }
    } catch (err) { console.error(err); }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} د`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `منذ ${days} يوم`;
    return new Date(date).toLocaleDateString("ar-SY");
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="h-full group"
    >
      <div 
        className="relative bg-white rounded-3xl overflow-hidden cursor-pointer h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
        onClick={() => navigate(`/offer/${offer.id}`)}
      >
        {/* Image Container */}
        <div className="relative aspect-square bg-gradient-to-br from-purple-100 via-pink-50 to-indigo-100 overflow-hidden">
          {offer.images && offer.images.length > 0 ? (
            <>
              {/* Skeleton loader */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 animate-pulse" />
              )}
              <img 
                src={offer.images[0]} 
                alt={offer.title} 
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/50 flex items-center justify-center">
                <IconComponent className="w-10 h-10 text-purple-400" strokeWidth={1.5} />
              </div>
            </div>
          )}
          
          {/* Top Badges */}
          <div className="absolute top-3 right-3 left-3 flex justify-between items-start">
            <div className="flex flex-col gap-2">
              {offer.is_quick_trade && (
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: delay + 0.2 }}>
                  <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg border-0 px-3 py-1">
                    <Zap className="w-3.5 h-3.5 ml-1" />
                    مقايضة سريعة
                  </Badge>
                </motion.div>
              )}
              {offer.status === "pending" && (
                <Badge className="bg-yellow-500 text-white shadow-lg">قيد المراجعة</Badge>
              )}
            </div>
            
            {/* Favorite Button */}
            {user && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleFavorite}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                  isFavorite 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-red-500'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </motion.button>
            )}
          </div>

          {/* Image Count Badge */}
          {offer.images && offer.images.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {offer.images.length}
            </div>
          )}

          {/* Views Badge */}
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {offer.views || 0}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Category & Location */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
              <IconComponent className="w-3 h-3" strokeWidth={2} />
              {offer.category}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              {offer.governorate}
            </span>
          </div>
          
          {/* Title */}
          <h3 className="font-bold text-gray-900 text-base md:text-lg line-clamp-2 mb-2 group-hover:text-purple-600 transition-colors">
            {offer.title}
          </h3>
          
          {/* Description */}
          <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 leading-relaxed">
            {offer.description}
          </p>
          
          {/* Actions for My Offers */}
          {showActions && (
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 rounded-xl text-xs h-9"
                onClick={(e) => { e.stopPropagation(); navigate(`/edit-offer/${offer.id}`); }}
              >
                <Edit className="w-3.5 h-3.5 ml-1" />
                تعديل
              </Button>
              {offer.status === "active" ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 rounded-xl text-xs h-9 text-green-600 border-green-200 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); onStatusChange?.(offer.id, "completed"); }}
                >
                  <Check className="w-3.5 h-3.5 ml-1" />
                  تم
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 rounded-xl text-xs h-9"
                  onClick={(e) => { e.stopPropagation(); onStatusChange?.(offer.id, "active"); }}
                >
                  تفعيل
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                className="rounded-xl text-xs h-9 text-red-500 border-red-200 hover:bg-red-50 px-3"
                onClick={(e) => { e.stopPropagation(); onDelete?.(offer.id); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Home Page
const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout, unreadNotifications, api, fetchUnreadCounts } = useAuth();
  const { settings } = useSettings();
  const [offers, setOffers] = useState([]);
  const [trendingOffers, setTrendingOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGov, setSelectedGov] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsSheetOpen, setNotificationsSheetOpen] = useState(false);

  useEffect(() => { fetchOffers(); fetchTrendingOffers(); }, []);
  
  useEffect(() => { 
    if (user && api) {
      fetchNotifications(); 
    }
  }, [user, api]);

  const fetchOffers = async () => {
    try { const res = await axios.get(`${API}/offers?limit=8`); setOffers(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchTrendingOffers = async () => {
    try { 
      const res = await axios.get(`${API}/offers?limit=8&sort=views`); 
      // ترتيب حسب المشاهدات (الأعلى أولاً)
      const sorted = res.data.sort((a, b) => (b.views || 0) - (a.views || 0));
      setTrendingOffers(sorted.slice(0, 4)); 
    }
    catch (e) { console.error(e); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      console.log("Notifications received:", res.data.length);
      setNotifications(res.data.slice(0, 10));
    } catch (e) { 
      console.error("Error fetching notifications:", e);
    }
  };

  // تحديث جميع الإشعارات كمقروءة
  const markAllNotificationsAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      // تحديث الإشعارات محلياً
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      // تحديث العداد
      if (fetchUnreadCounts) {
        fetchUnreadCounts();
      }
    } catch (e) {
      console.error("Error marking notifications as read:", e);
    }
  };

  // عند فتح sheet الإشعارات
  const handleNotificationsSheetOpen = (open) => {
    setNotificationsSheetOpen(open);
    if (open && notifications.some(n => !n.is_read)) {
      // تحديث الإشعارات كمقروءة بعد فتح الـ sheet
      setTimeout(() => {
        markAllNotificationsAsRead();
      }, 1000);
    }
  };

  const handleSearch = (e) => { e.preventDefault(); navigate(`/browse?search=${searchQuery}&governorate=${selectedGov}`); };

  return (
    <div className="min-h-screen pb-24 md:pb-8 bg-white">
      {/* Mobile View - تصميم إبداعي جديد مطابق للصورة */}
      <div className="md:hidden">
        {/* Header with Logo */}
        <div className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-40 border-b border-gray-50">
          <div className="flex items-center gap-1">
            {user ? (
              <>
                {/* زر الإشعارات */}
                <Sheet open={notificationsSheetOpen} onOpenChange={handleNotificationsSheetOpen}>
                  <SheetTrigger asChild>
                    <button className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative">
                      <Bell className="w-5 h-5" />
                      {unreadNotifications > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                          {unreadNotifications > 9 ? '9+' : unreadNotifications}
                        </span>
                      )}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[320px] p-0">
                    <div className="bg-gradient-to-br from-purple-600 to-pink-500 p-4 text-white">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        الإشعارات
                        {notifications.filter(n => !n.is_read).length > 0 && (
                          <Badge className="bg-white/20 text-white text-xs">{notifications.filter(n => !n.is_read).length} جديد</Badge>
                        )}
                      </h3>
                    </div>
                    <div className="p-4 max-h-[80vh] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
                          <p className="font-medium">لا توجد إشعارات</p>
                          <p className="text-sm mt-1">ستظهر إشعاراتك هنا</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {notifications.map((notif) => (
                            <Link 
                              key={notif.id} 
                              to={notif.link || '#'}
                              onClick={() => setNotificationsSheetOpen(false)}
                              className={`block p-4 rounded-xl transition-all ${notif.is_read ? 'bg-gray-50 hover:bg-gray-100' : 'bg-purple-50 border border-purple-100 hover:bg-purple-100'}`}
                            >
                              <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleDateString('ar-SY')}</p>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
                
                {/* زر القائمة */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                      <Menu className="w-5 h-5" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] p-0">
                    <div className="bg-gradient-to-br from-purple-600 to-pink-500 p-6 text-white">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-14 h-14 border-2 border-white/30">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-white/20 text-white text-xl font-bold">{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-lg">{user.name}</p>
                          <p className="text-purple-200 text-sm">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-1">
                      <Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                        <User className="w-5 h-5 text-gray-600" />
                        <span className="font-medium">الملف الشخصي</span>
                      </Link>
                      <Link to="/my-offers" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                        <Package className="w-5 h-5 text-gray-600" />
                        <span className="font-medium">عروضي</span>
                      </Link>
                      <Link to="/messages" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                        <MessageCircle className="w-5 h-5 text-gray-600" />
                        <span className="font-medium">الرسائل</span>
                      </Link>
                      <Link to="/favorites" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                        <Heart className="w-5 h-5 text-gray-600" />
                        <span className="font-medium">المفضلة</span>
                      </Link>
                      {user.is_admin && (
                        <Link to="/admin" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                          <Settings className="w-5 h-5 text-gray-600" />
                          <span className="font-medium">لوحة التحكم</span>
                        </Link>
                      )}
                      <hr className="my-2" />
                      <button onClick={logout} className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 w-full transition-colors">
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">تسجيل الخروج</span>
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <Link to="/login" className="text-sm font-medium text-purple-600 hover:text-purple-700">
                تسجيل الدخول
              </Link>
            )}
          </div>
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              {settings?.site_name || "Zone"}
            </span>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-md overflow-hidden">
              {settings?.site_logo ? (
                <img src={settings.site_logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
            </div>
          </Link>
        </div>

        {/* Hero Banner - Purple Gradient Card */}
        <div className="px-4 pt-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 rounded-3xl p-5 text-white relative overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-1 leading-tight">
                قايض بذكاء
              </h2>
              <h3 className="text-lg text-white/90 mb-3">
                اربح بدون نقود
              </h3>
              <Button 
                size="sm"
                className="bg-white text-purple-600 hover:bg-purple-50 rounded-full px-5 h-9 text-sm font-semibold shadow-lg"
                onClick={() => navigate('/browse')}
              >
                ابدأ المقايضة الآن
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Search Section */}
        <div className="px-4 pt-5">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-purple-500" />
              ابحث عن ما تريد
            </p>
            <form onSubmit={handleSearch} className="space-y-2.5">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  placeholder="ابحث عن أي شيء..." 
                  className="h-11 rounded-xl border-gray-200 text-sm bg-white pr-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedGov} onValueChange={setSelectedGov}>
                <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <SelectValue placeholder="اختر المحافظة" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المحافظات</SelectItem>
                  {GOVERNORATES.map((gov) => (
                    <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="submit" 
                className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold"
              >
                <Search className="w-4 h-4 ml-2" />
                ابحث الآن
              </Button>
            </form>
          </div>
        </div>

        {/* Categories Section - استكشف حسب الفئة */}
        <div className="pt-6 px-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">استكشف حسب الفئة</h3>
            <Link to="/browse" className="text-xs text-purple-600 font-medium flex items-center gap-1">
              المزيد
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.slice(0, 8).map((cat, idx) => {
              const IconComponent = cat.icon;
              const colors = [
                { bg: "bg-purple-100", icon: "text-purple-600" },
                { bg: "bg-pink-100", icon: "text-pink-600" },
                { bg: "bg-blue-100", icon: "text-blue-600" },
                { bg: "bg-green-100", icon: "text-green-600" },
                { bg: "bg-amber-100", icon: "text-amber-600" },
                { bg: "bg-rose-100", icon: "text-rose-600" },
                { bg: "bg-indigo-100", icon: "text-indigo-600" },
                { bg: "bg-teal-100", icon: "text-teal-600" },
              ];
              const color = colors[idx % colors.length];
              return (
                <Link
                  key={cat.name}
                  to={`/browse?category=${cat.name}`}
                  className="flex flex-col items-center gap-1.5 min-w-[60px]"
                >
                  <div className={`w-14 h-14 ${color.bg} rounded-2xl flex items-center justify-center active:scale-95 transition-transform`}>
                    <IconComponent className={`w-6 h-6 ${color.icon}`} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Trending Offers - عليها العين 👁️ */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4 px-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-500" />
              عليها العين
            </h3>
            <Link to="/browse?sort=views" className="text-xs text-purple-600 font-medium flex items-center gap-1">
              عرض الكل
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-4 px-4 scrollbar-hide">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="min-w-[160px] h-56 rounded-2xl flex-shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {(trendingOffers.length > 0 ? trendingOffers : offers.slice(0, 6)).map((offer, idx) => (
                <div key={offer.id} className="w-[160px] flex-shrink-0 snap-start">
                  <OfferCard offer={offer} delay={idx * 0.05} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Offers - أحدث العروض */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4 px-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-500" />
              أحدث العروض
            </h3>
            <Link to="/browse" className="text-xs text-purple-600 font-medium flex items-center gap-1">
              عرض الكل
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-4 px-4 scrollbar-hide">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="min-w-[160px] h-56 rounded-2xl flex-shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {offers.slice(0, 6).map((offer, idx) => (
                <div key={offer.id} className="w-[160px] flex-shrink-0 snap-start">
                  <OfferCard offer={offer} delay={idx * 0.05} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Why Zone Section - لماذا زون؟ */}
        <div className="pt-8 px-4 pb-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">لماذا زون؟</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Sparkles, title: "ادخل مسابقة المقايضة", color: "from-purple-500 to-pink-500", bg: "bg-purple-50" },
              { icon: RefreshCw, title: "تخلص من الأشياء الغير مرغوبة", color: "from-blue-500 to-cyan-500", bg: "bg-blue-50" },
              { icon: Users, title: "انضم لآلاف المستخدمين", color: "from-green-500 to-emerald-500", bg: "bg-green-50" },
              { icon: Star, title: "مقايضة موثوقة", color: "from-amber-500 to-orange-500", bg: "bg-amber-50" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`${item.bg} rounded-2xl p-4 flex flex-col items-center text-center`}
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mb-3 shadow-md`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-700 leading-tight">{item.title}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Hero Section */}
      <section className="relative overflow-hidden hidden md:block bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.6 }}
              className="text-right"
            >
              <Badge className="mb-4 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm">
                <Sparkles className="w-4 h-4 ml-1.5" />
                مدعوم بالذكاء الاصطناعي
              </Badge>

              <h1 className="text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  قايض بذكاء
                </span>
                <br />
                <span className="text-gray-900">اربح بدون نقود</span>
              </h1>

              <p className="text-lg text-gray-600 mb-6 leading-relaxed max-w-lg">
                أول منصة سورية ذكية تربطك بآلاف الأشخاص لتبادل السلع والخدمات. 
                <span className="block mt-1 text-purple-600 font-medium">بدون نقود، بكل سهولة!</span>
              </p>

              <div className="flex gap-3">
                <Button 
                  size="lg" 
                  className="h-12 px-6 rounded-xl text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
                  onClick={() => navigate('/browse')}
                >
                  <Search className="w-4 h-4 ml-2" />
                  تصفح العروض
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="h-12 px-6 rounded-xl text-base border-2 border-purple-200 hover:bg-purple-50"
                  onClick={() => navigate('/add-offer')}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  أضف عرض
                </Button>
              </div>
            </motion.div>

            {/* Right Side - Search Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white rounded-3xl p-6 shadow-2xl border border-purple-100">
                <div className="mb-5">
                  <h3 className="text-xl font-bold mb-1 text-gray-900">ابحث عن ما تريد</h3>
                  <p className="text-gray-500 text-sm">اكتشف آلاف العروض في جميع أنحاء سوريا</p>
                </div>

                <form onSubmit={handleSearch} className="space-y-3">
                  <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input 
                      placeholder="ابحث عن أي شيء..." 
                      className="pr-12 h-12 rounded-xl border-gray-200 bg-gray-50"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <Select value={selectedGov} onValueChange={setSelectedGov}>
                    <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50">
                      <MapPin className="w-4 h-4 ml-2 text-gray-400" />
                      <SelectValue placeholder="اختر المحافظة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المحافظات</SelectItem>
                      {GOVERNORATES.map((gov) => (
                        <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Search className="w-4 h-4 ml-2" />
                    ابحث الآن
                  </Button>
                </form>

                {/* Quick Categories */}
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-3">فئات شائعة:</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.slice(0, 5).map((cat) => {
                      const IconComponent = cat.icon;
                      return (
                        <Link
                          key={cat.name}
                          to={`/browse?category=${cat.name}`}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-purple-100 rounded-lg text-xs font-medium text-gray-700 hover:text-purple-700 transition-all flex items-center gap-1"
                        >
                          <IconComponent className="w-3 h-3" />
                          {cat.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Desktop Categories Section - تصميم مشابه للجوال */}
      <section className="py-12 bg-white hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">استكشف حسب الفئة</h2>
              <p className="text-gray-500 mt-1">اختر الفئة التي تهمك من بين {CATEGORIES.length} فئة متنوعة</p>
            </div>
            <Link to="/browse" className="text-purple-600 font-medium flex items-center gap-2 hover:gap-3 transition-all">
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {CATEGORIES.map((cat, idx) => {
              const IconComponent = cat.icon;
              const colors = [
                { bg: "bg-purple-100", icon: "text-purple-600", hover: "hover:bg-purple-200" },
                { bg: "bg-pink-100", icon: "text-pink-600", hover: "hover:bg-pink-200" },
                { bg: "bg-blue-100", icon: "text-blue-600", hover: "hover:bg-blue-200" },
                { bg: "bg-green-100", icon: "text-green-600", hover: "hover:bg-green-200" },
                { bg: "bg-amber-100", icon: "text-amber-600", hover: "hover:bg-amber-200" },
                { bg: "bg-rose-100", icon: "text-rose-600", hover: "hover:bg-rose-200" },
                { bg: "bg-indigo-100", icon: "text-indigo-600", hover: "hover:bg-indigo-200" },
                { bg: "bg-teal-100", icon: "text-teal-600", hover: "hover:bg-teal-200" },
                { bg: "bg-orange-100", icon: "text-orange-600", hover: "hover:bg-orange-200" },
                { bg: "bg-cyan-100", icon: "text-cyan-600", hover: "hover:bg-cyan-200" },
                { bg: "bg-violet-100", icon: "text-violet-600", hover: "hover:bg-violet-200" },
                { bg: "bg-emerald-100", icon: "text-emerald-600", hover: "hover:bg-emerald-200" },
                { bg: "bg-fuchsia-100", icon: "text-fuchsia-600", hover: "hover:bg-fuchsia-200" },
              ];
              const color = colors[idx % colors.length];
              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Link
                    to={`/browse?category=${cat.name}`}
                    className="flex flex-col items-center gap-3 min-w-[100px] group"
                  >
                    <div className={`w-20 h-20 ${color.bg} ${color.hover} rounded-3xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                      <IconComponent className={`w-9 h-9 ${color.icon}`} strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 text-center group-hover:text-purple-600 transition-colors">{cat.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section - Desktop - تصميم مشابه للجوال "لماذا زون؟" */}
      <section className="py-12 bg-gradient-to-b from-gray-50 to-white hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">لماذا زون؟</h2>
            <p className="text-gray-500 mt-1">المقايضة أصبحت أسهل من أي وقت - نوفر لك كل ما تحتاجه</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Sparkles, title: "ادخل مسابقة المقايضة", description: "فرصتك للفوز بجوائز قيمة", color: "from-purple-500 to-pink-500", bg: "bg-purple-50" },
              { icon: RefreshCw, title: "تخلص من الأشياء الغير مرغوبة", description: "حوّل ما لا تحتاجه لشيء مفيد", color: "from-blue-500 to-cyan-500", bg: "bg-blue-50" },
              { icon: Users, title: "انضم لآلاف المستخدمين", description: "مجتمع نشط ومتفاعل", color: "from-green-500 to-emerald-500", bg: "bg-green-50" },
              { icon: Star, title: "مقايضة موثوقة", description: "نظام تقييم وحماية متكامل", color: "from-amber-500 to-orange-500", bg: "bg-amber-50" },
              { icon: Zap, title: "سريع وسهل", description: "نتائج في دقائق معدودة", color: "from-orange-500 to-red-500", bg: "bg-orange-50" },
              { icon: MessageCircle, title: "تواصل مباشر", description: "راسل وتفاوض بسهولة", color: "from-indigo-500 to-purple-500", bg: "bg-indigo-50" },
              { icon: Shield, title: "آمن 100%", description: "حماية كاملة لبياناتك", color: "from-teal-500 to-cyan-500", bg: "bg-teal-50" },
              { icon: Gift, title: "مجاني بالكامل", description: "لا رسوم ولا عمولات", color: "from-pink-500 to-rose-500", bg: "bg-pink-50" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className={`${item.bg} rounded-3xl p-6 flex flex-col items-center text-center hover:shadow-lg transition-all duration-300 group cursor-pointer`}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Offers Section - عليها العين - Desktop */}
      <section className="py-12 bg-gray-50 hidden md:block">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8 px-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                عليها العين
              </h2>
              <p className="text-gray-500 mt-1">العروض الأكثر مشاهدة</p>
            </div>
            <Link 
              to="/browse?sort=views" 
              className="text-purple-600 font-medium flex items-center gap-2 hover:gap-3 transition-all"
            >
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex gap-5 overflow-x-auto pb-4 px-4 scrollbar-hide">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="w-[240px] h-72 rounded-3xl flex-shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {(trendingOffers.length > 0 ? trendingOffers : offers).slice(0, 8).map((offer, idx) => (
                <div key={offer.id} className="w-[240px] flex-shrink-0 snap-start">
                  <OfferCard offer={offer} delay={idx * 0.05} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest Offers Section - أحدث العروض - Desktop */}
      <section className="py-12 bg-white hidden md:block">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8 px-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                أحدث العروض
              </h2>
              <p className="text-gray-500 mt-1">تصفح أحدث الفرص المتاحة</p>
            </div>
            <Link 
              to="/browse" 
              className="text-purple-600 font-medium flex items-center gap-2 hover:gap-3 transition-all"
            >
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex gap-5 overflow-x-auto pb-4 px-4 scrollbar-hide">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="w-[240px] h-72 rounded-3xl flex-shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {offers.slice(0, 8).map((offer, idx) => (
                <div key={offer.id} className="w-[240px] flex-shrink-0 snap-start">
                  <OfferCard offer={offer} delay={idx * 0.05} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 md:py-20 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 hidden md:block">
        <div className="max-w-4xl mx-auto text-center text-white px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
              جاهز للبدء؟
            </h2>
            <p className="text-base md:text-xl lg:text-2xl mb-6 md:mb-8 opacity-90">
              انضم لآلاف المستخدمين واستمتع بتجربة مقايضة فريدة
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
              {user ? (
                <Button 
                  size="lg"
                  className="h-14 px-6 md:px-8 rounded-2xl md:rounded-full text-base md:text-lg bg-white text-purple-600 hover:bg-gray-100 shadow-xl w-full sm:w-auto"
                  onClick={() => navigate('/create-offer')}
                >
                  <Plus className="w-5 h-5 ml-2" />
                  أضف عرض
                </Button>
              ) : (
                <Button 
                  size="lg"
                  className="h-14 px-6 md:px-8 rounded-2xl md:rounded-full text-base md:text-lg bg-white text-purple-600 hover:bg-gray-100 shadow-xl w-full sm:w-auto"
                  onClick={() => navigate('/register')}
                >
                  <UserCheck className="w-5 h-5 ml-2" />
                  سجل مجاناً
                </Button>
              )}
              <Button 
                size="lg"
                variant="outline"
                className="h-14 px-6 md:px-8 rounded-2xl md:rounded-full text-base md:text-lg border-2 border-white text-white hover:bg-white/10 w-full sm:w-auto"
                onClick={() => navigate('/browse')}
              >
                <Eye className="w-5 h-5 ml-2" />
                استكشف العروض
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
const BrowsePage = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: "", governorate: "", search: "", quickTrade: false });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilters({ category: params.get("category") || "", governorate: params.get("governorate") || "", search: params.get("search") || "", quickTrade: params.get("quick") === "true" });
  }, [location.search]);

  useEffect(() => { fetchOffers(); }, [filters]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== "all") params.append("category", filters.category);
      if (filters.governorate && filters.governorate !== "all") params.append("governorate", filters.governorate);
      if (filters.search) params.append("search", filters.search);
      if (filters.quickTrade) params.append("quick_trade", "true");
      const res = await axios.get(`${API}/offers?${params.toString()}`);
      setOffers(res.data);
    } catch (e) { toast.error("فشل تحميل العروض"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 bg-white">
      {/* Mobile View - تصميم إبداعي جديد */}
      <div className="md:hidden">
        {/* Header with back button */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center text-gray-600">
              <ChevronRight className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">تصفح العروض</h1>
            <button className="w-9 h-9 flex items-center justify-center text-gray-600">
              <Filter className="w-5 h-5" />
            </button>
          </div>
          
          {/* Filter Pills */}
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 flex-shrink-0 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-200">
              <Switch 
                checked={filters.quickTrade} 
                onCheckedChange={(v) => setFilters({ ...filters, quickTrade: v })}
                className="scale-75"
              />
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">سعر فقط</span>
            </div>
            
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="h-8 rounded-full bg-gray-50 border-gray-200 text-xs px-3 min-w-[80px]">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.governorate} onValueChange={(v) => setFilters({ ...filters, governorate: v })}>
              <SelectTrigger className="h-8 rounded-full bg-gray-50 border-gray-200 text-xs px-3 min-w-[80px]">
                <SelectValue placeholder="المنطقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {GOVERNORATES.map((gov) => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <div className="relative flex-shrink-0">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input 
                placeholder="بحث..." 
                value={filters.search} 
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="h-8 rounded-full bg-gray-50 border-gray-200 text-xs pr-8 w-24"
              />
            </div>
          </div>
        </div>
        
        {/* Offers Grid */}
        <div className="px-3 pt-3 pb-20">
          {loading ? (
            <div className="grid grid-cols-2 gap-2.5">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">لا توجد عروض</h3>
              <p className="text-sm text-gray-500">جرب تغيير معايير البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {offers.map((offer, idx) => (
                <OfferCard key={offer.id} offer={offer} delay={idx * 0.03} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Desktop View */}
      <div className="hidden md:block px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">تصفح العروض</h1>
          <GlassCard className="mb-8 p-4" hover={false}>
            <div className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 items-stretch md:items-center">
              <div className="flex-1 w-full md:w-auto md:min-w-[200px]">
                <Input placeholder="بحث..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="rounded-xl bg-white/50 w-full" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                  <SelectTrigger className="w-full md:w-40 rounded-xl bg-white/50"><SelectValue placeholder="الفئة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    {CATEGORIES.map((cat) => {
                      const IconComponent = cat.icon;
                      return (
                        <SelectItem key={cat.name} value={cat.name}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" strokeWidth={1.5} />
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Select value={filters.governorate} onValueChange={(v) => setFilters({ ...filters, governorate: v })}>
                  <SelectTrigger className="w-full md:w-40 rounded-xl bg-white/50"><SelectValue placeholder="المحافظة" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">جميع المحافظات</SelectItem>{GOVERNORATES.map((gov) => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-xl">
                <Switch checked={filters.quickTrade} onCheckedChange={(v) => setFilters({ ...filters, quickTrade: v })} />
                <Label className="flex items-center gap-1 cursor-pointer text-sm"><Zap className="w-4 h-4 text-yellow-500" />سريعة فقط</Label>
              </div>
            </div>
          </GlassCard>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-52 md:h-72 rounded-2xl md:rounded-3xl" />)}</div>
          ) : offers.length === 0 ? (
            <div className="text-center py-16"><Package className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" /><h3 className="text-xl font-semibold mb-2">لا توجد عروض</h3><p className="text-muted-foreground">جرب تغيير معايير البحث</p></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">{offers.map((offer, idx) => <OfferCard key={offer.id} offer={offer} delay={idx * 0.05} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Offer Detail Page
const OfferDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, api } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => { fetchOffer(); }, [id]);

  const fetchOffer = async () => {
    try { const res = await axios.get(`${API}/offers/${id}`); setOffer(res.data); }
    catch (e) { toast.error("العرض غير موجود"); navigate("/browse"); }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); navigate("/login"); return; }
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post("/messages", { receiver_id: offer.user_id, offer_id: offer.id, content: message, message_type: "text" });
      toast.success("تم إرسال الرسالة");
      setMessage("");
      navigate(`/messages?offer=${offer.id}&user=${offer.user_id}`);
    } catch (e) { toast.error("فشل إرسال الرسالة"); }
    finally { setSending(false); }
  };

  const changeStatus = async (newStatus) => {
    try {
      await api.put(`/offers/${offer.id}/status?status=${newStatus}`);
      setOffer({ ...offer, status: newStatus });
      toast.success("تم تغيير حالة العرض");
      setShowStatusDialog(false);
    } catch (e) { toast.error("فشل تغيير الحالة"); }
  };

  const shareOffer = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: offer.title, text: offer.description, url });
      } catch (e) { }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    }
  };

  const submitReport = async () => {
    if (!reportReason.trim()) { toast.error("يرجى كتابة سبب البلاغ"); return; }
    try {
      await api.post("/reports", { reported_id: offer.id, report_type: "offer", reason: reportReason });
      toast.success("تم إرسال البلاغ");
      setShowReportDialog(false);
      setReportReason("");
    } catch (e) { toast.error("فشل إرسال البلاغ"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!offer) return null;

  const isOwner = user?.id === offer.user_id;

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-gray-50 pb-32">
        {/* Image Section */}
        <div className="relative">
          <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-pink-100">
            {offer.images?.[currentImageIndex] ? (
              <img 
                src={offer.images[currentImageIndex]} 
                alt={offer.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-20 h-20 text-purple-300" />
              </div>
            )}
          </div>
          
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          
          {/* Share Button */}
          <button 
            onClick={shareOffer}
            className="absolute top-4 left-4 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
          
          {/* Image Counter */}
          {offer.images?.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              {offer.images.length}
            </div>
          )}
          
          {/* Views Counter */}
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            {offer.views}
          </div>
        </div>
        
        {/* Image Thumbnails */}
        {offer.images?.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-white">
            {offer.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-purple-500 shadow-lg' : 'border-transparent opacity-70'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        
        {/* Content */}
        <div className="px-4 pt-4 space-y-4">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${offer.status === 'active' ? 'bg-green-100 text-green-700' : offer.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
              {offer.status === 'active' ? '🟢 فعال' : offer.status === 'completed' ? '✅ مكتمل' : '⏸️ معلق'}
            </span>
            {offer.is_quick_trade && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                ⚡ مقايضة سريعة
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              {offer.category}
            </span>
          </div>
          
          {/* Title */}
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{offer.title}</h1>
          
          {/* Description */}
          <p className="text-gray-600 text-sm leading-relaxed">{offer.description}</p>
          
          {/* Wanted Items */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100">
            <p className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" />
              مطلوب مقابله:
            </p>
            <p className="text-gray-700 text-sm">{offer.wanted_items}</p>
          </div>
          
          {/* Location & Date */}
          <div className="flex gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {offer.governorate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(offer.created_at).toLocaleDateString("ar-SY")}
            </span>
          </div>
          
          {/* Owner Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                {offer.user_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{offer.user_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <TrustBadge score={offer.user_trust_score} />
                </div>
              </div>
              {!isOwner && user && (
                <button 
                  onClick={() => setShowReportDialog(true)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Fixed Bottom Action */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          {isOwner ? (
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate(`/edit-offer/${offer.id}`)} 
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <Edit className="w-4 h-4 ml-2" />
                تعديل العرض
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowStatusDialog(true)} 
                className="h-12 px-4 rounded-xl"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => user ? navigate(`/messages?offer=${offer.id}&user=${offer.user_id}`) : navigate("/login")}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-base font-semibold shadow-lg"
            >
              <MessageCircle className="w-5 h-5 ml-2" />
              {user ? 'قايض معي' : 'سجل دخول للتواصل'}
            </Button>
          )}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block min-h-screen pb-8 px-4 py-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6"><ChevronRight className="w-5 h-5 ml-1" />رجوع</Button>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl overflow-hidden shadow-lg">
              <div className="aspect-square bg-gradient-to-br from-purple-50 to-pink-50">
                {offer.images?.[currentImageIndex] ? (
                  <img src={offer.images[currentImageIndex]} alt={offer.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-24 h-24 text-purple-200" />
                  </div>
                )}
              </div>
              {offer.images?.length > 1 && (
                <div className="p-3 flex gap-2 overflow-x-auto">
                  {offer.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-purple-500' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-5">
              <div className="flex gap-2 flex-wrap">
                {offer.is_quick_trade && <Badge className="bg-yellow-500 text-white"><Zap className="w-3 h-3 ml-1" />مقايضة سريعة</Badge>}
                <Badge variant="secondary" className="rounded-full">{offer.category}</Badge>
                <Badge className={`${offer.status === 'active' ? 'bg-green-500' : offer.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'} text-white`}>
                  {offer.status === 'active' ? 'نشط' : offer.status === 'completed' ? 'مكتمل' : 'معلق'}
                </Badge>
              </div>
              
              <h1 className="text-2xl font-bold">{offer.title}</h1>
              <p className="text-gray-600 leading-relaxed">{offer.description}</p>
              
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="rounded-full px-3 py-1"><MapPin className="w-4 h-4 ml-1" />{offer.governorate}</Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1"><Eye className="w-4 h-4 ml-1" />{offer.views} مشاهدة</Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1"><Clock className="w-4 h-4 ml-1" />{new Date(offer.created_at).toLocaleDateString("ar-SY")}</Badge>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-2xl">
                <h3 className="font-bold mb-2 flex items-center gap-2 text-purple-700"><RefreshCw className="w-4 h-4" />مطلوب مقابله:</h3>
                <p className="text-gray-700">{offer.wanted_items}</p>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                <Avatar className="w-14 h-14 border-2 border-purple-200">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl">{offer.user_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-bold text-lg">{offer.user_name}</p>
                  <TrustBadge score={offer.user_trust_score} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isOwner ? (
                  <>
                    <Button onClick={() => navigate(`/edit-offer/${offer.id}`)} className="flex-1 rounded-xl h-12 bg-gradient-to-r from-purple-500 to-pink-500"><Edit className="w-4 h-4 ml-2" />تعديل</Button>
                    <Button variant="outline" onClick={() => setShowStatusDialog(true)} className="flex-1 rounded-xl h-12"><RefreshCw className="w-4 h-4 ml-2" />تغيير الحالة</Button>
                    <Button variant="outline" onClick={shareOffer} className="rounded-xl h-12"><ExternalLink className="w-4 h-4" /></Button>
                  </>
                ) : (
                  <>
                    {user && (
                      <Button onClick={() => navigate(`/messages?offer=${offer.id}&user=${offer.user_id}`)} className="flex-1 rounded-xl h-12 bg-gradient-to-r from-purple-500 to-pink-500"><MessageCircle className="w-4 h-4 ml-2" />قايض معي</Button>
                    )}
                    <Button variant="outline" onClick={shareOffer} className="rounded-xl h-12"><ExternalLink className="w-4 h-4 ml-2" />مشاركة</Button>
                    {user && (
                      <Button variant="ghost" onClick={() => setShowReportDialog(true)} className="rounded-xl h-12 text-red-500 hover:text-red-600 hover:bg-red-50"><Flag className="w-4 h-4" /></Button>
                    )}
                  </>
                )}
              </div>
              
              {!user && (
                <Button className="w-full rounded-xl h-12 bg-gradient-to-r from-purple-500 to-pink-500" onClick={() => navigate("/login")}>
                  سجل دخول للتواصل
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>تغيير حالة العرض</DialogTitle><DialogDescription>اختر الحالة الجديدة لعرضك</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <Button variant={offer.status === 'active' ? 'default' : 'outline'} onClick={() => changeStatus('active')} className="justify-start rounded-xl"><CheckCircle className="w-4 h-4 ml-2 text-green-500" />نشط</Button>
            <Button variant={offer.status === 'completed' ? 'default' : 'outline'} onClick={() => changeStatus('completed')} className="justify-start rounded-xl"><Check className="w-4 h-4 ml-2 text-blue-500" />مكتمل (تمت المقايضة)</Button>
            <Button variant={offer.status === 'cancelled' ? 'default' : 'outline'} onClick={() => changeStatus('cancelled')} className="justify-start rounded-xl"><XCircle className="w-4 h-4 ml-2 text-gray-500" />ملغي</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>الإبلاغ عن العرض</DialogTitle><DialogDescription>أخبرنا بسبب البلاغ</DialogDescription></DialogHeader>
          <Textarea placeholder="سبب البلاغ..." value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="rounded-xl" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={submitReport} className="rounded-xl bg-red-500 hover:bg-red-600">إرسال البلاغ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Login Page
const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await login(email, password); toast.success("تم تسجيل الدخول بنجاح"); navigate("/"); }
    catch (e) { toast.error(e.response?.data?.detail || "فشل تسجيل الدخول"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-4 md:py-8">
      <GlassCard className="w-full max-w-md" hover={false}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/25"><span className="text-white font-bold text-2xl">ب</span></div>
          <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
          <p className="text-muted-foreground">مرحباً بعودتك إلى زون</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>البريد الإلكتروني</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 rounded-xl" placeholder="example@email.com" required /></div>
          <div><Label>كلمة المرور</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 rounded-xl" placeholder="••••••••" required /></div>
          <Button type="submit" className="w-full rounded-xl h-12" disabled={loading}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول"}</Button>
        </form>
        <div className="mt-6 text-center space-y-3">
          <Link to="/" className="text-primary hover:underline block"><ArrowRight className="w-4 h-4 inline ml-1" />العودة للرئيسية</Link>
          <p className="text-muted-foreground">ليس لديك حساب؟ <Link to="/register" className="text-primary hover:underline font-medium">سجل الآن</Link></p>
        </div>
      </GlassCard>
    </div>
  );
};

// Register Page
const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    phone: "", 
    country_code: "+963",
    governorate: "دمشق" 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // التحقق من رقم الهاتف
    if (!form.phone || form.phone.length < 9) {
      toast.error("يرجى إدخال رقم هاتف صحيح");
      return;
    }
    
    setLoading(true);
    try { 
      await register(form); 
      toast.success("تم إنشاء الحساب بنجاح! تحقق من WhatsApp للكود");
      // الانتقال لصفحة التحقق
      navigate("/verify-phone", { state: { phone: `${form.country_code}${form.phone}` } });
    }
    catch (e) { 
      toast.error(e.response?.data?.detail || "فشل إنشاء الحساب"); 
    }
    finally { setLoading(false); }
  };

  const countryCodes = [
    { code: "+963", country: "سوريا 🇸🇾", flag: "🇸🇾" },
    { code: "+961", country: "لبنان 🇱🇧", flag: "🇱🇧" },
    { code: "+962", country: "الأردن 🇯🇴", flag: "🇯🇴" },
    { code: "+20", country: "مصر 🇪🇬", flag: "🇪🇬" },
    { code: "+966", country: "السعودية 🇸🇦", flag: "🇸🇦" },
    { code: "+971", country: "الإمارات 🇦🇪", flag: "🇦🇪" },
    { code: "+964", country: "العراق 🇮🇶", flag: "🇮🇶" },
    { code: "+90", country: "تركيا 🇹🇷", flag: "🇹🇷" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-4 md:py-8 pb-24 md:pb-8">
      <GlassCard className="w-full max-w-md" hover={false}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-white font-bold text-2xl">ب</span>
          </div>
          <h1 className="text-2xl font-bold">إنشاء حساب جديد</h1>
          <p className="text-muted-foreground">انضم إلى مجتمع زون</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* الاسم */}
          <div>
            <Label>الاسم الكامل</Label>
            <Input 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              className="mt-2 rounded-xl" 
              placeholder="أحمد محمد" 
              required 
            />
          </div>

          {/* البريد الإلكتروني */}
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input 
              type="email" 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              className="mt-2 rounded-xl" 
              placeholder="example@email.com" 
              required 
            />
          </div>

          {/* رقم الهاتف مع كود الدولة */}
          <div>
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              رقم WhatsApp
              <Badge variant="secondary" className="text-xs">إجباري</Badge>
            </Label>
            <div className="flex gap-2 mt-2">
              <Select value={form.country_code} onValueChange={(v) => setForm({ ...form, country_code: v })}>
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countryCodes.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      <div className="flex items-center gap-2">
                        <span>{item.flag}</span>
                        <span>{item.code}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input 
                type="tel"
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '') })} 
                className="flex-1 rounded-xl" 
                placeholder="9XX XXX XXX"
                required
                maxLength={10}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              سنرسل لك كود التحقق عبر WhatsApp
            </p>
          </div>

          {/* المحافظة */}
          <div>
            <Label>المحافظة</Label>
            <Select value={form.governorate} onValueChange={(v) => setForm({ ...form, governorate: v })}>
              <SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOVERNORATES.map((gov) => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* كلمة المرور */}
          <div>
            <Label>كلمة المرور</Label>
            <Input 
              type="password" 
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
              className="mt-2 rounded-xl" 
              placeholder="••••••••" 
              required 
              minLength={6}
            />
            <p className="text-xs text-muted-foreground mt-1">على الأقل 6 أحرف</p>
          </div>

          {/* زر التسجيل */}
          <Button 
            type="submit" 
            className="w-full rounded-xl h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <UserCheck className="w-5 h-5 ml-2" />
                إنشاء الحساب
              </>
            )}
          </Button>
        </form>

        <p className="text-center mt-6 text-muted-foreground">
          لديك حساب؟ <Link to="/login" className="text-primary hover:underline font-medium">سجل دخول</Link>
        </p>
      </GlassCard>
    </div>
  );
};

// Verify Phone Page
const VerifyPhonePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { api, user, refreshUser } = useAuth();
  const phone = location.state?.phone || user?.phone || "";
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [cooldown, setCooldown] = useState(0); // عداد تنازلي للانتظار
  const inputs = useRef([]);

  // حماية الصفحة - إذا لم يكن المستخدم مسجل دخول، انتقل لصفحة تسجيل الدخول
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!phone) {
      navigate("/register", { replace: true });
      return;
    }
  }, [user, phone, navigate]);

  // عداد تنازلي للـ cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  // إذا لم يكن هناك مستخدم، لا تعرض الصفحة
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = pastedData.split("");
    while (newCode.length < 6) newCode.push("");
    setCode(newCode);
    inputs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  // طلب إرسال الكود
  const handleRequestCode = async () => {
    setRequesting(true);
    try {
      // استخراج رقم الهاتف وكود الدولة
      let phoneNum = phone.replace(/[^0-9]/g, '');
      let countryCode = "+963";
      
      if (phone.startsWith('+')) {
        countryCode = phone.match(/^\+\d{1,3}/)?.[0] || "+963";
        phoneNum = phone.replace(countryCode, '');
      }
      
      await api.post("/auth/send-otp", null, {
        params: { phone: phoneNum, country_code: countryCode }
      });
      
      toast.success("تم إرسال كود التحقق إلى WhatsApp الخاص بك");
      setCodeRequested(true);
      setCooldown(120); // 2 دقيقة
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch (e) {
      const detail = e.response?.data?.detail || "فشل إرسال الكود";
      toast.error(detail);
      
      // إذا كان الخطأ بسبب الانتظار، نضبط العداد
      const match = detail.match(/(\d+) ثانية/);
      if (match) {
        setCooldown(parseInt(match[1]));
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleVerify = async () => {
    const otp = code.join("");
    if (otp.length !== 6) {
      toast.error("يرجى إدخال الكود كاملاً");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { phone, code: otp });
      toast.success("تم التحقق بنجاح! 🎉");
      if (refreshUser) await refreshUser();
      navigate("/");
    } catch (e) {
      toast.error(e.response?.data?.detail || "كود غير صحيح");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-4 md:py-8 pb-24 md:pb-8">
      <GlassCard className="w-full max-w-md" hover={false}>
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl"
          >
            <MessageCircle className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">تحقق من رقم الهاتف</h1>
          <p className="text-muted-foreground mb-4">
            {codeRequested ? "أدخل كود التحقق المرسل إلى WhatsApp" : "اطلب كود التحقق عبر WhatsApp"}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-primary" />
            <span className="font-mono font-medium text-primary">{phone}</span>
          </div>
        </div>

        {/* زر طلب الكود */}
        {!codeRequested ? (
          <div className="text-center mb-6">
            <Button
              onClick={handleRequestCode}
              disabled={requesting || cooldown > 0}
              className="w-full rounded-xl h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              {requesting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  جاري الإرسال...
                </>
              ) : cooldown > 0 ? (
                <>
                  <Clock className="w-5 h-5 ml-2" />
                  انتظر {formatTime(cooldown)}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 ml-2" />
                  إرسال كود التحقق
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              سيتم إرسال كود مكون من 6 أرقام إلى WhatsApp الخاص بك
            </p>
          </div>
        ) : (
          <>
            {/* OTP Input */}
            <div className="mb-6">
              <Label className="block text-center mb-4">أدخل الكود المكون من 6 أرقام</Label>
              <div className="flex gap-2 justify-center" dir="ltr">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-xl"
                  />
                ))}
              </div>
            </div>

            {/* زر التحقق */}
            <Button
              onClick={handleVerify}
              disabled={loading || code.join("").length !== 6}
              className="w-full rounded-xl h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 mb-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 ml-2" />
                  تحقق من الكود
                </>
              )}
            </Button>

            {/* إعادة إرسال الكود */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                لم يصلك الكود؟
              </p>
              <Button
                variant="ghost"
                onClick={handleRequestCode}
                disabled={requesting || cooldown > 0}
                className="text-primary"
              >
                {cooldown > 0 ? (
                  <>
                    <Clock className="w-4 h-4 ml-1" />
                    إعادة الإرسال بعد {formatTime(cooldown)}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 ml-1" />
                    إعادة إرسال الكود
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        <div className="mt-6 pt-6 border-t text-center">
          <Link to="/" className="text-muted-foreground hover:text-primary text-sm">
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </GlassCard>
    </div>
  );
};

// Add Offer Page
const AddOfferPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "", governorate: "", wanted_items: "", images: [], is_quick_trade: false });

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 2MB"); return; }
      const reader = new FileReader();
      reader.onload = () => setForm((prev) => ({ ...prev, images: [...prev.images.slice(0, 4), reader.result] }));
      reader.readAsDataURL(file);
    });
  };

  const getAISuggestions = async () => {
    if (!form.description) { toast.error("يرجى كتابة وصف الغرض أولاً"); return; }
    setAiLoading(true);
    try { const res = await api.post("/ai/suggest", { item_description: form.description }); setSuggestions(res.data); toast.success("تم الحصول على الاقتراحات"); }
    catch (e) { toast.error("فشل الحصول على الاقتراحات"); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.governorate || !form.wanted_items) { toast.error("يرجى ملء جميع الحقول المطلوبة"); return; }
    setLoading(true);
    try { const res = await api.post("/offers", form); toast.success("تم نشر العرض بنجاح!"); navigate(`/offer/${res.data.id}`); }
    catch (e) { toast.error("فشل نشر العرض"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 pt-2 md:py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">إضافة عرض جديد</h1>
        <OfferForm form={form} setForm={setForm} handleImageUpload={handleImageUpload} getAISuggestions={getAISuggestions} aiLoading={aiLoading} suggestions={suggestions} handleSubmit={handleSubmit} loading={loading} buttonText="نشر العرض" />
      </div>
    </div>
  );
};

// Edit Offer Page
const EditOfferPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "", governorate: "", wanted_items: "", images: [], is_quick_trade: false });

  useEffect(() => { fetchOffer(); }, [id]);

  const fetchOffer = async () => {
    try {
      const res = await api.get(`/offers/${id}`);
      const offer = res.data;
      setForm({
        title: offer.title,
        description: offer.description,
        category: offer.category,
        governorate: offer.governorate,
        wanted_items: offer.wanted_items,
        images: offer.images || [],
        is_quick_trade: offer.is_quick_trade
      });
    } catch (e) { toast.error("فشل تحميل العرض"); navigate("/my-offers"); }
    finally { setFetchLoading(false); }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 2MB"); return; }
      const reader = new FileReader();
      reader.onload = () => setForm((prev) => ({ ...prev, images: [...prev.images.slice(0, 4), reader.result] }));
      reader.readAsDataURL(file);
    });
  };

  const getAISuggestions = async () => {
    if (!form.description) { toast.error("يرجى كتابة وصف الغرض أولاً"); return; }
    setAiLoading(true);
    try { const res = await api.post("/ai/suggest", { item_description: form.description }); setSuggestions(res.data); toast.success("تم الحصول على الاقتراحات"); }
    catch (e) { toast.error("فشل الحصول على الاقتراحات"); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.governorate || !form.wanted_items) { toast.error("يرجى ملء جميع الحقول المطلوبة"); return; }
    setLoading(true);
    try { await api.put(`/offers/${id}`, form); toast.success("تم تحديث العرض بنجاح!"); navigate(`/offer/${id}`); }
    catch (e) { toast.error("فشل تحديث العرض"); }
    finally { setLoading(false); }
  };

  if (fetchLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 pt-2 md:py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}><ChevronRight className="w-5 h-5" /></Button>
          <h1 className="text-3xl font-bold">تعديل العرض</h1>
        </div>
        <OfferForm form={form} setForm={setForm} handleImageUpload={handleImageUpload} getAISuggestions={getAISuggestions} aiLoading={aiLoading} suggestions={suggestions} handleSubmit={handleSubmit} loading={loading} buttonText="حفظ التعديلات" />
      </div>
    </div>
  );
};

// Shared Offer Form Component
const OfferForm = ({ form, setForm, handleImageUpload, getAISuggestions, aiLoading, suggestions, handleSubmit, loading, buttonText }) => (
  <form onSubmit={handleSubmit} className="space-y-6">
    <GlassCard hover={false}>
      <div className="space-y-4">
        <div><Label>عنوان العرض *</Label><Input placeholder="مثال: لابتوب Dell للمقايضة" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 rounded-xl" /></div>
        <div><Label>وصف الغرض *</Label><Textarea placeholder="اكتب وصفاً تفصيلياً للغرض..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 rounded-xl min-h-[120px]" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>الفئة *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="mt-2 rounded-xl"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => {
                  const IconComponent = cat.icon;
                  return (
                    <SelectItem key={cat.name} value={cat.name}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" strokeWidth={1.5} />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>المحافظة *</Label>
            <Select value={form.governorate} onValueChange={(v) => setForm({ ...form, governorate: v })}>
              <SelectTrigger className="mt-2 rounded-xl"><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
              <SelectContent>{GOVERNORATES.map((gov) => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-600" /><span className="font-medium">اقتراح بالذكاء الاصطناعي</span></div>
            <Button type="button" variant="outline" size="sm" onClick={getAISuggestions} disabled={aiLoading || !form.description} className="rounded-full bg-white">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}اقترح لي
            </Button>
          </div>
          {suggestions && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <p className="text-sm text-muted-foreground">القيمة التقديرية: <span className="font-bold text-indigo-600">{suggestions.market_value}</span></p>
              <div className="flex flex-wrap gap-2">
                {suggestions.suggestions.map((s, idx) => (
                  <Badge key={idx} variant="secondary" className="cursor-pointer hover:bg-indigo-100 rounded-full px-3 py-1.5 transition-colors" onClick={() => setForm({ ...form, wanted_items: form.wanted_items ? `${form.wanted_items}, ${s}` : s })}>
                    <Plus className="w-3 h-3 ml-1" />{s}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div><Label>ماذا تريد مقابله؟ *</Label><Textarea placeholder="مثال: منظومة طاقة شمسية، موبايل حديث..." value={form.wanted_items} onChange={(e) => setForm({ ...form, wanted_items: e.target.value })} className="mt-2 rounded-xl" /></div>

        <div>
          <Label>صور الغرض (حتى 5 صور)</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {form.images.map((img, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X className="w-6 h-6 text-white" /></button>
              </div>
            ))}
            {form.images.length < 5 && (
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-purple-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-purple-50/50 transition-colors">
                <Paperclip className="w-6 h-6 text-muted-foreground" /><span className="text-xs text-muted-foreground mt-1">إضافة</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
          <div className="flex items-center gap-3"><Zap className="w-5 h-5 text-yellow-500" /><div><p className="font-medium">مقايضة سريعة</p><p className="text-sm text-muted-foreground">للعروض الجاهزة للتنفيذ فوراً</p></div></div>
          <Switch checked={form.is_quick_trade} onCheckedChange={(v) => setForm({ ...form, is_quick_trade: v })} />
        </div>
      </div>
    </GlassCard>
    <Button type="submit" size="lg" className="w-full rounded-xl h-14 shadow-lg shadow-primary/25" disabled={loading}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Save className="w-5 h-5 ml-2" />}{buttonText}
    </Button>
  </form>
);
// Messages Page - MOBILE OPTIMIZED WITH DRAWER
const MessagesPage = () => {
  const { api, user, fetchUnreadCounts } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pollingRef = useRef(null);

  const scrollToBottom = () => {
    // استخدم requestAnimationFrame للتأكد من التمرير بعد render
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
  };

  // التمرير لآخر رسالة عند تحميل الرسائل أو وصول رسالة جديدة
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => { fetchConversations(); }, []);

  // Polling للرسائل الجديدة كل 3 ثواني - بشكل سلس
  useEffect(() => {
    if (selectedConv) {
      const pollMessages = async () => {
        try {
          const res = await api.get(`/messages/${selectedConv.offer_id}/${selectedConv.other_user_id}`);
          const newMessages = res.data;
          
          // مقارنة آخر رسالة بدلاً من العدد فقط
          setMessages(prev => {
            if (newMessages.length === 0) return prev;
            const lastNewId = newMessages[newMessages.length - 1]?.id;
            const lastPrevId = prev[prev.length - 1]?.id;
            
            // فقط نحدث إذا كانت هناك رسائل جديدة فعلاً
            if (lastNewId !== lastPrevId || newMessages.length !== prev.length) {
              fetchUnreadCounts();
              return newMessages;
            }
            return prev;
          });
        } catch (e) { /* صامت */ }
      };

      // بدء الـ polling
      pollingRef.current = setInterval(pollMessages, 3000);

      // تنظيف عند تغيير المحادثة أو الخروج
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [selectedConv?.id]); // نعتمد على ID المحادثة فقط

  // تحديث المحادثات بشكل دوري - سلس
  useEffect(() => {
    const pollConversations = async () => {
      try {
        const res = await api.get("/conversations");
        setConversations(prev => {
          // مقارنة لتجنب إعادة الرسم غير الضرورية
          const hasChanges = JSON.stringify(prev.map(c => ({ id: c.id, unread: c.unread_count, last: c.last_message }))) !== 
                            JSON.stringify(res.data.map(c => ({ id: c.id, unread: c.unread_count, last: c.last_message })));
          return hasChanges ? res.data : prev;
        });
      } catch (e) { /* صامت */ }
    };

    const convPolling = setInterval(pollConversations, 8000);
    return () => clearInterval(convPolling);
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await api.get("/conversations");
      setConversations(res.data);
      const params = new URLSearchParams(location.search);
      const offerId = params.get("offer");
      const userId = params.get("user");
      
      if (offerId && userId) {
        // البحث عن محادثة موجودة
        const conv = res.data.find(c => c.offer_id === offerId && c.other_user_id === userId);
        if (conv) {
          selectConversation(conv);
        } else {
          // إنشاء محادثة جديدة إذا لم تكن موجودة
          await startNewConversation(offerId, userId);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // بدء محادثة جديدة
  const startNewConversation = async (offerId, userId) => {
    try {
      // جلب بيانات العرض للحصول على اسم المستخدم
      const offerRes = await api.get(`/offers/${offerId}`);
      const offer = offerRes.data;
      
      // إنشاء محادثة وهمية مؤقتة للعرض
      const tempConv = {
        id: `temp-${offerId}-${userId}`,
        offer_id: offerId,
        other_user_id: userId,
        other_user_name: offer.user_name || "مستخدم",
        offer_title: offer.title,
        offer_image: offer.images?.[0],
        last_message: null,
        last_message_time: new Date().toISOString(),
        unread_count: 0,
        is_new: true
      };
      
      setSelectedConv(tempConv);
      setMessages([]);
      
      // إضافة المحادثة للقائمة إذا لم تكن موجودة
      setConversations(prev => {
        const exists = prev.find(c => c.offer_id === offerId && c.other_user_id === userId);
        if (!exists) {
          return [tempConv, ...prev];
        }
        return prev;
      });
    } catch (e) {
      console.error("Error starting conversation:", e);
      toast.error("فشل بدء المحادثة");
    }
  };

  const selectConversation = async (conv) => {
    setSelectedConv(conv);
    setDrawerOpen(false);
    setMessages([]);
    
    // لا تجلب الرسائل إذا كانت محادثة جديدة
    if (conv.is_new) return;
    
    try { 
      const res = await api.get(`/messages/${conv.offer_id}/${conv.other_user_id}`); 
      setMessages(res.data);
      fetchUnreadCounts(); // تحديث العداد بعد قراءة الرسائل
    }
    catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await api.post("/messages", { receiver_id: selectedConv.other_user_id, offer_id: selectedConv.offer_id, content: newMessage, message_type: "text" });
      setMessages(prev => [...prev, res.data]);
      setNewMessage("");
      
      // بعد إرسال أول رسالة، أزل علامة المحادثة الجديدة وأعد جلب المحادثات
      if (selectedConv.is_new) {
        setSelectedConv(prev => ({ ...prev, is_new: false }));
        // إعادة جلب المحادثات للحصول على ID الحقيقي
        const convRes = await api.get("/conversations");
        setConversations(convRes.data);
        // إيجاد المحادثة الجديدة وتحديدها
        const newConv = convRes.data.find(c => c.offer_id === selectedConv.offer_id && c.other_user_id === selectedConv.other_user_id);
        if (newConv) {
          setSelectedConv(newConv);
        }
      }
    } catch (e) { toast.error("فشل إرسال الرسالة"); }
    finally { setSending(false); }
  };

  // Conversations List Component - تصميم احترافي
  const ConversationsList = ({ mobile = false, onSelect }) => (
    <div className={mobile ? "h-full flex flex-col" : ""}>
      {mobile && (
        <div className="p-5 border-b border-purple-100/50 bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-white">المحادثات</h2>
              <p className="text-sm text-purple-200 mt-1">{conversations.length} محادثة نشطة</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setDrawerOpen(false)}
              className="text-white hover:bg-white/20 rounded-full w-10 h-10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
      <div className={`${mobile ? "flex-1 overflow-y-auto" : "h-[520px] overflow-y-auto"} bg-gray-50/50`}>
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-purple-400" />
            </div>
            <p className="font-medium text-gray-600">لا توجد محادثات</p>
            <p className="text-sm text-gray-400 mt-1">ابدأ محادثة من صفحة العرض</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conv, index) => (
              <motion.div 
                key={conv.id} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelect ? onSelect(conv) : selectConversation(conv)} 
                className={`p-4 cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                  !mobile && selectedConv?.id === conv.id 
                    ? "bg-purple-50 border-r-4 border-purple-500" 
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-lg">
                        {conv.other_user_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-bold text-gray-900 text-[15px] truncate">{conv.other_user_name}</p>
                      <span className="text-[11px] text-gray-400 flex-shrink-0 mr-2">
                        {new Date(conv.updated_at).toLocaleDateString('ar-SY', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Package className="w-3 h-3 text-purple-500 flex-shrink-0" />
                      <p className="text-xs font-medium text-purple-600 truncate">{conv.offer_title}</p>
                    </div>
                    <p className={`text-sm truncate leading-tight ${conv.unread_count > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                      {conv.last_message}
                    </p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-300 flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen">
      {/* Desktop View */}
      <div className="hidden md:block pb-8">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">الرسائل</h1>
          <div className="grid grid-cols-3 gap-6 h-[600px]">
            {/* Conversations List */}
            <GlassCard className="col-span-1 p-0 overflow-hidden" hover={false}>
              <div className="p-4 border-b border-purple-100">
                <h2 className="font-bold">المحادثات</h2>
              </div>
              <ConversationsList />
            </GlassCard>

            {/* Chat Area */}
            <GlassCard className="col-span-2 p-0 overflow-hidden flex flex-col" hover={false}>
              {selectedConv ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11 border-2 border-purple-300">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                          {selectedConv.other_user_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{selectedConv.other_user_name}</p>
                        <p className="text-sm text-purple-600">{selectedConv.offer_title}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div 
                    className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-purple-50/30 to-white"
                    style={{ 
                      WebkitOverflowScrolling: 'touch',
                      overscrollBehavior: 'contain'
                    }}
                  >
                    <div className="space-y-3 min-h-full flex flex-col justify-end">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center flex-1">
                          <div className="text-center text-muted-foreground">
                            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p>ابدأ المحادثة</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <div 
                              key={msg.id}
                              className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}
                            >
                              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
                                msg.sender_id === user.id 
                                  ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-br-sm" 
                                  : "bg-white border border-purple-100 text-gray-800 rounded-bl-sm"
                              }`}>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                <p className={`text-xs mt-1.5 ${msg.sender_id === user.id ? "text-purple-200" : "text-gray-400"}`}>
                                  {new Date(msg.created_at).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div ref={messagesEndRef} className="h-1" />
                    </div>
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-purple-100 bg-white">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="اكتب رسالة..." 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()} 
                        className="rounded-full border-purple-200 focus:border-purple-400 px-5"
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={sending || !newMessage.trim()} 
                        className="rounded-full w-12 h-12 p-0 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                      >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>اختر محادثة للبدء</p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Mobile View - With Drawer */}
      <div className="md:hidden fixed inset-0 flex flex-col bg-gray-50">
        {selectedConv ? (
          <>
            {/* Chat Header - Fixed at top */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg flex-shrink-0 safe-area-top">
              <div className="flex items-center gap-2 p-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setDrawerOpen(true)}
                  className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
                >
                  <Menu className="w-5 h-5" />
                  {conversations.filter(c => c.unread_count > 0).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-purple-600">
                      {conversations.filter(c => c.unread_count > 0).length}
                    </span>
                  )}
                </motion.button>

                <Avatar className="w-10 h-10 border-2 border-white/30 flex-shrink-0">
                  <AvatarFallback className="bg-white/20 text-white font-bold">
                    {selectedConv.other_user_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-[15px]">{selectedConv.other_user_name}</p>
                  <p className="text-xs text-purple-100 truncate">{selectedConv.offer_title}</p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full flex-shrink-0">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate(`/offer/${selectedConv.offer_id}`)}>
                      <Eye className="w-4 h-4 ml-2" />
                      عرض العرض
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/profile/${selectedConv.other_user_id}`)}>
                      <User className="w-4 h-4 ml-2" />
                      عرض الملف الشخصي
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages Area - Scrollable with flex-1 */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto bg-gradient-to-b from-purple-50/50 to-white"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              <div className="p-3 space-y-2 min-h-full flex flex-col justify-end">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center text-muted-foreground px-4">
                      {selectedConv?.is_new ? (
                        <>
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageCircle className="w-8 h-8 text-purple-500" />
                          </div>
                          <h3 className="font-bold text-gray-800 mb-2">ابدأ محادثة جديدة!</h3>
                          <p className="text-sm text-gray-500 leading-relaxed">
                            أرسل رسالة لـ <span className="font-semibold text-purple-600">{selectedConv.other_user_name}</span>
                            <br />بخصوص <span className="text-purple-600">"{selectedConv.offer_title}"</span>
                          </p>
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-14 h-14 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">ابدأ المحادثة الآن</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl shadow-sm ${
                          msg.sender_id === user.id 
                            ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-br-md" 
                            : "bg-white border border-purple-100 text-gray-800 rounded-bl-md"
                        }`}>
                          <p className="leading-relaxed text-[15px] break-words whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender_id === user.id ? "text-purple-200" : "text-gray-400"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} className="h-1" />
              </div>
            </div>

            {/* Input Area - Fixed at bottom above nav */}
            <div className="bg-white border-t border-gray-200 p-3 flex-shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 70px)' }}>
              <div className="flex gap-2 items-center">
                <Input 
                  placeholder="اكتب رسالة..." 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 rounded-full border-purple-200 focus:border-purple-400 px-4 h-11 text-base"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={sending || !newMessage.trim()} 
                  className="rounded-full w-11 h-11 p-0 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 flex-shrink-0 shadow-lg"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No conversation selected - Show list - تصميم إبداعي جديد */
          <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white">
            {/* Header إبداعي */}
            <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 text-white px-5 pt-6 pb-8 shadow-xl relative overflow-hidden">
              {/* خلفية ديكورية */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2"></div>
              
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h1 className="text-2xl font-bold">الرسائل</h1>
                  <p className="text-sm text-purple-200 mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    {conversations.length} محادثة نشطة
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                    <Search className="w-5 h-5" />
                  </button>
                  <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Tabs للفلترة - تصميم pills إبداعي */}
            <div className="bg-white/80 backdrop-blur-sm px-4 py-4 -mt-4 mx-4 rounded-2xl shadow-lg border border-purple-100/50 relative z-10">
              <div className="flex gap-2">
                <button className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold shadow-md">
                  الكل
                </button>
                <button className="flex-1 py-2.5 px-4 rounded-xl bg-purple-50 text-purple-600 text-sm font-medium hover:bg-purple-100 transition-colors">
                  غير مقروءة
                </button>
                <button className="flex-1 py-2.5 px-4 rounded-xl bg-purple-50 text-purple-600 text-sm font-medium hover:bg-purple-100 transition-colors">
                  مجموعات
                </button>
              </div>
            </div>
            
            {/* قائمة المحادثات */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-purple-400" />
                  </div>
                  <p className="font-medium text-gray-600">لا توجد محادثات</p>
                  <p className="text-sm text-gray-400 mt-1">ابدأ محادثة من صفحة العرض</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conv, index) => (
                    <motion.div
                      key={conv.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => selectConversation(conv)}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        {/* صورة المستخدم */}
                        <div className="relative flex-shrink-0">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                            {conv.other_user_name?.charAt(0)}
                          </div>
                          {conv.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                              {conv.unread_count > 9 ? '9+' : conv.unread_count}
                            </span>
                          )}
                        </div>
                        
                        {/* معلومات المحادثة */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-gray-900 text-[15px]">{conv.other_user_name}</h3>
                            <span className="text-xs text-gray-400">
                              {new Date(conv.updated_at).toLocaleDateString('ar-SY', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Package className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                            <p className="text-xs font-medium text-purple-600 truncate">{conv.offer_title}</p>
                          </div>
                          <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                            {conv.last_message || "ابدأ المحادثة..."}
                          </p>
                        </div>
                        
                        {/* سهم */}
                        <ChevronLeft className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversations Drawer - Slide from Right */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setDrawerOpen(false)}
              />

              {/* Drawer */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl z-50 overflow-hidden"
              >
                <ConversationsList mobile={true} onSelect={selectConversation} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Profile Page - COMPLETE
const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 pt-2 md:py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">الملف الشخصي</h1>
        <GlassCard className="mb-6" hover={false}>
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20 border-2 border-primary/20"><AvatarFallback className="bg-primary text-white text-3xl">{user?.name?.charAt(0)}</AvatarFallback></Avatar>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="mt-2 flex items-center gap-3">
                <TrustBadge score={user?.trust_score || 0} />
                <span className="text-sm text-muted-foreground">{user?.trades_count || 0} مقايضة</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="grid gap-4 mb-6">
          <GlassCard className="flex items-center gap-4 p-4" hover={false}><Phone className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">رقم الهاتف</p><p className="font-medium">{user?.phone || "غير محدد"}</p></div></GlassCard>
          <GlassCard className="flex items-center gap-4 p-4" hover={false}><MapPin className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">المحافظة</p><p className="font-medium">{user?.governorate}</p></div></GlassCard>
          <GlassCard className="flex items-center gap-4 p-4" hover={false}><Calendar className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">تاريخ التسجيل</p><p className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString("ar-SY") : "غير محدد"}</p></div></GlassCard>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full rounded-xl justify-start h-12" onClick={() => navigate("/my-offers")}><Package className="w-5 h-5 ml-2" />عروضي</Button>
          <Button variant="outline" className="w-full rounded-xl justify-start h-12" onClick={() => navigate("/favorites")}><Heart className="w-5 h-5 ml-2" />المفضلة</Button>
          {user?.is_admin && <Button variant="outline" className="w-full rounded-xl justify-start h-12 text-primary" onClick={() => navigate("/admin")}><LayoutDashboard className="w-5 h-5 ml-2" />لوحة التحكم</Button>}
          <Button variant="destructive" className="w-full rounded-xl h-12" onClick={logout}><LogOut className="w-5 h-5 ml-2" />تسجيل الخروج</Button>
        </div>
      </div>
    </div>
  );
};

// My Offers Page - COMPLETE
const MyOffersPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    try { const res = await api.get("/my-offers"); setOffers(res.data); }
    catch (e) { toast.error("فشل تحميل العروض"); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try { await api.put(`/offers/${id}/status?status=${status}`); setOffers(offers.map(o => o.id === id ? { ...o, status } : o)); toast.success("تم تحديث الحالة"); }
    catch (e) { toast.error("فشل التحديث"); }
  };

  const deleteOffer = async (id) => {
    if (!window.confirm("هل تريد حذف هذا العرض؟")) return;
    try { await api.delete(`/offers/${id}`); setOffers(offers.filter(o => o.id !== id)); toast.success("تم حذف العرض"); }
    catch (e) { toast.error("فشل الحذف"); }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 pt-2 md:py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">عروضي</h1>
          <Button onClick={() => navigate("/add-offer")} className="rounded-xl"><Plus className="w-5 h-5 ml-2" />إضافة عرض</Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 md:h-72 rounded-2xl md:rounded-3xl" />)}</div>
        ) : offers.length === 0 ? (
          <GlassCard className="text-center py-12" hover={false}>
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">لا توجد عروض</h3>
            <p className="text-muted-foreground mb-6">ابدأ بإضافة عرضك الأول</p>
            <Button onClick={() => navigate("/add-offer")} className="rounded-xl"><Plus className="w-5 h-5 ml-2" />إضافة عرض</Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {offers.map((offer) => <OfferCard key={offer.id} offer={offer} showActions onStatusChange={updateStatus} onDelete={deleteOffer} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// Favorites Page - COMPLETE
const FavoritesPage = () => {
  const { api } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFavorites(); }, []);

  const fetchFavorites = async () => {
    try { const res = await api.get("/favorites"); setFavorites(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 pt-2 md:py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">المفضلة</h1>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 md:h-72 rounded-2xl md:rounded-3xl" />)}</div>
        ) : favorites.length === 0 ? (
          <GlassCard className="text-center py-12" hover={false}>
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">لا توجد عناصر في المفضلة</h3>
            <p className="text-muted-foreground">أضف عروضاً للمفضلة لتجدها هنا</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">{favorites.map((offer, idx) => <OfferCard key={offer.id} offer={offer} delay={idx * 0.05} />)}</div>
        )}
      </div>
    </div>
  );
};

// Blog Page
const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try { const res = await axios.get(`${API}/blog`); setPosts(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 pt-2 md:py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">المدونة</h1>
        {loading ? (
          <div className="grid gap-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>
        ) : posts.length === 0 ? (
          <GlassCard className="text-center py-12" hover={false}>
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">لا توجد مقالات</h3>
            <p className="text-muted-foreground">ترقب مقالاتنا القادمة</p>
          </GlassCard>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <GlassCard key={post.id} className="p-6">
                <h2 className="text-xl font-bold mb-2">{post.title}</h2>
                <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{new Date(post.created_at).toLocaleDateString("ar-SY")}</span>
                  <Button variant="outline" className="rounded-xl">قراءة المزيد</Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Test Message Section Component
const TestMessageSection = ({ api }) => {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const sendTestMessage = async () => {
    if (!testPhone) {
      toast.error("أدخل رقم الهاتف");
      return;
    }
    
    setSending(true);
    setResult(null);
    
    try {
      const res = await api.post(`/whatsapp/test-send?phone=${encodeURIComponent(testPhone)}${testMessage ? `&message=${encodeURIComponent(testMessage)}` : ''}`);
      
      if (res.data.status === "sent") {
        toast.success("تم إرسال الرسالة بنجاح! ✅");
        setResult({ success: true, message: res.data.message });
      } else {
        toast.error(res.data.message || "فشل الإرسال");
        setResult({ success: false, message: res.data.message });
      }
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message || "فشل الاتصال بالخدمة";
      toast.error(errorMsg);
      setResult({ success: false, message: errorMsg });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        اختبر إرسال رسالة للتأكد من أن WhatsApp يعمل بشكل صحيح
      </p>
      
      <div className="grid gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">رقم الهاتف (مع كود الدولة)</label>
          <Input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="963955123456"
            dir="ltr"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">مثال: 963955123456 (بدون + أو 00)</p>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-1 block">الرسالة (اختياري)</label>
          <Input
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="رسالة اختبار من منصة زون"
          />
        </div>
        
        <Button
          onClick={sendTestMessage}
          disabled={sending || !testPhone}
          className="w-full rounded-xl"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 ml-2" />
              إرسال رسالة اختبار
            </>
          )}
        </Button>
        
        {result && (
          <div className={`p-3 rounded-xl text-sm ${result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {result.success ? <CheckCircle className="w-4 h-4 inline ml-1" /> : <XCircle className="w-4 h-4 inline ml-1" />}
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
};

// Admin WhatsApp Component
const AdminWhatsApp = () => {
  const { api } = useAuth();
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // تحديث كل 3 ثواني
    return () => clearInterval(interval);
  }, []);

  // مسح QR عند الاتصال
  useEffect(() => {
    if (status?.connected) {
      setQrCode(null);
    }
  }, [status?.connected]);

  const fetchStatus = async () => {
    try {
      const res = await api.get("/whatsapp/status");
      setStatus(res.data);
      
      // إذا تم الاتصال، أزل QR
      if (res.data.connected) {
        setQrCode(null);
      }
    } catch (e) {
      console.error("Error fetching WhatsApp status:", e);
    }
  };

  const generateQR = async () => {
    setLoading(true);
    try {
      const res = await api.post("/whatsapp/generate-qr");
      
      if (res.data.status === "already_connected" || res.data.status === "connected") {
        toast.success("WhatsApp متصل بالفعل! 🎉");
        setQrCode(null);
        fetchStatus();
      } else if (res.data.qr_code) {
        setQrCode(res.data.qr_code);
        toast.success("تم توليد QR Code - امسحه من WhatsApp");
      } else if (res.data.status === "loading") {
        toast.info("جاري توليد QR Code... انتظر قليلاً");
        // إعادة المحاولة بعد 3 ثواني
        setTimeout(async () => {
          const retryRes = await api.get("/whatsapp/qr");
          if (retryRes.data.qr_code) {
            setQrCode(retryRes.data.qr_code);
            toast.success("تم توليد QR Code");
          }
        }, 3000);
      }
    } catch (e) {
      console.error("Error generating QR:", e);
      toast.error("فشل توليد QR Code - تحقق من أن خدمة WhatsApp تعمل");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      await api.post("/whatsapp/disconnect");
      setQrCode(null);
      toast.success("تم قطع الاتصال");
      fetchStatus();
    } catch (e) {
      toast.error("فشل قطع الاتصال");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">إدارة WhatsApp</h2>
        <p className="text-muted-foreground">ربط رقم WhatsApp لإرسال رسائل التحقق</p>
      </div>

      {/* حالة الاتصال */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            حالة الاتصال
          </h3>
          {status?.connected ? (
            <Badge className="bg-green-500 text-white">
              <CheckCircle className="w-3 h-3 ml-1" />
              متصل
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="w-3 h-3 ml-1" />
              غير متصل
            </Badge>
          )}
        </div>

        {status?.connected && status?.connectedNumber && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900 mb-1">WhatsApp متصل بنجاح!</p>
                <div className="text-sm text-green-700 space-y-1">
                  <p>الرقم المتصل: +{status.connectedNumber}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                className="text-red-500 border-red-200 hover:bg-red-50"
              >
                قطع الاتصال
              </Button>
            </div>
          </div>
        )}

        {!status?.connected && !qrCode && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">ربط WhatsApp</h3>
            <p className="text-muted-foreground mb-6">قم بربط رقم WhatsApp لإرسال رسائل التحقق للمستخدمين</p>
            <Button
              onClick={generateQR}
              disabled={loading}
              className="rounded-xl"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  جاري التوليد...
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 ml-2" />
                  توليد QR Code
                </>
              )}
            </Button>
          </div>
        )}

        {qrCode && !status?.connected && (
          <div className="text-center py-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-6 rounded-2xl inline-block shadow-lg mb-4"
            >
              <img src={qrCode} alt="QR Code" className="w-64 h-64 mx-auto" />
            </motion.div>
            <h3 className="font-bold text-lg mb-2">امسح الـ QR Code</h3>
            <div className="max-w-md mx-auto space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 justify-center">
                <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">1</span>
                افتح WhatsApp على هاتفك
              </p>
              <p className="flex items-center gap-2 justify-center">
                <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">2</span>
                اضغط على القائمة (⋮) ثم الأجهزة المرتبطة
              </p>
              <p className="flex items-center gap-2 justify-center">
                <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">3</span>
                امسح هذا الكود
              </p>
            </div>
            <Button
              variant="outline"
              onClick={generateQR}
              className="mt-4"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              إعادة توليد QR
            </Button>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">في انتظار المسح...</span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* اختبار الإرسال */}
      {status?.connected && (
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-green-500" />
            اختبار إرسال رسالة
          </h3>
          <TestMessageSection api={api} />
        </GlassCard>
      )}

      {/* معلومات وإرشادات */}
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          ملاحظات مهمة
        </h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">الأمان</p>
              <p>استخدم رقم WhatsApp مخصص للمنصة فقط</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">الاتصال</p>
              <p>يجب أن يبقى الهاتف متصلاً بالإنترنت</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Ban className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">تحذير</p>
              <p>WhatsApp قد يحظر الحساب إذا اكتشف الاستخدام الآلي</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// Admin Dashboard - COMPLETE
const AdminDashboard = () => {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try { const res = await api.get("/admin/stats"); setStats(res.data); }
    catch (e) { toast.error("فشل تحميل الإحصائيات"); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 pt-2 md:py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">لوحة التحكم</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-white/80 p-1 rounded-full flex-wrap gap-1">
            <TabsTrigger value="overview" className="rounded-full"><TrendingUp className="w-4 h-4 ml-2" />نظرة عامة</TabsTrigger>
            <TabsTrigger value="users" className="rounded-full"><Users className="w-4 h-4 ml-2" />المستخدمون</TabsTrigger>
            <TabsTrigger value="offers" className="rounded-full"><Package className="w-4 h-4 ml-2" />العروض</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-full"><AlertTriangle className="w-4 h-4 ml-2" />البلاغات</TabsTrigger>
            <TabsTrigger value="blog" className="rounded-full"><BookOpen className="w-4 h-4 ml-2" />المدونة</TabsTrigger>
            <TabsTrigger value="pages" className="rounded-full"><Layers className="w-4 h-4 ml-2" />الصفحات</TabsTrigger>
            <TabsTrigger value="whatsapp" className="rounded-full"><MessageCircle className="w-4 h-4 ml-2" />WhatsApp</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full"><Settings className="w-4 h-4 ml-2" />الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><AdminOverview stats={stats} /></TabsContent>
          <TabsContent value="users"><AdminUsers /></TabsContent>
          <TabsContent value="offers"><AdminOffers /></TabsContent>
          <TabsContent value="reports"><AdminReports /></TabsContent>
          <TabsContent value="blog"><AdminBlog /></TabsContent>
          <TabsContent value="pages"><AdminPages /></TabsContent>
          <TabsContent value="whatsapp"><AdminWhatsApp /></TabsContent>
          <TabsContent value="settings"><AdminSettings /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Admin Overview Tab
const AdminOverview = ({ stats }) => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[
        { label: "المستخدمون", value: stats?.users_count || 0, icon: Users, color: "bg-primary/10 text-primary" },
        { label: "العروض النشطة", value: stats?.active_offers || 0, icon: Package, color: "bg-green-100 text-green-600" },
        { label: "الرسائل", value: stats?.messages_count || 0, icon: MessageCircle, color: "bg-blue-100 text-blue-600" },
        { label: "البلاغات المعلقة", value: stats?.pending_reports || 0, icon: AlertTriangle, color: "bg-red-100 text-red-600" },
      ].map((stat, idx) => (
        <GlassCard key={idx} hover={false}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
            <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-sm text-muted-foreground">{stat.label}</p></div>
          </div>
        </GlassCard>
      ))}
    </div>
    <div className="grid md:grid-cols-2 gap-6">
      <GlassCard hover={false}>
        <h3 className="font-bold mb-4">العروض حسب الفئة</h3>
        <div className="space-y-3">
          {Object.entries(stats?.by_category || {}).map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-3">
              <div className="flex-1"><div className="flex justify-between text-sm mb-1"><span>{cat}</span><span>{count}</span></div><Progress value={(count / Math.max(...Object.values(stats?.by_category || { a: 1 }))) * 100} className="h-2" /></div>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard hover={false}>
        <h3 className="font-bold mb-4">العروض حسب المحافظة</h3>
        <div className="space-y-3">
          {Object.entries(stats?.by_governorate || {}).slice(0, 7).map(([gov, count]) => (
            <div key={gov} className="flex items-center gap-3">
              <div className="flex-1"><div className="flex justify-between text-sm mb-1"><span>{gov}</span><span>{count}</span></div><Progress value={(count / Math.max(...Object.values(stats?.by_governorate || { a: 1 }))) * 100} className="h-2" /></div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  </>
);

// Admin Users Tab
const AdminUsers = () => {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const res = await api.get("/admin/users"); setUsers(res.data.users || res.data); }
    catch (e) { toast.error("فشل تحميل المستخدمين"); }
    finally { setLoading(false); }
  };

  const updateTrust = async (userId, score) => {
    try { await api.put(`/admin/users/${userId}/trust?trust_score=${score}`); setUsers(users.map(u => u.id === userId ? { ...u, trust_score: score } : u)); toast.success("تم تحديث مؤشر الثقة"); }
    catch (e) { toast.error("فشل التحديث"); }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === false;
      await api.put(`/admin/users/${userId}/status?is_active=${newStatus}`);
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: newStatus } : u));
      toast.success(newStatus ? "تم تفعيل الحساب" : "تم إيقاف الحساب");
    } catch (e) { toast.error("فشل تحديث حالة الحساب"); }
  };

  const deleteUser = async (userId) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      setDeleteConfirm(null);
      toast.success("تم حذف الحساب بنجاح");
    } catch (e) { toast.error("فشل حذف الحساب"); }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <GlassCard hover={false}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-100">
              <th className="text-right p-4">المستخدم</th>
              <th className="text-right p-4">البريد</th>
              <th className="text-right p-4">التوثيق</th>
              <th className="text-right p-4">الحالة</th>
              <th className="text-right p-4">مؤشر الثقة</th>
              <th className="text-right p-4">المقايضات</th>
              <th className="text-right p-4">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={`border-b border-purple-50 hover:bg-purple-50/50 ${user.is_active === false ? 'opacity-60 bg-red-50/30' : ''}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarFallback className="bg-primary text-white">{user.name?.charAt(0)}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <div className="flex gap-1 mt-1">
                        {user.is_admin && <Badge className="bg-primary text-xs">أدمن</Badge>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground text-sm">{user.email}</td>
                <td className="p-4">
                  {user.verified ? (
                    <Badge className="bg-green-500 text-white text-xs flex items-center gap-1 w-fit">
                      <CheckCircle className="w-3 h-3" />موثق
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-500 text-white text-xs flex items-center gap-1 w-fit">
                      <AlertCircle className="w-3 h-3" />غير موثق
                    </Badge>
                  )}
                </td>
                <td className="p-4">
                  {user.is_active === false ? (
                    <Badge className="bg-red-500 text-white text-xs flex items-center gap-1 w-fit">
                      <Ban className="w-3 h-3" />موقوف
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500 text-white text-xs flex items-center gap-1 w-fit">
                      <CheckCircle className="w-3 h-3" />نشط
                    </Badge>
                  )}
                </td>
                <td className="p-4"><div className="flex items-center gap-2"><TrustBadge score={user.trust_score} /><span className="text-sm text-muted-foreground">{user.trust_score}</span></div></td>
                <td className="p-4">{user.trades_count}</td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateTrust(user.id, Math.min(100, (user.trust_score || 0) + 10))}>
                        <Plus className="w-4 h-4 ml-2 text-green-500" />زيادة الثقة +10
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTrust(user.id, Math.max(0, (user.trust_score || 0) - 10))}>
                        <Minus className="w-4 h-4 ml-2 text-orange-500" />إنقاص الثقة -10
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.is_active === false ? (
                        <DropdownMenuItem onClick={() => toggleUserStatus(user.id, false)} className="text-green-600">
                          <CheckCircle className="w-4 h-4 ml-2" />تفعيل الحساب
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => toggleUserStatus(user.id, true)} className="text-orange-600" disabled={user.is_admin}>
                          <Ban className="w-4 h-4 ml-2" />إيقاف الحساب
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteConfirm(user.id)} className="text-red-600" disabled={user.is_admin}>
                        <Trash2 className="w-4 h-4 ml-2" />حذف الحساب
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* مودال تأكيد الحذف */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              تأكيد حذف الحساب
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا الحساب؟ سيتم حذف جميع عروض المستخدم أيضاً.
              <br />
              <span className="text-red-500 font-bold">هذا الإجراء لا يمكن التراجع عنه!</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteUser(deleteConfirm)}>
              <Trash2 className="w-4 h-4 ml-2" />نعم، احذف الحساب
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
};

// Admin Offers Tab
const AdminOffers = () => {
  const { api } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    try { const res = await api.get("/admin/offers"); setOffers(res.data.offers || res.data); }
    catch (e) { toast.error("فشل تحميل العروض"); }
    finally { setLoading(false); }
  };

  const updateStatus = async (offerId, status) => {
    try { await api.put(`/admin/offers/${offerId}/status?status=${status}`); setOffers(offers.map(o => o.id === offerId ? { ...o, status } : o)); toast.success("تم تحديث الحالة"); }
    catch (e) { toast.error("فشل التحديث"); }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <GlassCard hover={false}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-100">
              <th className="text-right p-4">العرض</th>
              <th className="text-right p-4">المالك</th>
              <th className="text-right p-4">الفئة</th>
              <th className="text-right p-4">المحافظة</th>
              <th className="text-right p-4">الحالة</th>
              <th className="text-right p-4">المشاهدات</th>
              <th className="text-right p-4">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id} className="border-b border-purple-50 hover:bg-purple-50/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl overflow-hidden">
                      {offer.images?.[0] ? <img src={offer.images[0]} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-purple-300" /></div>}
                    </div>
                    <span className="font-medium">{offer.title}</span>
                  </div>
                </td>
                <td className="p-4">{offer.user_name}</td>
                <td className="p-4">{offer.category}</td>
                <td className="p-4">{offer.governorate}</td>
                <td className="p-4"><Badge className={offer.status === "active" ? "bg-green-500" : offer.status === "pending" ? "bg-yellow-500" : "bg-gray-500"}>{offer.status === "active" ? "نشط" : offer.status === "pending" ? "معلق" : "موقوف"}</Badge></td>
                <td className="p-4">{offer.views}</td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => updateStatus(offer.id, "active")}><CheckCircle className="w-4 h-4 ml-2 text-green-500" />تفعيل</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(offer.id, "suspended")}><Ban className="w-4 h-4 ml-2 text-red-500" />إيقاف</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

// Admin Reports Tab
const AdminReports = () => {
  const { api } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try { const res = await api.get("/admin/reports"); setReports(res.data); }
    catch (e) { toast.error("فشل تحميل البلاغات"); }
    finally { setLoading(false); }
  };

  const updateStatus = async (reportId, status) => {
    try { await api.put(`/admin/reports/${reportId}?status=${status}`); setReports(reports.map(r => r.id === reportId ? { ...r, status } : r)); toast.success("تم التحديث"); }
    catch (e) { toast.error("فشل التحديث"); }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <GlassCard hover={false}>
      {reports.length === 0 ? (
        <div className="text-center py-12"><CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" /><p className="text-xl font-semibold">لا توجد بلاغات معلقة</p></div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="p-4 border border-purple-100 rounded-2xl">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <Badge className={report.status === "pending" ? "bg-yellow-500" : report.status === "resolved" ? "bg-green-500" : "bg-gray-500"}>{report.status === "pending" ? "معلق" : report.status === "resolved" ? "تم الحل" : "مرفوض"}</Badge>
                  <p className="font-bold mt-2">{report.reason}</p>
                </div>
                <p className="text-sm text-muted-foreground">{new Date(report.created_at).toLocaleDateString("ar-SY")}</p>
              </div>
              <p className="text-muted-foreground mb-3">{report.details}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus(report.id, "resolved")} className="rounded-xl"><Check className="w-4 h-4 ml-1" />تم الحل</Button>
                <Button size="sm" variant="ghost" onClick={() => updateStatus(report.id, "rejected")} className="rounded-xl">رفض</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

// Admin Blog Tab
const AdminBlog = () => {
  const { api } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", excerpt: "", tags: [], is_published: false });

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try { const res = await api.get("/blog?published_only=false"); setPosts(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createPost = async () => {
    try { await api.post("/blog", form); toast.success("تم إنشاء المقالة"); setShowDialog(false); setForm({ title: "", content: "", excerpt: "", tags: [], is_published: false }); fetchPosts(); }
    catch (e) { toast.error("فشل الإنشاء"); }
  };

  const deletePost = async (id) => {
    if (!window.confirm("هل تريد حذف هذه المقالة؟")) return;
    try { await api.delete(`/blog/${id}`); setPosts(posts.filter(p => p.id !== id)); toast.success("تم الحذف"); }
    catch (e) { toast.error("فشل الحذف"); }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">إدارة المدونة</h2>
        <Button onClick={() => setShowDialog(true)} className="rounded-xl"><PlusCircle className="w-4 h-4 ml-2" />مقالة جديدة</Button>
      </div>
      
      <GlassCard hover={false}>
        {posts.length === 0 ? (
          <div className="text-center py-12"><BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><p>لا توجد مقالات</p></div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between p-4 border border-purple-100 rounded-xl">
                <div>
                  <h3 className="font-bold">{post.title}</h3>
                  <p className="text-sm text-muted-foreground">{new Date(post.created_at).toLocaleDateString("ar-SY")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={post.is_published ? "bg-green-500" : "bg-gray-500"}>{post.is_published ? "منشور" : "مسودة"}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => deletePost(post.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>إنشاء مقالة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>العنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 rounded-xl" /></div>
            <div><Label>المقتطف</Label><Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="mt-2 rounded-xl" rows={2} /></div>
            <div><Label>المحتوى</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-2 rounded-xl" rows={6} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><Label>نشر فوراً</Label></div>
          </div>
          <DialogFooter><Button onClick={createPost} className="rounded-xl">إنشاء المقالة</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Admin Pages Tab - Page Builder
const BLOCK_TYPES = [
  { type: "hero", label: "بطل الصفحة", icon: Layout, description: "قسم رئيسي بصورة وعنوان" },
  { type: "text", label: "نص", icon: Type, description: "فقرة نصية" },
  { type: "slider", label: "سلايدر", icon: Layers, description: "عرض شرائح صور" },
  { type: "listings", label: "عروض", icon: Grid3X3, description: "عرض أحدث العروض" },
  { type: "banner", label: "بانر", icon: ImageIcon, description: "صورة إعلانية" },
  { type: "contact", label: "تواصل", icon: Mail, description: "نموذج تواصل" },
];

const AdminPages = () => {
  const { api } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [form, setForm] = useState({ title: "", slug: "", blocks: [], is_published: false });

  useEffect(() => { fetchPages(); }, []);

  const fetchPages = async () => {
    try { const res = await api.get("/pages"); setPages(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createPage = async () => {
    try { 
      await api.post("/pages", form); 
      toast.success("تم إنشاء الصفحة"); 
      setShowDialog(false); 
      setForm({ title: "", slug: "", blocks: [], is_published: false }); 
      fetchPages(); 
    }
    catch (e) { toast.error(e.response?.data?.detail || "فشل الإنشاء"); }
  };

  const updatePage = async () => {
    try { 
      await api.put(`/pages/${editingPage.id}`, form); 
      toast.success("تم تحديث الصفحة"); 
      setEditingPage(null); 
      setForm({ title: "", slug: "", blocks: [], is_published: false }); 
      fetchPages(); 
    }
    catch (e) { toast.error(e.response?.data?.detail || "فشل التحديث"); }
  };

  const deletePage = async (id) => {
    if (!window.confirm("هل تريد حذف هذه الصفحة؟")) return;
    try { await api.delete(`/pages/${id}`); setPages(pages.filter(p => p.id !== id)); toast.success("تم الحذف"); }
    catch (e) { toast.error("فشل الحذف"); }
  };

  const openEditPage = (page) => {
    setEditingPage(page);
    setForm({ title: page.title, slug: page.slug, blocks: page.blocks || [], is_published: page.is_published });
  };

  const addBlock = (type) => {
    const newBlock = {
      id: `block_${Date.now()}`,
      type,
      content: getDefaultBlockContent(type),
      order: form.blocks.length
    };
    setForm({ ...form, blocks: [...form.blocks, newBlock] });
  };

  const getDefaultBlockContent = (type) => {
    switch (type) {
      case "hero": return { title: "عنوان رئيسي", subtitle: "نص فرعي", buttonText: "ابدأ الآن", buttonLink: "/browse", backgroundImage: "" };
      case "text": return { title: "عنوان القسم", content: "محتوى النص هنا..." };
      case "slider": return { images: [], autoPlay: true };
      case "listings": return { title: "أحدث العروض", count: 4 };
      case "banner": return { image: "", link: "", alt: "بانر" };
      case "contact": return { title: "تواصل معنا", email: "", phone: "" };
      default: return {};
    }
  };

  const updateBlockContent = (blockId, newContent) => {
    setForm({
      ...form,
      blocks: form.blocks.map(b => b.id === blockId ? { ...b, content: { ...b.content, ...newContent } } : b)
    });
  };

  const removeBlock = (blockId) => {
    setForm({ ...form, blocks: form.blocks.filter(b => b.id !== blockId) });
  };

  const moveBlock = (blockId, direction) => {
    const idx = form.blocks.findIndex(b => b.id === blockId);
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === form.blocks.length - 1)) return;
    const newBlocks = [...form.blocks];
    [newBlocks[idx], newBlocks[idx + direction]] = [newBlocks[idx + direction], newBlocks[idx]];
    setForm({ ...form, blocks: newBlocks.map((b, i) => ({ ...b, order: i })) });
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">بناء الصفحات</h2>
        <Button onClick={() => setShowDialog(true)} className="rounded-xl"><PlusCircle className="w-4 h-4 ml-2" />صفحة جديدة</Button>
      </div>
      
      <GlassCard hover={false}>
        {pages.length === 0 ? (
          <div className="text-center py-12"><Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><p>لا توجد صفحات مخصصة</p></div>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between p-4 border border-purple-100 rounded-xl">
                <div>
                  <h3 className="font-bold">{page.title}</h3>
                  <p className="text-sm text-muted-foreground">/{page.slug} • {page.blocks?.length || 0} مكونات</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={page.is_published ? "bg-green-500" : "bg-gray-500"}>{page.is_published ? "منشور" : "مسودة"}</Badge>
                  <Button variant="outline" size="sm" onClick={() => window.open(`/page/${page.slug}`, '_blank')} className="rounded-xl"><ExternalLink className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => openEditPage(page)} className="rounded-xl"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => deletePage(page.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Create Page Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>إنشاء صفحة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>عنوان الصفحة</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 rounded-xl" placeholder="من نحن" /></div>
            <div><Label>الرابط (Slug)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-2 rounded-xl" placeholder="about-us" dir="ltr" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><Label>نشر فوراً</Label></div>
          </div>
          <DialogFooter><Button onClick={createPage} className="rounded-xl">إنشاء الصفحة</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Page Dialog (Page Builder) */}
      <Dialog open={!!editingPage} onOpenChange={() => { setEditingPage(null); setForm({ title: "", slug: "", blocks: [], is_published: false }); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الصفحة: {editingPage?.title}</DialogTitle>
            <DialogDescription>استخدم المكعبات لبناء صفحتك</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>عنوان الصفحة</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 rounded-xl" /></div>
              <div><Label>الرابط</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-2 rounded-xl" dir="ltr" /></div>
            </div>

            {/* Add Block Section */}
            <div className="border-2 border-dashed border-purple-200 rounded-xl p-4">
              <p className="text-sm font-medium mb-3">إضافة مكون جديد:</p>
              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPES.map((bt) => (
                  <Button key={bt.type} variant="outline" size="sm" onClick={() => addBlock(bt.type)} className="rounded-xl">
                    <bt.icon className="w-4 h-4 ml-2" />{bt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Blocks List */}
            <div className="space-y-4">
              {form.blocks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد مكونات. أضف مكوناً للبدء</p>
                </div>
              ) : (
                form.blocks.map((block, idx) => (
                  <div key={block.id} className="border border-purple-100 rounded-xl p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{BLOCK_TYPES.find(bt => bt.type === block.type)?.label || block.type}</Badge>
                        <span className="text-sm text-muted-foreground">#{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0}><ChevronRight className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => moveBlock(block.id, 1)} disabled={idx === form.blocks.length - 1}><ChevronLeft className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => removeBlock(block.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <BlockEditor block={block} onUpdate={(content) => updateBlockContent(block.id, content)} />
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label>نشر الصفحة</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingPage(null); setForm({ title: "", slug: "", blocks: [], is_published: false }); }} className="rounded-xl">إلغاء</Button>
            <Button onClick={updatePage} className="rounded-xl"><Save className="w-4 h-4 ml-2" />حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Block Editor Component
const BlockEditor = ({ block, onUpdate }) => {
  const content = block.content || {};
  
  const handleImageUpload = async (e, fieldName = 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // تحقق من حجم الملف (أقل من 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً. يجب أن يكون أقل من 5MB");
      return;
    }
    
    // تحويل الصورة إلى Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      onUpdate({ [fieldName]: base64String });
      toast.success("تم رفع الصورة بنجاح");
    };
    reader.onerror = () => {
      toast.error("فشل رفع الصورة");
    };
    reader.readAsDataURL(file);
  };
  
  switch (block.type) {
    case "hero":
      return (
        <div className="grid gap-3">
          <Input placeholder="العنوان الرئيسي" value={content.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} className="rounded-xl" />
          <Input placeholder="النص الفرعي" value={content.subtitle || ""} onChange={(e) => onUpdate({ subtitle: e.target.value })} className="rounded-xl" />
          
          {/* رفع الصورة */}
          <div className="space-y-2">
            <Label>صورة الخلفية</Label>
            <div className="flex gap-2">
              <Input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'image')} 
                className="rounded-xl"
              />
            </div>
            {content.image && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-purple-200">
                <img src={content.image} alt="Preview" className="w-full h-32 object-cover" />
                <Button 
                  size="icon" 
                  variant="destructive" 
                  className="absolute top-2 right-2 rounded-full" 
                  onClick={() => onUpdate({ image: "" })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="نص الزر" value={content.buttonText || ""} onChange={(e) => onUpdate({ buttonText: e.target.value })} className="rounded-xl" />
            <Input placeholder="رابط الزر" value={content.buttonLink || ""} onChange={(e) => onUpdate({ buttonLink: e.target.value })} className="rounded-xl" dir="ltr" />
          </div>
        </div>
      );
    case "text":
      return (
        <div className="grid gap-3">
          <Input placeholder="عنوان القسم" value={content.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} className="rounded-xl" />
          <Textarea placeholder="المحتوى" value={content.content || ""} onChange={(e) => onUpdate({ content: e.target.value })} className="rounded-xl" rows={4} />
        </div>
      );
    case "listings":
      return (
        <div className="grid gap-3">
          <Input placeholder="عنوان القسم" value={content.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} className="rounded-xl" />
          <div className="flex items-center gap-2">
            <Label>عدد العروض:</Label>
            <Input type="number" min="1" max="12" value={content.count || 4} onChange={(e) => onUpdate({ count: parseInt(e.target.value) })} className="w-20 rounded-xl" />
          </div>
        </div>
      );
    case "banner":
      return (
        <div className="grid gap-3">
          {/* رفع صورة البانر */}
          <div className="space-y-2">
            <Label>صورة البانر</Label>
            <div className="flex gap-2">
              <Input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'image')} 
                className="rounded-xl"
              />
            </div>
            {content.image && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-purple-200">
                <img src={content.image} alt="Preview" className="w-full h-32 object-cover" />
                <Button 
                  size="icon" 
                  variant="destructive" 
                  className="absolute top-2 right-2 rounded-full" 
                  onClick={() => onUpdate({ image: "" })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          
          <Input placeholder="رابط البانر" value={content.link || ""} onChange={(e) => onUpdate({ link: e.target.value })} className="rounded-xl" dir="ltr" />
          <Input placeholder="النص البديل" value={content.alt || ""} onChange={(e) => onUpdate({ alt: e.target.value })} className="rounded-xl" />
        </div>
      );
    case "contact":
      return (
        <div className="grid gap-3">
          <Input placeholder="عنوان القسم" value={content.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} className="rounded-xl" />
          <Input placeholder="البريد الإلكتروني" value={content.email || ""} onChange={(e) => onUpdate({ email: e.target.value })} className="rounded-xl" dir="ltr" />
          <Input placeholder="رقم الهاتف" value={content.phone || ""} onChange={(e) => onUpdate({ phone: e.target.value })} className="rounded-xl" />
          <Input placeholder="العنوان" value={content.address || ""} onChange={(e) => onUpdate({ address: e.target.value })} className="rounded-xl" />
        </div>
      );
    case "slider":
      return (
        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={content.autoPlay !== false} onCheckedChange={(v) => onUpdate({ autoPlay: v })} />
            <Label>تشغيل تلقائي</Label>
          </div>
          <p className="text-sm text-muted-foreground">يمكنك إضافة الصور عبر روابط مفصولة بفاصلة</p>
          <Textarea placeholder="روابط الصور (كل رابط في سطر)" value={(content.images || []).join("\n")} onChange={(e) => onUpdate({ images: e.target.value.split("\n").filter(Boolean) })} className="rounded-xl" rows={3} />
        </div>
      );
    default:
      return <p className="text-sm text-muted-foreground">مكون غير معروف</p>;
  }
};

// Admin Settings Tab
const AdminSettings = () => {
  const { api } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const [form, setForm] = useState({
    site_name: "",
    site_logo: "",
    contact_email: "",
    contact_phone: "",
    footer_text: "",
    primary_color: "#8b5cf6",
    menu_items: []
  });
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuForm, setMenuForm] = useState({ id: "", label: "", link: "", icon: "globe", is_visible: true, order: 0, open_in_new_tab: false });

  const MENU_ICONS = [
    { value: "home", label: "🏠 الرئيسية" },
    { value: "search", label: "🔍 بحث" },
    { value: "book", label: "📖 كتاب" },
    { value: "heart", label: "❤️ قلب" },
    { value: "user", label: "👤 مستخدم" },
    { value: "mail", label: "✉️ بريد" },
    { value: "phone", label: "📞 هاتف" },
    { value: "star", label: "⭐ نجمة" },
    { value: "package", label: "📦 طرد" },
    { value: "settings", label: "⚙️ إعدادات" },
    { value: "globe", label: "🌐 عالم" },
    { value: "calendar", label: "📅 تقويم" },
    { value: "award", label: "🏆 جائزة" },
    { value: "zap", label: "⚡ برق" },
    { value: "map", label: "📍 موقع" },
  ];

  useEffect(() => {
    if (settings) {
      setForm({
        site_name: settings.site_name || "",
        site_logo: settings.site_logo || "",
        contact_email: settings.contact_email || "",
        contact_phone: settings.contact_phone || "",
        footer_text: settings.footer_text || "",
        primary_color: settings.primary_color || "#8b5cf6",
        menu_items: settings.menu_items || []
      });
      setLogoPreview(settings.site_logo || "");
    }
  }, [settings]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) { toast.error("حجم الشعار يجب أن يكون أقل من 1MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setForm({ ...form, site_logo: reader.result });
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {
    setLoading(true);
    try { await api.put("/settings", form); toast.success("تم حفظ الإعدادات"); refreshSettings(); }
    catch (e) { toast.error("فشل الحفظ"); }
    finally { setLoading(false); }
  };

  // Menu Management Functions
  const openAddMenu = () => {
    setEditingMenuItem(null);
    setMenuForm({ id: `menu_${Date.now()}`, label: "", link: "", icon: "globe", is_visible: true, order: form.menu_items.length, open_in_new_tab: false });
    setShowMenuDialog(true);
  };

  const openEditMenu = (item) => {
    setEditingMenuItem(item);
    setMenuForm({ ...item });
    setShowMenuDialog(true);
  };

  const saveMenuItem = () => {
    if (!menuForm.label || !menuForm.link) { toast.error("يرجى ملء جميع الحقول"); return; }
    
    if (editingMenuItem) {
      setForm({ ...form, menu_items: form.menu_items.map(item => item.id === editingMenuItem.id ? menuForm : item) });
    } else {
      setForm({ ...form, menu_items: [...form.menu_items, menuForm] });
    }
    setShowMenuDialog(false);
    toast.success(editingMenuItem ? "تم تحديث العنصر" : "تم إضافة العنصر");
  };

  const deleteMenuItem = (itemId) => {
    setForm({ ...form, menu_items: form.menu_items.filter(item => item.id !== itemId) });
    toast.success("تم حذف العنصر");
  };

  const moveMenuItem = (itemId, direction) => {
    const idx = form.menu_items.findIndex(item => item.id === itemId);
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === form.menu_items.length - 1)) return;
    const newItems = [...form.menu_items];
    [newItems[idx], newItems[idx + direction]] = [newItems[idx + direction], newItems[idx]];
    setForm({ ...form, menu_items: newItems.map((item, i) => ({ ...item, order: i })) });
  };

  const toggleMenuVisibility = (itemId) => {
    setForm({ ...form, menu_items: form.menu_items.map(item => item.id === itemId ? { ...item, is_visible: !item.is_visible } : item) });
  };

  return (
    <div className="space-y-6">
      <GlassCard hover={false}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Globe className="w-5 h-5" />إعدادات الموقع</h3>
        <div className="grid gap-4">
          <div><Label>اسم الموقع</Label><Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} className="mt-2 rounded-xl" /></div>
          <div><Label>البريد الإلكتروني للتواصل</Label><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="mt-2 rounded-xl" type="email" /></div>
          <div><Label>رقم الهاتف للتواصل</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="mt-2 rounded-xl" /></div>
          <div><Label>نص الفوتر</Label><Input value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className="mt-2 rounded-xl" /></div>
        </div>
      </GlassCard>

      <GlassCard hover={false}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5" />شعار الموقع</h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-purple-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-purple-200">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-muted-foreground">
                <Upload className="w-8 h-8 mx-auto mb-1" />
                <span className="text-xs">لا يوجد شعار</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-3">ارفع شعار الموقع (PNG, JPG - أقل من 1MB)</p>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
                <Button type="button" variant="outline" className="rounded-xl" asChild><span><Upload className="w-4 h-4 ml-2" />رفع شعار</span></Button>
              </label>
              {logoPreview && (
                <Button type="button" variant="ghost" className="rounded-xl text-destructive" onClick={() => { setForm({ ...form, site_logo: "" }); setLogoPreview(""); }}>
                  <Trash2 className="w-4 h-4 ml-2" />حذف
                </Button>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Menu Management Section */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2"><Menu className="w-5 h-5" />إدارة القائمة الرئيسية</h3>
          <Button onClick={openAddMenu} size="sm" className="rounded-xl"><PlusCircle className="w-4 h-4 ml-2" />إضافة عنصر</Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">خصّص عناصر القائمة الرئيسية التي تظهر في الموقع على جميع الأجهزة</p>
        
        {form.menu_items.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-purple-200 rounded-xl">
            <Menu className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">لم تتم إضافة عناصر للقائمة بعد</p>
            <p className="text-sm text-muted-foreground mt-1">سيتم استخدام القائمة الافتراضية</p>
          </div>
        ) : (
          <div className="space-y-2">
            {form.menu_items.sort((a, b) => a.order - b.order).map((item, idx) => (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${item.is_visible ? 'border-purple-100 bg-purple-50/50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveMenuItem(item.id, -1)} disabled={idx === 0}><ChevronRight className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveMenuItem(item.id, 1)} disabled={idx === form.menu_items.length - 1}><ChevronLeft className="w-4 h-4" /></Button>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <span className="text-lg">{MENU_ICONS.find(i => i.value === item.icon)?.label.split(' ')[0] || '🌐'}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{item.link}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.open_in_new_tab && <Badge variant="outline" className="text-xs"><ExternalLink className="w-3 h-3 ml-1" />تبويب جديد</Badge>}
                  <Switch checked={item.is_visible} onCheckedChange={() => toggleMenuVisibility(item.id)} />
                  <Button variant="ghost" size="icon" onClick={() => openEditMenu(item)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMenuItem(item.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard hover={false}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Palette className="w-5 h-5" />الألوان</h3>
        <div className="flex items-center gap-4">
          <Label>اللون الأساسي</Label>
          <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-12 h-12 rounded-xl cursor-pointer" />
          <span className="text-sm text-muted-foreground">{form.primary_color}</span>
        </div>
      </GlassCard>

      <Button onClick={saveSettings} disabled={loading} className="rounded-xl w-full h-12">
        {loading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Save className="w-5 h-5 ml-2" />}حفظ الإعدادات
      </Button>

      {/* Menu Item Dialog */}
      <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMenuItem ? "تعديل عنصر القائمة" : "إضافة عنصر جديد"}</DialogTitle>
            <DialogDescription>أضف رابطاً جديداً للقائمة الرئيسية</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم العنصر</Label>
              <Input value={menuForm.label} onChange={(e) => setMenuForm({ ...menuForm, label: e.target.value })} className="mt-2 rounded-xl" placeholder="مثال: من نحن" />
            </div>
            <div>
              <Label>الرابط</Label>
              <Input value={menuForm.link} onChange={(e) => setMenuForm({ ...menuForm, link: e.target.value })} className="mt-2 rounded-xl" placeholder="/about أو https://..." dir="ltr" />
              <p className="text-xs text-muted-foreground mt-1">استخدم / للصفحات الداخلية أو رابط كامل للخارجية</p>
            </div>
            <div>
              <Label>الأيقونة</Label>
              <Select value={menuForm.icon} onValueChange={(v) => setMenuForm({ ...menuForm, icon: v })}>
                <SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MENU_ICONS.map(icon => (
                    <SelectItem key={icon.value} value={icon.value}>{icon.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={menuForm.is_visible} onCheckedChange={(v) => setMenuForm({ ...menuForm, is_visible: v })} />
                <Label>ظاهر</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={menuForm.open_in_new_tab} onCheckedChange={(v) => setMenuForm({ ...menuForm, open_in_new_tab: v })} />
                <Label>فتح في تبويب جديد</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMenuDialog(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={saveMenuItem} className="rounded-xl">{editingMenuItem ? "حفظ التعديلات" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Dynamic Page Component - عرض الصفحات الديناميكية
const DynamicPage = () => {
  const { slug } = useParams();
  const { api } = useAuth();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API}/pages/${slug}`);
        setPage(res.data);
      } catch (e) {
        console.error(e);
        setError("الصفحة غير موجودة");
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen pb-24 md:pb-8 px-4 pt-2 md:py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">الصفحة غير موجودة</h1>
          <p className="text-muted-foreground mb-8">{error}</p>
          <Button onClick={() => window.location.href = '/'}>
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  // استخدام blocks بدلاً من content
  const components = page.blocks || [];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">{page.title}</h1>
        
        {components.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا يوجد محتوى في هذه الصفحة بعد</p>
          </div>
        ) : (
          <div className="space-y-8">
            {components.map((component, index) => {
              // استخدام content بدلاً من data
              const blockData = component.content || component.data || {};
              
              switch (component.type) {
                case 'hero':
                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative h-[400px] rounded-3xl overflow-hidden"
                    >
                      {blockData.image && (
                        <img src={blockData.image} alt={blockData.title || 'Hero'} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                        <div className="p-8 text-white">
                          <h2 className="text-4xl font-bold mb-3">{blockData.title || ''}</h2>
                          {blockData.subtitle && <p className="text-lg opacity-90">{blockData.subtitle}</p>}
                          {blockData.buttonText && (
                            <Button 
                              className="mt-4 bg-white text-purple-600 hover:bg-white/90"
                              onClick={() => window.location.href = blockData.buttonLink || '#'}
                            >
                              {blockData.buttonText}
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );

                case 'text':
                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <GlassCard>
                        {blockData.title && <h3 className="text-2xl font-bold mb-4">{blockData.title}</h3>}
                        {blockData.content && <p className="text-lg leading-relaxed whitespace-pre-wrap">{blockData.content}</p>}
                      </GlassCard>
                    </motion.div>
                  );

                case 'banner':
                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {blockData.image ? (
                        <div 
                          className="relative h-[300px] rounded-3xl overflow-hidden cursor-pointer"
                          onClick={() => blockData.link && (window.location.href = blockData.link)}
                        >
                          <img src={blockData.image} alt={blockData.alt || 'Banner'} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <GlassCard className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-center py-12">
                          <h3 className="text-3xl font-bold mb-4">{blockData.title || ''}</h3>
                          <p className="text-xl mb-6 opacity-90">{blockData.content || ''}</p>
                          {blockData.button_text && (
                            <Button 
                              className="bg-white text-purple-600 hover:bg-white/90"
                              onClick={() => window.location.href = blockData.button_link || '#'}
                            >
                              {blockData.button_text}
                            </Button>
                          )}
                        </GlassCard>
                      )}
                    </motion.div>
                  );

                case 'contact':
                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <GlassCard>
                        {blockData.title && <h3 className="text-2xl font-bold mb-6 text-center">{blockData.title}</h3>}
                        <div className="grid md:grid-cols-3 gap-6">
                          {blockData.email && (
                            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
                              <Mail className="w-6 h-6 text-primary" />
                              <div>
                                <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                                <p className="font-medium">{blockData.email}</p>
                              </div>
                            </div>
                          )}
                          {blockData.phone && (
                            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
                              <Phone className="w-6 h-6 text-primary" />
                              <div>
                                <p className="text-sm text-muted-foreground">الهاتف</p>
                                <p className="font-medium">{blockData.phone}</p>
                              </div>
                            </div>
                          )}
                          {blockData.address && (
                            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
                              <MapPin className="w-6 h-6 text-primary" />
                              <div>
                                <p className="text-sm text-muted-foreground">العنوان</p>
                                <p className="font-medium">{blockData.address}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    </motion.div>
                  );

                default:
                  return null;
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Scroll To Top Component - يعيد التمرير للأعلى عند تغيير الصفحة
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // لا تقم بالتمرير للأعلى في صفحة المراسلات لأن لديها تمرير خاص
    if (!pathname.startsWith('/messages')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname]);

  return null;
};

// Welcome Page - صفحة ترحيبية للمستخدمين الجدد
const WelcomePage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-10 w-48 h-48 bg-pink-300/20 rounded-full blur-2xl" />
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-purple-300/15 rounded-full blur-xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden">
            {settings?.site_logo ? (
              <img src={settings.site_logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-10 h-10 text-white" />
            )}
          </div>
        </motion.div>
        
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            جاهز للبدء؟
          </h1>
          <p className="text-lg text-white/80 max-w-sm mx-auto leading-relaxed">
            انضم لآلاف المستخدمين واستمتع بتجربة مقايضة فريدة
          </p>
        </motion.div>
        
        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full max-w-sm space-y-4"
        >
          <Button 
            size="lg"
            className="w-full h-14 rounded-2xl text-lg font-bold bg-white text-purple-600 hover:bg-white/90 shadow-xl"
            onClick={() => navigate('/browse')}
          >
            <Search className="w-5 h-5 ml-2" />
            استكشف العروض
          </Button>
          
          <Button 
            size="lg"
            variant="outline"
            className="w-full h-14 rounded-2xl text-lg font-bold border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
            onClick={() => navigate('/add-offer')}
          >
            <Plus className="w-5 h-5 ml-2" />
            أضف عرض
          </Button>
        </motion.div>
        
        {/* Features List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 flex items-center gap-6 text-white/70 text-sm"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>آمن</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>سريع</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span>مجاني</span>
          </div>
        </motion.div>
        
        {/* Skip Link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          onClick={() => navigate('/')}
          className="mt-8 text-white/60 text-sm hover:text-white transition-colors"
        >
          تخطي والذهاب للرئيسية ←
        </motion.button>
      </div>
    </div>
  );
};

// Main App
function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen bg-background font-tajawal">
            <Toaster position="top-center" richColors closeButton dir="rtl" />
            <Navbar />
            <VerificationBanner />
            <main className="pt-0 md:pt-8">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/offer/:id" element={<OfferDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-phone" element={<VerifyPhonePage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/add-offer" element={<ProtectedRoute><AddOfferPage /></ProtectedRoute>} />
                <Route path="/edit-offer/:id" element={<ProtectedRoute><EditOfferPage /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/my-offers" element={<ProtectedRoute><MyOffersPage /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
                <Route path="/page/:slug" element={<DynamicPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
