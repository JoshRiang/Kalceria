"use client";

import AuthField from "@/components/auth/AuthField";

export default function LoginForm({
  form,
  setField,
  loading,
  isEmailValid,
}) {
  return (
    <>
      <AuthField
        id="email"
        label="Email Address"
        type="email"
        placeholder="user@domain.com"
        val={form.email || ""}
        onChange={setField}
        isValid={isEmailValid}
        autoComplete="email"
      />
      <AuthField
        id="password"
        label="Password"
        type="password"
        placeholder="••••••••"
        val={form.password || ""}
        onChange={setField}
        isValid={Boolean(form.password && form.password.length >= 6)}
        autoComplete="current-password"
      />
    </>
  );
}

