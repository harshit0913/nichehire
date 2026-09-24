import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url, id, company } = await req.json();

    // 1. LinkedIn Job Enrichment via Public Guest API
    const linkedInIdMatch = (url || '').match(/jobs\/view\/.*?(\d{7,})/i) || (id || '').match(/(\d{7,})/);
    if (linkedInIdMatch || (url && url.includes('linkedin.com'))) {
      const jobId = linkedInIdMatch ? linkedInIdMatch[1] : id?.replace(/\D/g, '');
      if (jobId) {
        try {
          const gUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
          const res = await fetch(gUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          });
          if (res.ok) {
            const html = await res.text();
            const descMatch = html.match(/show-more-less-html__markup[\s\S]*?>([\s\S]*?)<\/div>/i);
            const appMatch =
              html.match(/class="[^"]*num-applicants[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ||
              html.match(/([\d,]+)\s+(?:people clicked apply|applicants)/i);

            if (descMatch) {
              const cleanDesc = descMatch[1]
                .replace(/<br\s*[\/]?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<li>/gi, '• ')
                .replace(/<\/li>/gi, '\n')
                .replace(/<[^>]*>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&nbsp;/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

              const applicantText = appMatch
                ? appMatch[0].replace(/<[^>]*>/g, '').replace(/class="[^"]*"/g, '').replace(/\s+/g, ' ').trim()
                : undefined;

              return NextResponse.json({
                description: cleanDesc,
                applicantText,
              });
            }
          }
        } catch {
          // Fall through to other handlers
        }
      }
    }

    // 2. Yash Technologies Portal Scraper
    if (url && url.includes('careers.yash.com')) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (res.ok) {
          const html = await res.text();
          const idx = html.indexOf('jobdescription');
          if (idx !== -1) {
            const chunk = html.slice(idx, idx + 6000);
            const cleanDesc = chunk
              .replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<\/p>/gi, '\n\n')
              .replace(/<li>/gi, '• ')
              .replace(/<\/li>/gi, '\n')
              .replace(/<[^>]*>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&nbsp;/g, ' ')
              .replace(/\n{3,}/g, '\n\n')
              .trim();

            return NextResponse.json({ description: cleanDesc });
          }
        }
      } catch {
        // Fall through
      }
    }

    // 3. General URL Scraping Fallback
    if (url && url.startsWith('http')) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (res.ok) {
          const html = await res.text();
          const descMatch =
            html.match(/class="[^"]*(?:job-description|jobDescription|description|job-details)[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
            html.match(/itemprop="description"[^>]*>([\s\S]*?)<\/div>/i);
          if (descMatch) {
            const cleanDesc = descMatch[1]
              .replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<\/p>/gi, '\n\n')
              .replace(/<li>/gi, '• ')
              .replace(/<\/li>/gi, '\n')
              .replace(/<[^>]*>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&nbsp;/g, ' ')
              .trim();
            if (cleanDesc.length > 100) {
              return NextResponse.json({ description: cleanDesc });
            }
          }
        }
      } catch {
        // Fall through
      }
    }

    return NextResponse.json({ error: 'Detail not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch details' }, { status: 500 });
  }
}
