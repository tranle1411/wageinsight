import { useEffect, useRef, useState } from "react";
type Api = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      retry: string;
      size: string;
    },
  ) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Api;
  }
}
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    let id: string | undefined;
    const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!sitekey) {
      setError("Verification is unavailable right now.");
      return;
    }
    const render = () => {
      if (disposed || !container.current || !window.turnstile) return;
      try {
        id = window.turnstile.render(container.current, {
          sitekey,
          action: "explain",
          size: "flexible",
          retry: "never",
          callback: (token) => {
            if (!disposed) onToken(token);
          },
          "error-callback": () => {
            if (!disposed) setError("Verification failed. Please try again.");
          },
          "expired-callback": () => {
            if (!disposed) setError("Verification expired. Please try again.");
          },
        });
      } catch {
        setError("Verification is unavailable right now.");
      }
    };
    let script = document.querySelector<HTMLScriptElement>(
      "script[data-wageinsight-turnstile]",
    );
    if (script?.dataset.failed === "true" && !window.turnstile) {
      script.remove();
      script = null;
    }
    if (!script) {
      script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.wageinsightTurnstile = "true";
      document.head.appendChild(script);
    }
    const failed = () => {
      if (script) script.dataset.failed = "true";
      if (!disposed) setError("Verification could not load. Please try again.");
    };
    script.addEventListener("load", render);
    script.addEventListener("error", failed);
    if (window.turnstile) render();
    const timeout = window.setTimeout(() => {
      if (!disposed && !id) failed();
    }, 15000);
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      script?.removeEventListener("load", render);
      script?.removeEventListener("error", failed);
      if (id) window.turnstile?.remove(id);
    };
  }, [onToken, attempt]);
  return (
    <div aria-label="Verify before requesting explanation">
      <p>Complete verification to receive the AI explanation.</p>
      <div ref={container} />
      {error && (
        <>
          <p role="alert">{error}</p>
          <button
            className="button"
            onClick={() => {
              setError("");
              setAttempt((a) => a + 1);
            }}
          >
            Retry verification
          </button>
        </>
      )}
    </div>
  );
}
