const http = require("http");

const req = http.request(
  {
    hostname: "localhost",
    port: 4000,
    path: "/meetings",
    method: "GET",
    headers: {
      "x-user-id": "11111111-1111-1111-1111-111111111111"
    },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => {
      body += chunk;
    });
    res.on("end", () => {
      console.log("status:", res.statusCode);
      console.log("body:", body);
    });
  }
);

req.on("error", (err) => {
  console.error("요청 실패:", err);
});

req.end();
