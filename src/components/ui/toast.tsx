
"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
  XIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";


const globalToastManager =
  ToastPrimitive.createToastManager();

/* =========================================================
   TYPES
========================================================= */

type ToastType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading";

interface ToastOptions {
  description?: string;
  duration?: number;
}


const toast = {

  show: (
    type: ToastType,
    title: string,
    options?: ToastOptions
  ) => {
    return globalToastManager.add({
      type,
      title,
      description: options?.description,
      timeout: options?.duration ?? 4000,
    });
  },


  success: (
    title: string,
    options?: ToastOptions
  ) => {
    return globalToastManager.add({
      type: "success",
      title,
      description: options?.description,
      timeout: options?.duration ?? 4000,
    });
  },

  error: (
    title: string,
    options?: ToastOptions
  ) => {
    return globalToastManager.add({
      type: "error",
      title,
      description: options?.description,
      timeout: options?.duration ?? 5000,
    });
  },


  warning: (
    title: string,
    options?: ToastOptions
  ) => {
    return globalToastManager.add({
      type: "warning",
      title,
      description: options?.description,
      timeout: options?.duration ?? 4000,
    });
  },


  info: (
    title: string,
    options?: ToastOptions
  ) => {
    return globalToastManager.add({
      type: "info",
      title,
      description: options?.description,
      timeout: options?.duration ?? 4000,
    });
  },

  /* -------------------------------------------------------
     LOADING
  ------------------------------------------------------- */

  loading: (
    title: string,
    options?: ToastOptions
  ) => {
    return globalToastManager.add({
      type: "loading",
      title,
      description: options?.description,
      timeout: options?.duration ?? 0,
    });
  },

  /* -------------------------------------------------------
     DISMISS
  ------------------------------------------------------- */

  dismiss: (id: string) => {
    globalToastManager.close(id);
  },

  /* -------------------------------------------------------
     PROMISE
  ------------------------------------------------------- */

  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T> => {
    const loadingId = toast.loading(
      messages.loading
    );

    try {
      const result = await promise;

      globalToastManager.close(loadingId);

      toast.success(messages.success);

      return result;
    } catch (error) {
      globalToastManager.close(loadingId);

      toast.error(messages.error);

      throw error;
    }
  },
};

/* =========================================================
   PROVIDER
========================================================= */

function ToastProvider({
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastPrimitive.Provider
      {...props}
    />
  );
}

/* =========================================================
   PORTAL
========================================================= */

function ToastPortal({
  ...props
}: ToastPrimitive.Portal.Props) {
  return (
    <ToastPrimitive.Portal
      data-slot="toast-portal"
      {...props}
    />
  );
}

/* =========================================================
   VIEWPORT
   TOP RIGHT
========================================================= */

function ToastViewport({
  className,
  ...props
}: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        `
        pointer-events-none
        fixed
        top-4
        right-4
        z-[99999]
        flex
        w-[calc(100%-2rem)]
        max-w-[420px]
        flex-col
        gap-3
        outline-none

        sm:top-5
        sm:right-5

        max-sm:left-4
        max-sm:right-4
        max-sm:w-auto
        `,
        className
      )}
      {...props}
    />
  );
}

/* =========================================================
   TOAST ROOT
========================================================= */

function Toast({
  className,
  ...props
}: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        `
        group/toast
        pointer-events-auto
        relative
        w-full
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        text-slate-900
        shadow-2xl
        shadow-black/10
        backdrop-blur-xl
        outline-none
        select-none

        transition-all
        duration-300

        dark:border-white/10
        dark:bg-slate-950
        dark:text-white
        dark:shadow-black/40

        data-starting-style:translate-x-[120%]
        data-starting-style:opacity-0

        data-ending-style:translate-x-[120%]
        data-ending-style:opacity-0

        data-swiping:transition-none
        `,
        className
      )}
      {...props}
    />
  );
}

/* =========================================================
   CONTENT
========================================================= */

function ToastContent({
  className,
  ...props
}: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        `
        flex
        min-h-[72px]
        w-full
        items-start
        gap-3
        p-4
        `,
        className
      )}
      {...props}
    />
  );
}

