import type { AdminClient } from "../lib/agent-interface";
import { AGENCY_USAGE_CAP } from "../lib/plan-config";

const IS_TEST = process.env.NODE_ENV !== "production";

export async function createSubscription(
  admin: AdminClient,
  input: {
    planName: string;
    price: number;
    returnUrl: string;
    trialDays?: number;
    isAgency?: boolean;
  },
) {
  const lineItems: unknown[] = [
    {
      plan: {
        appRecurringPricingDetails: {
          price: { amount: input.price, currencyCode: "USD" },
          interval: "EVERY_30_DAYS",
        },
      },
    },
  ];

  // Agency tier gets a usage-based line item for extra stores
  if (input.isAgency) {
    lineItems.push({
      plan: {
        appUsagePricingDetails: {
          cappedAmount: { amount: AGENCY_USAGE_CAP, currencyCode: "USD" },
          terms: "Additional stores beyond 5 included, at $29/store/month",
        },
      },
    });
  }

  const response = await admin.graphql(
    `mutation appSubscriptionCreate(
      $name: String!,
      $lineItems: [AppSubscriptionLineItemInput!]!,
      $returnUrl: URL!,
      $trialDays: Int,
      $test: Boolean
    ) {
      appSubscriptionCreate(
        name: $name
        lineItems: $lineItems
        returnUrl: $returnUrl
        trialDays: $trialDays
        test: $test
      ) {
        appSubscription {
          id
          status
          lineItems {
            id
          }
        }
        confirmationUrl
        userErrors { field message }
      }
    }`,
    {
      variables: {
        name: input.planName,
        lineItems,
        returnUrl: input.returnUrl,
        trialDays: input.trialDays ?? 0,
        test: IS_TEST,
      },
    },
  );

  const json = await response.json();
  const result = json.data?.appSubscriptionCreate;

  if (result?.userErrors?.length > 0) {
    throw new Error(
      result.userErrors.map((e: { message: string }) => e.message).join(", "),
    );
  }

  return {
    subscriptionId: result?.appSubscription?.id as string,
    confirmationUrl: result?.confirmationUrl as string,
    lineItemIds: (result?.appSubscription?.lineItems ?? []).map(
      (li: { id: string }) => li.id,
    ) as string[],
  };
}

export async function getSubscriptionStatus(
  admin: AdminClient,
  subscriptionId: string,
) {
  const response = await admin.graphql(
    `query getSubscription($id: ID!) {
      node(id: $id) {
        ... on AppSubscription {
          id
          status
          name
          createdAt
          currentPeriodEnd
          trialDays
        }
      }
    }`,
    { variables: { id: subscriptionId } },
  );

  const json = await response.json();
  return json.data?.node;
}

export async function cancelSubscription(
  admin: AdminClient,
  subscriptionId: string,
) {
  const response = await admin.graphql(
    `mutation cancelSubscription($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription { id status }
        userErrors { field message }
      }
    }`,
    { variables: { id: subscriptionId } },
  );

  const json = await response.json();
  return json.data?.appSubscriptionCancel;
}

export async function createUsageRecord(
  admin: AdminClient,
  subscriptionLineItemId: string,
  amount: number,
  description: string,
) {
  const response = await admin.graphql(
    `mutation usageRecordCreate(
      $subscriptionLineItemId: ID!,
      $price: MoneyInput!,
      $description: String!
    ) {
      appUsageRecordCreate(
        subscriptionLineItemId: $subscriptionLineItemId
        price: $price
        description: $description
      ) {
        appUsageRecord { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        subscriptionLineItemId,
        price: { amount, currencyCode: "USD" },
        description,
      },
    },
  );

  const json = await response.json();
  const result = json.data?.appUsageRecordCreate;
  if (result?.userErrors?.length > 0) {
    throw new Error(
      result.userErrors.map((e: { message: string }) => e.message).join(", "),
    );
  }
  return result?.appUsageRecord;
}
