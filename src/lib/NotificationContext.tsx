import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Bell, X, CheckCircle, CalendarCheck, Stethoscope } from "lucide-react";
import { supabase } from "./supabaseClient";
import { useAuth } from "../AuthContext";

interface AppNotification {
  id: string;
  type: "verdict" | "scheduled" | "completed";
  message: string;
  read: boolean;
  created_at: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  // Step A: Load existing (persisted) notifications on login / app load
  useEffect(() => {
    if (!currentUser || currentUser.role !== "patient") return;

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(data as AppNotification[]);
      }
    };

    loadNotifications();
  }, [currentUser]);

  // Step B: Listen for new notifications in real-time
  useEffect(() => {
    if (!currentUser || currentUser.role !== "patient") return;

    const channel = supabase
      .channel(`notifications-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
          setToasts((prev) => [...prev, newNotif]);

          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== newNotif.id));
          }, 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (currentUser) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", currentUser.id)
        .eq("read", false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: AppNotification["type"]) => {
    if (type === "verdict") return <Stethoscope className="h-4 w-4 text-teal-600" />;
    if (type === "scheduled") return <CalendarCheck className="h-4 w-4 text-cyan-600" />;
    return <CheckCircle className="h-4 w-4 text-emerald-600" />;
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}

      {/* Toast Stack - fixed top-right */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 w-full max-w-sm px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-slate-200 shadow-lg rounded-xl p-4 flex items-start gap-3"
          >
            <div className="mt-0.5 shrink-0">{getIcon(t.type)}</div>
            <p className="text-xs text-slate-700 leading-relaxed flex-1">{t.message}</p>
            <button onClick={() => dismissToast(t.id)} className="text-slate-300 hover:text-slate-500 cursor-pointer shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: AppNotification["type"]) => {
    if (type === "verdict") return <Stethoscope className="h-4 w-4 text-teal-600" />;
    if (type === "scheduled") return <CalendarCheck className="h-4 w-4 text-cyan-600" />;
    return <CheckCircle className="h-4 w-4 text-emerald-600" />;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) markAllRead();
        }}
        className="relative p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg cursor-pointer transition-all"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Notifications</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">Koi notification nahi hai</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-3 flex items-start gap-2.5 hover:bg-slate-50/50 ${!n.read ? "bg-cyan-50/40" : ""}`}>
                  <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1">
                    <p className="text-[11px] text-slate-700 leading-relaxed">{n.message}</p>
                    <span className="text-[9px] text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}