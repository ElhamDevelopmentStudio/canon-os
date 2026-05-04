import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmationDialog } from "@/components/feedback/ConfirmationDialog";

describe("dialog accessibility shell", () => {
  it("labels confirmation dialogs, traps tab focus, closes with Escape", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <>
        <button type="button">Open source button</button>
        <ConfirmationDialog
          message="This action has consequences."
          open
          title="Confirm action"
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </>,
    );

    const opener = screen.getByRole("button", { name: "Open source button" });
    opener.focus();

    const dialog = screen.getByRole("dialog", { name: "Confirm action" });
    expect(dialog).toHaveAttribute("aria-modal", "true");

    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
