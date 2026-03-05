import type { ActionFunctionArgs } from "react-router";
import prisma from "../db.server";
import { mapReviewToDb } from "../services/judgeme.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const payload = await request.json();

  const review = payload;
  if (!review || !review.id) {
    return new Response("Invalid payload", { status: 400 });
  }

  const shopDomain = review.shop_domain;
  if (!shopDomain) {
    return new Response("Missing shop_domain", { status: 400 });
  }

  const config = await prisma.reviewSyncConfig.findFirst({
    where: { shop: shopDomain, status: "active" },
  });
  if (!config) {
    return new Response("No active sync config", { status: 404 });
  }

  const dbData = mapReviewToDb(review, shopDomain);
  await prisma.review.upsert({
    where: {
      shop_source_externalId: {
        shop: shopDomain,
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

  const count = await prisma.review.count({ where: { shop: shopDomain } });
  await prisma.reviewSyncConfig.update({
    where: { shop: shopDomain },
    data: { reviewCount: count, lastSyncedAt: new Date() },
  });

  return new Response("OK", { status: 200 });
};
