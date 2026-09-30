from setuptools import setup, find_packages

setup(
    name='nichehire_scraper',
    version='1.0',
    packages=find_packages(),
    entry_points={'scrapy': ['settings = nichehire_scraper.settings']},
)
