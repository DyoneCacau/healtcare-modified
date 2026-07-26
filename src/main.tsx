import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Após um novo deploy, os arquivos JS antigos (com hash) deixam de existir no
// servidor. Quem está com a aba aberta de antes do deploy tenta importar um
// chunk antigo (ex.: ao navegar para uma página lazy) e recebe esse erro.
// Recomendação oficial do Vite: recarregar a página uma vez ao detectar isso.
// https://vite.dev/guide/build.html#load-error-handling
const RELOAD_GUARD_KEY = "vite-preload-reload-at";
window.addEventListener("vite:preloadError", () => {
  const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
  const now = Date.now();
  // Evita loop de reload caso o erro persista por outro motivo (ex.: rede).
  if (now - lastReload > 10_000) {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary
    fallback={
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive text-center" role="alert">
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
