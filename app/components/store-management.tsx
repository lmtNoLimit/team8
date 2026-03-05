import { useFetcher } from "react-router";

interface Store {
  id: string;
  managedShop: string;
  addedAt: string | Date;
}

interface StoreManagementProps {
  stores: Store[];
  maxIncluded: number;
}

export function StoreManagement({ stores, maxIncluded }: StoreManagementProps) {
  const addFetcher = useFetcher();
  const removeFetcher = useFetcher();
  const isAdding = addFetcher.state !== "idle";

  const extraCount = Math.max(0, stores.length - maxIncluded);
  const overIncluded = extraCount > 0;

  const addError = (addFetcher.data as { error?: string } | null)?.error;

  return (
    <s-stack direction="block" gap="base">
      <s-stack direction="inline" gap="small">
        <s-text>
          <strong>{stores.length} stores</strong>
        </s-text>
        <s-badge tone={overIncluded ? "warning" : "info"}>
          {overIncluded
            ? `${extraCount} extra ($${extraCount * 29}/mo)`
            : `${maxIncluded - stores.length} slots remaining`}
        </s-badge>
      </s-stack>

      {stores.map((store) => (
        <s-box key={store.id} padding="small" borderWidth="base" borderRadius="base">
          <s-stack direction="inline" gap="small">
            <s-text>{store.managedShop}</s-text>
            <s-button
              variant="secondary"
              onClick={() => {
                const fd = new FormData();
                fd.set("_action", "remove_store");
                fd.set("managedShop", store.managedShop);
                removeFetcher.submit(fd, { method: "post" });
              }}
            >
              Remove
            </s-button>
          </s-stack>
        </s-box>
      ))}

      <addFetcher.Form method="post">
        <input type="hidden" name="_action" value="add_store" />
        <s-stack direction="inline" gap="small">
          <s-text-field
            label="Add Store"
            name="managedShop"
            placeholder="store-name.myshopify.com"
          />
          <s-button
            variant="primary"
            type="submit"
            {...(isAdding ? { loading: true } : {})}
          >
            Add Store
          </s-button>
        </s-stack>
      </addFetcher.Form>

      {addError && (
        <s-banner tone="critical">{addError}</s-banner>
      )}
    </s-stack>
  );
}
