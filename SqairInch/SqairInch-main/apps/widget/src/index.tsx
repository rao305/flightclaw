import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Widget } from "./Widget.js";
import type { RuntimeConfig } from "./state/types.js";

export type { RuntimeConfig };

let reactRoot: Root | null = null;
let lastMountEl: HTMLElement | null = null;
let lastRuntimeConfig: RuntimeConfig = { baseUrl: "", queryString: "" };

export function mountSqairinch(el: HTMLElement, options?: RuntimeConfig) {
  unmountSqairinch();
  lastMountEl = el;
  lastRuntimeConfig = options ?? { baseUrl: "", queryString: "" };
  reactRoot = createRoot(el);
  reactRoot.render(<Widget config={lastRuntimeConfig} />);
}

export function onVariantChange(variantId: string | null) {
  if (!lastMountEl) return;
  mountSqairinch(lastMountEl, {
    ...lastRuntimeConfig,
    variantId: variantId ?? undefined,
  });
}

export function unmountSqairinch() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
}

// Auto-mount if data attribute present (e.g. standalone test page)
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const el = document.querySelector<HTMLElement>("[data-sqairinch-widget]");
    if (el) {
      const baseUrl = el.dataset.baseUrl ?? "";
      const queryString = el.dataset.queryString ?? "";
      const variantId = el.dataset.variantId;
      mountSqairinch(el, { baseUrl, queryString, variantId });
    }
  });
}
