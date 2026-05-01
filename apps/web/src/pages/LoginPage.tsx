import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormFieldWrapper, TextInput } from "@/components/forms/FormFieldWrapper";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);
  const navigate = useNavigate();
  const location = useLocation();
  const from = typeof location.state === "object" && location.state && "from" in location.state ? location.state.from : null;
  const destination = typeof from === "object" && from && "pathname" in from ? String(from.pathname) : APP_ROUTES.dashboard;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAuthError();
    try {
      await login({ email, password });
      navigate(destination, { replace: true });
    } catch {
      // Store owns the user-facing error state.
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">CanonOS</p>
        <PageTitle className="mt-3">Log in</PageTitle>
        <PageSubtitle>Open your private media judgment workspace.</PageSubtitle>

        {error ? <div className="mt-5"><ErrorState title="Login failed" message={error} /></div> : null}

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <FormFieldWrapper id="login-email" label="Email">
            <TextInput
              autoComplete="email"
              id="login-email"
              name="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormFieldWrapper>
          <FormFieldWrapper id="login-password" label="Password">
            <TextInput
              autoComplete="current-password"
              id="login-password"
              name="password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormFieldWrapper>
          <Button disabled={status === "loading"} type="submit">
            {status === "loading" ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          New to CanonOS?{" "}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to={APP_ROUTES.register}>
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
