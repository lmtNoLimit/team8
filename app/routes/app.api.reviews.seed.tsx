import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { seedReviews, clearReviews } from "../agents/review-agent/review.seed";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Clear existing seed reviews first, then re-seed
  const deleted = await clearReviews(shop);
  const seeded = await seedReviews(shop);

  return data({
    success: true,
    deleted,
    seeded,
    message: `Cleared ${deleted} old reviews, seeded ${seeded} new reviews for ${shop}`,
  });
};
