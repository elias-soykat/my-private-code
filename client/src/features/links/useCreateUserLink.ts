import { useMutation } from "@tanstack/react-query";
import { LinkProps } from "../../contexts/LinksContext";
import { createUserLink as createUserLinkApi } from "../../utils/api";

export function useCreateUserLink() {
  const { mutate: createUserLink, isPending: isCreating } = useMutation({
    mutationFn: (details: LinkProps[]) => createUserLinkApi(details),
  });

  return { createUserLink, isCreating };
}
