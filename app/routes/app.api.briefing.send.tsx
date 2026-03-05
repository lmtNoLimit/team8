import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { getFindings } from "../services/finding-storage.server";
import { getStoreProfile } from "../services/store-profile.server";
import { generateBriefing } from "../services/briefing.server";
import { sendBriefingEmail } from "../services/email-briefing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [profile, findings] = await Promise.all([
    getStoreProfile(shop),
    getFindings(shop, { status: "pending" }),
  ]);

  if (!profile.briefingEnabled || !profile.briefingEmail) {
    return data(
      { success: false, reason: "Email briefing not configured" },
      { status: 400 },
    );
  }

  const briefing = await generateBriefing(
    findings,
    profile.storeName || undefined,
  );

  const appUrl = `https://admin.shopify.com/store/${shop.replace(".myshopify.com", "")}/apps/${process.env.SHOPIFY_API_KEY}`;

  try {
    await sendBriefingEmail(profile.briefingEmail, briefing, appUrl);
    return data({ success: true, sentTo: profile.briefingEmail });
  } catch (error) {
    console.error("[BriefingEmail] Failed to send:", error);
    return data(
      { success: false, reason: (error as Error).message },
      { status: 500 },
    );
  }
};
