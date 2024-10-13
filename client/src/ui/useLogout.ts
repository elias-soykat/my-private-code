import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { logout as logoutApi } from "../utils/api";

export function useLogout() {
  const navigate = useNavigate();
  const { mutate: logout, isPending: isLogoutPending } = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      toast.success("Logged out successfully");
      navigate("/login");
    },
  });

  return { logout, isLogoutPending };
}
