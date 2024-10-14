import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { forgotPassword as forgotPasswordApi } from "../utils/api";

export function useForgotPassword() {
  const { mutate: forgotPassword, isPending: isForgotPasswordLoading } =
    useMutation({
      mutationFn: (email: string) => forgotPasswordApi(email),
      onSuccess: (data) => {
        toast.success(data.message);
      },
      onError: (error: { response: { data: { message: string } } }) => {
        toast.error(error.response.data.message);
      },
    });

  return { forgotPassword, isForgotPasswordLoading };
}
