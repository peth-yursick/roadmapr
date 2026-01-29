export function formatWeight(weight: number): string {
  const abs = Math.abs(weight);
  const sign = weight < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${sign}${abs.toFixed(1).replace(/\.0$/, "")}`;
}

export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
