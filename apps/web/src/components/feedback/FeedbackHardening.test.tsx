import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { useToast } from "@/components/feedback/toastContext";
import { MutationButton } from "@/components/ui/MutationButton";

function BrokenChild(): ReactElement {
  throw new Error("Broken test screen");
}

function ToastButton() {
  const { notify } = useToast();
  return (
    <button type="button" onClick={() => notify({ title: "Saved", message: "Toast visible", tone: "success" })}>
      Show toast
    </button>
  );
}

describe("hardening feedback primitives", () => {
  it("renders a global fallback when a child throws", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/screen error/i);
    consoleSpy.mockRestore();
  });

  it("renders toast notifications and loading mutation buttons", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastButton />
        <MutationButton isLoading loadingLabel="Saving media">
          Save
        </MutationButton>
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: /show toast/i }));

    expect(screen.getByRole("status", { name: /notifications/i })).toHaveTextContent("Saved");
    expect(screen.getByRole("button", { name: /saving media/i })).toBeDisabled();
  });
});
