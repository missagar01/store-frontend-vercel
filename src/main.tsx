// src/main.tsx
import "@/index.css";
import React, { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AuthProvider, useAuth } from "@/context/AuthContext.tsx";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./components/views/Login";
import Dashboard from "./components/views/Dashboard";
import App from "./App";
import ApproveIndent from "@/components/views/ApproveIndent";
import { SheetsProvider } from "./context/SheetsContext";
import StoreOutApproval from "./components/views/StoreOutApproval";
import type { RouteAttributes } from "./types";
import {
  LayoutDashboard,
  ClipboardCheck,
  PackageCheck,
  ShieldUser,
  ListTodo,
  Store,
  ClipboardList,
  Users,
} from "lucide-react";

import Administration from "./components/views/Administration";
import Loading from "./components/views/Loading";
import PendingIndents from "./components/views/PendingIndents";
import Inventory from "./components/views/Inventory";
import CreateIndent from "./components/views/CreateIndent";
import UserIndent from "./components/views/UserIndent";
import UserIndentListIndent from "./components/views/UserIndentListIndent";
import UserIndentListRequisition from "./components/views/UserIndentListRequisition";
import ApprowIndentData from "./components/views/ApprowIndentData";

// ---------- ADMIN ROUTES ----------
const adminRoutes: RouteAttributes[] = [
  { path: "", name: "Dashboard", icon: <LayoutDashboard size={20} />, element: <Dashboard />, notifications: () => 0 },
  { path: "inventory", name: "Inventory", icon: <Store size={20} />, element: <Inventory />, notifications: () => 0 },
  // { path: "create-indent", name: "Create Indent", icon: <ClipboardList size={20} />, element: <CreateIndent />, notifications: () => 0 },
  {
    path: "indent",
    name: "Indent",
    icon: <ClipboardCheck size={20} />,
    element: <ApproveIndent />,
    notifications: (sheets) =>
      (sheets as Array<Record<string, unknown>>).filter(
        (sheet) =>
          String(sheet["planned1"] ?? "") !== "" &&
          String(sheet["vendorType"] ?? "") === "" &&
          (typeof sheet["indentType"] === "string" &&
            sheet["indentType"] === "Purchase")
      ).length,
  },
  { path: "pending-pos", name: "Purchase Order", icon: <ListTodo size={20} />, element: <PendingIndents />, notifications: () => 0 },
  {
    path: "store-out-approval",
    name: "Store Out Approval",
    icon: <PackageCheck size={20} />,
    element: <StoreOutApproval />,
    notifications: (sheets) =>
      (sheets as Array<Record<string, unknown>>).filter(
        (sheet) =>
          String(sheet["planned6"] ?? "") !== "" &&
          String(sheet["actual6"] ?? "") === "" &&
          (typeof sheet["indentType"] === "string" &&
            sheet["indentType"] === "Store Out")
      ).length,
  },
  { path: "administration", name: "Administration", icon: <ShieldUser size={20} />, element: <Administration />, notifications: () => 0 },
  {
    path: "approve-indent-data",
    name: "Approve Indent Data",
    icon: <ClipboardCheck size={20} />,
    element: <ApprowIndentData />,
    notifications: () => 0,
  },
  
];

// ---------- USER ROUTES ----------
const userRoutes: RouteAttributes[] = [
  { path: "user-indent", name: "Indent", icon: <Users size={20} />, element: <UserIndentListIndent />, notifications: () => 0 },
  { path: "user-requisition", name: "Requisition", icon: <ClipboardList size={20} />, element: <UserIndentListRequisition />, notifications: () => 0 },
  { path: "user-indent/create", name: "Create Indent", icon: <ClipboardList size={20} />, element: <UserIndent />, notifications: () => 0 },
];

// ---------- HELPERS ----------
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loggedIn, loading } = useAuth();
  if (loading) return <Loading />;
  if (!loggedIn) return <Navigate to="/login" replace />;
  return children;
}

function GatedRoute({ children }: { children: React.ReactNode }) {
  return children;
}

// ---------- ROOT ROUTER ----------
function RootWithAuthRoutes() {
  const { role, employee_id } = useAuth();
  const isAdmin = role === "admin";

  // special employees override everything
  const isStoreOutOnly = employee_id === "S07632" || employee_id === "S08088";
  const isApproveIndentOnly = employee_id === "S00116";

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SheetsProvider>
              <App
                routes={
                  isStoreOutOnly
                    ? [
                        {
                          path: "store-out-approval",
                          name: "Store Out Approval",
                          icon: <PackageCheck size={20} />,
                          element: <StoreOutApproval />,
                          notifications: () => 0,
                        },
                      ]
                    : isApproveIndentOnly
                    ? [
                        {
                          path: "approve-indent-data",
                          name: "Approve Indent Data",
                          icon: <ClipboardCheck size={20} />,
                          element: <ApprowIndentData />,
                          notifications: () => 0,
                        },
                      ]
                    : isAdmin
                    ? adminRoutes
                    : userRoutes
                }
              />
            </SheetsProvider>
          </ProtectedRoute>
        }
      >
        {isStoreOutOnly ? (
          <>
            <Route index element={<Navigate to="store-out-approval" replace />} />
            <Route path="store-out-approval" element={<StoreOutApproval />} />
            <Route path="*" element={<Navigate to="store-out-approval" replace />} />
          </>
        ) : isApproveIndentOnly ? (
          <>
            <Route index element={<Navigate to="approve-indent-data" replace />} />
            <Route path="approve-indent-data" element={<ApprowIndentData />} />
            <Route path="*" element={<Navigate to="approve-indent-data" replace />} />
          </>
        ) : (
          <>
            {isAdmin ? (
              <Route index element={<Dashboard />} />
            ) : (
              <Route index element={<Navigate to="user-indent" replace />} />
            )}
            {(isAdmin ? adminRoutes : userRoutes).map(({ path, element }) => (
              <Route key={path} path={path} element={<GatedRoute>{element}</GatedRoute>} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Route>
    </Routes>
  );
}

// ---------- MOUNT ----------
const container = document.getElementById("root") as HTMLElement;

// Prevent duplicate createRoot calls in dev/HMR
const existingRoot: Root | undefined = (container as any).__app_root;
const root = existingRoot ?? createRoot(container);
(container as any).__app_root = root;

root.render(
  <StrictMode>
    <AuthProvider>
      <HashRouter>
        <RootWithAuthRoutes />
      </HashRouter>
    </AuthProvider>
  </StrictMode>
);
