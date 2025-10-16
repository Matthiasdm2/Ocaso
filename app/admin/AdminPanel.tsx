"use client";

import {
  BarChart3,
  ChevronRight,
  CreditCard,
  FolderTree,
  Home,
  Package,
  Shield,
  Users
} from "lucide-react";
import { useState } from "react";

import CategoryManagement from "./CategoryManagement";
import Dashboard from "./Dashboard";
import ListingManagement from "./ListingManagement";
import SubscriptionManagement from "./SubscriptionManagement";
import UserManagement from "./UserManagement";

type TabType = "dashboard" | "users" | "listings" | "subscriptions" | "categories";

const tabs = [
  { id: "dashboard" as TabType, name: "Dashboard", icon: BarChart3, description: "Overzicht & statistieken" },
  { id: "users" as TabType, name: "Gebruikers", icon: Users, description: "Gebruikers beheren" },
  { id: "listings" as TabType, name: "Advertenties", icon: Package, description: "Listings modereren" },
  { id: "categories" as TabType, name: "Categorieën", icon: FolderTree, description: "Categorien organiseren" },
  { id: "subscriptions" as TabType, name: "Abonnementen", icon: CreditCard, description: "Business accounts" },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "users":
        return <UserManagement />;
      case "listings":
        return <ListingManagement />;
      case "categories":
        return <CategoryManagement />;
      case "subscriptions":
        return <SubscriptionManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-48 bg-white shadow-lg static inset-0">
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
                <p className="text-xs text-gray-500">OCASO Beheer</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <div className="flex-1">
                    <div className="font-medium">{tab.name}</div>
                    <div className={`text-xs ${isActive ? 'text-primary-100' : 'text-gray-500'}`}>
                      {tab.description}
                    </div>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200">
            <a
              href="/"
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Terug naar website</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-4 flex-1">

        {/* Page header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-8">
            <div className="flex items-center space-x-3">
              {activeTabData && <activeTabData.icon className="w-8 h-8 text-primary" />}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{activeTabData?.name}</h1>
                <p className="text-sm text-gray-600 mt-1">{activeTabData?.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
