const { AuthService } = require("../services/authService");

// authenticate an account holder and generate a jwt token
async function authenticateAccount(req, res) {
  try {
    const { email, password } = req.body;
    // didnt provide email or password
    if (!email || !password) {
      return res.status(400).json({ error: "Bad Request" });
    }
    const result = await AuthService.authenticateAccount(email, password);
    return res.status(200).json(result);
  } catch (error) {
    if (error.type === "unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Account Not Activated" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function createResetToken(req, res) {
  try {
    // check if email is valid
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Bad Request" });
    }
    const resetToken = await AuthService.createResetToken(email, req.ip);
    return res.status(202).json(resetToken);
  } catch (error) {
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Not Found" });
    }
    if (error.type === "rate_limit") {
      return res.status(429).json({ error: "Too Many Requests" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function useResetToken(req, res) {
  try {
    const { email, password } = req.body;
    const { resetToken } = req.params;
    if (!email) {
      return res.status(400).json({ error: "Bad Request" });
    }
    const response = await AuthService.useResetToken(email, password, resetToken);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(401).json({ error: "Invalid Password Format" });
    }
    if (error.type === "unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Not Found" });
    }
    if (error.type === "gone") {
      return res.status(410).json({ error: "Gone" });
    }

    return res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = { authenticateAccount, createResetToken, useResetToken };
