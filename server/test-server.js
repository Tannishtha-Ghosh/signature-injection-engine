const http = require("http");

console.log("Before listen");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello from plain Node server\n");
});

server.listen(5000, () => {
  console.log("Plain Node server listening on port 5000");
});
