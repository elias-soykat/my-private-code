import axios from "axios";
import Cookies from "js-cookie";
import { LinkProps } from "../contexts/LinksContext";
import { handleError } from "./helper";

const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

export async function signUp({
  email,
  password,
  confirmPassword,
}: {
  email: string;
  password: string;
  confirmPassword: string;
}) {
  try {
    const { data } = await axios.post(`${VITE_BASE_URL}/users/signup`, {
      email,
      password,
      confirmPassword,
    });

    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function verifyEmail(token: string) {
  try {
    const { data } = await axios.get(`${VITE_BASE_URL}/users/verify-email`, {
      params: { token },
    });

    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    const { data } = await axios.post(`${VITE_BASE_URL}/users/login`, {
      email,
      password,
    });

    Cookies.set("jwt", data.token);
    Cookies.set("userId", data.data.user._id);
    Cookies.set("userMail", data.data.user.email);
    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function forgotPassword(email: string) {
  try {
    const { data } = await axios.post(`${VITE_BASE_URL}/users/forgotPassword`, {
      email,
    });

    Cookies.set("forgotMail", email);
    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function resetPassword({
  token,
  password,
  confirmPassword,
}: {
  token: string;
  password: string;
  confirmPassword: string;
}) {
  try {
    const { data } = await axios.patch(`${VITE_BASE_URL}/users/resetPassword`, {
      token,
      password,
      confirmPassword,
    });

    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function logout() {
  try {
    const { data } = await axios.post(`${VITE_BASE_URL}/users/logout`);

    Cookies.remove("jwt");
    Cookies.remove("userId");
    Cookies.remove("userMail");
    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function getUsersLink() {
  const token = Cookies.get("jwt");
  try {
    const { data } = await axios.get(`${VITE_BASE_URL}/links`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function createUserLink(links: LinkProps[]) {
  const token = Cookies.get("jwt");
  try {
    const { data } = await axios.post(`${VITE_BASE_URL}/links`, links, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function updateUserProfile({
  firstName,
  lastName,
  photo,
}: {
  firstName: string;
  lastName: string;
  photo: string;
}) {
  const token = Cookies.get("jwt");
  const email = Cookies.get("userMail");
  try {
    const { data } = await axios.patch(
      `${VITE_BASE_URL}/users/profile-update`,
      {
        firstName,
        lastName,
        email,
        photo,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function getUserProfile() {
  const token = Cookies.get("jwt");
  try {
    const { data } = await axios.get(`${VITE_BASE_URL}/users/profile-update`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function getOfflineUserProfile(id: string) {
  try {
    const { data } = await axios.get(`${VITE_BASE_URL}/users/offline-profile`, {
      params: { id },
    });

    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function getOfflineUserLinks(id: string) {
  try {
    const { data } = await axios.get(`${VITE_BASE_URL}/links/offline-links`, {
      params: { id },
    });

    return data;
  } catch (error) {
    handleError(error);
  }
}
