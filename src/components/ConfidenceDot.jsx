export default function ConfidenceDot({ confidence, className = "" }) {
  const isConfirmed = confidence === "confirmed";
  return (
    <span
      title={isConfirmed ? "Confirmed" : "Suggested — awaiting review"}
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{
        width: 8,
        height: 8,
        background: isConfirmed ? "var(--color-accent)" : "transparent",
        border: isConfirmed ? "none" : "1.5px dashed var(--color-accent)",
      }}
    />
  );
}
