import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary
    fallback={
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive text-center">
          <p className="font-medium">Erro ao carregar o sistema</p>
          <p className="text-sm mt-2">Recarregue a página (F5). Se persistir, limpe o cache do navegador.</p>
          <button
            type="button"
            className="mt-4 rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      </div>
    }
  >
    <App />
  </ErrorBoundary>
);
