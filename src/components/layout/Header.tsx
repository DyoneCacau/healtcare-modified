import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

interface AdminNotification {
  id: string;
  title: string;
  message: string | null;
  created_at: string;
  is_read: boolean;
  type: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [pendingContacts, setPendingContacts] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("admin_notifications")
      .select("id, title, message, created_at, is_read, type")
      .order("created_at", { ascending: false })
      .limit(5);

    const parsed = (data || []) as AdminNotification[];
    setNotifications(parsed);
    return parsed;
  };

  const fetchPendingContacts = async () => {
    if (!isSuperAdmin) return 0;
    const { count } = await supabase
      .from("contact_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    setPendingContacts(count ?? 0);
    return count ?? 0;
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      setNotifications([]);
      setPendingContacts(0);
      return;
    }
    fetchNotifications();
    fetchPendingContacts();

    const channel = supabase
      .channel("header-contact-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_requests" }, fetchPendingContacts)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );
  const totalCount = notifications.length;
  const unreadIds = useMemo(
    () => notifications.filter((n) => !n.is_read).map((n) => n.id),
    [notifications]
  );
  const badgeCount = unreadCount + pendingContacts;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." className="w-64 pl-9 bg-background" />
        </div>

        {/* Notifications */}
        <DropdownMenu
          open={isOpen}
          onOpenChange={async (open) => {
            setIsOpen(open);
            if (!open || !isSuperAdmin) return;
            const current = await fetchNotifications();
            await fetchPendingContacts();
            const currentUnread = current.filter((n) => !n.is_read).map((n) => n.id);
            if (currentUnread.length > 0) {
              await supabase
                .from("admin_notifications")
                .update({ is_read: true })
                .in("id", currentUnread);
              await fetchNotifications();
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {badgeCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] bg-destructive text-destructive-foreground">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>
              Notificações
              {isSuperAdmin && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {badgeCount > 0 ? `${unreadCount + pendingContacts} pendente(s)` : "Nenhuma"}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isSuperAdmin && pendingContacts > 0 && (
              <>
                <DropdownMenuItem
                  className="flex items-center gap-2 p-3 cursor-pointer"
                  onSelect={() => {
                    setIsOpen(false);
                    navigate("/superadmin?tab=solicitacoes");
                  }}
                >
                  <UserPlus className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">
                    {pendingContacts} solicitaç{pendingContacts === 1 ? "ão" : "ões"} de acesso pendente{pendingContacts === 1 ? "" : "s"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {notifications.length === 0 && pendingContacts === 0 ? (
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <span className="text-sm text-muted-foreground">Sem notificações</span>
              </DropdownMenuItem>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3">
                  <span className="font-medium">{n.title}</span>
                  {n.message && <span className="text-xs text-muted-foreground">{n.message}</span>}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
