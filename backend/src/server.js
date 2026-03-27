#!/usr/bin/env node
"use strict";

/*
 * NOTE: DO NOT CHANGE THIS FILE
 */

const port = (() => {
  const args = process.argv;

  if (args.length !== 3) {
    console.error(`usage: node src/server.js port`);
    process.exit(1);
  }

  const num = parseInt(args[2], 10);
  if (isNaN(num)) {
    console.error("error: argument must be an integer.");
    process.exit(1);
  }

  return num;
})();

const http = require("http");
const { create_app } = require("./app");
const { attach_sockets } = require("./socket");

const app = create_app();
const server = http.createServer(app);
attach_sockets(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

server.on("error", (err) => {
  console.error(`cannot start server: ${err.message}`);
  process.exit(1);
});
