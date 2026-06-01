# Security Headers

| Reference                                                                     | Input        | CSP depth | Other headers    | Notes                            |
| ----------------------------------------------------------------------------- | ------------ | --------- | ---------------- | -------------------------------- |
| [securityheaders.com](https://securityheaders.com) (Snyk)                     | URL          | Basic     | Yes — full grade | Target rating: **A+**            |
| [observatory.mozilla.org](https://observatory.mozilla.org) (Mozilla)          | URL          | Deep      | Yes              | Good for automated/CI checks     |
| [csp-evaluator.withgoogle.com](https://csp-evaluator.withgoogle.com) (Google) | Manual paste | Deepest   | No               | Use to debug specific directives |
| [webhint.io](https://webhint.io)                                              | URL          | Moderate  | Yes              | General web quality tool         |

---

## Required Headers

If using Cloudflare, add these under `Rules > Overview > Response Header Transform Rules`.

> **Tip — Cloudflare Managed Transforms:** Under `Rules > Transform Rules > Managed Transforms`, enable the **"Add security headers"** toggle. This automatically injects the headers marked with ✦ below (using Cloudflare's default values). You only need to manually add the remaining headers, or override a ✦ header's value if the default differs from what is listed here.

| Header                      | Value                                                                              | Notes                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | `frame-ancestors 'none'; upgrade-insecure-requests;`                               | Other directives enforced in `svelte.config.ts` (see below). Convert to single line.                                                                                                                     |
| `Strict-Transport-Security` | `max-age=2592000; includeSubDomains`                                               | Enforces HTTPS for 30 days across all subdomains. Start here to avoid lockout — increase to `max-age=31536000` and add `preload` only after confirming HTTPS works correctly on all subdomains.          |
| `X-Frame-Options` ✦         | `DENY`                                                                             | Managed Transform default is `SAMEORIGIN` — override to `DENY` since this app never renders in a frame. Redundant with CSP `frame-ancestors 'none'` but required by some scanners for an explicit grade. |
| `X-Content-Type-Options` ✦  | `nosniff`                                                                          | Prevents MIME-type sniffing. Managed Transform sets this correctly; no override needed.                                                                                                                  |
| `Referrer-Policy` ✦         | `strict-origin-when-cross-origin`                                                  | Sends full path on same-origin, only origin on cross-origin HTTPS, nothing on downgrade. Managed Transform sets this correctly; no override needed.                                                      |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | Disables browser features not used by the app. Adjust per feature requirements.                                                                                                                          |
| `X-XSS-Protection` ✦        | `0`                                                                                | Modern browsers ignore this; set to `0` to avoid conflicting with CSP. Managed Transform sets `0`; no override needed.                                                                                   |

---

## Note on Content Security Policy

The `Content-Security-Policy` header above only carries the directives that must be set at the edge (Cloudflare). The remaining CSP directives — `script-src`, `style-src`, `img-src`, `connect-src`, `font-src`, `object-src`, `base-uri`, `form-action`, etc. — are enforced at build time via SvelteKit's built-in CSP support in `svelte.config.ts`:

```ts
const config = {
    kit: {
        csp: {
            // Remaining CSP directives implemented here
        },
    },
}
```

The two sets of directives are merged by the browser into a single effective policy.
