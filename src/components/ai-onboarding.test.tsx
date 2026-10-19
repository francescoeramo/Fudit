// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AiOnboarding, { AI_ONBOARDING_KEY } from "./ai-onboarding";

beforeEach(() => localStorage.clear());
describe("tutorial prima apertura", () => {
  it("consente di iniziare senza AI e ricorda la scelta", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onKeyChange = vi.fn();
    const view = render(
      <AiOnboarding
        apiKey=""
        onKeyChange={onKeyChange}
        onComplete={onComplete}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Benvenuto in Fudit" }),
    ).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Continua senza AI" }));
    expect(onComplete).toHaveBeenCalledWith("plan");
    expect(onKeyChange).toHaveBeenCalledWith("");
    expect(localStorage.getItem(AI_ONBOARDING_KEY)).toBe("done");
    view.unmount();
    render(
      <AiOnboarding
        apiKey=""
        onKeyChange={onKeyChange}
        onComplete={onComplete}
      />,
    );
    expect(
      screen.queryByRole("heading", { name: "Benvenuto in Fudit" }),
    ).not.toBeInTheDocument();
  });
  it("guida alla chiave senza salvarla e permette di riaprire la guida", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onKeyChange = vi.fn();
    localStorage.setItem(AI_ONBOARDING_KEY, "done");
    const view = render(
      <AiOnboarding
        forceOpen
        apiKey=""
        onKeyChange={onKeyChange}
        onComplete={onComplete}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Configura l’assistente" }),
    );
    expect(
      screen.getByRole("link", { name: /Google AI Studio/ }),
    ).toHaveAttribute("href", "https://aistudio.google.com/api-keys");
    expect(screen.getByText(/senza fatturazione attiva/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Avanti" }));
    expect(screen.getByLabelText("La tua chiave API Gemini")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("button", { name: "Avanti" })).toBeDisabled();
    await user.type(screen.getByLabelText("La tua chiave API Gemini"), "x");
    expect(onKeyChange).toHaveBeenCalledWith("x");
    view.rerender(
      <AiOnboarding
        forceOpen
        apiKey="fake-private-key"
        onKeyChange={onKeyChange}
        onComplete={onComplete}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Avanti" }));
    await user.click(
      screen.getByRole("button", { name: "Prova un’idea con Gemini" }),
    );
    expect(onComplete).toHaveBeenCalledWith("ideas");
    expect(JSON.stringify(localStorage)).not.toContain("fake-private-key");
  });
  it("rimane utilizzabile quando il browser impedisce di salvare la scelta", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const blocked = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    render(
      <AiOnboarding apiKey="" onKeyChange={vi.fn()} onComplete={onComplete} />,
    );
    await user.click(screen.getByRole("button", { name: "Continua senza AI" }));
    expect(onComplete).toHaveBeenCalledWith("plan");
    blocked.mockRestore();
  });
});
