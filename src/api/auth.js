import client from "./client.js";

export async function signup({ employeeNo, name, password, department }) {
  const { data } = await client.post("/auth/signup", {
    employee_no: employeeNo,
    name,
    password,
    department,
  });
  return data.user;
}

export async function login({ employeeNo, password }) {
  const { data } = await client.post("/auth/login", {
    employee_no: employeeNo,
    password,
  });
  return data.user;
}

export async function logout() {
  await client.post("/auth/logout");
}

export async function fetchMe() {
  const { data } = await client.get("/auth/me");
  return data.user;
}
