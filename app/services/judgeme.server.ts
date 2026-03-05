import prisma from "../db.server";

const JUDGEME_BASE = "https://judge.me/api/v1";

interface JudgeMeReview {
  id: number;
  title: string | null;
  body: string;
  rating: number;
  product_external_id: string;
  product_title: string;
  reviewer: { name: string } | null;
  verified: string;
  source: string;
  created_at: string;
  updated_at: string;
}

interface JudgeMeWebhook {
  id: number;
  key: string;
  url: string;
  failure_count: number;
}

function buildUrl(path: string, apiToken: string, shopDomain: string, extraParams?: Record<string, string>): string {
  const url = new URL(`${JUDGEME_BASE}${path}`);
  url.searchParams.set("api_token", apiToken);
  url.searchParams.set("shop_domain", shopDomain);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

function authHeaders(apiToken: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

/** Validate API token by fetching review count */
export async function validateToken(apiToken: string, shopDomain: string): Promise<boolean> {
  try {
    const url = buildUrl("/reviews/count", apiToken, shopDomain);
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

/** Fetch all reviews with pagination */
export async function fetchAllReviews(apiToken: string, shopDomain: string): Promise<JudgeMeReview[]> {
  const allReviews: JudgeMeReview[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = buildUrl("/reviews", apiToken, shopDomain, {
      page: String(page),
      per_page: String(perPage),
    });
    const res = await fetch(url, { headers: authHeaders(apiToken) });
    if (!res.ok) {
      console.error(`[Judge.me] Failed to fetch reviews: ${res.status} ${res.statusText}`);
      break;
    }

    const data = await res.json();
    if (page === 1) {
      console.log(`[Judge.me] API response keys: ${Object.keys(data).join(", ")}`);
      console.log(`[Judge.me] First page raw count: ${Array.isArray(data.reviews) ? data.reviews.length : "not an array"}`);
    }
    const reviews: JudgeMeReview[] = data.reviews ?? [];
    if (reviews.length === 0) break;

    allReviews.push(...reviews);
    if (reviews.length < perPage) break;
    page++;
  }

  return allReviews;
}

/** Register webhooks for review/created and review/updated */
export async function registerWebhooks(
  apiToken: string,
  shopDomain: string,
  callbackUrl: string,
): Promise<string[]> {
  const webhookIds: string[] = [];

  for (const key of ["review/created", "review/updated"]) {
    const url = buildUrl("/webhooks", apiToken, shopDomain);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhook: { key, url: callbackUrl } }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.webhook?.id) webhookIds.push(String(data.webhook.id));
    }
  }

  return webhookIds;
}

/** Remove registered webhooks */
export async function removeWebhooks(
  apiToken: string,
  shopDomain: string,
  callbackUrl: string,
): Promise<void> {
  for (const key of ["review/created", "review/updated"]) {
    const url = buildUrl("/webhooks", apiToken, shopDomain);
    await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, url: callbackUrl }),
    }).catch(() => {});
  }
}

/** Convert a Judge.me review to our DB shape */
export function mapReviewToDb(review: JudgeMeReview, shop: string) {
  return {
    shop,
    productId: String(review.product_external_id || "unknown"),
    productTitle: review.product_title || "Unknown Product",
    source: "judgeme" as const,
    externalId: String(review.id),
    author: review.reviewer?.name || "Anonymous",
    rating: Math.max(1, Math.min(5, review.rating)),
    title: review.title || null,
    body: review.body || "",
    verified: review.verified === "buyer",
    reviewDate: new Date(review.created_at),
  };
}

/** Bulk upsert reviews into DB */
export async function syncReviewsToDb(reviews: JudgeMeReview[], shop: string): Promise<number> {
  let count = 0;
  for (const review of reviews) {
    const dbData = mapReviewToDb(review, shop);
    await prisma.review.upsert({
      where: {
        shop_source_externalId: {
          shop,
          source: "judgeme",
          externalId: dbData.externalId!,
        },
      },
      update: {
        rating: dbData.rating,
        title: dbData.title,
        body: dbData.body,
        verified: dbData.verified,
        productTitle: dbData.productTitle,
        author: dbData.author,
      },
      create: dbData,
    });
    count++;
  }
  return count;
}
