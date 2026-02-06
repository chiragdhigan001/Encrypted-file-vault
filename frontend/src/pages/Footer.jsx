import { Lock, Github, Twitter, Linkedin } from "lucide-react";
import "./footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Top grid */}
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <Lock size={28} className="brand-icon" />
              <span>SecureVault</span>
            </div>
            <p>
              Enterprise-grade file encryption for individuals and teams. 
              Protecting your digital assets with zero-knowledge architecture.
            </p>
            <div className="socials">
              <a href="#"><Github size={22} /></a>
              <a href="#"><Twitter size={22} /></a>
              <a href="#"><Linkedin size={22} /></a>
            </div>
          </div>

          <div className="footer-links-col">
            <div className="footer-title">Product</div>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">Enterprise</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <div className="footer-title">Company</div>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <div className="footer-title">Resources</div>
            <ul>
              <li><a href="#">Documentation</a></li>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Community</a></li>
              <li><a href="#">Status</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <p>© 2026 SecureVault. All rights reserved.</p>
          <div className="legal-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;