"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import AdminEventForm from "./AdminEventForm";
import AdminMerchList from "./AdminMerchList";

export default function AdminPanel({ userRole }) {
  const [activeTab, setActiveTab] = useState("Events");
  const [events, setEvents]       = useState([]);
  const [merch, setMerch]         = useState([]);

  if (userRole !== "ADMIN") return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    api.get("/api/admin/events").then((r) => setEvents(r.data.events)).catch(() => {});
    api.get("/api/admin/merch").then((r) => setMerch(r.data.merch)).catch(() => {});
  }, []);

  const tabs = ["Events", "Merch"];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === "Events" && (
        <AdminEventForm
          events={events}
          onCreated={(e) => setEvents((p) => [e, ...p])}
          onDeleted={(id) => setEvents((p) => p.filter((x) => x.id !== id))}
        />
      )}

      {activeTab === "Merch" && (
        <AdminMerchList
          merch={merch}
          onToggle={(id, val) =>
            setMerch((p) => p.map((m) => (m.id === id ? { ...m, isSoldOut: val } : m)))
          }
          onDeleted={(id) => setMerch((p) => p.filter((m) => m.id !== id))}
          onCreated={(m) => setMerch((p) => [m, ...p])}
        />
      )}
    </div>
  );
}
