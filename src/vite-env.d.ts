/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * PostHog Cloud project API key. Empty/absent disables product analytics
     * entirely — see src/lib/analytics.ts.
     */
    readonly VITE_POSTHOG_KEY?: string;

    /** PostHog ingest host; defaults to the US cloud when unset. */
    readonly VITE_POSTHOG_HOST?: string;
}
