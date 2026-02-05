import { useContext, useState, useRef } from 'react'
import { Lock, Mail, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import './resetPassword.css'

const ResetPassword = () => {
    const { backendUrl } = useContext(AppContext);
    const navigate = useNavigate();
    axios.defaults.withCredentials = true;

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [isOtpSubmitted, setIsOtpSubmitted] = useState(false);

    const inputRefs = useRef([]);

    const handleInput = (e, index) => {
        if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    // Step 1: Send Reset OTP
    const onSubmitEmail = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post(backendUrl + '/api/auth/send-reset-otp', { email });
            data.success ? (setIsEmailSent(true), toast.success(data.message)) : toast.error(data.message);
        } catch (error) {
            toast.error(error.message);
        }
    }

    // Step 2: Verify OTP
    const onSubmitOtp = async (e) => {
  e.preventDefault();

  const otpValue = inputRefs.current
    .filter(Boolean)
    .map((input) => input.value)
    .join("");

  if (otpValue.length !== 6) {
    return toast.error("Enter 6 digit OTP");
  }

  try {
    const { data } = await axios.post(
      backendUrl + "/api/auth/verify-reset-otp",
      { email, otp: otpValue }
    );

    if (data.success) {
      toast.success("OTP verified");
      setOtp(otpValue);
      setIsOtpSubmitted(true);
    } else {
      toast.error(data.message);
    }

  } catch (error) {
    toast.error(error.response?.data?.message || error.message);
  }
};

    // Step 3: Set New Password
    const onSubmitNewPassword = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post(backendUrl + '/api/auth/reset-password', { email, newPassword });
            if (data.success) {
                toast.success(data.message);
                navigate('/login');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    return (
        <div className='reset-container'>
            

            {/* --- STEP 1: ENTER EMAIL --- */}
            {!isEmailSent &&
                <form onSubmit={onSubmitEmail} className="reset-card">
                    <div className="reset-header">
                        <h1>Reset Password</h1>
                        <p>Enter your registered email to receive an OTP.</p>
                    </div>
                    <div className="input-group">
                        <Mail size={20} className='input-icon' />
                        <input type="email" placeholder="Email ID" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <button className='reset-btn'>Send OTP</button>
                </form>
            }

            {/* --- STEP 2: ENTER OTP --- */}
            {isEmailSent && !isOtpSubmitted &&
                <form onSubmit={onSubmitOtp} className="reset-card">
                    <div className="reset-header">
                        <Shield size={40} className='shield-icon-reset' />
                        <h1>Verify OTP</h1>
                        <p>Enter the 6-digit code sent to {email}</p>
                    </div>
                    <div className="otp-inputs">
                        {Array(6).fill(0).map((_, index) => (
                            <input key={index} type="text" maxLength="1" ref={e => inputRefs.current[index] = e} onInput={(e) => handleInput(e, index)} onKeyDown={(e) => handleKeyDown(e, index)} required />
                        ))}
                    </div>
                    <button className='reset-btn'>Verify & Continue</button>
                </form>
            }

            {/* --- STEP 3: NEW PASSWORD --- */}
            {isOtpSubmitted &&
                <form onSubmit={onSubmitNewPassword} className="reset-card">
                    <div className="reset-header">
                        <h1>New Password</h1>
                        <p>Enter your new password below.</p>
                    </div>
                    <div className="input-group">
                        <Lock size={20} className='input-icon' />
                        <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    </div>
                    <button className='reset-btn'>Submit</button>
                </form>
            }
        </div>
    )
}

export default ResetPassword