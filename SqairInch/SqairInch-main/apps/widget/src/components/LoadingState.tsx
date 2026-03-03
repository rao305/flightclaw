export function LoadingState() {
  return (
    <div aria-busy="true" style={{ padding: "16px", textAlign: "center" }}>
      <output className="sqairinch-spinner" aria-label="Loading…">
        ⏳
      </output>
    </div>
  );
}
