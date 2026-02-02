import { Routes, Route } from "react-router-dom"
import Home from './pages/Home.jsx'
import Login from "./pages/Login.jsx"
import Logout from "./pages/Logout"
import EmailVerify from "./pages/EmailVerify.jsx"
import ResetPassword from "./pages/ResetPassword.jsx"
import Footer from "./pages/Footer.jsx"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UnlockScreen from "./working/UnlockScreen.jsx"




const App = () => {
  return (
    <div>
      <ToastContainer />
        <Routes>
            <Route path="/" element={<Home />}/>
            <Route path="login" element={<Login />}/>
            <Route path="logout" element={<Logout />}/>
            <Route path="email-verify" element={<EmailVerify />}/>
            <Route path="reset-password" element={<ResetPassword />}/>
            <Route path="unlock-screen" element={<UnlockScreen />}/>
        </Routes>

        <Footer />
    </div>
  )
}

export default App