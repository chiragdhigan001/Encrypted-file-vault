import { useState } from "react";
import axios from "axios";
import { CreditCard, Loader2, Lock, Shield, X } from "lucide-react";
import { toast } from "react-toastify";
import "./checkoutModal.css";

export default function CheckoutModal({ backendUrl, plan, onClose, onComplete }) {
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saving, setSaving] = useState(false);

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cardName.trim() || cardNumber.replace(/\s/g, "").length < 16 || expiry.length < 5 || cvv.length < 3) {
      toast.error("Please fill in all card details correctly.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/process-payment`, {
        plan: plan.id,
        cardName: cardName.trim(),
        cardNumber: cardNumber.replace(/\s/g, ""),
        expiry,
        cvv
      });

      if (data.success) {
        toast.success(data.message);
        onComplete?.(data);
        onClose();
      } else {
        toast.error(data.message || "Payment failed.");
      }
    } catch (error) {
      toast.error("Payment processing error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="checkout-header">
          <div>
            <p className="checkout-eyebrow">Secure Checkout</p>
            <h2>Upgrade to {plan.name}</h2>
            <span className="checkout-plan-summary">{plan.storage} encrypted storage — ${plan.price}/month</span>
          </div>
          <button className="checkout-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="checkout-form">
          <div className="checkout-badge">
            <Lock size={16} />
            <span>Simulated payment — no real card data is stored or charged</span>
          </div>

          <div className="checkout-field">
            <label htmlFor="cardName">Cardholder Name</label>
            <input
              id="cardName"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="John Doe"
              disabled={saving}
              required
            />
          </div>

          <div className="checkout-field">
            <label htmlFor="cardNumber">Card Number</label>
            <div className="checkout-input-wrap">
              <CreditCard size={18} />
              <input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4242 4242 4242 4242"
                disabled={saving}
                required
              />
            </div>
          </div>

          <div className="checkout-row">
            <div className="checkout-field">
              <label htmlFor="expiry">Expiry</label>
              <input
                id="expiry"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                disabled={saving}
                required
              />
            </div>
            <div className="checkout-field">
              <label htmlFor="cvv">CVV</label>
              <input
                id="cvv"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                type="password"
                disabled={saving}
                required
              />
            </div>
          </div>

          <div className="checkout-total">
            <span>Total</span>
            <strong>${plan.price}/month</strong>
          </div>

          <button type="submit" className="checkout-pay-btn" disabled={saving}>
            {saving ? (
              <><Loader2 size={18} className="spin" /> Processing...</>
            ) : (
              <><Shield size={18} /> Pay ${plan.price} — Upgrade to {plan.name}</>
            )}
          </button>

          <p className="checkout-note">Your payment information is processed securely. No real charges are made in this demo.</p>
        </form>
      </div>
    </div>
  );
}
