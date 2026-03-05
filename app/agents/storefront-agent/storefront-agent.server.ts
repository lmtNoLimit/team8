import type {
  Agent,
  AdminClient,
  AgentFindingInput,
} from "../../lib/agent-interface";
import { askClaudeJSON } from "../../lib/ai.server";

interface ProductData {
  id: string;
  title: string;
  handle: string;
  status: string;
  descriptionHtml: string;
  heroImageUrl: string | null;
  images: { url: string; altText: string | null; mediaId: string }[];
}

interface ClaudeCROAnalysis {
  findings: {
    type: "done" | "action_needed" | "insight";
    priority: number;
    title: string;
    description: string;
    recommendation: string;
    metadata: Record<string, unknown>;
  }[];
}

const PRODUCTS_QUERY = `
  query StorefrontAudit {
    products(first: 50, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        status
        descriptionHtml
        featuredMedia {
          preview { image { url altText } }
        }
        media(first: 10) {
          nodes {
            id
            mediaContentType
            preview { image { url altText } }
          }
        }
      }
    }
  }
`;

const MIN_DESCRIPTION_LENGTH = 50;

const SYSTEM_PROMPT = `You are a Shopify CRO (Conversion Rate Optimization) specialist. Analyze product catalog data and identify specific, actionable improvements that could increase conversions. Be specific — cite product names, exact numbers, and concrete recommendations. Focus on what a store owner can fix today.`;

/**
 * Storefront Agent -- Store Quality Monitoring
 * Fetches products from Shopify Admin API, runs mechanical quality checks,
 * and optionally uses Claude for CRO analysis.
 */
export const storefrontAgent: Agent = {
  agentId: "storefront",
  displayName: "Storefront QA",
  description: "Monitors live storefront quality, rendering, and UX issues",

  async run(shop: string, admin: AdminClient): Promise<AgentFindingInput[]> {
    const products = await fetchProducts(admin);
    const activeProducts = products.filter((p) => p.status === "ACTIVE");

    if (activeProducts.length === 0) {
      return [
        {
          type: "done",
          priority: 5,
          title: "No active products to audit",
          description:
            "No active products found in your store. Publish products to get storefront quality insights.",
          deduplicationKey: "storefront:no-products",
        },
      ];
    }

    const mechanicalFindings = runMechanicalChecks(activeProducts);

    let croFindings: AgentFindingInput[] = [];
    try {
      const analysis = await askClaudeJSON<ClaudeCROAnalysis>(
        buildCROPrompt(activeProducts),
        SYSTEM_PROMPT,
      );
      if (!Array.isArray(analysis.findings)) {
        throw new Error("Claude returned unexpected response shape");
      }
      croFindings = analysis.findings.map((f) => ({
        type: f.type as AgentFindingInput["type"],
        priority: Math.max(1, Math.min(5, f.priority)) as AgentFindingInput["priority"],
        title: f.title.slice(0, 80),
        description: `${f.description.slice(0, 200)}${f.recommendation ? `\n\nRecommendation: ${f.recommendation.slice(0, 200)}` : ""}`,
        metadata: f.metadata,
        deduplicationKey: `storefront:cro-${f.title.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`,
      }));
    } catch (error) {
      console.error("[StorefrontAgent] Claude API error, using fallback:", error);
      croFindings = [
        {
          type: "insight",
          priority: 3,
          title: "Connect Claude API for deeper CRO analysis",
          description:
            "Mechanical checks completed. Set ANTHROPIC_API_KEY for AI-powered conversion rate optimization insights.",
          deduplicationKey: "storefront:cro-api-needed",
        },
      ];
    }

    const score = calculateHealthScore(activeProducts);
    const imageIssues = mechanicalFindings.filter(
      (f) =>
        f.deduplicationKey?.startsWith("storefront:missing-image") ||
        f.deduplicationKey?.startsWith("storefront:missing-alt"),
    ).length;
    const contentIssues = mechanicalFindings.filter((f) =>
      f.deduplicationKey?.startsWith("storefront:thin-desc"),
    ).length;

    const scoreFinding: AgentFindingInput = {
      type: "done",
      priority: 4,
      title: `Store health score: ${score}/100`,
      description: `Audited ${activeProducts.length} active products. Found ${imageIssues} image issues and ${contentIssues} content issues.`,
      metadata: {
        score,
        totalProducts: activeProducts.length,
        imageIssues,
        contentIssues,
      },
      deduplicationKey: "storefront:health-score",
    };

    return [scoreFinding, ...mechanicalFindings, ...croFindings];
  },
};

async function fetchProducts(admin: AdminClient): Promise<ProductData[]> {
  const response = await admin.graphql(PRODUCTS_QUERY);
  const json = await response.json();

  if (json.errors) {
    console.error("[StorefrontAgent] GraphQL errors:", json.errors);
  }

  const nodes = json.data?.products?.nodes ?? [];

  return nodes.map((node: Record<string, unknown>) => {
    const featuredMedia = node.featuredMedia as Record<string, unknown> | null;
    const preview = featuredMedia?.preview as Record<string, unknown> | null;
    const heroImage = preview?.image as Record<string, unknown> | null;

    const mediaContainer = node.media as { nodes: Record<string, unknown>[] } | null;
    const mediaNodes = mediaContainer?.nodes ?? [];

    const images = mediaNodes
      .map((m: Record<string, unknown>) => {
        const mPreview = m.preview as Record<string, unknown> | null;
        const mImage = mPreview?.image as Record<string, unknown> | null;
        if (!mImage?.url) return null;
        return {
          url: mImage.url as string,
          altText: (mImage.altText as string | null) ?? null,
          mediaId: m.id as string,
        };
      })
      .filter(Boolean) as { url: string; altText: string | null; mediaId: string }[];

    return {
      id: node.id as string,
      title: node.title as string,
      handle: node.handle as string,
      status: node.status as string,
      descriptionHtml: (node.descriptionHtml as string) || "",
      heroImageUrl: (heroImage?.url as string) || null,
      images,
    };
  });
}

