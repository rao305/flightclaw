(function () {
  "use strict";

  var GLOBAL_NAME = "SqairinchWidget";
  var trigger =
    document.getElementById("sqairinch-trigger") ||
    document.querySelector("[data-sqairinch-trigger]");

  if (!trigger) return;

  var root = document.getElementById("sqairinch-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "sqairinch-root";
    root.setAttribute("aria-live", "polite");
    root.setAttribute("aria-atomic", "true");
    document.body.appendChild(root);
  }

  var loaded = false;
  var currentVariantId = null;
  var overlayEl = null;
  var slotEl = null;

  function getVariantId() {
    var input = document.querySelector(
      'product-form [name="id"], form[action*="/cart/add"] [name="id"]'
    );
    return input ? input.value : null;
  }

  function getShopDomain() {
    var raw = trigger.dataset.shop;
    if (!raw) return null;

    try {
      var parsed = JSON.parse(raw);
      return typeof parsed === "string" ? parsed : null;
    } catch {
      return raw;
    }
  }

  function buildQueryString() {
    var params = new URLSearchParams();

    var shop = getShopDomain();
    if (shop) {
      params.set("shop", shop);
    }

    var productId = trigger.dataset.productId;
    if (productId) {
      params.set("product", productId);
    }

    var variantId = getVariantId();
    if (variantId) {
      params.set("variant", variantId);
    }

    return params.toString();
  }

  function getOptions() {
    return {
      baseUrl: window.location.origin,
      queryString: buildQueryString(),
      variantId: getVariantId() || undefined,
    };
  }

  function ensureModalShell() {
    if (slotEl) return;

    var host = root;
    if (!host.shadowRoot) {
      host.attachShadow({ mode: "open" });
    }
    var sh = host.shadowRoot;

    var style = document.createElement("style");
    style.textContent =
      ":host{all:initial;display:block;position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;box-sizing:border-box}" +
      ".sqairinch-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}" +
      ".sqairinch-overlay.sqairinch-hidden{display:none}" +
      ".sqairinch-drawer{position:relative;background:#fff;border-radius:8px;max-width:480px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 4px 24px rgba(0,0,0,0.15);box-sizing:border-box}" +
      ".sqairinch-close{position:absolute;top:12px;right:12px;width:32px;height:32px;padding:0;border:none;background:transparent;cursor:pointer;font-size:20px;line-height:1;color:#333;border-radius:4px}" +
      ".sqairinch-close:hover{background:#eee}" +
      ".sqairinch-slot{min-height:120px;padding:48px 24px 40px;box-sizing:border-box}" +
      ".sqairinch-footer{padding:12px 24px;font-size:12px;color:#666;text-align:center;border-top:1px solid #eee;box-sizing:border-box}";

    sh.appendChild(style);

    var overlay = document.createElement("div");
    overlay.className = "sqairinch-overlay sqairinch-hidden";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    var drawer = document.createElement("div");
    drawer.className = "sqairinch-drawer";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "sqairinch-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "\u00D7";

    var slot = document.createElement("div");
    slot.className = "sqairinch-slot";

    var footer = document.createElement("div");
    footer.className = "sqairinch-footer";
    footer.textContent = "Powered by Sqairinch";

    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    drawer.appendChild(closeBtn);
    drawer.appendChild(slot);
    drawer.appendChild(footer);
    overlay.appendChild(drawer);
    sh.appendChild(overlay);

    overlayEl = overlay;
    slotEl = slot;
  }

  function openModal() {
    ensureModalShell();
    overlayEl.classList.remove("sqairinch-hidden");
  }

  function closeModal() {
    if (overlayEl) overlayEl.classList.add("sqairinch-hidden");
    if (
      window[GLOBAL_NAME] &&
      typeof window[GLOBAL_NAME].unmountSqairinch === "function"
    ) {
      window[GLOBAL_NAME].unmountSqairinch();
    }
  }

  function mountWidget() {
    if (!slotEl) return;
    if (!window[GLOBAL_NAME] || !window[GLOBAL_NAME].mountSqairinch) return;
    window[GLOBAL_NAME].mountSqairinch(slotEl, getOptions());
  }

  function loadAndMount() {
    var widgetUrl = trigger.dataset.widgetUrl;
    if (!widgetUrl) {
      console.warn("[Sqairinch] widget_bundle_url is not configured.");
      return;
    }

    if (!/^https:\/\//.test(widgetUrl)) {
      console.warn("[Sqairinch] widget_bundle_url must use HTTPS.");
      return;
    }

    openModal();

    if (loaded) {
      mountWidget();
      return;
    }

    loaded = true;
    var script = document.createElement("script");
    script.src = widgetUrl;
    script.defer = true;
    script.onload = mountWidget;
    script.onerror = function () {
      loaded = false;
      closeModal();
      console.error("[Sqairinch] Failed to load widget bundle.");
    };
    document.head.appendChild(script);
  }

  trigger.addEventListener("click", loadAndMount);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlayEl && !overlayEl.classList.contains("sqairinch-hidden")) {
      closeModal();
    }
  });

  document.addEventListener("change", function (e) {
    var el = e.target;
    if (!el) return;
    var isVariantSelector =
      el.matches('[name="id"]') ||
      el.closest("variant-selects") !== null ||
      el.closest("variant-radios") !== null;
    if (!isVariantSelector) return;

    var newVariantId = getVariantId();
    if (newVariantId !== currentVariantId) {
      currentVariantId = newVariantId;
      if (window[GLOBAL_NAME] && window[GLOBAL_NAME].onVariantChange) {
        window[GLOBAL_NAME].onVariantChange(newVariantId);
      }
    }
  });
})();
