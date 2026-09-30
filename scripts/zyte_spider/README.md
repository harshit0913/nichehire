# NicheHire Zyte Scrapy Cloud Integration

This directory contains the Python Scrapy spider configured to run on your **Zyte Scrapy Cloud** free unit (Organization: `1035910`).

## One-Command Deployment to Zyte Cloud

1. Install `shub` (Zyte's command-line tool):
   ```bash
   pip install shub
   ```

2. Log in using your Zyte API Key (`31d08cad20114510b15bac0c1e1439ca`):
   ```bash
   shub login
   ```

3. Deploy the spider directly to your free Scrapy Cloud container:
   ```bash
   shub deploy
   ```

4. Run or schedule the spider via Zyte dashboard or CLI:
   ```bash
   shub schedule career_portals
   ```
