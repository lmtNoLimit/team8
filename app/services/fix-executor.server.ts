import type { AdminClient } from "../lib/agent-interface";
import { askClaude } from "../lib/ai.server";

interface FixResult {
  success: boolean;
  fixType: string;
  message: string;
  changes?: Record<string, unknown>;
}

const FILE_UPDATE_MUTATION = `
  mutation UpdateAltText($files: [FileUpdateInput!]!) {
    fileUpdate(files: $files) {
      files { id alt }
      userErrors { field message code }
    }
  }
`;

const PRODUCT_UPDATE_MUTATION = `
  mutation UpdateDescription($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id descriptionHtml }
      userErrors { field message }
    }
  }
`;

export async function executeFix(
  actionData: Record<string, unknown>,
  admin: AdminClient,
): Promise<FixResult> {
  const fixType = actionData.fixType as string;

  switch (fixType) {
    case "generate_alt_text":
      return executeAltTextFix(actionData, admin);
    case "improve_description":
      return executeDescriptionFix(actionData, admin);
    case "manual_upload_image":
      return {
        success: false,
        fixType,
        message: "Image upload requires manual action in Shopify Admin.",
      };
    default:
      return {
        success: false,
        fixType: fixType ?? "unknown",
        message: `Unknown fix type: ${fixType}`,
      };
  }
}

async function executeAltTextFix(
  actionData: Record<string, unknown>,
  admin: AdminClient,
): Promise<FixResult> {
  const productTitle = actionData.productTitle as string;
  const images = actionData.images as { mediaId: string; url: string }[];

  if (!images || images.length === 0) {
    return { success: false, fixType: "generate_alt_text", message: "No images to fix." };
  }

  const fileUpdates: { id: string; alt: string }[] = [];

  for (const img of images) {
    const altText = await askClaude(
      `Write concise alt text (under 125 chars) for a product image. Product: "${productTitle}". Image URL: ${img.url}. Return only the alt text, no quotes or explanation.`,
    );
    fileUpdates.push({ id: img.mediaId, alt: altText.trim().slice(0, 125) });
  }

  const response = await admin.graphql(FILE_UPDATE_MUTATION, {
    variables: { files: fileUpdates },
  });
  const json = await response.json();
  const userErrors = json.data?.fileUpdate?.userErrors ?? [];

  if (userErrors.length > 0) {
    return {
      success: false,
      fixType: "generate_alt_text",
      message: `Shopify error: ${userErrors.map((e: { message: string }) => e.message).join(", ")}`,
    };
  }

  return {
    success: true,
    fixType: "generate_alt_text",
    message: `Generated alt text for ${fileUpdates.length} image(s).`,
    changes: { altTexts: fileUpdates },
  };
}

async function executeDescriptionFix(
  actionData: Record<string, unknown>,
  admin: AdminClient,
): Promise<FixResult> {
  const productId = actionData.productId as string;
  const productTitle = actionData.productTitle as string;
  const currentDescription = actionData.currentDescription as string;

  const newDescription = await askClaude(
    `Write a compelling Shopify product description (100-200 words, HTML with <p> tags). Product: "${productTitle}". Current description: "${currentDescription}". Return only the HTML, no explanation.`,
  );

  const response = await admin.graphql(PRODUCT_UPDATE_MUTATION, {
    variables: {
      product: { id: productId, descriptionHtml: newDescription.trim() },
    },
  });
  const json = await response.json();
  const userErrors = json.data?.productUpdate?.userErrors ?? [];

  if (userErrors.length > 0) {
    return {
      success: false,
      fixType: "improve_description",
      message: `Shopify error: ${userErrors.map((e: { message: string }) => e.message).join(", ")}`,
    };
  }

  return {
    success: true,
    fixType: "improve_description",
    message: `Updated product description for "${productTitle}".`,
    changes: { descriptionHtml: newDescription.trim() },
  };
}
