/**
 * Environment variables - safe access with preview-mode fallbacks
 */

const required = (key: string, value: string | undefined): string => {
  if (!value || value.trim() === "") {
    return "";
  }
  return value;
};

export const env = {
  // Supabase
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),

  // App
  APP_URL: required("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000",

  // Toss
  TOSS_CLIENT_KEY: required("NEXT_PUBLIC_TOSS_CLIENT_KEY", process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY),
  TOSS_SECRET_KEY: required("TOSS_SECRET_KEY", process.env.TOSS_SECRET_KEY),
  TOSS_CARD_VARIANT_KEY: required(
    "NEXT_PUBLIC_TOSS_CARD_VARIANT_KEY",
    process.env.NEXT_PUBLIC_TOSS_CARD_VARIANT_KEY
  ),
  TOSS_WEBHOOK_SECRET: process.env.TOSS_WEBHOOK_SECRET || "",
} as const;

export const hasSupabase = (): boolean =>
  !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY && !!env.SUPABASE_SERVICE_ROLE_KEY;

export const hasToss = (): boolean =>
  !!env.TOSS_CLIENT_KEY && !!env.TOSS_SECRET_KEY && !!env.TOSS_CARD_VARIANT_KEY;
