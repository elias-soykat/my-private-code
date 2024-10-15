import {
  FaCodepen,
  FaFacebook,
  FaLinkedin,
  FaStackOverflow,
  FaTwitch,
  FaYoutube,
} from "react-icons/fa";
import { IoLogoTwitter } from "react-icons/io";
import { PiDevToLogoFill, PiGithubLogoFill } from "react-icons/pi";
import { SiCodewars, SiGitlab, SiHashnode } from "react-icons/si";

export function getCorrespondingLogo(name: string, size?: string) {
  if (name === "Github") return <PiGithubLogoFill size={size} />;
  if (name === "Dev.to") return <PiDevToLogoFill size={size} />;
  if (name === "Codewars") return <SiCodewars size={size} />;
  if (name === "Gitlab") return <SiGitlab size={size} />;
  if (name === "Hashnode") return <SiHashnode size={size} />;
  if (name === "Twitter") return <IoLogoTwitter size={size} />;
  if (name === "LinkedIn") return <FaLinkedin size={size} />;
  if (name === "YouTube") return <FaYoutube size={size} />;
  if (name === "Facebook") return <FaFacebook size={size} />;
  if (name === "Twitch") return <FaTwitch size={size} />;
  if (name === "Codepen") return <FaCodepen size={size} />;
  if (name === "StackOverflow") return <FaStackOverflow size={size} />;
}

export function getBgColor(name: string) {
  if (name === "Github") return "bg-[#1a1a1a] text-white";
  if (name === "Twitter") return "bg-[#43b7e9] text-white";
  if (name === "LinkedIn") return "bg-[#2d68ff] text-white";
  if (name === "YouTube") return "bg-[#ee3939] text-white";
  if (name === "Facebook") return "bg-[#2442ac] text-white";
  if (name === "Dev.to") return "bg-[#333] text-white";
  if (name === "Codewars") return "bg-[#ba1a50] text-white";
  if (name === "Gitlab") return "bg-[#eb4925] text-white";
  if (name === "Hashnode") return "bg-[#0330d1] text-white";
  if (name === "StackOverflow") return "bg-[#ec7100] text-white";
  if (name === "Twitch") return "bg-[#ee3fc8] text-white";
  if (name === "Codepen") return "bg-[#464646] text-white";
}

export function getRightProfileUrl(name: string) {
  if (name === "Github") return "https://www.github.com/users";
  if (name === "Dev.to") return "https://www.dev.to/users";
  if (name === "Codewars") return "https://www.codewars.com/users";
  if (name === "Gitlab") return "https://www.gitlab.com/users";
  if (name === "Hashnode") return "https://www.hashnode.com/@users";
  if (name === "Twitter") return "https://www.twitter.com/users";
  if (name === "LinkedIn") return "https://www.linkedin.com/in/users";
  if (name === "YouTube") return "https://www.youtube.com/users";
  if (name === "Facebook") return "https://www.facebook.com/users";
  if (name === "Twitch") return "https://www.twitch.tv/users";
  if (name === "Codepen") return "https://www.codepen.io/users";
  if (name === "StackOverflow") return "https://www.stackoverflow.com/users";
}

export const handleError = (error: unknown) => {
  throw error;
};

export const checkStatusFailed = (data: {
  status: string;
  message: string;
}) => {
  if (data.status === "fail") {
    throw new Error(data.message);
  }
};

export type SignUpType = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginType = {
  email: string;
  password: string;
};

export type ResetPasswordType = {
  token: string;
  password: string;
  confirmPassword: string;
};

export type UserProfileType = {
  firstName: string;
  lastName: string;
  photo: string;
};
