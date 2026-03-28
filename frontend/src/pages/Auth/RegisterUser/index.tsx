import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import "./style.css";

export default function RegisterUser() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // form fields for regular user registration
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    birthday: "",
  });

  // update the matching field in form state
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // submit registration and redirect to login on success
  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/users", form);
      navigate("/login");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Registration failed");
      } else {
        setError("Registration failed");
      }
    }
  }

  return (
    <div className="RegisterUser">
      <form onSubmit={handleSubmit}>
        {/* show error message if registration fails */}
        {error && <p className="error">{error}</p>}
        <input
          name="firstName"
          type="text"
          placeholder="First Name"
          value={form.firstName}
          onChange={handleChange}
          required
        />
        <input
          name="lastName"
          type="text"
          placeholder="Last Name"
          value={form.lastName}
          onChange={handleChange}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <input
          name="phone"
          type="text"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
        />
        <input
          name="address"
          type="text"
          placeholder="Postal Address"
          value={form.address}
          onChange={handleChange}
        />
        <input
          name="birthday"
          type="date"
          placeholder="Birthday"
          value={form.birthday}
          onChange={handleChange}
        />
        <button type="submit">Register</button>
      </form>
    </div>
  );
}
