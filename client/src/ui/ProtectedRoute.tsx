import Cookies from "js-cookie";
import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const jwt = Cookies.get("jwt");
  const navigate = useNavigate();

  useEffect(() => {
    if (!jwt) navigate("/login");
  }, [jwt, navigate]);

  return children;
}
