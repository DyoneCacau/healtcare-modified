import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactAdminScreen } from "./ContactAdminScreen";
import { SubscriptionBlockedScreen } from "./SubscriptionBlockedScreen";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  refreshSubscription: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ signOut: mocks.signOut }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ refreshSubscription: mocks.refreshSubscription }),
}));

describe("estados de acesso da assinatura", () => {
  beforeEach(() => {
    mocks.signOut.mockReset();
    mocks.refreshSubscription.mockReset();
  });

  it("orienta a ativação de uma clínica ainda sem assinatura", () => {
    render(<ContactAdminScreen />);

    expect(screen.getByRole("heading", { name: "Clínica pendente de ativação" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.refreshSubscription).toHaveBeenCalledOnce();
  });

  it("oferece regularização e nova consulta quando o acesso está bloqueado", () => {
    render(
      <MemoryRouter>
        <SubscriptionBlockedScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Acesso suspenso" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Regularizar agora" })).toHaveAttribute("href", "/billing");

    fireEvent.click(screen.getByRole("button", { name: "Já regularizei — tentar novamente" }));
    expect(mocks.refreshSubscription).toHaveBeenCalledOnce();
  });

  it("permite encerrar a sessão nos dois estados", () => {
    const { rerender } = render(<ContactAdminScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));

    rerender(
      <MemoryRouter>
        <SubscriptionBlockedScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });
});
