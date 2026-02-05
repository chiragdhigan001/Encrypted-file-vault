import { Shield } from "lucide-react";
import { useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";
import "./emailVerify.css";

const EmailVerify = () => {

  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const { backendUrl,isLoggedin, userData, getUserData } = useContext(AppContext);

  axios.defaults.withCredentials = true;

  // Autofocus first box
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Move to next input
  const handleInput = (e, index) => {
    if (e.target.value > 0 && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Move back on delete
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Paste OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").slice(0, 6);

    paste.split("").forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = char;
        const event = new Event("input", { bubbles: true });
        inputRefs.current[index].dispatchEvent(event);
      }
    });

    inputRefs.current[paste.length - 1]?.focus();
  };

  // Submit OTP
  const onSubmitHandler = async (e) => {
    e.preventDefault();

    const otp = inputRefs.current.map((e) => e.value).join("");

    if (otp.length !== 6) {
      return toast.error("Please enter 6 digit OTP");
    }

    try {
      
      const { data } = await axios.post(
        backendUrl + "/api/auth/verify-account",
        { otp: otp }
      );

      if (data.success) {
        toast.success("Account verified");
        await getUserData();
        navigate("/");
      } else {
        toast.error(data.message);
      }

    } catch (error) {
      toast.error(error.response?.data?.message || "Verification failed");
    }
  };

  // Redirect if already verified
  useEffect(() => {
    if (userData?.isAccountVerified) {
      navigate("/");
    }
  }, [isLoggedin, userData]);

  return (
    <div className="verify-container">

      <form className="verify-form" onSubmit={onSubmitHandler}>

        <div className="verify-header">

          <div className="shield-wrapper">
            <Shield size={36} className="shield-icon" />
          </div>

          <h1>Verify your account</h1>
          <p>Enter the 6-digit code sent to your email</p>

        </div>

        <div className="otp-inputs" onPaste={handlePaste}>

          {Array(6).fill(0).map((_, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              ref={(e) => (inputRefs.current[index] = e)}
              onInput={(e) => handleInput(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              required
            />
          ))}

        </div>

        <button type="submit" className="verify-btn">
          Verify Account
        </button>

      </form>

    </div>
  );
};

export default EmailVerify;
