import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getOfflineUserProfile } from "../utils/api";

export function useGetOfflineUser() {
  const { id } = useParams();
  const { data: offlineUser, isPending: isOfflineUserPending } = useQuery({
    queryKey: ["offlineUser"],
    queryFn: () => getOfflineUserProfile(id!),
    retry: false,
  });

  return { offlineUser, isOfflineUserPending };
}
