export function getStoredGithubToken(): string {
  return "";
}

export function persistGithubToken(_value: string): void {
  // no-op (GitHub integration disabled)
}

export function resolveGithubToken(): string | undefined {
  return undefined;
}
