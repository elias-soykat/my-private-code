import axios from "axios";
import toast from "react-hot-toast";
import { useLinks } from "../../contexts/LinksContext";
import Loader from "../../ui/Loader";
import ProfileHeader from "../../ui/ProfileHeader";
import ProfilePhoneMockup from "../../ui/ProfilePhoneMockup";
import SaveBtn from "../../ui/SaveBtn";
import TransparentLoader from "../../ui/TransparentLoader";
import { useLogout } from "../../ui/useLogout";
import { useGetUserProfile } from "../profile/useGetUserProfile";
import { useUpdateProfile } from "../profile/useUpdateProfile";
import ProfileCustomizeLinks from "./ProfileCustomizeLinks";
import { useCreateUserLink } from "./useCreateUserLink";
import { useUserLink } from "./useUserLink";

export default function ProfileLinksSection() {
  const { isFetching } = useUserLink();
  const { isPending } = useGetUserProfile();
  const { createUserLink, isCreating } = useCreateUserLink();
  const { isUpdating } = useUpdateProfile();
  const { isLogoutPending } = useLogout();
  const { links } = useLinks();

  function saveLinksToDB() {
    createUserLink(links, {
      onSuccess: () => {
        toast.success("Link created successfully");
      },
      onError: (error: Error) => {
        if (axios.isAxiosError(error) && error.response) {
          toast.error(error.response.data.message);
        } else {
          toast.error("An unexpected error occurred");
        }
      },
    });
  }

  if (isFetching || isPending) return <Loader />;

  return (
    <main className="relative">
      <ProfileHeader />
      <section className="grid grid-cols-2 gap-8 pt-16 tablet:grid-cols-1 tablet:pt-0">
        <ProfilePhoneMockup />
        <ProfileCustomizeLinks isCreating={isCreating} />
        <SaveBtn
          disabled={links.length === 0 || isCreating}
          onSave={saveLinksToDB}
        />
        {(isFetching ||
          isCreating ||
          isUpdating ||
          isPending ||
          isLogoutPending) && <TransparentLoader />}
      </section>
    </main>
  );
}
