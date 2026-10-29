// Download link for the CF-OAUTH specification PDF, built from docs/spec at
// deploy time and served as a static asset (see specPdf() in vite.config.ts).
// Hidden when the build had no PDF (e.g. local dev without LaTeX).
// `icon` is the header button; the default is the full link in Settings.
export function SpecDownload({ icon = false }: { icon?: boolean }) {
  if (!__SPEC_PDF__) return null
  const title = `Download the Canvasflow Tenant Integration Specification v${__SPEC_VERSION__} (PDF)`
  return (
    <a
      href={__SPEC_PDF__}
      download
      className={icon
        ? 'p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-panel border border-transparent hover:border-rim transition-colors'
        : 'inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-ink2 border border-rim2 hover:bg-rim hover:text-ink transition-colors w-fit'}
      title={title}
      aria-label={icon ? title : undefined}
    >
      <svg width={icon ? 16 : 14} height={icon ? 16 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {!icon && `Spec v${__SPEC_VERSION__} (PDF)`}
    </a>
  )
}
