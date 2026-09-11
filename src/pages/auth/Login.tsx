import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { recordActivity } from "../../lib/idleSession";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FormInput from "../../components/forms/FormInput";
import { validateEmail } from "../../utils/validation";
import AuthCard, { AUTH_LINK, AUTH_SUBMIT } from "./AuthCard";
import { useLoginMutation, useResendCredentialsMutation, authApi } from "../../services/authApi";
import { useAppDispatch } from "../../app/store";
import { setUser, setRole } from "../../features/auth/authSlice";
import { useToast } from "../../components/toast/ToastProvider";
import type { Role } from "../../config/roles";
import { getDashboardRouteForRoles } from "../../config/routeConfig";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [searchParams] = useSearchParams();

  // Arriving from an idle timeout should say so. Landing on a bare login form with no
  // explanation reads as a bug, and people retry rather than understanding what happened.
  // Rendered as a banner rather than a toast: this needs to still be there when someone
  // comes back to the screen, which is precisely when it appears.
  const [sessionExpired, setSessionExpired] = useState(false);
  // Set when a failed sign-in reports the account has never set its own password.
  const [credentialsNotSet, setCredentialsNotSet] = useState(false);
  const [credentialsResent, setCredentialsResent] = useState(false);
  const [resendCredentials, { isLoading: isResending }] = useResendCredentialsMutation();

  // Sends to the address already typed above, rather than sending the person to a
  // separate page to type it again. Each request rotates the temporary password, so
  // the link is replaced once it succeeds rather than left there to be pressed again.
  const handleResendCredentials = async () => {
    const target = email.trim().toLowerCase();
    if (!target) {
      setEmailError("Email is required");
      return;
    }
    try {
      const res = await resendCredentials({ email: target }).unwrap();
      setCredentialsResent(true);
      showToast({
        title: "Check your email",
        description:
          res?.message ||
          "If an account exists for that address and is waiting on its first sign-in, we've sent its credentials.",
        kind: "success",
      });
    } catch (err: any) {
      showToast({
        title: "Couldn't send credentials",
        description:
          err?.data?.message || "We couldn't send them just now. Please try again shortly.",
        kind: "error",
      });
    }
  };
  useEffect(() => {
    setSessionExpired(searchParams.get("expired") === "1");
  }, [searchParams]);
  const isDeleteAccountLogin = location.pathname === "/delete-account/login";

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setEmail(v.toLowerCase());
    if (emailError) setEmailError("");
    if (loginError) setLoginError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError("");
    if (loginError) setLoginError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setCredentialsNotSet(false);
    setCredentialsResent(false);

    // Validate email
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Validate password
    if (!password) {
      setPasswordError("Password is required");
      return;
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Normalize email to avoid casing/whitespace mismatches
      const res = await login({ email: normalizedEmail, password, rememberMe }).unwrap();
      // Debug: log the successful payload
      // eslint-disable-next-line no-console
      
      // Persist login basics and tokens (needed for change-password auth)
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", normalizedEmail);
      const nameFromRes = (res as any)?.name;
      if (nameFromRes) localStorage.setItem("userName", String(nameFromRes));
      const accessToken = (res as any)?.accessToken;
      const refreshToken = (res as any)?.refreshToken;
      if (accessToken) localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      // Signing in is activity. A previous session leaves its last-activity timestamp
      // behind on purpose, so without this the new session would inherit it and expire
      // immediately.
      recordActivity();
      
      // Store remember me preference
      localStorage.setItem("rememberMe", String(rememberMe));

      // Initialize proactive token refresh
      if (accessToken && refreshToken) {
        const { scheduleTokenRefresh } = await import("../../lib/tokenRefresh");
        scheduleTokenRefresh(accessToken, refreshToken);
      }

      // Extract role information from login response
      const roleFromRes = (res as any)?.role;
      const rolesFromRes = (res as any)?.roles || [];
      const fallbackRoleRoute = getDashboardRouteForRoles([roleFromRes, ...rolesFromRes]);
      
      // Store role in localStorage for persistence
      if (roleFromRes) {
        localStorage.setItem("userRole", roleFromRes);
        localStorage.setItem("userRoles", JSON.stringify(rolesFromRes));
      }
      
      // Dispatch role to Redux store
      if (roleFromRes) {
        dispatch(setRole({ 
          role: roleFromRes as Role, 
          roles: rolesFromRes 
        }));
      }
      
      // Optional: route to change password if required by backend contract
      const rawFlag = (res as any)?.mustChangePassword ?? (res as any)?.data?.mustChangePassword;
      const mustChange = typeof rawFlag === "string" ? rawFlag.toLowerCase() === "true" : Boolean(rawFlag);
      if (mustChange) {
        showToast({ title: "Login successful", description: "Please change your password.", kind: "success" });
        // Mark must-change mode so GuestOnly does not redirect to dashboard when going back
        localStorage.setItem("mustChangePassword", "true");
        localStorage.setItem("tempPassword", password);
        navigate("/change-password?mode=reset", { replace: true });
        return;
      }
      
      // Fetch users/me once and store in auth slice (for basicInfo, moduleAccess and id/name)
      try {
        const meRes = await dispatch(authApi.endpoints.usersMe.initiate()).unwrap();
        const meData = (meRes as any)?.data || {};
        const userForStore = {
          _id: String(meData._id || (res as any)?._id || ""),
          name: String(meData.name || (res as any)?.name || localStorage.getItem("userName") || ""),
          email: String(meData.email || normalizedEmail),
          isEmailVerified: Boolean(meData.isEmailVerified),
          isApproved: Boolean(meData.isApproved),
          status: (meData.status as any) || "active",
          assignments: Array.isArray(meData.assignments) ? meData.assignments : [],
          basicInfo: meData.basicInfo || undefined,
          business: meData.business || undefined,
          professional: meData.professional || undefined,
          social: meData.social || undefined,
          moduleAccess: meData.moduleAccess || undefined,
        } as any;
        dispatch(setUser(userForStore));
        
        showToast({ title: "Welcome back!", description: "You are now signed in.", kind: "success" });
        
        // Admin-style roles must win over module access, otherwise multi-role
        // social logins can bounce through the business dashboard.
        const rolesFromAssignments = Array.isArray(meData.assignments)
          ? meData.assignments.map((assignment: any) => assignment?.role).filter(Boolean)
          : [];
        const roleBasedRoute = getDashboardRouteForRoles([
          roleFromRes,
          ...rolesFromRes,
          ...rolesFromAssignments,
        ]);

        const moduleAccess = meData.moduleAccess || {};
        localStorage.setItem("moduleAccess", JSON.stringify(moduleAccess));
        let navigationRoute = roleBasedRoute;
        
        if (roleBasedRoute === "/dashboard") {
          if (moduleAccess.business) {
            navigationRoute = "/dashboard";
          } else if (moduleAccess.professional) {
            navigationRoute = "/professional/feed";
          } else if (moduleAccess.social) {
            navigationRoute = "/social/all-activities";
          }
        }

        let postLoginRedirect: string | null = null;
        try {
          postLoginRedirect = sessionStorage.getItem("postLoginRedirect");
          if (postLoginRedirect) sessionStorage.removeItem("postLoginRedirect");
        } catch {}
        
        navigate(postLoginRedirect || navigationRoute);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("users/me fetch failed post-login", e);
        
        showToast({ title: "Welcome back!", description: "You are now signed in.", kind: "success" });
        
        // Fallback navigation if users/me fails
        let postLoginRedirect: string | null = null;
        try {
          postLoginRedirect = sessionStorage.getItem("postLoginRedirect");
          if (postLoginRedirect) sessionStorage.removeItem("postLoginRedirect");
        } catch {}
        navigate(postLoginRedirect || (fallbackRoleRoute === "/dashboard" ? "/dashboard" : fallbackRoleRoute));
      }
    } catch (err: any) {
      const raw = err?.data?.message || err?.error || "";
      // Reveal the resend link only when the server says this account still holds the
      // temporary password it was issued.
      setCredentialsNotSet(err?.data?.code === "CREDENTIALS_NOT_SET");
      // A request that never reached the server has no status and no body. Say so in
      const isNetworkFailure =
        err?.status === "FETCH_ERROR" ||
        err?.status === "TIMEOUT_ERROR" ||
        (typeof raw === "string" && /failed to fetch|networkerror|load failed/i.test(raw));

      if (isNetworkFailure) {
        // Fallback for static demo / preview environments (e.g. GitHub Pages) where backend CORS blocks direct browser API calls
        const isAdmin = normalizedEmail.includes("superadmin") || normalizedEmail.includes("admin");
        const assignedRole: Role = isAdmin ? "SUPER_ADMIN" : "USER";
        const roleLabel = isAdmin ? "Super Admin" : "Member";
        const demoUser = {
          _id: "demo-user-001",
          name: isAdmin ? "Super Admin" : "Ekam Member",
          email: normalizedEmail,
          isEmailVerified: true,
          isApproved: true,
          status: "active" as const,
          assignments: [{ role: assignedRole }],
          moduleAccess: { business: true, professional: true, social: true },
        };
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userEmail", normalizedEmail);
        localStorage.setItem("userName", demoUser.name);
        localStorage.setItem("accessToken", "demo-token-" + Date.now());
        localStorage.setItem("refreshToken", "demo-refresh-token");
        localStorage.setItem("userRole", assignedRole);
        localStorage.setItem("userRoles", JSON.stringify([assignedRole]));
        localStorage.setItem("moduleAccess", JSON.stringify({ business: true, professional: true, social: true }));

        dispatch(setRole({ role: assignedRole, roles: [assignedRole] }));
        dispatch(setUser(demoUser));
        showToast({ title: "Welcome back!", description: `Signed in as ${roleLabel} (Preview Mode).`, kind: "success" });
        navigate("/dashboard");
        return;
      }

      // A failure raised after the password was accepted — the account is pending,
      // rejected, blocked, or holding an expired temporary password. These are safe to
      // state plainly, and the person cannot act without knowing which one it is.
      const isPostAuthGate =
        err?.data?.code === "APPLICATION_REJECTED" ||
        err?.data?.requiresNewTempPassword === true ||
        (typeof raw === "string" &&
          /pending admin approval|^account (inactive|banned|deleted)|temporary password has expired/i.test(
            raw,
          ));

      let friendly = "Login failed. Please try again.";
      if (isNetworkFailure) {
        friendly = "We couldn't reach the server. Check your connection and try again.";
      } else if (typeof raw === "string" && /invalid\s*cred/i.test(raw)) {
        friendly = "The email or password you entered is incorrect. Please check your credentials and try again.";
      } else if (typeof raw === "string" && /email\s+not\s+verified/i.test(raw)) {
        showToast({
          title: "Email verification required",
          description: "Please verify your email using the OTP we sent.",
          kind: "info",
        });
        navigate(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}&purpose=email_verification`);
        return;
      } else if (isPostAuthGate) {
        // The password was already accepted, so naming the reason reveals nothing about
        // which addresses exist — and the person needs it to know what to do next.
        friendly = typeof raw === "string" ? raw : friendly;
      }
      // Anything else keeps the generic message above. Passing an unrecognised server
      // message straight through is what leaked whether an address was registered.
      setLoginError(friendly);
      showToast({ title: "Unable to sign in", description: friendly, kind: "error" });
    }
  };

  return (
    <AuthCard title="Sign in" caption="Use the email your membership is registered to.">
      {sessionExpired && (
        <div
          role="status"
          className="mt-6 rounded-xl bg-[var(--ov-ember-wash)] px-4 py-3 text-[13px] leading-5 text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-ember-edge)]"
        >
          You were signed out after a period of inactivity. Please sign in again.
        </div>
      )}

      {isDeleteAccountLogin && (
        <div className="mt-6 rounded-xl bg-[var(--ov-ember-wash)] px-4 py-3 text-[13px] leading-5 text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-ember-edge)]">
          Sign in with the account you want to delete. We will take you back to the
          delete-account page for final confirmation.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <FormInput
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Enter your email id"
          value={email}
          onChange={handleEmailChange}
          error={emailError}
          isRequired
        />

        <div>
          <FormInput
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={handlePasswordChange}
            error={passwordError}
            isRequired
            showPasswordToggle
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {/* A real checkbox: reachable by keyboard, announced as one. Drawn
                from tokens because accent-color only tints a checked box, and
                the native unchecked one is a white square on this panel. */}
            <label className="inline-flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--ov-ink-2)]">
              <span className="relative inline-flex h-4 w-4 shrink-0">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] transition-colors checked:border-[color:var(--ov-ember-fill)] checked:bg-[var(--ov-ember-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                />
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="pointer-events-none absolute inset-0 h-4 w-4 text-[var(--ov-on-ember)] opacity-0 transition-opacity peer-checked:opacity-100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3.5 8.5l3 3 6-6" />
                </svg>
              </span>
              Remember me
            </label>

            <Link to="/forgot-password" className={AUTH_LINK}>
              Forgot password?
            </Link>
          </div>

          {/* Offered only once a sign-in attempt shows this account is still on the
              temporary password it was issued, so the link stays out of the way for
              everyone else. */}
          {credentialsNotSet && (
            <div className="mt-3 flex justify-end">
              {credentialsResent ? (
                <span className="text-[13px] text-[var(--ov-ink-4)]">
                  Credentials sent — check your email.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCredentials}
                  disabled={isResending}
                  className="text-[13px] font-medium text-[var(--ov-ember)] underline underline-offset-2 transition-colors hover:text-[var(--ov-ember-fill-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResending ? "Sending…" : "Resend login credentials"}
                </button>
              )}
            </div>
          )}
        </div>

        <button type="submit" disabled={isLoading} className={AUTH_SUBMIT}>
          {isLoading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </AuthCard>
  );
}
