import { predict } from "./inference";
import type { Bundle, Profile } from "./types";
let cached: Promise<Bundle> | null = null;
self.onmessage = async (
  event: MessageEvent<{
    id: number;
    profile: Profile;
    variant: string;
    year: number;
  }>,
) => {
  const { id, profile, variant, year } = event.data;
  try {
    cached ??= fetch("/models/bundle.json").then(async (r) => {
      if (!r.ok)
        throw new Error(
          "Estimates are unavailable right now. Please try again later.",
        );
      return r.json();
    });
    const bundle = await cached;
    self.postMessage({ id, result: predict(bundle, profile, variant, year) });
  } catch (e) {
    cached = null;
    self.postMessage({
      id,
      error: e instanceof Error ? e.message : "Prediction unavailable.",
    });
  }
};
