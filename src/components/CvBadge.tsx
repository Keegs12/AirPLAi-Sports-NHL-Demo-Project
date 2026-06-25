/**
 * The marker that calls out a surface only AirPLAi's computer vision can produce
 * (vs. the public/ESPN-derived numbers). Gradient pill in the brand colors so the
 * "this is the differentiator" signal is obvious and consistent everywhere.
 */
export default function CvBadge({ label = "AirPLAi CV" }: { label?: string }) {
  return (
    <span className="cv-badge" title="Computer-vision-generated — not available from any public feed">
      <span className="pulse" />
      {label}
    </span>
  );
}
