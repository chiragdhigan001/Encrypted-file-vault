import { useState,createContext,useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";


export const AppContext = createContext();

export const AppContextProvider = (props) => {

    axios.defaults.withCredentials = true;

    const backendUrl = import.meta.env.VITE_BACKEND_URL
    console.log("Context initialized. Backend URL:", backendUrl);

    const [isLoggedin, setIsLoggedin] = useState(false)
    const [userData, setUserData] = useState(false)
    const [vaultSession, setVaultSession] = useState(null);

    const getAuthState = async () => {
      try {
        const { data } = await axios.get(backendUrl + '/api/auth/is-auth')
        if (data.success) {
          setIsLoggedin(true)
          getUserData()
        } else {
          setIsLoggedin(false)
          setUserData(false)
        }
      } catch (error) {
        setIsLoggedin(false)
        setUserData(false)
      }
    }

    const getUserData = async () => {
  try {
    const { data } = await axios.get(backendUrl + '/api/user/data');

    if (data && data.success) {
        setUserData(data.userData);
    } else {
        toast.error(data.message || "Failed to load user data");
    }
    
  } catch (error) {
    if (error.response?.status !== 401) {
      toast.error(error.response?.data?.message || error.message);
    }
  }
}

    useEffect(() => {
      getAuthState()
    },[])

    const value = {
        backendUrl,
        isLoggedin, setIsLoggedin,
        userData, setUserData,
        getUserData,
        vaultSession, setVaultSession
    };
  
  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};
