import Cookies from "js-cookie";
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const jwt = Cookies.get("jwt");
  const navigate = useNavigate();

  if (!jwt) {
    navigate("/login");
  }

  return children;
}

export default ProtectedRoute;
