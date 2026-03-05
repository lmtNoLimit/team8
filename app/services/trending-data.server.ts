export interface TrendingTopic {
  title: string;
  trafficVolume: string;
  source: string;
}

const GOOGLE_TRENDS_RSS_URL = "https://trends.google.com/trending/rss";

/**
 * Fetch real trending topics from Google Trends daily trends RSS feed.
 * Returns up to `limit` topics sorted by traffic volume.
 */
export async function fetchGoogleTrends(
  geo = "US",
  limit = 20,
): Promise<TrendingTopic[]> {
  const url = `${GOOGLE_TRENDS_RSS_URL}?geo=${encodeURIComponent(geo)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ShopifyApp/1.0; +https://shopify.dev)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Google Trends RSS returned ${response.status}`);
  }

  const xml = await response.text();
  return parseRssItems(xml).slice(0, limit);
}

function parseRssItems(xml: string): TrendingTopic[] {
  const topics: TrendingTopic[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTagContent(block, "title");
    const traffic = extractTagContent(block, "ht:approx_traffic");

    if (title) {
      topics.push({
        title,
        trafficVolume: traffic || "N/A",
        source: "google_trends",
      });
    }
  }

  return topics;
}

/** Extract text content from an XML tag, handling CDATA sections. */
function extractTagContent(xml: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<${escaped}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${escaped}>`,
  );
  const m = regex.exec(xml);
  if (!m) return null;
  return (m[1] ?? m[2] ?? "").trim() || null;
}

/**
 * Fetch trending topics with graceful fallback.
 * Tries Google Trends first; returns empty array on failure so the caller
 * can decide how to handle it.
 */
export async function fetchTrendingTopics(
  geo = "US",
): Promise<TrendingTopic[]> {
  try {
    return await fetchGoogleTrends(geo);
  } catch (error) {
    console.error("[TrendingData] Google Trends fetch failed:", error);
    return [];
  }
}
