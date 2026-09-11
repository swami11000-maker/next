"use client";

import { useEffect } from "react";

const BLOCKED_KEYS = new Set([
  "F12",
  "F11",
  "F5",
  "F1",
]);

const BLOCKED_COMBOS = new Set([
  "ControlI",
  "ControlJ",
  "ControlShiftI",
  "ControlShiftJ",
  "ControlShiftC",
  "ControlShiftS",
  "ControlU",
  "ControlB",
  "ControlShiftB",
  "AltCommandI",
]);

const CLI_UA_PATTERNS = [
  /HeadlessChrome/i,
  /curl/i,
  /PostmanRuntime/i,
  /Wget/i,
  /python-requests/i,
  /Go-http-client/i,
  /node-fetch/i,
  /axios/i,
  /Burp/i,
  /ZAP/i,
  /jq/i,
];

function isDevToolsOpen(): boolean {
  const devtools = {
    open: false,
    orientation: 1,
  };

  const threshold = 160;
  const devtoolsCheck = () => {
    if (
      window.outerHeight - window.innerHeight > threshold ||
      window.outerWidth - window.innerWidth > threshold
    ) {
      return true;
    }
    return false;
  };

  return devtoolsCheck();
}

export function DevToolsGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isBot = CLI_UA_PATTERNS.some((p) => p.test(navigator.userAgent));
    if (isBot) {
      document.body.style.display = "none";
      return;
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const tagName = (e.target as HTMLElement)?.tagName?.toLowerCase() ?? "";

      if (tagName === "input" || tagName === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const combo = `${e.ctrlKey ? "Control" : ""}${e.altKey ? "Alt" : ""}${e.shiftKey ? "Shift" : ""}${e.key.length === 1 ? e.key.toUpperCase() : e.key}`;

      if (BLOCKED_KEYS.has(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const normalizedCombo = `${e.ctrlKey ? "Control" : ""}${e.shiftKey ? "Shift" : ""}${e.key.length === 1 ? e.key.toUpperCase() : e.key}`;

      if (BLOCKED_COMBOS.has(normalizedCombo) || BLOCKED_COMBOS.has(combo)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (e.ctrlKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (BLOCKED_KEYS.has(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleSelect = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const checkDevTools = () => {
      if (isDevToolsOpen()) {
        document.body.style.display = "none";
      }
    };

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkDevTools, 50);
    };

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("selectstart", handleSelect, true);
    document.addEventListener("dragstart", handleDragStart, true);
    window.addEventListener("resize", handleResize);

    const interval = setInterval(checkDevTools, 1000);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      document.removeEventListener("selectstart", handleSelect, true);
      document.removeEventListener("dragstart", handleDragStart, true);
      window.removeEventListener("resize", handleResize);
      clearInterval(interval);
    };
  }, []);

  return children as React.ReactElement;
}
