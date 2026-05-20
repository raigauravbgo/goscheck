import FirecrawlApp from "firecrawl";

export interface CrawledPage {
  url: string;
  markdown: string;
  html?: string;
  title?: string;
  description?: string;
  statusCode?: number;
}

let client: FirecrawlApp | null = null;

function getClient(): FirecrawlApp {
  if (!client) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set");
    client = new FirecrawlApp({ apiKey });
  }
  return client;
}

// Common selectors for cookie-consent banners that otherwise leak into the
// markdown and get audited as if they were page content. Anchored on
// CookieYes (used by billgosling.com) plus the generic selectors most
// consent platforms use.
const COOKIE_BANNER_SELECTORS = [
  "#cky-consent",
  ".cky-consent-container",
  ".cky-modal",
  ".cky-overlay",
  ".cky-preference-center",
  ".cookieyes",
  "[id^='cky-']",
  "[class^='cky-']",
  "[id*='cookie-banner']",
  "[id*='cookie-consent']",
  "[class*='cookie-banner']",
  "[class*='cookie-consent']",
  "[class*='consent-banner']",
  "[aria-label*='cookie' i]",
];

const SCRAPE_DEFAULTS = {
  onlyMainContent: true,
  excludeTags: COOKIE_BANNER_SELECTORS,
  removeBase64Images: true,
};

export async function scrapePage(url: string): Promise<CrawledPage> {
  const app = getClient();
  const result = await app.scrapeUrl(url, { formats: ["markdown"], ...SCRAPE_DEFAULTS });
  if (!result.success) throw new Error(`Firecrawl scrape failed for ${url}`);
  return {
    url,
    markdown: (result as { markdown?: string }).markdown ?? "",
    title: (result as { metadata?: { title?: string } }).metadata?.title,
    description: (result as { metadata?: { description?: string } }).metadata?.description,
  };
}

export async function crawlSite(url: string, limit = 200): Promise<CrawledPage[]> {
  const app = getClient();

  console.log(`[firecrawl] Starting crawl of ${url} (limit: ${limit})`);

  const result = await app.crawlUrl(url, {
    limit,
    scrapeOptions: {
      formats: ["markdown", "html"],
      ...SCRAPE_DEFAULTS,
    },
  });

  if (!result.success) {
    throw new Error(`Firecrawl crawl failed for ${url}`);
  }

  const pages: CrawledPage[] = (result.data ?? [])
    .filter((doc) => doc.markdown && doc.metadata?.sourceURL)
    .map((doc) => ({
      url: doc.metadata!.sourceURL!,
      markdown: doc.markdown!,
      html: doc.html,
      title: doc.metadata?.title,
      description: doc.metadata?.description,
      statusCode: doc.metadata?.statusCode,
    }));

  console.log(`[firecrawl] Crawled ${pages.length} pages from ${url}`);
  return pages;
}
