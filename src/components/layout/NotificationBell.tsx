import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, Check, CreditCard, Wallet, UserPlus, Building2, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getClinicDisplayName } from "@/lib/utils";
import { formatNotificationMessageForDisplay, buildAgendaFocusPath } from "@/lib/notificationMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUnclosedCashDays, useUnclosedCashDaysAllClinics } from "@/hooks/useFinancial";
import { useSelectedClinicId } from "@/hooks/useSelectedClinicId";
import { useClinics } from "@/hooks/useClinic";

interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  reference_id: string | null;
  clinic_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface AdminNotification {
  id: string;
  title: string;
  message: string | null;
  created_at: string;
  is_read: boolean;
  type: string;
}

interface NotificationBellProps {
  collapsed?: boolean;
}

const logNotificationError = (operation: string, error: unknown) => {
  const safeError = error && typeof error === "object"
    ? {
        name: "name" in error ? String(error.name) : "Error",
        code: "code" in error ? String(error.code) : undefined,
      }
    : { name: "Error" };
  console.error(`[NotificationBell] ${operation} falhou.`, safeError);
};

export function NotificationBell({ collapsed }: NotificationBellProps) {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { setSelectedClinicId } = useSelectedClinicId();
  const { subscription } = useSubscription();
  const { unclosedDates } = useUnclosedCashDays();
  const { clinicsWithUnclosed } = useUnclosedCashDaysAllClinics(isSuperAdmin);
  const { clinics } = useClinics();

  // Com mais de uma clínica vinculada, cada notificação mostra a clínica de origem
  const hasMultipleClinics = clinics.length > 1;
  const clinicNameById = useMemo(() => {
    const map = new Map<string, string>();
    clinics.forEach((clinic: { id: string; name?: string | null; unit_name?: string | null }) => {
      map.set(clinic.id, getClinicDisplayName(clinic));
    });
    return map;
  }, [clinics]);

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [pendingContacts, setPendingContacts] = useState(0);
  const [open, setOpen] = useState(false);

  const paymentDueSoon = useMemo(() => {
    if (isSuperAdmin || !subscription || subscription.status !== "active" || !subscription.current_period_end) return false;
    const due = new Date(subscription.current_period_end);
    const now = new Date();
    const daysUntil = Math.floor((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return daysUntil <= 5 && daysUntil >= 0;
  }, [isSuperAdmin, subscription]);

  const hasUnclosedCash = isAdmin && (isSuperAdmin ? clinicsWithUnclosed.length > 0 : unclosedDates.length > 0);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("user_notifications")
      .select("id, type, title, message, reference_id, clinic_id, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      logNotificationError("Busca de notificações", error);
      return;
    }
    setNotifications((data as UserNotification[]) || []);
  }, [user?.id]);

  const fetchAdminNotifications = useCallback(async () => {
    if (!isSuperAdmin) return [];
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("id, title, message, created_at, is_read, type")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) {
      logNotificationError("Busca de notificações administrativas", error);
      return [];
    }
    const parsed = (data || []) as AdminNotification[];
    setAdminNotifications(parsed);
    return parsed;
  }, [isSuperAdmin]);

  const fetchPendingContacts = useCallback(async () => {
    if (!isSuperAdmin) return 0;
    const { count, error } = await supabase
      .from("contact_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) {
      logNotificationError("Contagem de contatos pendentes", error);
      return 0;
    }
    setPendingContacts(count ?? 0);
    return count ?? 0;
  }, [isSuperAdmin]);

  useEffect(() => {
    void fetchNotifications();
    if (isSuperAdmin) {
      void fetchAdminNotifications();
      void fetchPendingContacts();
    }
  }, [fetchNotifications, fetchAdminNotifications, fetchPendingContacts, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const channel = supabase
      .channel("notification-bell-contact-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_requests" }, fetchPendingContacts)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isSuperAdmin, fetchPendingContacts]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("user-notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` }, fetchNotifications)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  const unreadUserCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);
  const unreadAdminCount = useMemo(() => adminNotifications.filter((n) => !n.is_read).length, [adminNotifications]);

  const badgeCount =
    unreadUserCount +
    unreadAdminCount +
    pendingContacts +
    (hasUnclosedCash ? 1 : 0) +
    (paymentDueSoon ? 1 : 0);

  const markAllUserAsRead = async () => {
    if (!user?.id || unreadUserCount === 0) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    const { error } = await supabase.from("user_notifications").update({ is_read: true }).in("id", unreadIds);
    if (error) {
      logNotificationError("Marcação de notificações como lidas", error);
      return;
    }
    setNotifications((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n)));
  };

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      void fetchNotifications();
      if (isSuperAdmin) {
        const current = await fetchAdminNotifications();
        await fetchPendingContacts();
        const unreadIds = current.filter((n) => !n.is_read).map((n) => n.id);
        if (unreadIds.length > 0) {
          const { error } = await supabase.from("admin_notifications").update({ is_read: true }).in("id", unreadIds);
          if (error) {
            logNotificationError("Marcação de notificações administrativas", error);
            return;
          }
          await fetchAdminNotifications();
        }
      }
    }
  };

  const handleNotificationClick = async (n: UserNotification) => {
    if (!n.is_read) {
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item)));
      const { error } = await supabase.from("user_notifications").update({ is_read: true }).eq("id", n.id);
      if (error) {
        logNotificationError("Marcação de notificação como lida", error);
      }
    }
    if (n.type === "appointment_created" && n.reference_id) {
      navigate(buildAgendaFocusPath(n.reference_id, n.clinic_id));
    }
    if (n.type === "payment_confirmed" || n.type === "payment_overdue" || n.type === "clinic_created") {
      navigate("/billing");
    }
    setOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment_confirmed":
        return <CreditCard className="h-4 w-4" />;
      case "payment_overdue":
        return <AlertTriangle className="h-4 w-4" />;
      case "clinic_created":
        return <Building2 className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label={badgeCount > 0 ? `Abrir notificações (${badgeCount} pendentes)` : "Abrir notificações"}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {badgeCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full p-0 text-[9px] bg-destructive text-destructive-foreground flex items-center justify-center">
              {badgeCount > 99 ? "99+" : badgeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent side={collapsed ? "right" : "top"} align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notificações</h4>
          {unreadUserCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground" onClick={markAllUserAsRead}>
              <Check className="mr-1 h-3 w-3" />
              Marcar lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          <div className="divide-y">
            {!isSuperAdmin && paymentDueSoon && subscription?.current_period_end && (
              <button
                onClick={() => { setOpen(false); navigate("/configuracoes"); }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50"
              >
                <CreditCard className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Pagamento próximo do vencimento</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento em {new Date(subscription.current_period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.
                  </p>
                </div>
              </button>
            )}

            {!isSuperAdmin && unclosedDates.length > 0 && (
              <button
                onClick={() => { setOpen(false); navigate("/financeiro"); }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50"
              >
                <Wallet className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Caixa não fechado</p>
                  <p className="text-xs text-muted-foreground">
                    Dias: {unclosedDates.slice(-7).map((d) => format(new Date(d + "T12:00:00"), "dd/MM", { locale: ptBR })).join(", ")}
                  </p>
                </div>
              </button>
            )}

            {isSuperAdmin && clinicsWithUnclosed.length > 0 &&
              clinicsWithUnclosed.map((c) => (
                <button
                  key={c.clinicId}
                  onClick={() => { setOpen(false); setSelectedClinicId(c.clinicId); navigate("/financeiro"); }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50"
                >
                  <Wallet className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{c.clinicName}</p>
                    <p className="text-xs text-muted-foreground">
                      Dias: {c.dates.slice(-7).map((d) => format(new Date(d + "T12:00:00"), "dd/MM", { locale: ptBR })).join(", ")}
                    </p>
                  </div>
                </button>
              ))}

            {isSuperAdmin && pendingContacts > 0 && (
              <button
                onClick={() => { setOpen(false); navigate("/superadmin?tab=solicitacoes"); }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50"
              >
                <UserPlus className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                <p className="font-medium text-sm">
                  {pendingContacts} solicitaç{pendingContacts === 1 ? "ão" : "ões"} de acesso pendente{pendingContacts === 1 ? "" : "s"}
                </p>
              </button>
            )}

            {isSuperAdmin && adminNotifications.map((n) => (
              <div key={n.id} className="flex w-full items-start gap-3 px-4 py-3">
                <Bell className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
                </div>
              </div>
            ))}

            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn("flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50", !n.is_read && "bg-primary/5")}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                    n.type === "payment_overdue" ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"
                  )}
                >
                  {getNotificationIcon(n.type)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm", !n.is_read && "font-semibold")}>{n.title}</span>
                    {!n.is_read && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                  </div>
                  {hasMultipleClinics && n.clinic_id && clinicNameById.get(n.clinic_id) && (
                    <p className="mt-0.5 truncate text-[11px] font-medium text-primary/80">
                      {clinicNameById.get(n.clinic_id)}
                    </p>
                  )}
                  {n.message && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatNotificationMessageForDisplay(n.message)}
                    </p>
                  )}
                  {n.type === "appointment_created" && n.reference_id ? (
                    <p className="mt-1 text-[11px] font-medium text-primary">Visualizar</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </button>
            ))}

            {badgeCount === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-30" />
                <span className="text-sm">Sem notificações</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
