import { CiLogout } from "react-icons/ci";
import { useLogout } from "./useLogout";

export default function Logout() {
  const { logout } = useLogout();

  return (
    <button
      className="flex items-center gap-4 text-[1.6rem] text-[#737373] transition-none hover:text-[#633cff] mobile:px-[1.6rem]"
      onClick={() => logout()}
    >
      <CiLogout size={"2rem"} />
      <span className="mobile:hidden">Logout</span>
    </button>
  );
}
