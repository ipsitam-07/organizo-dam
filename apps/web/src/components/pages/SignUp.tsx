import { type SyntheticEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "@/hooks/useAuth";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import type { ApiError } from "@/types";
import { APP_NAME } from "@/constants";
import { UI_STRINGS } from "@/constants/ui.constants";
import { Eye, EyeOff } from "lucide-react";

function getStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: "Weak", color: "bg-red-400" };
  if (s <= 2) return { score: s, label: "Fair", color: "bg-amber-400" };
  if (s <= 3) return { score: s, label: "Good", color: "bg-yellow-400" };
  return { score: s, label: "Strong", color: "bg-green-500" };
}

export function SignUpPage() {
  const navigate = useNavigate();
  const { mutateAsync: register, isPending } = useRegister();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  const strength = password ? getStrength(password) : null;

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "At least 8 characters";
    return e;
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      console.log("[SignUp] Attempting registration for:", email);
      await register({ email, password });
      console.log(
        "[SignUp] Registration + auto-login successful, navigating to dashboard"
      );
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      console.error("[SignUp] Registration failed:", {
        message: apiErr.message,
        status: apiErr.status,
        raw: err,
      });
      setErrors({
        form: apiErr.message ?? "Registration failed. Please try again.",
      });
    }
  };

  return (
    <div className="bg-bg flex min-h-screen flex-col items-center justify-center p-4">
      <div className="animate-fade-up w-full max-w-95">
        <div className="mb-8 text-center">
          <span className="text-text-primary text-[22px] font-semibold tracking-tight">
            {APP_NAME}
          </span>
          <p className="text-text-muted mt-1 text-[13px]">
            {UI_STRINGS.SIGN_UP_PAGE.SUB_HEADING}
          </p>
        </div>
        <div className="bg-surface border-border rounded-lg border p-6 shadow-sm">
          <h1 className="text-text-primary mb-1 text-[17px] font-semibold">
            {UI_STRINGS.SIGN_UP_PAGE.CREATE_ACCOUNT}
          </h1>
          <p className="text-text-secondary mb-5 text-[13px]">
            {UI_STRINGS.SIGN_UP_PAGE.GET_STARTED}
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
                className="text-text-primary text-[13px] font-medium"
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
              <Label
                htmlFor="password"
                className="text-text-primary text-[13px] font-medium"
              >
                {UI_STRINGS.CREDENTIALS.PASSWORD}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  autoComplete="new-password"
                  className={`pr-10 ${errors.password ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-text-muted hover:text-text-primary absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[12px] text-red-500">{errors.password}</p>
              )}
              {strength && (
                <div className="mt-0.5 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= Math.ceil((strength.score / 5) * 4)
                            ? strength.color
                            : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-text-muted w-10 shrink-0 text-right text-[11px]">
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-1 w-full"
              disabled={isPending}
            >
              {isPending ? "Creating account…" : UI_STRINGS.BUTTONS.CREATE}
            </Button>
          </form>

          <p className="text-text-muted mt-4 text-center text-[12px] leading-relaxed">
            {UI_STRINGS.SIGN_UP_PAGE.AGREE}{" "}
            <span className="text-text-secondary">
              {UI_STRINGS.SIGN_UP_PAGE.TERMS}
            </span>{" "}
            {UI_STRINGS.SIGN_UP_PAGE.AND}{" "}
            <span className="text-text-secondary">
              {UI_STRINGS.SIGN_UP_PAGE.PRIVACY}
            </span>
            .
          </p>
        </div>
        <p className="text-text-secondary mt-4 text-center text-[13px]">
          {UI_STRINGS.SIGN_UP_PAGE.HAVE_ACCOUNT}{" "}
          <Link
            to="/login"
            className="text-accent-text font-medium underline-offset-2 hover:underline"
          >
            {UI_STRINGS.BUTTONS.SIGN_IN}
          </Link>
        </p>
      </div>
    </div>
  );
}
