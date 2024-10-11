import Cookies from "js-cookie";
import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const jwt = Cookies.get("jwt");
  const navigate = useNavigate();

  useEffect(() => {
    if (!jwt || jwt === "undefined") {
      navigate("/login");
    }
  }, [jwt, navigate]);

  return <>{children}</>;
}

export default ProtectedRoute;
