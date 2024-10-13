import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getOfflineUserLinks } from "../utils/api";

export function useGetOfflineLinks() {
  const { id } = useParams();
  const { data: offlineLinks, isPending: isOfflineLinksPending } = useQuery({
    queryKey: ["offlineLinks", id],
    queryFn: () => getOfflineUserLinks(id!),
    retry: false,
  });

  return { offlineLinks, isOfflineLinksPending };
}
