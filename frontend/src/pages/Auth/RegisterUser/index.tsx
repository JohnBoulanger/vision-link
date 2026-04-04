import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import PasswordInput from "../../../components/PasswordInput";
import "./style.css";

export default function RegisterUser() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // form fields matching backend snake_case expectations
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone_number: "",
    postal_address: "",
    birthday: "",
  });

  // update the matching field in form state
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // submit registration and redirect to activation
  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // only send birthday if the user actually entered one
      const { birthday, ...rest } = form;
      const payload: Record<string, string> = { ...rest };
      if (birthday) payload.birthday = birthday;
      const response = await api.post("/users", payload);
      // redirect to activation with the token from response
      navigate(`/activate/${response.data.resetToken}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError("An account with this email already exists.");
        } else {
          setError(err.response?.data?.error || "Registration failed");
        }
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="RegisterUser page-enter">
      <div className="auth-card">
        <h1>Create account</h1>
        <p className="auth-subtitle">Join as a dental professional</p>

        <form onSubmit={handleSubmit}>
          {error && <p className="error-message">{error}</p>}

          <div className="form-row">
            <input
              name="first_name"
              type="text"
              placeholder="First name"
              value={form.first_name}
              onChange={handleChange}
              required
            />
            <input
              name="last_name"
              type="text"
              placeholder="Last name"
              value={form.last_name}
              onChange={handleChange}
              required
            />
          </div>

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <PasswordInput
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <p className="hint">
            8–20 characters, uppercase, lowercase, digit, and special character
          </p>

          <input
            name="phone_number"
            type="text"
            placeholder="Phone number (optional)"
            value={form.phone_number}
            onChange={handleChange}
          />

          <input
            name="postal_address"
            type="text"
            placeholder="Postal address (optional)"
            value={form.postal_address}
            onChange={handleChange}
          />

          <input
            name="birthday"
            type="date"
            placeholder="Birthday (optional)"
            value={form.birthday}
            onChange={handleChange}
          />

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className="auth-footer">
          Registering a clinic? <Link to="/register/business">Register as business</Link>
        </p>
      </div>
    </div>
  );
}
