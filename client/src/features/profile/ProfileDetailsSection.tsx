import { useForm } from "react-hook-form";
import { useUserContext } from "../../contexts/UserProfileContext";
import Loader from "../../ui/Loader";
import ProfileHeader from "../../ui/ProfileHeader";
import ProfilePhoneMockup from "../../ui/ProfilePhoneMockup";
import SaveBtn from "../../ui/SaveBtn";
import TransparentLoader from "../../ui/TransparentLoader";
import { useLogout } from "../../ui/useLogout";
import { useCreateUserLink } from "../links/useCreateUserLink";
import { useUserLink } from "../links/useUserLink";
import ProfileDetails from "./ProfileDetails";
import { useGetUserProfile } from "./useGetUserProfile";
import { useUpdateProfile } from "./useUpdateProfile";

type FormData = {
  firstName: string;
  lastName: string;
};

export default function ProfileDetailsSection() {
  const { isFetching } = useUserLink();
  const { isPending } = useGetUserProfile();
  const { isCreating } = useCreateUserLink();
  const { updateProfile, isUpdating } = useUpdateProfile();
  const { isLogoutPending } = useLogout();
  const { register, handleSubmit, formState } = useForm<FormData>();
  const { updateFirstName, updateLastName, photo } = useUserContext();
  const { errors } = formState;

  function onSubmitData(data: FormData): void {
    updateProfile(
      {
        firstName: data.firstName,
        lastName: data.lastName,
        photo: photo,
      },
      {
        onSuccess: () => {
          updateFirstName(data.firstName);
          updateLastName(data.lastName);
        },
      },
    );
  }

  if (isFetching || isPending) return <Loader />;

  return (
    <main className="relative">
      <ProfileHeader />
      <section className="grid grid-cols-2 gap-8 pt-16 tablet:grid-cols-1 tablet:pt-0">
        <ProfilePhoneMockup />
        <ProfileDetails
          register={register}
          errors={errors}
          handleSubmit={handleSubmit}
          isUpdating={isUpdating}
          onSubmitData={onSubmitData}
        />

        <SaveBtn disabled={false} onSave={handleSubmit(onSubmitData)} />
        {(isFetching ||
          isCreating ||
          isUpdating ||
          isPending ||
          isLogoutPending) && <TransparentLoader />}
      </section>
    </main>
  );
}
