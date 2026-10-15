export function formatTime(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const frac = ms % 1000;
  return `${m}:${String(s).padStart(2, "0")}.${String(frac).padStart(3, "0")}`;
}

export function formatWhen(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().replace("T", " ").replace("Z", " UTC");
}
