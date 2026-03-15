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

  // PortOne
  NEXT_PUBLIC_PORTONE_STORE_ID: required(
    "NEXT_PUBLIC_PORTONE_STORE_ID",
    process.env.NEXT_PUBLIC_PORTONE_STORE_ID
  ),
  NEXT_PUBLIC_PORTONE_CHANNEL_KEY: required(
    "NEXT_PUBLIC_PORTONE_CHANNEL_KEY",
    process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY
  ),
  PORTONE_API_SECRET: required("PORTONE_API_SECRET", process.env.PORTONE_API_SECRET),

  // Saju Provider (Ablecity)
  ABLECITY_API_URL: required("ABLECITY_API_URL", process.env.ABLECITY_API_URL),
  ABLECITY_API_KEY: required("ABLECITY_API_KEY", process.env.ABLECITY_API_KEY),
  ABLECITY_CITY: required("ABLECITY_CITY", process.env.ABLECITY_CITY) || "서울특별시",
  ABLECITY_DISABLE_CACHE: process.env.ABLECITY_DISABLE_CACHE || "false",
  ABLECITY_TIMEOUT_MS: required("ABLECITY_TIMEOUT_MS", process.env.ABLECITY_TIMEOUT_MS) || "10000",

  // OpenAI
  OPENAI_API_KEY: required("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
  OPENAI_MODEL: required("OPENAI_MODEL", process.env.OPENAI_MODEL) || "gpt-4.1-mini",
} as const;

export const hasSupabase = (): boolean =>
  !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY;

export const hasPortOne = (): boolean =>
  !!env.NEXT_PUBLIC_PORTONE_STORE_ID &&
  !!env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
