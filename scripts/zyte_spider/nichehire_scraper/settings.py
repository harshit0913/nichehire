BOT_NAME = "nichehire_scraper"

SPIDER_MODULES = ["nichehire_scraper.spiders"]
NEWSPIDER_MODULE = "nichehire_scraper.spiders"

ROBOTSTXT_OBEY = True

# Sensible defaults for ethical, high-speed job scraping
CONCURRENT_REQUESTS = 8
DOWNLOAD_DELAY = 1.0

USER_AGENT = "NicheHire-Crawler (+https://www.nichehire.tech)"

# Output encoding
FEED_EXPORT_ENCODING = "utf-8"
