import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, useContext, createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { toast } from "sonner";

const UserContext = createContext();

const getLoginParams = async () => {
  let city = "Unknown City";
  let state = "Unknown State";
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      city = data.city || "Unknown City";
      state = data.region || "Unknown State";
    }
  } catch (err) {
    console.error("Failed to fetch location:", err);
  }

  // Detect simple browser/OS device string
  const ua = typeof window !== "undefined" ? navigator.userAgent : "";
  let device = "Desktop Browser";
  if (/mobile/i.test(ua)) device = "Mobile Device";
  else if (/tablet/i.test(ua)) device = "Tablet Device";

  if (/chrome/i.test(ua)) device = "Chrome";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) device = "Safari";
  else if (/firefox/i.test(ua)) device = "Firefox";
  else if (/edg/i.test(ua)) device = "Edge";

  return { city, state, device };
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [tempParams, setTempParams] = useState(null);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    setShowOtp(false);
    setTempParams(null);
    setOtpEmail("");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error?.code !== "auth/popup-closed-by-user") {
        console.error("Google sign-in failed:", error);
        toast.error(error?.message || "Google sign-in failed");
      }
    }
  };

  const verifyOtpCode = async (otpCode) => {
    try {
      const response = await axiosInstance.post("/user/verify-otp", {
        email: otpEmail,
        otpCode,
        ...tempParams,
      });
      login(response.data.result);
      setShowOtp(false);
      setTempParams(null);
      setOtpEmail("");
      toast.success("Security verification successful!");
      return { success: true };
    } catch (err) {
      console.error("OTP verification error:", err);
      const msg = err.response?.data?.message || "Verification code invalid or expired";
      return { success: false, message: msg };
    }
  };

  const updatePlanInState = (newPlan) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updated = { ...prevUser, plan: newPlan };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const updateThemeInState = (newTheme) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updated = { ...prevUser, theme: newTheme };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        const params = await getLoginParams();
        const firebaseProfile = {
          firebaseUid: firebaseuser.uid,
          email: firebaseuser.email,
          name: firebaseuser.displayName,
          image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        };

        try {
          const payload = {
            email: firebaseProfile.email,
            name: firebaseProfile.name,
            image: firebaseProfile.image,
            ...params,
          };
          const response = await axiosInstance.post("/user/login", payload);
          
          if (response.data.otpRequired) {
            setOtpEmail(firebaseProfile.email);
            setTempParams(params);
            setShowOtp(true);
            setUser({ ...firebaseProfile, isPendingOtp: true });
          } else {
            login(response.data.result);
          }
        } catch (error) {
          console.error("Could not sync the user profile:", error);
          login(firebaseProfile);
        }
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        updatePlanInState,
        updateThemeInState,
        showOtp,
        setShowOtp,
        verifyOtpCode,
        otpEmail,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

