import { Link } from "react-router-dom";

export default function Logo() {
  const isMobile = window.screen.width <= 768;

  return (
    <Link to="/">
      <img
        src={`${isMobile ? "./logo-devlinks-small.svg" : "./logo-devlinks-large.svg"}`}
        alt="logo"
        className="mobile:px-[1.6rem]"
      />
    </Link>
  );
}
