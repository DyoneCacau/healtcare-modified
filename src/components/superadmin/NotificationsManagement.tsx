import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminNotification {
  id: string;
  title: string;
  message: string | null;
  created_at: string;
  is_read: boolean;
  type: string;
}

export function NotificationsManagement() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, [page, typeFilter]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("admin_notifications")
      .select("id, title, message, created_at, is_read, type", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    const { data, error, count } = await query;

    if (!error) {
      setNotifications((data || []) as AdminNotification[]);
      setTotalCount(count || 0);
    }
    setIsLoading(false);
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach((n) => set.add(n.type));
    return Array.from(set);
  }, [notifications]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("id", id);
    if (!error) fetchNotifications();
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    if (!error) fetchNotifications();
  };

  const removeNotification = async (id: string) => {
    const { error } = await supabase
      .from("admin_notifications")
      .delete()
      .eq("id", id);
    if (!error) fetchNotifications();
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Notificacoes do SuperAdmin</CardTitle>
          <p className="text-sm text-muted-foreground">
            {unreadCount} nao lidas nesta pagina
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setPage(1);
              setTypeFilter(value);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchNotifications}>
            Atualizar
          </Button>
          <Button onClick={markAllAsRead} disabled={unreadCount === 0}>
            Marcar tudo como lido
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma notificacao
                  </TableCell>
                </TableRow>
              )}
              {notifications.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <Badge variant={n.is_read ? "secondary" : "default"}>
                      {n.is_read ? "Lida" : "Nova"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{n.title}</TableCell>
                  <TableCell className="max-w-[320px] truncate">
                    {n.message || "-"}
                  </TableCell>
                  <TableCell>{n.type}</TableCell>
                  <TableCell>
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!n.is_read && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => markAsRead(n.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeNotification(n.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Pagina {page} de {totalPages} • {totalCount} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Proxima
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