/* =========================================================
   TITLE
========================================================= */

function ToastTitle({
  className,
  ...props
}: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn(
        "text-sm font-semibold leading-5",
        className
      )}
      {...props}
    />
  );
}

/* =========================================================
   DESCRIPTION
========================================================= */

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn(
        "mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400",
        className
      )}
      {...props}
    />
  );
}

/* =========================================================
   ACTION
========================================================= */

function ToastAction({
  className,
  render = (
    <Button
      variant="outline"
      size="sm"
    />
  ),
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn(
        "shrink-0",
        className
      )}
      {...props}
    />
  );
}

/* =========================================================
   CLOSE
========================================================= */

function ToastClose({
  className,
  children,
  render = (
    <Button
      variant="ghost"
      size="icon-sm"
    />
  ),
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close notification"
      render={render}
      className={cn(
        `
        relative
        shrink-0
        text-slate-400
        transition-all
        duration-200

        hover:bg-slate-100
        hover:text-slate-700

        dark:hover:bg-white/10
        dark:hover:text-white
        `,
        className
      )}
      {...props}
    >
      {children ?? (
        <XIcon className="size-4" />
      )}
    </ToastPrimitive.Close>
  );
}

/* =========================================================
   ICON
========================================================= */

function ToastIcon({
  type,
}: {
  type?: string;
}) {
  let icon: React.ReactNode = null;

  if (type === "success") {
    icon = (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
        <CircleCheckIcon
          className="size-5 text-emerald-500"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (type === "error") {
    icon = (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
        <OctagonXIcon
          className="size-5 text-red-500"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (type === "warning") {
    icon = (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
        <TriangleAlertIcon
          className="size-5 text-amber-500"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (type === "info") {
    icon = (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
        <InfoIcon
          className="size-5 text-blue-500"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (type === "loading") {
    icon = (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#ff3800]/10">
        <Loader2Icon
          className="size-5 animate-spin text-[#ff3800]"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (!icon) {
    return null;
  }

  return (
    <div data-slot="toast-icon">
      {icon}
    </div>
  );
}

/* =========================================================
   TOAST LIST
========================================================= */

function ToastList() {
  const {
    toasts,
  } = ToastPrimitive.useToastManager();

  return (
    <>
      {toasts.map((toastItem) => (
        <Toast
          key={toastItem.id}
          toast={toastItem}
        >
          <ToastContent>
            <ToastIcon
              type={toastItem.type}
            />

            <div className="min-w-0 flex-1 pt-0.5">
              <ToastTitle />

              <ToastDescription />
            </div>

            <ToastAction />

            <ToastClose />
          </ToastContent>

          {/* Progress line */}

          {toastItem.type !== "loading" && (
            <div
              className={cn(
                "absolute bottom-0 left-0 h-[2px] w-full origin-left",
                toastItem.type ===
                  "success" &&
                  "bg-emerald-500",

                toastItem.type ===
                  "error" &&
                  "bg-red-500",

                toastItem.type ===
                  "warning" &&
                  "bg-amber-500",

                toastItem.type ===
                  "info" &&
                  "bg-blue-500"
              )}
            />
          )}
        </Toast>
      ))}
    </>
  );
}

/* =========================================================
   TOASTER
========================================================= */

function Toaster({
  children,
  toastManager: providedToastManager,
  ...props
}: ToastPrimitive.Provider.Props) {
  /*
   * If user provides a custom manager,
   * use that manager.
   *
   * Otherwise use our global manager.
   */
  const manager =
    providedToastManager ??
    globalToastManager;

  return (
    <ToastProvider
      toastManager={manager}
      {...props}
    >
      {children}

      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

/* =========================================================
   MANAGER HELPERS
========================================================= */

const createToastManager =
  ToastPrimitive.createToastManager;

const useToastManager =
  ToastPrimitive.useToastManager;

/* =========================================================
   EXPORTS
========================================================= */

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,

  createToastManager,

  toast,

  useToastManager,
};
