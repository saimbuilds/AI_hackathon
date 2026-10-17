import type { Metadata } from "next";
import { AuthCallback } from "@/components/session/AuthCallback";

export const metadata: Metadata = { title: "Signing in · Endpaper", robots: { index: false } };

export default function CallbackPage() {
  return <AuthCallback />;
}
