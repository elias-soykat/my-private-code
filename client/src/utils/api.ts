import axios from "axios";
import Cookies from "js-cookie";
import { LinkProps } from "../contexts/LinksContext";

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
    const { data } = await axios.post(`${VITE_BASE_URL}/signup`, {
      email,
      password,
      confirmPassword,
    });

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function verifyEmail(token: string) {
  try {
    const { data } = await axios.get(`${VITE_BASE_URL}/verify-email`, {
      params: { token },
    });

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
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
    const { data } = await axios.post(`${VITE_BASE_URL}/login`, {
      email,
      password,
    });

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    Cookies.set("jwt", data.token);
    Cookies.set("userId", data.data.user._id);
    Cookies.set("userMail", data.data.user.email);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function forgotPassword(email: string) {
  try {
    const { data } = await axios.post(`${VITE_BASE_URL}/forgotPassword`, {
      email,
    });

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    console.log(data);
    Cookies.set("forgotMail", email);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
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
    const { data } = await axios.patch(`${VITE_BASE_URL}/resetPassword`, {
      token,
      password,
      confirmPassword,
    });

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function logout() {
  try {
    const { data } = await axios.post(`${VITE_BASE_URL}/logout`);

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    Cookies.remove("jwt");
    Cookies.remove("userId");
    Cookies.remove("userMail");
    return data;
  } catch (error) {
    console.error(error);
    throw error;
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

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function createUserLink(links: LinkProps[]) {
  console.log(links);
  const token = Cookies.get("jwt");
  try {
    const { data } = await axios.post(`${VITE_BASE_URL}/links`, links, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
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
      `${VITE_BASE_URL}/profile-update`,
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

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getUserProfile() {
  const token = Cookies.get("jwt");
  try {
    const { data } = await axios.get(`${VITE_BASE_URL}/profile-update`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getOfflineUserProfile(id: string) {
  try {
    const { data } = await axios.get(`${VITE_BASE_URL}/offline-profile`, {
      params: { id },
    });

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getOfflineUserLinks(id: string) {
  try {
    const { data } = await axios.get(`${VITE_BASE_URL}/offline-links`, {
      params: { id },
    });

    if (data.status === "fail") {
      throw new Error(data.message);
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
