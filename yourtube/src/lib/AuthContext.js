import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, useContext, createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { toast } from "sonner";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Rehydrate from localStorage immediately so user is not null on page reload
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
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

  const updatePlanInState = (newPlan) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updated = { ...prevUser, plan: newPlan };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        const firebaseProfile = {
          firebaseUid: firebaseuser.uid,
          email: firebaseuser.email,
          name: firebaseuser.displayName,
          image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        };

        // Show signed-in user immediately; sync DB profile separately
        login(firebaseProfile);

        try {
          const payload = {
            email: firebaseProfile.email,
            name: firebaseProfile.name,
            image: firebaseProfile.image,
          };
          const response = await axiosInstance.post("/user/login", payload);
          login(response.data.result);
        } catch (error) {
          console.error("Could not sync the user profile:", error);
          toast.warning(
            "Signed in with Google, but the server profile is temporarily unavailable."
          );
        }
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin, updatePlanInState }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
