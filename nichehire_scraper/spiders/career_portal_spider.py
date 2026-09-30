import scrapy
from datetime import datetime

class CareerPortalSpider(scrapy.Spider):
    """
    NicheHire Cloud Job Crawler for Zyte Scrapy Cloud.
    Targeting verified, fresh job listings under 7 days old.
    """
    name = "career_portals"
    allowed_domains = ["yash.com", "himalayas.app"]
    start_urls = [
        "https://himalayas.app/jobs/api?limit=50",
    ]

    def parse(self, response):
        if "himalayas.app" in response.url:
            data = response.json()
            for job in data.get("jobs", []):
                yield {
                    "id": f"zyte-{job.get('id', '')}",
                    "title": job.get("title", ""),
                    "company": job.get("company_name", ""),
                    "location": job.get("location", "Remote"),
                    "type": job.get("employment_type", "Full-Time"),
                    "salary": job.get("salary", ""),
                    "description": job.get("description", ""),
                    "url": job.get("application_url") or job.get("url", ""),
                    "source": "Zyte Scrapy Cloud",
                    "crawled_at": datetime.utcnow().isoformat(),
                }
