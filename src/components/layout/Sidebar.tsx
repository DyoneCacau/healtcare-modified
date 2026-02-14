import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  DollarSign,
  Package,
  Settings,
  FileBarChart,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Activity,
  Percent,
  Clock,
  FileText,
  Crown,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, ROUTE_FEATURE_MAP } from "@/hooks/useSubscription";
import { useClinics } from "@/hooks/useClinic";
import { useSelectedClinicId } from "@/hooks/useSelectedClinicId";
import { useCurrentClinic } from "@/hooks/useCurrentClinic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  feature?: string;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", feature: "dashboard" },
  { icon: Calendar, label: "Agenda", path: "/agenda", feature: "agenda" },
  { icon: Users, label: "Pacientes", path: "/pacientes", feature: "pacientes" },
  { icon: Stethoscope, label: "Profissionais", path: "/profissionais", feature: "profissionais" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro", feature: "financeiro" },
  { icon: Percent, label: "Comissões", path: "/comissoes", feature: "comissoes" },
  { icon: Clock, label: "Ponto", path: "/ponto", feature: "ponto" },
  { icon: FileText, label: "Termos", path: "/termos", feature: "termos" },
  { icon: Package, label: "Estoque", path: "/estoque", feature: "estoque" },
  { icon: FileBarChart, label: "Relatórios", path: "/relatorios", feature: "relatorios" },
  { icon: Shield, label: "Administração", path: "/administracao", feature: "administracao" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", feature: "configuracoes" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, isAdmin, profile, signOut } = useAuth();
  const { hasFeature } = useSubscription();
  const { clinics, isLoading: isLoadingClinics } = useClinics();
  const { selectedClinicId, setSelectedClinicId } = useSelectedClinicId();
  const { currentClinic, isLoading: isLoadingCurrentClinic } = useCurrentClinic();

  // Mostrar seletor só se superadmin ou se tiver mais de uma clínica (como dono)
  const showClinicSelector = isSuperAdmin || clinics.length > 1;
  useEffect(() => {
    if (clinics.length === 0) return;
    const firstId = clinics[0].id;
    const selectionValid = selectedClinicId && clinics.some((c) => c.id === selectedClinicId);
    if (!selectionValid || clinics.length === 1) {
      setSelectedClinicId(firstId);
    }
  }, [clinics, selectedClinicId, setSelectedClinicId]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        "gradient-sidebar flex h-screen flex-col border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
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
            className="h-8 w-8 rounded-lg object-cover mx-auto"
          />
        )}
      </div>

      {showClinicSelector && !collapsed && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <div className="text-xs font-medium text-sidebar-muted mb-2">Clínica ativa</div>
          <Select
            value={selectedClinicId || ''}
            onValueChange={(v) => setSelectedClinicId(v)}
            disabled={isLoadingClinics || clinics.length === 0}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione uma clínica" />
            </SelectTrigger>
            <SelectContent>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name}
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
                        location.pathname === '/superadmin'
                          ? "bg-amber-500 text-white shadow-md"
                          : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
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
                    location.pathname === '/superadmin'
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                  )}
                >
                  <Crown className="h-5 w-5 flex-shrink-0" />
                  <span>SuperAdmin</span>
                </Link>
              )}
            </li>
          )}

          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const isLocked = item.feature && !hasFeature(item.feature);
            
            // Verificação especial para a página de Administração - apenas admins podem acessar
            const isAdminPage = item.path === '/administracao';
            const isAdminLocked = isAdminPage && !isAdmin && !isSuperAdmin;

            // Se está bloqueado e não é superadmin, mostra como desabilitado
            if ((isLocked && !isSuperAdmin) || isAdminLocked) {
              const lockedContent = (
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "text-sidebar-muted cursor-not-allowed opacity-50"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
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
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent p-3",
            collapsed && "justify-center p-2"
          )}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {isSuperAdmin ? 'S' : (profile?.name?.charAt(0).toUpperCase() || 'U')}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {isSuperAdmin ? 'Superadmin' : (profile?.name || 'Usuário')}
              </p>
              {isLoadingCurrentClinic ? (
                <p className="truncate text-xs text-sidebar-muted animate-pulse">
                  Carregando...
                </p>
              ) : currentClinic ? (
                <p className="truncate text-xs text-sidebar-muted">
                  {currentClinic.name}
                </p>
              ) : (
                <p className="truncate text-xs text-sidebar-muted">
                  {profile?.email || ''}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
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
