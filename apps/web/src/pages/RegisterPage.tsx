import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormFieldWrapper, TextInput } from "@/components/forms/FormFieldWrapper";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const register = useAuthStore((state) => state.register);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAuthError();
    try {
      await register({ email, password, displayName });
      navigate(APP_ROUTES.dashboard, { replace: true });
    } catch {
      // Store owns the user-facing error state.
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">CanonOS</p>
        <PageTitle className="mt-3">Create account</PageTitle>
        <PageSubtitle>Start a private profile for media tracking, taste signals, and future recommendations.</PageSubtitle>

        {error ? <div className="mt-5"><ErrorState title="Registration failed" message={error} /></div> : null}

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <FormFieldWrapper id="register-display-name" label="Display name">
            <TextInput
              autoComplete="name"
              id="register-display-name"
              name="displayName"
              required
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </FormFieldWrapper>
          <FormFieldWrapper id="register-email" label="Email">
            <TextInput
              autoComplete="email"
              id="register-email"
              name="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormFieldWrapper>
          <FormFieldWrapper id="register-password" label="Password" description="Use at least 8 characters.">
            <TextInput
              autoComplete="new-password"
              id="register-password"
              minLength={8}
              name="password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormFieldWrapper>
          <Button disabled={status === "loading"} type="submit">
            {status === "loading" ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to={APP_ROUTES.login}>
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
