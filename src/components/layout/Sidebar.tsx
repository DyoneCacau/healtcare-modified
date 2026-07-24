import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  ListPlus,
  DollarSign,
  Wallet,
  Package,
  Settings,
  FileBarChart,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Percent,
  Clock,
  FileText,
  Crown,
  Lock,
  // MessageSquare, // TODO(go-live): Atendimento omnichannel
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { usePermissions } from "@/hooks/usePermissions";
import { useClinics } from "@/hooks/useClinic";
import { useSelectedClinicId } from "@/hooks/useSelectedClinicId";
import { useCurrentClinic } from "@/hooks/useCurrentClinic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClinicDisplayName } from "@/components/common/ClinicDisplayName";
import { getClinicDisplayName } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";

interface MenuItem {
  type?: "item";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  feature?: string;
}

interface MenuGroup {
  type: "group";
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: MenuItem[];
}

type MenuEntry = MenuItem | MenuGroup;

const menuEntries: MenuEntry[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app", feature: "dashboard" },
  { icon: Calendar, label: "Agenda", path: "/agenda", feature: "agenda" },
  { icon: Users, label: "Pacientes", path: "/pacientes", feature: "pacientes" },
  { icon: Stethoscope, label: "Profissionais", path: "/profissionais", feature: "profissionais" },
  { icon: ListPlus, label: "Procedimentos", path: "/procedimentos", feature: "procedimentos" },
  {
    type: "group",
    id: "financeiro",
    icon: DollarSign,
    label: "Financeiro",
    children: [
      { icon: DollarSign, label: "Caixa", path: "/financeiro", feature: "financeiro" },
      { icon: Wallet, label: "Contas a receber", path: "/contas-a-receber", feature: "contas_receber" },
      { icon: Percent, label: "Comissões", path: "/comissoes", feature: "comissoes" },
      { icon: FileBarChart, label: "Relatórios", path: "/relatorios", feature: "relatorios" },
    ],
  },
  { icon: Clock, label: "Ponto", path: "/ponto", feature: "ponto" },
  { icon: FileText, label: "Meus Termos", path: "/termos", feature: "termos" },
  { icon: Package, label: "Estoque", path: "/estoque", feature: "estoque" },
  // TODO(go-live): descomentar item Atendimento ao concluir integração Meta WhatsApp
  // { icon: MessageSquare, label: "Atendimento", path: "/atendimento", feature: "atendimento" },
  { icon: Shield, label: "Administração", path: "/administracao", feature: "administracao" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", feature: "configuracoes" },
];

function isMenuGroup(entry: MenuEntry): entry is MenuGroup {
  return entry.type === "group";
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, isAdmin, profile, signOut } = useAuth();
  const { hasFeature } = useSubscription();
  const { can: canPermission, permissions: permissionMatrix } = usePermissions();
  const { clinics, isLoading: isLoadingClinics } = useClinics();
  const { selectedClinicId, setSelectedClinicId } = useSelectedClinicId();
  const { currentClinic, isLoading: isLoadingCurrentClinic } = useCurrentClinic();

  const usePermissionMatrix = typeof permissionMatrix === "object" && permissionMatrix !== null;

  const canSeeItem = (item: MenuItem): { visible: boolean; locked: boolean } => {
    if (usePermissionMatrix && item.feature && !canPermission(item.feature, "can_view")) {
      return { visible: false, locked: false };
    }
    const isLocked = !usePermissionMatrix && !!item.feature && !hasFeature(item.feature);
    const isAdminPage = item.path === "/administracao";
    const isAdminLocked = isAdminPage && !isAdmin && !isSuperAdmin;
    if ((isLocked && !isSuperAdmin) || isAdminLocked) {
      return { visible: true, locked: true };
    }
    return { visible: true, locked: false };
  };

  const financeChildActive = useMemo(
    () =>
      ["/financeiro", "/contas-a-receber", "/comissoes", "/relatorios"].includes(
        location.pathname,
      ),
    [location.pathname],
  );

  const [financeOpen, setFinanceOpen] = useState(financeChildActive);

  useEffect(() => {
    if (financeChildActive) setFinanceOpen(true);
  }, [financeChildActive]);

  // Mostrar seletor só se superadmin ou se tiver mais de uma clínica (como dono)
  const showClinicSelector = isSuperAdmin || clinics.length > 1;
  // SuperAdmin: não auto-selecionar clínica (permite "Nenhuma"). Cliente com múltiplas clínicas: auto-selecionar primeira.
  useEffect(() => {
    if (clinics.length === 0) return;
    if (isSuperAdmin) return; // SuperAdmin escolhe manualmente, inclusive "Nenhuma"
    const firstId = clinics[0].id;
    const selectionValid = selectedClinicId && clinics.some((c) => c.id === selectedClinicId);
    if (!selectionValid) {
      setSelectedClinicId(firstId);
    }
  }, [clinics, selectedClinicId, setSelectedClinicId, isSuperAdmin]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const renderLinkItem = (item: MenuItem, opts?: { nested?: boolean }) => {
    const { visible, locked } = canSeeItem(item);
    if (!visible) return null;

    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    const nested = opts?.nested === true;

    if (locked) {
      const lockedContent = (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            "text-sidebar-muted cursor-not-allowed opacity-50",
            nested && "py-2",
          )}
        >
          <Icon className={cn("flex-shrink-0", nested ? "h-4 w-4" : "h-5 w-5")} />
          {!collapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              <Lock className="h-3.5 w-3.5" />
            </>
          )}
        </div>
      );

      if (collapsed) {
        return (
          <li key={item.path}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>{lockedContent}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  {item.label} (Bloqueado)
                </div>
              </TooltipContent>
            </Tooltip>
          </li>
        );
      }

      return <li key={item.path}>{lockedContent}</li>;
    }

    const linkContent = (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200",
          nested ? "py-2" : "py-2.5",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className={cn("flex-shrink-0", nested ? "h-4 w-4" : "h-5 w-5")} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <li key={item.path}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </li>
      );
    }

    return <li key={item.path}>{linkContent}</li>;
  };

  const renderFinanceGroup = (group: MenuGroup) => {
    const visibleChildren = group.children
      .map((child) => ({ child, access: canSeeItem(child) }))
      .filter(({ access }) => access.visible);

    if (visibleChildren.length === 0) return null;

    const GroupIcon = group.icon;
    const isOpen = financeOpen || financeChildActive;

    // Sidebar recolhido: mostra só os filhos acessíveis (tooltips)
    if (collapsed) {
      return visibleChildren.map(({ child }) => renderLinkItem(child));
    }

    return (
      <li key={group.id} className="space-y-1">
        <button
          type="button"
          onClick={() => setFinanceOpen((open) => !open)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            financeChildActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
          aria-expanded={isOpen}
        >
          <GroupIcon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 opacity-70 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen && (
          <ul className="relative ml-4 space-y-0.5 border-l border-sidebar-border pl-3">
            {visibleChildren.map(({ child }) => renderLinkItem(child, { nested: true }))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside
      className={cn(
        "gradient-sidebar flex h-screen flex-col border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="HealthCare"
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="text-lg font-semibold text-sidebar-foreground">
              HealthCare
            </span>
          </div>
        )}
        {collapsed && (
          <img
            src="/logo.png"
            alt="HealthCare"
            className="mx-auto h-8 w-8 rounded-lg object-cover"
          />
        )}
      </div>

      {showClinicSelector && !collapsed && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <div className="mb-2 text-xs font-medium text-sidebar-muted">Clínica ativa</div>
          <Select
            value={selectedClinicId || "__none__"}
            onValueChange={(v) => setSelectedClinicId(v === "__none__" ? null : v)}
            disabled={isLoadingClinics || (!isSuperAdmin && clinics.length === 0)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={isSuperAdmin ? "Selecione uma clínica" : "Selecione"} />
            </SelectTrigger>
            <SelectContent>
              {isSuperAdmin && (
                <SelectItem value="__none__">
                  <span className="italic text-muted-foreground">Nenhuma</span>
                </SelectItem>
              )}
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {getClinicDisplayName(clinic)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <nav className="overflow-y-auto p-3">
        <ul className="space-y-1">
          {/* SuperAdmin Link - only for superadmins */}
          {isSuperAdmin && (
            <li className="mb-2">
              {collapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to="/superadmin"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        location.pathname === "/superadmin"
                          ? "bg-amber-500 text-white shadow-md"
                          : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
                      )}
                    >
                      <Crown className="h-5 w-5 flex-shrink-0" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    SuperAdmin
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  to="/superadmin"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    location.pathname === "/superadmin"
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
                  )}
                >
                  <Crown className="h-5 w-5 flex-shrink-0" />
                  <span>SuperAdmin</span>
                </Link>
              )}
            </li>
          )}

          {menuEntries.map((entry) => {
            if (isMenuGroup(entry)) {
              return renderFinanceGroup(entry);
            }
            return renderLinkItem(entry);
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent p-3",
            collapsed && "justify-center p-2",
          )}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {isSuperAdmin ? "S" : profile?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {isSuperAdmin ? "Superadmin" : profile?.name || "Usuário"}
              </p>
              {isLoadingCurrentClinic ? (
                <p className="truncate text-xs text-sidebar-muted animate-pulse">
                  Carregando...
                </p>
              ) : currentClinic ? (
                <p className="truncate text-xs text-sidebar-muted">
                  <ClinicDisplayName clinic={currentClinic} />
                </p>
              ) : isSuperAdmin ? (
                <p className="truncate text-xs italic text-sidebar-muted">
                  Nenhuma clínica
                </p>
              ) : (
                <p className="truncate text-xs text-sidebar-muted">
                  {profile?.email || ""}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="flex-1 justify-start gap-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
