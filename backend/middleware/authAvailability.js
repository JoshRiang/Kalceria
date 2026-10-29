const emailAuthEnabled = () => process.env.ENABLE_EMAIL_AUTH === "true";

export function requireEmailAuth(req, res, next) {
  if (!emailAuthEnabled()) {
    return res.status(503).json({
      error: "Email-based account flows are temporarily disabled. Contact an administrator for account access.",
    });
  }

  next();
}

export function requirePublicSignup(req, res, next) {
  if (process.env.ENABLE_PUBLIC_SIGNUP === "false") {
    return res.status(403).json({
      error: "Public registration is closed. Contact an administrator to request an account.",
    });
  }

  next();
}
