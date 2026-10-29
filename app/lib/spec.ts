// app/lib/spec.ts
// ---------------------------------------------------------------------------
// The CF-OAUTH specification this validator implements. The version has one
// source: \specversion in docs/spec/version.tex, which also stamps the PDF.
// To move to a new spec version, change that number only; specPdf() in
// vite.config.ts reads it at build time. Everything in the app uses these
// constants, never the number itself.
// ---------------------------------------------------------------------------

export const SPEC_VERSION: string = __SPEC_VERSION__
export const SPEC_TITLE = 'Canvasflow Tenant Integration Specification'
/** URL of the built PDF, or null when the build had none (e.g. no LaTeX). */
export const SPEC_PDF: string | null = __SPEC_PDF__
