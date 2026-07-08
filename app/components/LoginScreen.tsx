import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { login } from "../lib/oauth";
import { isConfigured } from "../lib/config";
import { SettingsDialog } from "./SettingsDialog";
import { ThemeToggle } from "./ThemeToggle";

const routeApi = getRouteApi("/login");

export function LoginScreen() {
  const { error, error_description } = routeApi.useSearch();
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [configured, setConfigured] = useState(isConfigured);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login();
    } catch (e) {
      console.error("Login initiation failed:", e);
      setLoading(false);
    }
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    setConfigured(isConfigured());
  };

  return (
    <>
      {showSettings && <SettingsDialog onClose={handleSettingsClose} />}

      <div className="min-h-screen flex items-center justify-center p-6 bg-canvas">
        <div className="w-full max-w-md bg-card border border-rim rounded-2xl p-10 flex flex-col gap-6 shadow-sm">
          {/* Brand row */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="https://canvasflow.io/wp-content/uploads/2022/06/favicon.ico"
                  width="28"
                  height="28"
                  alt="Canvasflow"
                  className="rounded-md"
                />
                <span className="font-mono text-sm text-ink2 tracking-wide">
                  Canvasflow OAuth Validator
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <button
                  className="p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-panel transition-colors cursor-pointer"
                  onClick={() => setShowSettings(true)}
                  aria-label="Configure IdP settings"
                  title="Settings"
                >
                  <SettingsIcon />
                </button>
              </div>
            </div>

            <h1 className="text-[1.75rem] font-bold tracking-tight text-ink">
              Sign in
            </h1>
            <p className="text-sm text-ink2 leading-relaxed">
              Authorization Code flow with PKCE (S256).
              <br />
              Validation with Web Crypto only.
            </p>
          </div>

          {/* Not configured warning */}
          {!configured && (
            <div
              className="flex items-start gap-3 bg-warn/10 border border-warn/30 rounded-xl p-4"
              role="alert"
            >
              <span className="text-base leading-relaxed shrink-0 mt-0.5">
                ⚙️
              </span>
              <div>
                <strong className="block text-sm font-semibold text-warn mb-1">
                  IdP not configured
                </strong>
                <span className="text-xs text-ink2 leading-relaxed">
                  Click the settings icon to enter your identity provider
                  details before signing in.
                </span>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              className="bg-bad/10 border border-bad/30 rounded-xl p-4 flex flex-col gap-1"
              role="alert"
            >
              <strong className="font-mono text-sm text-bad">{error}</strong>
              {error_description && (
                <span className="text-sm text-ink2">{error_description}</span>
              )}
            </div>
          )}

          {/* Sign in button */}
          <button
            className="w-full bg-brand hover:opacity-90 text-white font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-base"
            onClick={handleLogin}
            disabled={loading || !configured}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
                Redirecting to IdP…
              </>
            ) : (
              "Sign in with your IdP"
            )}
          </button>

          {/* Footer */}
          <div className="border-t border-rim pt-4">
            <p className="text-xs text-ink3 text-center leading-relaxed">
              Tokens are stored in <code>sessionStorage</code> and cleared when
              the tab closes. IdP settings are saved in{" "}
              <code>localStorage</code>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
