interface ErrorStateProps {
  code: string;
  message: string;
  onRetry: () => void;
  showEdit?: boolean;
  onEdit?: () => void;
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  SKU_NOT_FOUND: "No measurements found for this item.",
  NETWORK_ERROR: "Connection problem.",
  SERVER_ERROR: "Something went wrong on our end.",
  RATE_LIMITED: "Too many requests — please wait a moment.",
  MALFORMED_RESPONSE: "Unable to load configuration.",
  CONFIG_ERROR: "Unable to load configuration.",
};

export function ErrorState({
  code,
  message: _message,
  onRetry,
  showEdit,
  onEdit,
}: ErrorStateProps) {
  const friendly = FRIENDLY_MESSAGES[code] ?? "Something went wrong.";

  return (
    <div style={{ padding: "16px", fontFamily: "sans-serif" }}>
      <p style={{ color: "#c00", marginBottom: "12px" }}>{friendly}</p>
      <button type="button" onClick={onRetry} style={{ marginRight: "8px" }}>
        Retry
      </button>
      {showEdit && onEdit && (
        <button type="button" onClick={onEdit}>
          Edit Measurements
        </button>
      )}
    </div>
  );
}
