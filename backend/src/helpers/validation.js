// use regex to determine if the email is valid
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// check at least 1 lowercase, 1 uppercase, 1 digit, 1 special character, between length 8-20 regex
function isValidPassword(password) {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?/{}~|]).{8,20}$/;
  return passwordRegex.test(password);
}

function parseBoolean(value) {
  if (value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw { type: "validation" };
}

module.exports = { isValidEmail, isValidPassword, parseBoolean };
