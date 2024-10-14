import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateUserProfile } from "../../utils/api";

export function useUpdateProfile() {
  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: (details: {
      firstName: string;
      lastName: string;
      photo: string;
    }) => updateUserProfile(details),
    onSuccess: () => {
      toast.success("Profile updated successfully");
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  return { updateProfile, isUpdating };
}
