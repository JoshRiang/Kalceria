"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasAdminSession } from "@/lib/session";

export default function AdminRoot() {
  const router = useRouter();
  useEffect(() => {
    router.replace(hasAdminSession() ? "/admin/dashboard" : "/admin/login");
  }, [router]);
  return null;
}
