import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { signUp as signUpApi } from "../utils/api";

export function UseSignup() {
  const { mutate: signUp, isPending: isSigningUp } = useMutation({
    mutationFn: (details: {
      email: string;
      password: string;
      confirmPassword: string;
    }) => signUpApi(details),
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error: { response: { data: { message: string } } }) => {
      toast.error(error.response.data.message);
    },
  });

  return { signUp, isSigningUp };
}
