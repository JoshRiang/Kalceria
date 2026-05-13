"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRoot() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    router.replace(token ? "/admin/dashboard" : "/admin/login");
  }, [router]);
  return null;
}
