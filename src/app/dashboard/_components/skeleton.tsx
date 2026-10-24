export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-sm bg-white/[0.09] motion-reduce:animate-none ${className}`}
    />
  );
}
