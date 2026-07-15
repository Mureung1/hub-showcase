import axios from "axios";

const client = axios.create({
  baseURL: "/v1",
});

export default client;
