// testRequest.js
async function main() {
  const response = await fetch("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation: "요즘 계속 야근해서 너무 지친다" }),
  });

  const data = await response.json();
  console.log(data);
}

main();