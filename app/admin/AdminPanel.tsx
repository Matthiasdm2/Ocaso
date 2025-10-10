"use client";

import { useState } from "react";

import CategoryManagement from "./CategoryManagement";
import Dashboard from "./Dashboard";
import ListingManagement from "./ListingManagement";
import SubscriptionManagement from "./SubscriptionManagement";
import UserManagement from "./UserManagement";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "listings" | "subscriptions" | "categories">("dashboard");

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Paneel</h1>
      <div className="flex space-x-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${activeTab === "dashboard" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === "users" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("users")}
        >
          Gebruikers
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === "listings" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("listings")}
        >
          Advertenties
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === "categories" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("categories")}
        >
          Categorien
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === "subscriptions" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("subscriptions")}
        >
          Abonnementen
        </button>
      </div>
      <div className="tab-content">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "listings" && <ListingManagement />}
        {activeTab === "categories" && <CategoryManagement />}
        {activeTab === "subscriptions" && <SubscriptionManagement />}
      </div>
    </div>
  );
}
