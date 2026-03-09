import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from "./components/layout/ProtectedRoute";
import { queryClient } from "./lib/queryClient";
import { SignUpPage } from "./components/pages/SignUp";
import { LoginPage } from "./components/pages/Login";
import { Dashboard } from "./components/pages/Dashboard";
import { useBootstrapAuth } from "./hooks/useAuth";
import { Toaster } from "./components/ui/sonner";

function AppRoutes() {
  useBootstrapAuth();
  return (
    <Routes>
      <Route path="/" element={<SignUpPage />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignUpPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              classNames: {
                toast: "!bg-card !border-border !text-foreground !shadow-lg",
                title: "!text-foreground !text-sm !font-medium",
                description: "!text-muted-foreground !text-xs",
                success: "!border-primary/20",
                error: "!border-destructive/20",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
