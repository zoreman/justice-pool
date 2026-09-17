console.log("SUPABASE ENV CHECK", {
  hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  hasPublishableKey: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ),
});

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabasePublishableKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
);