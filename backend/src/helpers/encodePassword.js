const bcrypt = require("bcrypt");

// use bcrypt to hash password
async function encodePassword(password) {
  const enc = await bcrypt.hash(password, 10);
  return enc;
}

module.exports = encodePassword;
