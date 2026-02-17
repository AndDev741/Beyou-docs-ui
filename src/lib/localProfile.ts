import { getStoredValue, persistStoredValue } from "@/lib/storage";

export type LocalProfile = {
  name: string;
  role: string;
  email?: string;
};

const LOCAL_PROFILE_STORAGE_KEY = "docs-ui-local-profile";

export function getLocalProfile(): LocalProfile | null {
  const raw = getStoredValue(LOCAL_PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LocalProfile> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      role: typeof parsed.role === "string" ? parsed.role : "",
      email: typeof parsed.email === "string" ? parsed.email : undefined,
    };
  } catch {
    return null;
  }
}

export function normalizeLocalProfile(profile: LocalProfile): LocalProfile {
  const name = profile.name.trim();
  const role = profile.role.trim();
  const email = profile.email?.trim() || undefined;
  return { name, role, email };
}

export function persistLocalProfile(profile: LocalProfile | null): void {
  if (!profile) {
    persistStoredValue(LOCAL_PROFILE_STORAGE_KEY, "");
    return;
  }
  const normalized = normalizeLocalProfile(profile);
  persistStoredValue(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(normalized));
}

export function isLocalProfileComplete(profile: LocalProfile | null): boolean {
  if (!profile) return false;
  return Boolean(profile.name.trim() && profile.role.trim());
}
