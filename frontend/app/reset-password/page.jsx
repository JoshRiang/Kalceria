"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token") || searchParams.get("reset_token") || "";
    if (token) {
      router.replace(`/?auth=true&token=${encodeURIComponent(token)}`);
    } else {
      router.replace(`/?auth=true`);
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#050a14] flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  );
}

export default function ResetPasswordRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050a14]" />}>
      <ResetPasswordRedirectContent />
    </Suspense>
  );
}
