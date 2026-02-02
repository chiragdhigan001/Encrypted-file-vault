import "./home.css";
import {
  Lock,
  MessageSquareLock,
  Sparkles,
  ArrowRight,
  Shield,
  Share2,
  Zap,
  Eye,
  Globe,
  Upload,
  Key,
  Download,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";


const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: "Miliatry Grade Encryption",
      description:
        "Your files are Protected wih AES-256 encryption, the same standard used by governments and financial institutions worldwide. ",
      gradient: "blue",
    },
    {
      icon: Lock,
      title: "End-to-end security",
      description:
        "Files are encrypted on your device before upload. Only you have the keys to decrypt your data.",
      gradient: "purple",
    },
    {
      icon: Share2,
      title: "Secure Sharing",
      description:
        "Share encrypted files with team members using secure links with expiration dates and password protection.",
      gradient: "green",
    },
    {
      icon: Zap,
      title: "Lightning fast",
      description:
        "Optimized encryption algorithms ensure your files are secured quickly without compromising safety.",
      gradient: "yellow",
    },
    {
      icon: Eye,
      title: "Zero-knowledge-architecture",
      description:
        "We never have access to your encryption keys or unencrypted data. Your privacy is guaranteed.",
      gradient: "red",
    },
    {
      icon: Globe,
      title: "Acess anywhere",
      description:
        "Securely access your encrypted files from any device, anywhere in the world.",
      gradient: "cyan",
    },
  ];

  const steps = [
    {
      icon: Upload,
      title: "Upload files",
      description:
        "Drag and drop files or folders into SecureVault. Supports all file types and sizes.",
      number: "01",
      color: "#58a6ff",
    },
    {
      icon: Key,
      title: "Automatic encryption",
      description:
        "Files are encrypted locally on your device using AES-256 before upload.",
      number: "02",
      color: "#bc8cff",
    },
    {
      icon: Download,
      title: "Access securely",
      descripion:
        "Download and decrypt files anytime. Share secure links with protection.",
      number: "03",
      color: "#3fb950",
    },
  ];

  const securityFeatures = [
    "AES-256 bit encryption",
    "Zero-knowledge architecture",
    "End-to-end encryption",
    "SOC 2 Type II certified",
    "GDPR compliant",
    "Regular security audits",
    "Two-factor authentication",
    "Encrypted backups",
  ];

  const { userData, backendUrl, setUserData, setIsLoggedin } =
    useContext(AppContext);

  const sendVerificationOtp = async () => {
    try {
      axios.defaults.withCredentials = true;

      const { data } = await axios.post(backendUrl + '/api/auth/send-verify-otp')

      if (data.success) {
        navigate('/email-verify')
        toast.success(data.message)
      }
      else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(backendUrl + "/api/auth/logout");
      if (data.success) {
        setIsLoggedin(false);
        setUserData(false);
        toast.success(data.message || "Logged out successfully");
        navigate("/");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="home-wrapper">
      {/*-----------------------------------------Header-------------------------------------- */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="header"
      >
        <div className="header-container">
          <div className="icon" onClick={() => navigate("/")}>
            <Lock size={30} />
            <span>Secure Vault</span>
          </div>

          <nav className="navbar">
            <Link to="#">Features</Link>
            <Link to="#">Security</Link>
            <Link to="#">Pricing</Link>
            <Link to="#">Docs</Link>
          </nav>

          <div className="actions">
            {userData ? (
              <div className="user-avatar-container">
                <div className="user-avatar">
                  {userData.name?.charAt(0).toUpperCase()}
                </div>
                <ul className="user-menu">
                  {!userData.isAccountVerified && (
                    <li onClick={(sendVerificationOtp)}>
                      Verify email
                    </li>
                  )}
                  <li className="reset-password" onClick={() => navigate('reset-password')}>
                    Reset password
                  </li>
                  <li onClick={logout} className="logout-item">
                    Logout
                  </li>
                  
                </ul>
              </div>
            ) : (
              <div className="auth-buttons">
                <button onClick={() => navigate("/login")} className="signin">
                  Sign in
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="get-started"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/*------------------------------------------Body --------------------------------------*/}

      <section className="body">
        <div className="body-bg" />
        <div className="orbit orbit-blue" />
        <div className="orbit orbit-purple" />
        <div className="grid-overlay" />

        <div className="body-container">
          <div className="body-content-wrapper">
            {" "}
            {/* Centering wrapper */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="badge"
            >
              <MessageSquareLock size={25} />
              <span>Open Source File Encryption</span>
              <Sparkles size={25} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }} // Fixed: Was y: 20
              transition={{ duration: 0.6 }}
              className="title"
            >
              Secure your files with <br />
              <span className="gradient-text">military grade encryption</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="body-desc"
            >
              SecureVault provides enterprise-level security for your sensitive
              files. Upload, encrypt, and share with confidence using end-to-end
              encryption.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="body-buttons"
            >
              <button className="btn-primary">
                Start encrypting
                <ArrowRight size={20} />
              </button>
              <button className="btn-secondary">View documentation</button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="stats-box"
            >
              <div className="stat-item">
                <strong>256 bit AES</strong>
                <span>Encryption Standard</span>
              </div>
              <div className="divider" />
              <div className="stat-item">
                <strong>100% Open source</strong>
                <span>Auditable</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/*------------------------------------------ Features --------------------------------------*/}

      <section id="features" className="features">
        <div className="features-bg blue-glow" />
        <div className="features-bg purple-glow" />

        <div className="features-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="features-header"
          >
            <h2>Everything you need to secure your files</h2>
            <p>
              Built with security-first principles and designed for teams that
              value privacy and compliance.
            </p>
          </motion.div>

          <div className="features-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="feature-card"
                >
                  <div className={`icon-box ${feature.gradient}`}>
                    <Icon size={25} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/*---------------------------------------- How it works --------------------------------------*/}

      <section className="how-section">
        <div className="grid-bg" />

        <div className="how-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="how-header"
          >
            <h2>How it works</h2>
            <p>
              Simple, secure, and seamless. Get started in minutes with our
              intuitive interface.
            </p>
          </motion.div>

          <div className="steps-grid">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 1 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="step-card"
                >
                  {index < steps.length - 1 && <div className="step-line" />}
                  <div className="step-content">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 12,
                      }}
                      className="step-icon"
                      style={{ boxShadow: `0 0 35px ${step.color}66` }}
                    >
                      <Icon size={28} />
                    </motion.div>

                    <div className="step-number">{step.number}</div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/*---------------------------------------- Security --------------------------------------*/}

      <section id="security" className="security-section">
        <div className="security-glow" />

        <div className="security-container">
          <div className="security-grid">
            {/* Left Side */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="security-badge">
                <Shield size={16} />
                <span>Enterprise Security</span>
              </div>
              <h2>Security that meets the highest standards</h2>
              <p className="security-desc">
                We take security seriously. SecureVault is built from the ground
                up with enterprise-grade security features and compliance
                certifications to protect your most sensitive data.
              </p>

              <div className="security-features">
                {securityFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="security-item"
                  >
                    <CheckCircle2 size={18} />
                    <span>{feature}</span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="security-btn"
              >
                Read our security paper
              </motion.button>
            </motion.div>

            {/* Right Side */}

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="security-card">
                {[
                  {
                    title: "Encrypted at rest",
                    desc: "All data is encrypted using AES-256 before storage.",
                  },
                  {
                    title: "Encrypted in transit",
                    desc: "TLS 1.3 encryption for all data transmission.",
                  },
                  {
                    title: "Client-side encryption",
                    desc: "Keys never leave your device.",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  >
                    <div className="card-icon">
                      <CheckCircle2 size={22} />
                    </div>
                    <div className="card-title">{item.title}</div>
                    <div className="card-desc">{item.desc}</div>
                  </motion.div>
                ))}

                <div className="rating-box">
                  <div className="rating-text">
                    Trusted by security professionals
                  </div>

                  <div className="rating-now">
                    <strong>4.9/5</strong>
                  </div>

                  <div className="stars">
                    {[...Array(5)].map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                      >
                        ★
                      </motion.span>
                    ))}
                  </div>

                  <span className="reviews">2,500+ reviews</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
