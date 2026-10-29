// Download link for the CF-OAUTH specification PDF, built from docs/spec at
// deploy time and served as a static asset (see specPdf() in vite.config.ts).
// Hidden when the build had no PDF (e.g. local dev without LaTeX).
export function SpecDownload({ compact = false }: { compact?: boolean }) {
  if (!__SPEC_PDF__) return null
  return (
    <a
      href={__SPEC_PDF__}
      download
      className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-ink2 border border-rim2 hover:bg-panel hover:text-ink transition-colors"
      title={`Download the Canvasflow Tenant Integration Specification v${__SPEC_VERSION__} (PDF)`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {compact ? 'Spec' : `Spec v${__SPEC_VERSION__} (PDF)`}
    </a>
  )
}
