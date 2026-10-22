/**
 * System-Wide Browser DevTools & Inspect Element Blocker
 * Prevents unauthorized users from inspecting elements, viewing source code,
 * or tampering with application logic in browser.
 */

export function initSecurityProtection() {
  if (typeof window === 'undefined') return;

  // 1. Disable Right Click Context Menu
  document.addEventListener(
    'contextmenu',
    (e) => {
      // Allow right click ONLY inside regular text inputs or textareas if needed for pasting,
      // but block inspecting anywhere.
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    true
  );

  // 2. Disable Keyboard Shortcuts for DevTools & Source Inspection
  window.addEventListener(
    'keydown',
    (e) => {
      // F12 key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const isModifier = e.ctrlKey || e.metaKey;

      if (isModifier) {
        // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
        // Ctrl+Shift+J / Cmd+Opt+J (Console)
        // Ctrl+Shift+C / Cmd+Opt+C (Element Inspector)
        // Ctrl+Shift+K / Cmd+Opt+K (Firefox Web Console)
        if (e.shiftKey) {
          const key = (e.key || '').toLowerCase();
          if (['i', 'j', 'c', 'k'].includes(key)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }

        // Ctrl+U / Cmd+U (View Source)
        if ((e.key || '').toLowerCase() === 'u') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Ctrl+S / Cmd+S (Save Page HTML)
        if ((e.key || '').toLowerCase() === 's') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    },
    true
  );

  // 3. Clear & Neutralize Console in Production
  try {
    const noop = () => {};
    // Keep error for unhandled exception logging if needed, but neutralize informational logs
    window.console.log = noop;
    window.console.info = noop;
    window.console.debug = noop;
    window.console.dir = noop;
  } catch (err) {
    // ignore
  }

  // 4. DevTools Detection Trap
  // When DevTools is opened, debugger triggers execution delay
  let devtoolsOpen = false;
  const threshold = 160;

  setInterval(() => {
    const startTime = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const endTime = performance.now();

    if (endTime - startTime > threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        console.clear();
      }
    } else {
      devtoolsOpen = false;
    }
  }, 1500);
}

export default initSecurityProtection;
