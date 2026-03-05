import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../../lib/agent-interface";
import { askClaudeJSON } from "../../lib/ai.server";
import prisma from "../../db.server";

interface ReviewGroup {
  productId: string;
  productTitle: string;
  reviewCount: number;
  avgRating: number;
  reviews: { author: string; rating: number; title: string; body: string }[];
}

interface ClaudeAnalysis {
  findings: {
    type: "done" | "action_needed" | "insight";
    priority: number;
    title: string;
    description: string;
    metadata: Record<string, unknown>;
  }[];
}

/**
 * Review Insights Agent
 * Reads product reviews from DB, sends to Claude for sentiment analysis,
 * and returns actionable findings about complaints, praise themes, and keyword mismatches.
 */
export const reviewAgent: Agent = {
  agentId: "review",
  displayName: "Review Analyst",
  description:
    "Analyzes customer reviews for sentiment patterns, complaints, and keyword insights",

  async run(shop: string, _admin: AdminClient): Promise<AgentFindingInput[]> {
    const reviews = await prisma.review.findMany({
      where: { shop },
      orderBy: { reviewDate: "desc" },
    });

    if (reviews.length === 0) {
      return [
        {
          type: "done",
          priority: 5,
          title: "No reviews to analyze",
          description:
            "No product reviews found for this shop. Seed reviews or connect a review source to get insights.",
          deduplicationKey: "review:no-reviews",
        },
      ];
    }

    // Group reviews by product
    const grouped = new Map<string, ReviewGroup>();
    for (const r of reviews) {
      const existing = grouped.get(r.productId);
      if (existing) {
        existing.reviews.push({
          author: r.author || "Anonymous",
          rating: r.rating,
          title: r.title || "",
          body: r.body,
        });
        existing.reviewCount++;
        existing.avgRating =
          existing.reviews.reduce((sum, rev) => sum + rev.rating, 0) /
          existing.reviewCount;
      } else {
        grouped.set(r.productId, {
          productId: r.productId,
          productTitle: r.productTitle,
          reviewCount: 1,
          avgRating: r.rating,
          reviews: [
            {
              author: r.author || "Anonymous",
              rating: r.rating,
              title: r.title || "",
              body: r.body,
            },
          ],
        });
      }
    }

    const productSummaries = Array.from(grouped.values()).map((g) => ({
      productId: g.productId,
      productTitle: g.productTitle,
      reviewCount: g.reviewCount,
      avgRating: Math.round(g.avgRating * 10) / 10,
      reviews: g.reviews,
    }));

    try {
      const analysis = await askClaudeJSON<ClaudeAnalysis>(
        buildPrompt(productSummaries),
        SYSTEM_PROMPT,
      );

      return analysis.findings.map((f) => ({
        type: f.type as AgentFindingInput["type"],
        priority: Math.max(1, Math.min(5, f.priority)) as AgentFindingInput["priority"],
        title: f.title.slice(0, 80),
        description: f.description.slice(0, 300),
        metadata: f.metadata,
        deduplicationKey: `review:${f.type}-${f.title.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`,
      }));
    } catch (error) {
      console.error("[ReviewAgent] Claude API error, using fallback:", error);
      return buildFallbackFindings(productSummaries);
    }
  },
};

const SYSTEM_PROMPT = `You are a review analyst for a Shopify store. You analyze customer reviews to find actionable insights for the store owner. Be specific, cite numbers, and focus on patterns that affect sales and customer satisfaction.`;

function buildPrompt(
  products: {
    productId: string;
    productTitle: string;
    reviewCount: number;
    avgRating: number;
    reviews: { author: string; rating: number; title: string; body: string }[];
  }[],
): string {
  const reviewData = products
    .map(
      (p) =>
        `## ${p.productTitle} (${p.reviewCount} reviews, avg ${p.avgRating}/5)\n` +
        p.reviews
          .map(
            (r) =>
              `- [${r.rating}/5] "${r.title}" by ${r.author}: ${r.body}`,
          )
          .join("\n"),
    )
    .join("\n\n");

  return `Analyze these product reviews and return exactly 4-6 findings as JSON.

For each finding, determine:
- Recurring complaints (group by theme: sizing, durability, packaging, etc.)
- Positive patterns worth highlighting in marketing
- Keyword mismatches: words customers consistently use that differ from the product title/description
- Overall sentiment shifts or concerning trends

Return JSON in this exact format:
{
  "findings": [
    {
      "type": "action_needed" | "insight" | "done",
      "priority": 1-5,
      "title": "short headline under 80 chars",
      "description": "detailed explanation under 300 chars with specific numbers",
      "metadata": { "productId": "...", "theme": "...", "mentionCount": N, "sentiment": "positive|negative|mixed" }
    }
  ]
}

Rules:
- "action_needed": issues hurting sales that the store owner should fix (priority 1-2)
- "insight": interesting patterns the owner should know about (priority 2-3)
- "done": positive confirmations, things going well (priority 4-5)
- Include at least one of each type
- Be specific: cite review counts, percentages, exact customer words
- For keyword mismatches: note what customers say vs what the product page says

REVIEWS DATA:
${reviewData}`;
}

/** Fallback findings when Claude API is unavailable */
function buildFallbackFindings(
  products: {
    productId: string;
    productTitle: string;
    reviewCount: number;
    avgRating: number;
    reviews: { author: string; rating: number; title: string; body: string }[];
  }[],
): AgentFindingInput[] {
  const findings: AgentFindingInput[] = [];

  // Find lowest-rated product
  const sorted = [...products].sort((a, b) => a.avgRating - b.avgRating);
  if (sorted.length > 0) {
    const worst = sorted[0];
    findings.push({
      type: "action_needed",
      priority: 2,
      title: `'${worst.productTitle}' has lowest rating (${worst.avgRating}/5)`,
      description: `This product has ${worst.reviewCount} reviews averaging ${worst.avgRating}/5. Check reviews for recurring complaints and address them.`,
      metadata: {
        productId: worst.productId,
        avgRating: worst.avgRating,
        reviewCount: worst.reviewCount,
      },
      deduplicationKey: "review:lowest-rated",
    });
  }

  // Total review summary
  const totalReviews = products.reduce((sum, p) => sum + p.reviewCount, 0);
  const overallAvg =
    Math.round(
      (products.reduce((sum, p) => sum + p.avgRating * p.reviewCount, 0) /
        totalReviews) *
        10,
    ) / 10;

  findings.push({
    type: "done",
    priority: 4,
    title: `Analyzed ${totalReviews} reviews across ${products.length} products`,
    description: `Overall average rating: ${overallAvg}/5. Review analysis completed successfully.`,
    metadata: { totalReviews, productCount: products.length, overallAvg },
    deduplicationKey: "review:analysis-complete",
  });

  findings.push({
    type: "insight",
    priority: 3,
    title: `${products.length} products have customer reviews to analyze`,
    description: `Connect Claude API for deeper sentiment analysis, keyword mismatch detection, and complaint pattern grouping.`,
    metadata: { productCount: products.length },
    deduplicationKey: "review:api-needed",
  });

  return findings;
}
