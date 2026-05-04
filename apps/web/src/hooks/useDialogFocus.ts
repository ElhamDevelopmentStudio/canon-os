import { type RefObject, useEffect, useRef } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    if (element.getAttribute("aria-hidden") === "true") return false;
    if (element.hasAttribute("disabled")) return false;
    if (element.closest("[hidden]")) return false;
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

export function useDialogFocus(
  dialogRef: RefObject<HTMLElement>,
  {
    closeOnEscape = true,
    initialFocusRef,
    onClose,
    open,
  }: {
    closeOnEscape?: boolean;
    initialFocusRef?: RefObject<HTMLElement>;
    onClose?: () => void;
    open: boolean;
  },
) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const dialogElement = dialog;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitialElement = () => {
      const initial = initialFocusRef?.current;
      if (initial && dialogElement.contains(initial)) {
        initial.focus();
        return;
      }
      const autofocusElement = dialogElement.querySelector<HTMLElement>("[data-autofocus='true']");
      if (autofocusElement && !autofocusElement.hasAttribute("disabled")) {
        autofocusElement.focus();
        return;
      }
      const [firstFocusable] = getFocusableElements(dialogElement);
      (firstFocusable ?? dialogElement).focus();
    };

    const focusTimeout = window.setTimeout(focusInitialElement, 0);

    function handleKeyDown(event: KeyboardEvent) {
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement) || !dialogElement.contains(activeElement)) {
        focusInitialElement();
      }

      if (event.key === "Escape" && closeOnEscape && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(dialogElement);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [closeOnEscape, dialogRef, initialFocusRef, open]);
}
