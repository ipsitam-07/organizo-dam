import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import type { ApiError } from "@/interfaces";
import { APP_NAME, UI_STRINGS } from "@/constants";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      const res = await authApi.login({ email, password });
      login(res);
      navigate("/dashboard");
    } catch (err) {
      setErrors({
        form: (err as ApiError).message ?? "Invalid email or password",
      });
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark bg-gradient-mesh flex min-h-screen flex-col items-center justify-center p-4">
      <div className="animate-fade-in w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-text-primary text-[22px] font-semibold tracking-tight dark:text-white">
            {APP_NAME}
          </span>
          <p className="text-text-secondary mt-1 text-[13px]">
            {UI_STRINGS.LOGIN_PAGE.SUB_HEADING}
          </p>
        </div>
        <div className="border-border-light rounded-2xl border bg-white p-6 shadow-sm dark:border-white/5 dark:bg-black/20 dark:backdrop-blur-xl">
          <h1 className="text-text-primary mb-1 text-[17px] font-semibold dark:text-white">
            {UI_STRINGS.LOGIN_PAGE.WELCOME_BACK}
          </h1>
          <p className="text-text-secondary mb-5 text-[13px]">
            {UI_STRINGS.LOGIN_PAGE.SIGN_IN_TO_CONTINUE}
          </p>
          {errors.form && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-800/30 dark:bg-red-950/30 dark:text-red-400">
              {errors.form}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-text-primary text-[13px] font-medium dark:text-white"
              >
                {UI_STRINGS.CREDENTIALS.EMAIL}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined }));
                }}
                autoComplete="email"
                autoFocus
                className={
                  errors.email
                    ? "border-red-400 focus-visible:ring-red-300"
                    : ""
                }
              />
              {errors.email && (
                <p className="text-[12px] text-red-500">{errors.email}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-text-primary text-[13px] font-medium dark:text-white"
                >
                  {UI_STRINGS.CREDENTIALS.PASSWORD}
                </Label>
                <button
                  type="button"
                  className="text-primary text-[12px] font-medium underline-offset-2 hover:underline"
                >
                  {UI_STRINGS.LOGIN_PAGE.FORGOT_PASSWORD}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: undefined }));
                }}
                autoComplete="current-password"
                className={
                  errors.password
                    ? "border-red-400 focus-visible:ring-red-300"
                    : ""
                }
              />
              {errors.password && (
                <p className="text-[12px] text-red-500">{errors.password}</p>
              )}
            </div>
            <Button type="submit" size="lg" className="mt-1 w-full">
              {UI_STRINGS.BUTTONS.SIGN_IN}
            </Button>
          </form>
        </div>
        <p className="text-text-secondary mt-4 text-center text-[13px]">
          {UI_STRINGS.LOGIN_PAGE.NO_ACCOUNT}{" "}
          <Link
            to="/signup"
            className="text-primary font-medium underline-offset-2 hover:underline"
          >
            {UI_STRINGS.BUTTONS.SIGN_UP}
          </Link>
        </p>
      </div>
    </div>
  );
}
