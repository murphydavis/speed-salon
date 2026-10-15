export function pathNow(): string {
  return window.location.pathname + window.location.search;
}

export function navigate(to: string): void {
  history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