function adminProductUrl(gid: string): string {
  return `shopify:admin/products/${gid.split("/").pop()}`;
}

function runMechanicalChecks(products: ProductData[]): AgentFindingInput[] {
  const findings: AgentFindingInput[] = [];

  for (const product of products) {
    const truncTitle = product.title.length > 40
      ? product.title.slice(0, 37) + "..."
      : product.title;

    // Check: Missing hero image (manual fix only — can't auto-upload)
    if (!product.heroImageUrl) {
      findings.push({
        type: "action_needed",
        priority: 1,
        title: `'${truncTitle}' has no hero image`,
        description: `Products with a featured image get up to 2x more clicks. Go to this product in Shopify Admin and upload a high-quality hero image (recommended: 1024x1024px, white background).`,
        action: JSON.stringify({
          fixType: "manual_upload_image",
          productId: product.id,
          adminUrl: adminProductUrl(product.id),
        }),
        metadata: { handle: product.handle, productId: product.id },
        deduplicationKey: `storefront:missing-image-${product.handle}`,
        externalId: product.id,
      });
    }

    // Check: Missing alt text on any image (auto-fixable)
    const imagesWithoutAlt = product.images.filter((img) => !img.altText);
    if (imagesWithoutAlt.length > 0) {
      findings.push({
        type: "action_needed",
        priority: 3,
        title: `'${truncTitle}' has ${imagesWithoutAlt.length} images missing alt text`,
        description: `${imagesWithoutAlt.length} of ${product.images.length} images lack alt text. This hurts SEO ranking and accessibility (screen readers). Click "Apply Fix" to auto-generate descriptive alt text with AI.`,
        action: JSON.stringify({
          fixType: "generate_alt_text",
          productId: product.id,
          productTitle: product.title,
          adminUrl: adminProductUrl(product.id),
          images: imagesWithoutAlt.map((img) => ({ mediaId: img.mediaId, url: img.url })),
        }),
        metadata: {
          handle: product.handle,
          productId: product.id,
          totalImages: product.images.length,
          missingAlt: imagesWithoutAlt.length,
        },
        deduplicationKey: `storefront:missing-alt-${product.handle}`,
        externalId: product.id,
      });
    }

    // Check: Thin description (auto-fixable)
    const plainText = product.descriptionHtml.replace(/<[^>]*>/g, "").trim();
    if (plainText.length < MIN_DESCRIPTION_LENGTH) {
      findings.push({
        type: "action_needed",
        priority: 2,
        title: `'${truncTitle}' has a thin description (${plainText.length} chars)`,
        description: `Only ${plainText.length} chars — Google recommends 150+ for SEO. Short descriptions reduce buyer confidence and search visibility. Click "Apply Fix" to generate a rich, SEO-optimized description with AI.`,
        action: JSON.stringify({
          fixType: "improve_description",
          productId: product.id,
          productTitle: product.title,
          currentDescription: plainText,
          handle: product.handle,
          adminUrl: adminProductUrl(product.id),
        }),
        metadata: {
          handle: product.handle,
          productId: product.id,
          descriptionLength: plainText.length,
        },
        deduplicationKey: `storefront:thin-desc-${product.handle}`,
        externalId: product.id,
      });
    }
  }

  return findings;
}

function buildCROPrompt(products: ProductData[]): string {
  const summaries = products
    .map((p) => {
      const plainDesc = p.descriptionHtml.replace(/<[^>]*>/g, "").trim();
      return `- ${p.title} (handle: ${p.handle}): ${plainDesc.length} char description, ${p.images.length} images, alt text on ${p.images.filter((i) => i.altText).length}/${p.images.length} images`;
    })
    .join("\n");

  return `Analyze this product catalog for CRO improvements. Return 3-5 specific findings as JSON.

PRODUCT DATA:
${summaries}

Return JSON in this exact format:
{
  "findings": [
    {
      "type": "action_needed" | "insight" | "done",
      "priority": 1-5,
      "title": "short headline under 80 chars",
      "description": "what the problem is, with specific product names and numbers",
      "recommendation": "exact step-by-step action the merchant should take to fix this",
      "metadata": { "products": ["handle1"], "theme": "..." }
    }
  ]
}

Rules:
- "action_needed": concrete issues hurting conversions (priority 1-2). Always include a specific fix in recommendation.
- "insight": patterns or opportunities (priority 2-3). Include specific suggestions in recommendation.
- "done": things that look good (priority 4-5). Explain why it's good in recommendation.
- Be specific: name products, cite numbers, give exact recommendations
- Every finding MUST have a concrete "recommendation" with actionable steps
- Focus on: product titles (SEO keywords), description quality, image coverage, pricing presentation, collection organization`;
}

function calculateHealthScore(
  products: ProductData[],
): number {
  let score = 100;

  for (const product of products) {
    if (!product.heroImageUrl) score -= 5;
    if (product.images.some((img) => !img.altText)) score -= 2;
    const plainText = product.descriptionHtml.replace(/<[^>]*>/g, "").trim();
    if (plainText.length < MIN_DESCRIPTION_LENGTH) score -= 3;
  }

  // Normalize per product count to keep score meaningful for large catalogs
  const maxDeduction = products.length * 10;
  const actualDeduction = 100 - score;
  const normalizedScore =
    maxDeduction > 0
      ? 100 - Math.round((actualDeduction / maxDeduction) * 100)
      : 100;

  return Math.max(0, normalizedScore);
}
