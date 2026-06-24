## Goal

Make every tenant subdomain (e.g. `alluringdolls.procschedule.com`) load over HTTPS by putting Cloudflare in front of `procschedule.com` with a wildcard certificate. This is configuration work in the Cloudflare and Lovable dashboards — no further code changes are required (the `WILDCARD_SUBDOMAINS_LIVE` flag is already wired and tests pass).

---

## Part 1 — Add the domain to Cloudflare

1. Create a free Cloudflare account at dash.cloudflare.com (skip if you already have one).
2. Click **Add a site**, enter `procschedule.com`, and pick the **Free** plan.
3. Cloudflare scans your existing DNS records. Review the imported list — make sure your `@`, `www`, and any email (MX/TXT/SPF/DKIM/DMARC) records came across. Add any that are missing.
4. Cloudflare gives you **two nameservers** (e.g. `xxx.ns.cloudflare.com`). Log in to your current domain registrar (where you bought procschedule.com) and **replace the existing nameservers** with Cloudflare's two. This is the step that hands DNS control to Cloudflare.
5. Wait for Cloudflare to show the zone as **Active** (usually 5 min–a few hours).

---

## Part 2 — DNS records for the wildcard

In Cloudflare → **DNS → Records**, make sure these exist, all **Proxied** (orange cloud ON):

```text
Type   Name   Content            Proxy
A      @      185.158.133.1      Proxied
A      www    185.158.133.1      Proxied
A      *      185.158.133.1      Proxied   <- the wildcard, this is the new one
```

The `*` record is what makes `anything.procschedule.com` resolve. The orange-cloud proxy is what lets Cloudflare terminate SSL for it.

---

## Part 3 — SSL/TLS settings

1. Cloudflare → **SSL/TLS → Overview**: set encryption mode to **Full** (not Flexible, not Full Strict).
2. Cloudflare → **SSL/TLS → Edge Certificates**: enable **Total TLS**. This auto-issues certificates that cover wildcard hostnames like `*.procschedule.com`, which the default universal cert does not.
3. (Optional but recommended) enable **Always Use HTTPS** on the same page.

---

## Part 4 — Reconnect the domain in Lovable (proxy mode)

Because traffic now flows through Cloudflare's proxy, Lovable needs to verify via CNAME instead of A record:

1. Lovable → **Project Settings → Domains**.
2. If `procschedule.com` / `www.procschedule.com` are connected in non-proxy mode, reconnect them: **Connect Domain → expand Advanced → check "Domain uses Cloudflare or a similar proxy."**
3. Follow the CNAME-based verification it shows.

---

## Part 5 — Verify before going live

1. Test a tenant subdomain handshake from your machine:

```text
curl -I https://alluringdolls.procschedule.com
```

   Success = a normal HTTP response header block. Failure = `ssl/tls alert handshake failure` or connection reset — means the cert isn't ready yet (give Total TLS time, recheck the `*` record is proxied).
2. Also open `https://alluringdolls.procschedule.com` in a browser and confirm the padlock + the storefront load.

---

## Part 6 — Publish the app

The code flag that emits `<slug>.procschedule.com` links is already on. **Only after Part 5 passes**, click Publish so the live app starts handing out subdomain links. Publishing earlier would make every client link fail the same way the current SSL error does.

---

### Notes / gotchas

- If you have **CAA records**, make sure they allow `letsencrypt.org` and/or `pki.goog` (Cloudflare's CAs) or cert issuance silently fails.
- Email DNS (MX/SPF/DKIM/DMARC) must remain in Cloudflare's DNS after the nameserver switch, or transactional/auth email breaks.
- Nameserver changes can take up to 24–72h to fully propagate, though it's usually much faster.

No code changes are part of this plan — it's dashboard configuration. I can help verify the handshake or audit any remaining hardcoded URLs once Cloudflare is live.