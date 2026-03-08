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
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
