import { COUNTRY_MAP } from "@/lib/countries";

interface GeoFlagProps {
  geo: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function GeoFlag({ geo, size = "sm", showLabel = true }: GeoFlagProps) {
  if (!geo) return <span className="text-muted-foreground">-</span>;

  const name = COUNTRY_MAP[geo] ?? geo;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`fflag fflag-${geo} ff-${size}`}
        title={name}
      />
      {showLabel && <span>{name}</span>}
    </span>
  );
}
