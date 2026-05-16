import "./login.css";
import { useContext, useEffect, useRef, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { KeyRound, Shield, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";

const Login = () => {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const {
    backendUrl,
    setIsLoggedin,
    getUserData
  } = useContext(AppContext);

  const [state, setState] = useState("Register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const completeLogin = async () => {
    setIsLoggedin(true);
    await getUserData();
    navigate("/");
  };

  const handleAuthSuccess = async (data) => {
    if (data.requiresMfa) {
      setMfaToken(data.mfaToken);
      toast.info("Enter your authenticator code to finish logging in.");
      return;
    }

    await completeLogin();
  };

  const onSubmitHandler = async (e) => {
    try {
      e.preventDefault();

      axios.defaults.withCredentials = true;
      if (state === "Register") {
        const { data } = await axios.post(`${backendUrl}/api/auth/register`, {
          name,
          email,
          password
        });

        if (data.success) {
          await completeLogin();
        } else {
          toast.error(data.message);
        }
      } else {
        const { data } = await axios.post(`${backendUrl}/api/auth/login`, {
          email,
          password
        });

        if (data.success) {
          await handleAuthSuccess(data);
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Wrong credentials");
    }
  };

  const handleMfaSubmit = async (event) => {
    event.preventDefault();
    try {
      const { data } = await axios.post(`${backendUrl}/api/security/auth/mfa/verify`, {
        mfaToken,
        otp: mfaCode,
        recoveryCode
      });

      if (data.success) {
        setMfaToken("");
        setMfaCode("");
        setRecoveryCode("");
        await completeLogin();
      } else {
        toast.error(data.message || "Unable to verify MFA.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to verify MFA.");
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current || typeof window === "undefined") {
      return undefined;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const { data } = await axios.post(`${backendUrl}/api/security/auth/google`, {
              credential: response.credential
            });

            if (data.success) {
              await handleAuthSuccess(data);
            } else {
              toast.error(data.message || "Google sign-in failed.");
            }
          } catch (error) {
            toast.error(error.response?.data?.message || "Google sign-in failed.");
          }
        }
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: state === "Login" ? "signin_with" : "signup_with",
        shape: "pill",
        width: 320
      });
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return undefined;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [backendUrl, googleClientId, state]);

  if (mfaToken) {
    return (
      <div className="login-container">
        <div className="login-header">
          <Shield className="shield-icon" size={60} />
          <h1>Multi-Factor Check</h1>
          <p>Use your authenticator code or a recovery code to complete sign-in</p>
        </div>

        <div className="login-card">
          <form onSubmit={handleMfaSubmit} className="login-form">
            <div className="mfa-banner">
              <KeyRound size={18} />
              <span>Your account is protected with two-factor authentication.</span>
            </div>

            <div className="input-group">
              <label htmlFor="mfa-code">Authenticator code</label>
              <input
                id="mfa-code"
                className="login-input"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                placeholder="123456"
              />
            </div>

            <div className="input-group">
              <label htmlFor="recovery-code">Recovery code</label>
              <input
                id="recovery-code"
                className="login-input"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                placeholder="Optional backup code"
              />
            </div>

            <button className="login-button" type="submit">
              Verify and Continue
            </button>

            <button
              type="button"
              className="secondary-login-action"
              onClick={() => {
                setMfaToken("");
                setMfaCode("");
                setRecoveryCode("");
              }}
            >
              Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-header">
        <Shield className="shield-icon" size={60} />
        <h1>Encrypted File Vault</h1>
        <p>Secure your files with end-to-end encryption</p>
      </div>

      <div className="login-card">
        <form onSubmit={onSubmitHandler} className="login-form">
          <ul className="auth-toggle">
            <li
              onClick={() => setState("Register")}
              className={state === "Register" ? "active" : ""}
            >
              Register
            </li>
            <li
              onClick={() => setState("Login")}
              className={state === "Login" ? "active" : ""}
            >
              Login
            </li>
          </ul>

          {state === "Register" && (
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <input
                onChange={(e) => setName(e.target.value)}
                value={name}
                type="text"
                id="name"
                className="login-input"
                placeholder="Username"
                required
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              type="email"
              id="email"
              className="login-input"
              placeholder="Email"
              required
            />
          </div>

          <div className="input-group">
            <div className="label-row">
              <label htmlFor="password">Password</label>
              {state === "Login" && (
                <Link to="/reset-password" className="forgot-link">
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="password-input-wrap">
              <input
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                id="password"
                className="login-input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button className="login-button" type="submit">
            {state === "Login" ? "Login" : "Create Account"}
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <div className="google-login-wrap">
            {googleClientId ? (
              <div ref={googleButtonRef} className="google-render-slot" />
            ) : (
              <button type="button" className="google-login" onClick={() => toast.info("Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in.")}>
                <FcGoogle size={20} />
                <span>{state === "Login" ? "Login" : "Sign up"} with Google</span>
              </button>
            )}
          </div>

          {googleClientId && !googleReady && (
            <p className="google-hint">Loading Google sign-in...</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
