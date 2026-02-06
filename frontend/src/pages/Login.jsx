import "./login.css";
import { useContext, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";


const Login = () => {
  const navigate = useNavigate();

  const { backendUrl, setIsLoggedin, getUserData } = useContext(AppContext);

  const [state, setState] = useState("Register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmitHandler = async (e) => {
    try {
      e.preventDefault();

      axios.defaults.withCredentials = true;
      if (state === "Register") {
        const { data } = await axios.post(backendUrl + "/api/auth/register", {
          name,
          email,
          password,
        });

        if (data.success) {
          setIsLoggedin(true);
          getUserData()
          navigate("/");
        } else {
          toast.error(data.message);
        }
      } else {
        const { data } = await axios.post(backendUrl + "/api/auth/login", {
          email,
          password,
        });

        if (data.success) {
          setIsLoggedin(true);
          getUserData()
          navigate("/");
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Wrong credentials");
    }
  };

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
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              id="password"
              className="login-input"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button className="login-button" type="submit">
            {state === "Login" ? "Login" : "Create Account"}
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <button type="button" className="google-login">
            <FcGoogle size={20} />
            <span>{state === "Login" ? "Login" : "Sign up"} with Google</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
