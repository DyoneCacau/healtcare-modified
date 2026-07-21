import { CheckCircle2, Circle, ClipboardList } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface CommercialChecklistState {
  hasAdmin: boolean;
  hasClinics: boolean;
  hasPlan: boolean;
  hasBillingDay: boolean;
  hasChargeStart: boolean;
  hasBillingMode: boolean;
  clientNotified: boolean;
}

interface Item {
  key: keyof CommercialChecklistState;
  label: string;
  hint?: string;
  auto: boolean;
}

const ITEMS: Item[] = [
  { key: "hasAdmin", label: "Responsável e e-mail de acesso", auto: true },
  { key: "hasClinics", label: "Unidade(s) com nome e CNPJ", auto: true },
  { key: "hasPlan", label: "Plano e mensalidade fechados", auto: true },
  { key: "hasBillingDay", label: "Dia de vencimento combinado (1–28)", auto: true },
  {
    key: "hasChargeStart",
    label: "Início da cobrança (imediato ou data promo)",
    auto: true,
  },
  {
    key: "hasBillingMode",
    label: "Modo de cobrança (Asaas ou manual)",
    auto: true,
  },
  {
    key: "clientNotified",
    label: "Cliente avisado: login + Configurações → Minha Cobrança",
    hint: "Forma de pagamento (PIX, boleto ou cartão) o cliente escolhe no Asaas.",
    auto: false,
  },
];

interface Props {
  state: CommercialChecklistState;
  onClientNotifiedChange: (checked: boolean) => void;
}

export function CommercialChecklist({ state, onClientNotifiedChange }: Props) {
  const done = ITEMS.filter((item) => state[item.key]).length;
  const total = ITEMS.length;

  return (
    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-medium text-sm">Checklist comercial</p>
            <p className="text-xs text-muted-foreground">
              Venda B2B: você define plano, vencimento e início; o cliente escolhe como pagar.
            </p>
          </div>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground shrink-0">
          {done}/{total}
        </span>
      </div>

      <ul className="space-y-2">
        {ITEMS.map((item) => {
          const checked = state[item.key];
          if (!item.auto) {
            return (
              <li key={item.key} className="flex items-start gap-2 rounded-md border bg-background p-2.5">
                <Checkbox
                  id={`checklist-${item.key}`}
                  checked={state.clientNotified}
                  onCheckedChange={(v) => onClientNotifiedChange(v === true)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor={`checklist-${item.key}`} className="text-sm font-normal cursor-pointer leading-snug">
                    {item.label}
                  </Label>
                  {item.hint && (
                    <p className="text-xs text-muted-foreground">{item.hint}</p>
                  )}
                </div>
              </li>
            );
          }

          return (
            <li
              key={item.key}
              className={cn(
                "flex items-start gap-2 text-sm",
                checked ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {checked ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function buildCommercialChecklistState(input: {
  adminName: string;
  adminEmail: string;
  clinics: Array<{ name: string; cnpj: string }>;
  planId: string;
  billingDay: number;
  billingProvider: string;
  scheduleFirstCharge: boolean;
  firstDueDate: string;
  clientNotified: boolean;
}): CommercialChecklistState {
  const hasAdmin = input.adminName.trim().length >= 2 && input.adminEmail.includes("@");
  const hasClinics =
    input.clinics.length > 0
    && input.clinics.every((c) => c.name.trim().length >= 2 && c.cnpj.replace(/\D/g, "").length >= 11);
  const hasPlan = Boolean(input.planId);
  const hasBillingDay = input.billingDay >= 1 && input.billingDay <= 28;
  const hasChargeStart = input.billingProvider !== "asaas"
    || !input.scheduleFirstCharge
    || /^\d{4}-\d{2}-\d{2}$/.test(input.firstDueDate);
  const hasBillingMode = input.billingProvider === "asaas" || input.billingProvider === "manual";

  return {
    hasAdmin,
    hasClinics,
    hasPlan,
    hasBillingDay,
    hasChargeStart,
    hasBillingMode,
    clientNotified: input.clientNotified,
  };
}
