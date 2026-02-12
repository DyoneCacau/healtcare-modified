import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "info";
}

const variantStyles = {
  default: {
    icon: "bg-muted text-muted-foreground",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
    },
  },
  primary: {
    icon: "bg-primary/10 text-primary",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
    },
  },
  success: {
    icon: "bg-success/10 text-success",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
    },
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
    },
  },
  info: {
    icon: "bg-info/10 text-info",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
    },
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-200 hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {(subtitle || trend) && (
            <div className="mt-2 flex items-center gap-2">
              {trend && (
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend.isPositive
                      ? styles.trend.positive
                      : styles.trend.negative
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
              )}
              {subtitle && (
                <span className="text-sm text-muted-foreground">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn("rounded-xl p-3", styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
