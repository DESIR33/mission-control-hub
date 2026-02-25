import axiosLib from "axios";

const axios = axiosLib.create({
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axios;
