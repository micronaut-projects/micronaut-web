import {
  isProgrammingLanguage,
  PROGRAMMING_LANGUAGE_EVENT,
  readProgrammingLanguageCookiePreference,
  saveProgrammingLanguagePreference,
} from "@/lib/programming-language-preference";

(() => {
  const snippetText = (block: Element) => {
    const code = block.querySelector("code");
    return code?.innerText || code?.textContent || "";
  };

  const copyText = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  const decorateCopyButtonIcon = (button: HTMLElement) => {
    const icon = button.querySelector("svg");
    if (!icon) {
      return;
    }
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("stroke-width", "2");
  };

  const setCopyState = (button: HTMLElement, copied: boolean) => {
    button.setAttribute("aria-label", copied ? "Copied" : "Copy code");
    button.setAttribute("title", copied ? "Copied" : "Copy code");
    const label = button.querySelector("span");
    if (label) {
      label.textContent = copied ? "Copied" : "Copy code";
    }
  };

  const bindCopyButton = (button: HTMLElement, getText: () => string) => {
    if (button.dataset.copyEnhanced === "true") {
      return;
    }
    button.dataset.copyEnhanced = "true";
    button.addEventListener("click", async () => {
      try {
        await copyText(getText());
        setCopyState(button, true);
        window.setTimeout(() => setCopyState(button, false), 1400);
      } catch {
        button.setAttribute("aria-label", "Copy failed");
        button.setAttribute("title", "Copy failed");
        window.setTimeout(() => setCopyState(button, false), 1800);
      }
    });
  };

  const bindStaticSnippetTemplate = (template: HTMLElement) => {
    if (template.dataset.staticSnippetEnhanced === "true") {
      return;
    }
    const tabs = Array.from(
      template.querySelectorAll<HTMLElement>(
        ".docs-snippet-tabs button[role='tab']",
      ),
    );
    const panels = tabs
      .map((tab) =>
        document.getElementById(tab.getAttribute("aria-controls") || ""),
      )
      .filter((panel): panel is HTMLElement => Boolean(panel));
    const copyButton = template.querySelector<HTMLElement>(
      "[data-copy-active-snippet]",
    );
    if (!tabs.length || !panels.length) {
      return;
    }
    template.dataset.staticSnippetEnhanced = "true";
    let activeIndex = Math.max(
      0,
      tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"),
    );

    const activate = (nextIndex: number, persistGlobally = false) => {
      activeIndex = nextIndex;
      panels.forEach((panel, index) => {
        const active = index === activeIndex;
        panel.hidden = !active;
        panel.setAttribute("aria-hidden", String(!active));
      });
      tabs.forEach((tab, index) => {
        const active = index === activeIndex;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        tab.classList.toggle("selected", active);
        tab.classList.toggle("font-semibold", active);
        tab.classList.toggle("text-code-foreground", active);
        tab.classList.toggle("text-code-muted", !active);
      });
      if (persistGlobally) {
        const language = tabs[nextIndex]?.dataset.lang;
        if (isProgrammingLanguage(language)) {
          saveProgrammingLanguagePreference(language);
        } else if (language === "gradle" || language === "maven") {
          import("@/lib/build-tool-preference")
            .then(({ saveBuildToolPreference }) => {
              saveBuildToolPreference(language as any);
            })
            .catch(() => {});
        }
      }
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        const persistGlobally =
          template.dataset.globalLanguageApplication !== "true";
        delete template.dataset.globalLanguageApplication;
        activate(index, persistGlobally);
      });
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
          return;
        }
        event.preventDefault();
        const offset = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (index + offset + tabs.length) % tabs.length;
        activate(nextIndex, true);
        tabs[nextIndex]?.focus();
      });
    });

    if (copyButton) {
      decorateCopyButtonIcon(copyButton);
      bindCopyButton(copyButton, () => snippetText(panels[activeIndex]));
    }
    activate(activeIndex);
  };

  const enhanceTemplateSnippetControls = (root: Element) => {
    root
      .querySelectorAll<HTMLElement>(".docs-snippet-template")
      .forEach((template) => {
        bindStaticSnippetTemplate(template);
      });
  };

  const stabilizeGeneratedImages = (root: Element) => {
    root.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
      image.loading = image.loading || "lazy";
      image.decoding = image.decoding || "async";
      const applyDimensions = () => {
        if (image.naturalWidth > 0 && image.naturalHeight > 0) {
          image.width = image.width || image.naturalWidth;
          image.height = image.height || image.naturalHeight;
        }
      };
      if (image.complete) {
        applyDimensions();
      } else {
        image.addEventListener("load", applyDimensions, { once: true });
      }
    });
  };

  /**
   * Given a snippet template, activate the tab that matches
   * `language`, if one exists. Does nothing if no matching tab is found,
   * preserving any existing local selection.
   */
  const applyLanguageToTemplate = (template: HTMLElement, language: string) => {
    const tabs = Array.from(
      template.querySelectorAll<HTMLElement>(
        ".docs-snippet-tabs button[role='tab'][data-lang]",
      ),
    );
    const matchIndex = tabs.findIndex((tab) => tab.dataset.lang === language);
    if (matchIndex < 0) {
      return;
    }
    // Re-use the existing activate logic that was already bound; simulate a click.
    template.dataset.globalLanguageApplication = "true";
    tabs[matchIndex]?.click();
  };

  /**
   * Apply the current language preference to all already enhanced snippet
   * templates under [data-generated-docs].
   */
  const applyGlobalLanguagePreference = (language: string) => {
    document
      .querySelectorAll<HTMLElement>(".docs-snippet-template")
      .forEach((template) => {
        applyLanguageToTemplate(template, language);
      });
  };

  // Listen for language changes from the navbar selector.
  window.addEventListener(PROGRAMMING_LANGUAGE_EVENT, (event) => {
    const detail = (event as CustomEvent<{ language?: string }>).detail;
    const language = detail?.language;
    if (language && isProgrammingLanguage(language)) {
      applyGlobalLanguagePreference(language);
    }
  });

  window.addEventListener("micronaut-web-build-tool-change", (event) => {
    const detail = (event as CustomEvent<{ buildTool?: string }>).detail;
    const buildTool = detail?.buildTool;
    if (buildTool === "gradle" || buildTool === "maven") {
      applyGlobalLanguagePreference(buildTool);
    }
  });

  const init = () => {
    document
      .querySelectorAll<HTMLElement>("[data-generated-docs]")
      .forEach((root) => {
        if (root.dataset.generatedDocsEnhanced === "true") {
          return;
        }
        root.dataset.generatedDocsEnhanced = "true";
        stabilizeGeneratedImages(root);
        enhanceTemplateSnippetControls(root);
      });
    // Apply global language preference to all snippets.
    const preferredLanguage = readProgrammingLanguageCookiePreference();
    if (preferredLanguage) {
      applyGlobalLanguagePreference(preferredLanguage);
    }
    import("@/lib/build-tool-preference")
      .then(({ readBuildToolCookiePreference }) => {
        const preferredBuildTool = readBuildToolCookiePreference();
        if (preferredBuildTool) {
          applyGlobalLanguagePreference(preferredBuildTool);
        }
      })
      .catch(() => {});
    document.documentElement.removeAttribute("data-code-language-pending");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
