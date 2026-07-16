import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!rawUrl) {
    throw new Error("VITE_SUPABASE_URL이 없습니다.");
}

if (!supabasePublishableKey) {
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY가 없습니다.");
}

const supabaseUrl = rawUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/, "")
    .replace(/\/auth\/v1$/, "");

console.log("현재 Supabase URL:", supabaseUrl);

if (
    !supabaseUrl.startsWith("https://") ||
    !supabaseUrl.endsWith(".supabase.co")
) {
    throw new Error(
        `Supabase URL 형식이 잘못되었습니다: ${supabaseUrl}`
    );
}

export const supabase = createClient(
    supabaseUrl,
    supabasePublishableKey.trim()
);