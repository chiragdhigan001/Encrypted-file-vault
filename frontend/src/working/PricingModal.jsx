import { useState } from "react";
import axios from "axios";
import { CheckCircle2, Loader2, Shield, X, Zap } from "lucide-react";
import { toast } from "react-toastify";
import "./pricingModal.css";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    storage: "1 GB",
    bytes: 1_073_741_824,
    features: [
      "Up to 1 GB encrypted storage",
      "AES-256-GCM encryption",
      "Basic file sharing",
      "Community support"
    ],
    color: "#64748b",
    popular: false
  },
  {
    id: "basic",
    name: "Basic",
    price: 10,
    storage: "10 GB",
    bytes: 10_737_418_240,
    features: [
      "Up to 10 GB encrypted storage",
      "AES-256-GCM encryption",
      "Advanced file sharing",
      "File versioning",
      "Priority support"
    ],
    color: "#3b82f6",
    popular: true
  },
  {
    id: "pro",
    name: "Pro",
    price: 100,
    storage: "100 GB",
    bytes: 107_374_182_400,
    features: [
      "Up to 100 GB encrypted storage",
      "AES-256-GCM encryption",
      "Advanced file sharing",
      "File versioning",
      "Group management",
      "Audit logs & analytics",
      "Dedicated support"
    ],
    color: "#8b5cf6",
    popular: false
  }
];

export default function PricingModal({ backendUrl, currentPlan, onClose, onUpgraded }) {
  const [saving, setSaving] = useState(false);

  const handleUpgrade = async (planId) => {
    if (planId === currentPlan) {
      toast.info("You are already on this plan.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/upgrade-plan`, { plan: planId });
      if (data.success) {
        toast.success(data.message);
        onUpgraded?.(data);
        onClose();
      } else {
        toast.error(data.message || "Unable to upgrade plan.");
      }
    } catch (error) {
      toast.error("Unable to upgrade plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pricing-overlay" onClick={onClose}>
      <div className="pricing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pricing-header">
          <div>
            <p className="pricing-eyebrow">Upgrade Storage</p>
            <h2>Choose a plan that fits your needs</h2>
            <span>All plans include client-side AES-256-GCM encryption and secure file sharing.</span>
          </div>
          <button className="pricing-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="pricing-grid">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <div key={plan.id} className={`pricing-card ${isCurrent ? "current" : ""} ${plan.popular ? "popular" : ""}`}>
                {plan.popular && <div className="popular-badge">Most Popular</div>}
                <div className="pricing-card-header" style={{ "--plan-color": plan.color }}>
                  <Shield size={24} style={{ color: plan.color }} />
                  <h3>{plan.name}</h3>
                  <div className="pricing-amount">
                    <strong>${plan.price}</strong>
                    {plan.price > 0 && <span>/month</span>}
                  </div>
                  <p className="pricing-storage-label">{plan.storage} encrypted storage</p>
                </div>

                <ul className="pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`pricing-action ${isCurrent ? "current-plan" : ""}`}
                  disabled={saving || isCurrent}
                  onClick={() => handleUpgrade(plan.id)}
                  style={{ "--plan-color": plan.color }}
                >
                  {saving ? (
                    <><Loader2 size={16} className="spin" /> Working...</>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    <><Zap size={16} /> Upgrade to {plan.name}</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
