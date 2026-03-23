# Content Security Policy v3 Headers

https://csp-evaluator.withgoogle.com/

If using CloudFlare, add this on the `Rules > Overview > Response Header Transform Rules`

**Header Name**

```
Content-Security-Policy
```

**Header Value (Convert to single line)**

```
frame-ancestors 'none';
upgrade-insecure-requests;
```

Other CSP directives are enforced on `svelte.config.ts`

```ts
const config = {
    kit: {
        csp: {
            // Implemented here
        },
    },
}
```
