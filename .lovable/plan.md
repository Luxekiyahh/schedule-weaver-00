I’ll update the currently active generation endpoint at `src/routes/api/public/generate-branding.ts` (the route now serving `/api/public/generate-branding`; the old `src/routes/api/generate-branding.ts` path no longer exists after the move).

Implementation plan:

1. Add the requested API-key visibility log immediately before the Anthropic `fetch` call:
   - `console.log("Anthropic API Key present:", !!process.env.ANTHROPIC_API_KEY);`

2. Improve upstream error logging:
   - When Anthropic returns `!resp.ok`, read `await resp.text()` into `errorText`.
   - Log `console.error("Anthropic API Error Details:", errorText);`
   - Keep the existing refund behavior intact.

3. Add robust Claude-output extraction:
   - Introduce a small helper that strips markdown fences and extracts only the first JSON object from `{` through the last `}`.
   - Remove common trailing commas/control characters before parsing as a fallback.

4. Add parse/validation diagnostics:
   - Capture Claude’s raw text as `rawText`.
   - Wrap JSON extraction + `brandingSchema.parse(...)` in a nested `try/catch`.
   - On parse/validation failure, log:
     - `console.error("Failed to parse or validate Claude's JSON payload. Raw text received:", rawText);`
     - optionally include the caught error for stack/details.
   - Re-throw so the existing outer catch still refunds the credit and returns the clean error response.

No database or UI changes are needed for this fix.