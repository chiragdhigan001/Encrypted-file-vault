import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodemailer.js';

// Register Controller
export const register = async (req,res) => {

    const {name, email, password} = req.body;

    if(!name || !email || !password ) {
        return res.json({ success: false, message: "Missing details, All fields are required" })
    }
    
    try {

        const existingUser = await userModel.findOne({email})

        if(existingUser) {
            return res.json({ success: false, message: "User already exist"})
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new userModel({
            name,
            email,
            password: hashedPassword
        })
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })

        res.cookie('token', token,{
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        
        // sending welcome email
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Welcome to Encryption File Vault',
            text: `Hello ${name},
            \n\nWelcome to Encryption File Vault! We're excited to have you on board.
            \n\nBest regards,
            \nThe Encryption File Vault Team`
        }

        await transporter.sendMail(mailOptions)

        return res.json({ success: true})

    } catch (error) {
       return res.json({ success: false, message: error.message})
    }
}

// Login Controller
export const login = async (req, res) => {
    const { email , password } = req.body;

    if(!email || !password) {
        return res.json({ success:false, message: "Missing details"})
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found" })
        }
        
        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch){
            return res.json({ success: false, message: "Invalid credentials" })
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })

        res.cookie('token', token,{
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.json({ success: true})

    } catch (error) {
        return res.json({ success: false, message: error.message })
    }
}

// Logout Controller
export const logout = async (req,res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })

        return res.json({ success: true, message: "Logged out successfully" })
        
    } catch (error) {
        return res.json({ success: false, message: error.message})
    }
}

// Send verification OTP
export const sendVerifyOTP = async (req,res) => {
    try {
        const userId = req.user.id

        const user = await userModel.findById(userId)

        if(!user) {
            return res.json({ success: false, message: 'User not found'})
        }

        if(user.isAccountVerified){
            return res.json({ success: false, message: 'Account already verified'})
        }

        // Generate 6 digit OTP
        const OTP = String(Math.floor(100000 + Math.random() * 900000))

        user.verifyOTP = OTP
        user.verifyOTPExpiryAt = Date.now() + 10 * 60 * 1000

        await user.save()

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account Verification OTP',
            text: `Your OTP for account verification is ${OTP}. 
            \n\nThis OTP is valid for 10 minutes.`
        }

        await transporter.sendMail(mailOption)

        return res.json({ success:true, message: 'OTP sent to your email address'})

    } catch (error) {
        res.json({ success: false, message: error.message})
    }
}

// Verify Email Controller
export const verifyEmail = async (req, res) => {
  try {
    const userId = req.user.id;        // <-- get from JWT
    const { otp } = req.body;          // <-- still from body

    if (!otp) {
      return res.json({ success: false, message: "OTP is required" });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (!user.verifyOTP || user.verifyOTP !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.verifyOTPExpiryAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }

    user.isAccountVerified = true;
    user.verifyOTP = "";
    user.verifyOTPExpiryAt = 0;

    await user.save();

    return res.json({ success: true, message: "Email verified successfully" });

  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// Check if user is authenticated
export const isAuthenticated = async (req,res) => {
    try {
        return res.json({ success: true })
    } catch (error) {
        return res.json({ success: false, message: error.message})
    }
    
}

// Send password reset OTP
export const sendResetPasswordOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({
      success: false,
      message: "Email is required"
    });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    const OTP = String(Math.floor(100000 + Math.random() * 900000));

    user.verifyOTP = OTP;
    user.verifyOTPExpiryAt = Date.now() + 10 * 60 * 1000;

    await user.save();

    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is ${OTP}.`
    };

    await transporter.sendMail(mailOption);

    return res.json({
      success: true,
      message: "OTP sent to your email address"
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message
    });
  }
};

// Verify Reset OTP
export const verifyResetOTP = async (req, res) => {

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.json({
      success: false,
      message: "Missing details"
    });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.verifyOTP || user.verifyOTP !== otp) {
      return res.json({
        success: false,
        message: "Invalid OTP"
      });
    }

    if (user.verifyOTPExpiryAt < Date.now()) {
      return res.json({
        success: false,
        message: "OTP expired"
      });
    }

    // Mark OTP as verified
    user.verifyOTP = "VERIFIED";
    await user.save();

    return res.json({
      success: true,
      message: "OTP verified"
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message
    });
  }
};

// Reset User Password
export const resetPassword = async (req, res) => {

  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.json({
      success: false,
      message: "Missing details"
    });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    // ✅ ONLY CHECK VERIFIED FLAG
    if (user.verifyOTP !== "VERIFIED") {
      return res.json({
        success: false,
        message: "OTP not verified"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.verifyOTP = "";
    user.verifyOTPExpiryAt = 0;

    await user.save();

    return res.json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message
    });
  }
};

