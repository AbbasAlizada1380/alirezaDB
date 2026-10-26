import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom"; // optional, if you use routing
import { signIn } from "../../../state/userSlice/userSlice";

const useSignin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate(); // optional
  const { loading, error, currentUser } = useSelector((state) => state.user);

const handleSignin = async (e) => {
  e.preventDefault();

  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  try {
    const resultAction = await dispatch(signIn({ email, password }));

    if (signIn.fulfilled.match(resultAction)) {
      const { accessToken, userData } = resultAction.payload;

      console.log("✅ Login successful:", resultAction.payload);

      // Save to localStorage so data persists after refresh
      localStorage.setItem(
        "authData",
        JSON.stringify({ accessToken, userData })
      );

      // Navigate after successful login
      navigate("/dashboard");
    } else {
      console.error("❌ Login failed:", resultAction.payload);
      alert(resultAction.payload || "Invalid credentials");
    }
  } catch (err) {
    console.error("⚠️ Unexpected login error:", err);
    alert("Something went wrong. Please try again.");
  }
};


  return {
    email,
    setEmail,
    password,
    setPassword,
    handleSignin,
    isLoading: loading,
    error,
    currentUser,
  };
};

export default useSignin;
