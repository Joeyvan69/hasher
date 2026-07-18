(function () {
  "use strict";

  function debounce(callback, delayForCall) {
    let timer = null;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(callback, delayForCall());
    };
  }

  async function copyResult(button) {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    const previous = button.textContent;
    try {
      await navigator.clipboard.writeText(target.textContent || "");
      button.textContent = "Copied";
    } catch (_error) {
      button.textContent = "Copy failed";
    }
    setTimeout(() => { button.textContent = previous; }, 1200);
  }

  function showScreen() {
    const about = location.hash === "#info";
    document.getElementById("screen-1").hidden = about;
    document.getElementById("screen-2").hidden = !about;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("input-value");
    const password = document.getElementById("input-password");
    const passwordWrapper = document.getElementById("input-password-wrapper");
    const tabList = document.getElementById("tabs");
    const output = document.getElementById("output");
    const scheduleUpdate = debounce(() => hasher.update(), () => hasher.tab === tabs.cipher ? 550 : 160);

    hasher.render();
    hasher.update();
    showScreen();
    input.focus();

    input.addEventListener("input", scheduleUpdate);
    password.addEventListener("input", scheduleUpdate);

    tabList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tab]");
      if (!button) return;
      for (const tab of tabList.querySelectorAll("[data-tab]")) {
        const selected = tab === button;
        tab.classList.toggle("on", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      }
      const tabName = button.dataset.tab;
      passwordWrapper.hidden = tabName !== tabs.hmac && tabName !== tabs.cipher;
      hasher.setTab(tabName);
      hasher.update();
    });

    tabList.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const buttons = [...tabList.querySelectorAll("[data-tab]")];
      const current = buttons.indexOf(document.activeElement);
      const direction = event.key === "ArrowRight" ? 1 : -1;
      buttons[(current + direction + buttons.length) % buttons.length].click();
      buttons[(current + direction + buttons.length) % buttons.length].focus();
      event.preventDefault();
    });

    output.addEventListener("click", (event) => {
      const copy = event.target.closest("[data-copy-target]");
      if (copy) {
        copyResult(copy);
        return;
      }
      const expand = event.target.closest("[data-expand-target]");
      if (!expand) return;
      const value = document.getElementById(expand.dataset.expandTarget);
      const expanded = value.classList.toggle("expanded");
      expand.setAttribute("aria-expanded", String(expanded));
      expand.textContent = expanded ? "Collapse" : "Expand";
    });

    document.getElementById("button-popout").addEventListener("click", async () => {
      try {
        await chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
      } catch (_error) {
        document.getElementById("status").textContent = "Could not open a new tab.";
      }
    });

    window.addEventListener("hashchange", showScreen);
    document.querySelector(".back-button").addEventListener("click", (event) => {
      event.preventDefault();
      history.replaceState(null, "", location.pathname);
      showScreen();
      input.focus();
    });
  });
})();
