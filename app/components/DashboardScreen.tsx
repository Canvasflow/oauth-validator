import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { clearAll, loadTokens, type StoredTokens } from "../lib/storage";
import { TokenInspector } from "./TokenInspector";
import { SignatureValidator } from "./SignatureValidator";
import { TokenRefresh } from "./TokenRefresh";
import { SettingsDialog } from "./SettingsDialog";
import { ThemeToggle } from "./ThemeToggle";

export function DashboardScreen() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<StoredTokens>(() => loadTokens()!);
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = () => {
    clearAll();
    void navigate({
      to: "/login",
      replace: true,
      search: { error: undefined, error_description: undefined },
    });
  };

  return (
    <>
      {showSettings && (
        <SettingsDialog onClose={() => setShowSettings(false)} />
      )}

      <div className="min-h-screen bg-canvas">
        {/* Sticky header */}
        <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur-sm border-b border-rim px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="https://canvasflow.io/wp-content/uploads/2022/06/favicon.ico"
              width="22"
              height="22"
              alt="Canvasflow"
              className="rounded-md"
            />
            <span className="font-mono text-sm text-ink2">
              OAuth PKCE Validator
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Auth status badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-ok/10 text-ok border border-ok/25">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Authenticated
            </div>

            <ThemeToggle />

            <button
              className="p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-panel border border-transparent hover:border-rim transition-colors cursor-pointer"
              onClick={() => setShowSettings(true)}
              aria-label="Configure IdP settings"
              title="Settings"
            >
              <SettingsIcon />
            </button>

            <button
              className="text-sm font-medium px-3 py-1.5 rounded-lg text-ink2 border border-rim2 hover:bg-panel hover:text-ink transition-colors"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-7 pb-16">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink mb-2">
              Token Inspector
            </h2>
            <p className="text-sm text-ink2 leading-relaxed">
              The PKCE flow completed successfully. The access token is stored
              in <code>sessionStorage</code>. Decoded claims are shown below —
              client-side decode only. Use the Signature Verification panel to
              cryptographically confirm the token via the Cloudflare Worker
              backend.
            </p>
          </div>

          <TokenInspector tokens={tokens} />
          <SignatureValidator accessToken={tokens.accessToken} />
          <TokenRefresh tokens={tokens} onRefreshed={setTokens} />
        </main>
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
