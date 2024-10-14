import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { login } from "../utils/api";

export function useLogin() {
  const navigate = useNavigate();
  const { mutate: loginFn, isPending: isLoggingIn } = useMutation({
    mutationFn: (details: { email: string; password: string }) =>
      login(details),
    onSuccess: () => {
      toast.success("Login successfully");
      navigate("/add-links");
    },
    onError: (error: { response: { data: { message: string } } }) => {
      toast.error(error.response.data.message);
    },
  });

  return { loginFn, isLoggingIn };
}
