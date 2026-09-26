# Cloudflare WAF Custom Rule Configuration

To prevent **Cloudflare Bot Fight Mode** from falsely challenging or blocking **BetterStack uptime pings** (`/api/health`) and to ensure **Googlebot / Bingbot** can index your site for Google for Jobs without interference, configure this single WAF Custom Rule in your Cloudflare dashboard (Free Tier includes 5 rules).

---

## Configuration Steps

1. Log into your **Cloudflare Dashboard** and select your domain (e.g. `nichehire.in`).
2. In the left sidebar, navigate to **Security** $\rightarrow$ **WAF** $\rightarrow$ **Custom rules**.
3. Click **Create rule**.
4. Configure the rule fields as follows:

- **Rule name**: `Allowlist BetterStack & Verified Search Crawlers`
- **Field expression** (Switch to "Edit expression" or use Expression Builder):
  ```text
  ((http.user_agent contains "BetterStack" or http.request.uri.path eq "/api/health") or (cf.client.bot and cf.bot_management.verified_bot))
  ```
- **Action**: `Skip`
- **WAF components to skip**:
  - ☑️ **All remaining Custom rules**
  - ☑️ **Rate limiting rules**
  - ☑️ **Managed rules (WAF)**
  - ☑️ **Bot Fight Mode (Super Bot Fight Mode / Bot Management)**

5. Click **Deploy**.

---

## Why this specific rule expression?

- `http.user_agent contains "BetterStack" or http.request.uri.path eq "/api/health"`: Guarantees your 60-second uptime pings never receive a 403 or JavaScript challenge, eliminating false "site is down" alerts.
- `cf.client.bot and cf.bot_management.verified_bot`: Specifically targets bots that Cloudflare has cryptographically and DNS-verified (e.g. Googlebot, Bingbot, LinkedIn bot). Unlike an open `cf.client.bot` rule, this **does not** create a loophole for spoofed or unknown web scrapers.
