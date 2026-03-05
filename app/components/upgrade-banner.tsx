interface UpgradeBannerProps {
  reason: string;
  onDismiss?: () => void;
}

export function UpgradeBanner({ reason, onDismiss }: UpgradeBannerProps) {
  return (
    <s-banner tone="warning" onDismiss={onDismiss}>
      {reason}{" "}
      <s-link href="/app/upgrade">View upgrade options</s-link>
    </s-banner>
  );
}
