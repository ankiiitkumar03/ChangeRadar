# CR-05 — Monitoring extraction and noise reduction

## Changes

- Strip comments, scripts, styles, templates, embedded media, SVG, iframes, and explicitly hidden/`aria-hidden`/CSS-hidden elements before text extraction.
- Preserve the existing semantic line breaks and duplicate-line suppression.
- Normalize extracted Unicode to NFC for stable hashes across equivalent text representations.
- Decode numeric entities defensively so malformed or out-of-range code points do not crash a monitoring run.
- Make keyword tracking deterministic: if configured terms are absent, save a stable marker instead of silently falling back to tracking the entire page. This prevents unrelated page edits from triggering alerts and detects the arrival of a tracked term.
- Keep ignore-only filters stable when all extracted lines are excluded.
- Validate keyword filters at the API boundary (maximum 20 terms, 80 characters per term).

## Behavior to verify

1. A page with the same content but different script/style payloads produces the same extracted text.
2. Text inside `hidden`, `aria-hidden="true"`, or inline `display:none` elements is excluded.
3. Invalid numeric entities do not throw.
4. With tracked keywords configured and none present, repeated checks remain unchanged despite unrelated page edits.
5. When a tracked keyword appears, a change is detected.
6. Ignore keywords continue excluding matching lines; excluding all lines does not turn the check into a fetch failure.
7. Requests containing more than 20 terms or a term longer than 80 characters are rejected.

## Limitations

- This is a lightweight HTML text extractor, not a standards-compliant browser DOM.
- JavaScript-rendered content is still unsupported. Playwright should be introduced through a separate browser worker/service rather than bundled into the current Vercel serverless function.
- Full dependency installation, typecheck, build, and live PostgreSQL tests are still required before production deployment.
