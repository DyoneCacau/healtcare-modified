import { useEffect, useMemo, useState } from "react";
import { Bell, Search } from "lucide-react";
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
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
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

  useEffect(() => {
    if (!isSuperAdmin) {
      setNotifications([]);
      return;
    }
    fetchNotifications();
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
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] bg-destructive text-destructive-foreground">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>
              Notificacoes
              {isSuperAdmin && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {unreadCount}/{totalCount}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <span className="text-sm text-muted-foreground">Sem notificacoes</span>
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
