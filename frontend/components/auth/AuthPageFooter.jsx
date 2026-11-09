"use client";

export function AuthPageFooter({
  mode,
  switchMode,
  setMode,
  setError,
  setSuccess,
}) {
  return (
    <>
      {mode !== "verify" && mode !== "forgot-password" && (
        <div className={mode === "login" ? "mt-5 sm:mt-6 pb-4 sm:pb-6 text-center" : "mt-8 pb-3 text-center"}>
          <p className="font-mono text-xs text-slate-500">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="font-sans font-bold text-white hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4 cursor-pointer"
            >
              {mode === "login" ? "Register now" : "Sign in"}
            </button>
          </p>
          {mode === "login" && (
            <p className="mt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  try {
                    localStorage.removeItem("kalceria_auth_return");
                    localStorage.removeItem("kalceria_password_reset_from_map");
                    sessionStorage.removeItem("kalceria_password_reset_from_map");
                  } catch {}
                  setMode("forgot-password");
                }}
                className="font-sans font-bold text-xs text-white hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4 cursor-pointer"
              >
                Forgot Password
              </button>
            </p>
          )}
        </div>
      )}
      {mode === "verify" && (
        <div className="mt-8 text-center">
          <p className="font-mono text-xs text-slate-500">
            Sudah verifikasi?{" "}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="font-sans font-bold text-white hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4 cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </div>
      )}
    </>
  );
}
