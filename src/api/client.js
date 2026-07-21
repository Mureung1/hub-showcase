import axios from "axios";

const client = axios.create({
  baseURL: "/v1",
  withCredentials: true,
});

export default client;
