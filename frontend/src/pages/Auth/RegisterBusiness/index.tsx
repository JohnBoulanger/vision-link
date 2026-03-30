import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import PasswordInput from "../../../components/PasswordInput";
import AddressSearch from "../../../components/AddressSearch";
import "../RegisterUser/style.css";
import "./style.css";

export default function RegisterBusiness() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // form fields matching backend expectations
  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    email: "",
    password: "",
    phone_number: "",
    postal_address: "",
    lat: "",
    lon: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // called when the user picks a suggestion from AddressSearch
  function handleAddressSelect(address: string, lat: number, lon: number) {
    setForm({ ...form, postal_address: address, lat: String(lat), lon: String(lon) });
    setError("");
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");

    if (!form.postal_address.trim()) {
      setError("Please enter and select a clinic address.");
      return;
    }

    // validate coordinates — filled by autocomplete or manually entered
    const lat = parseFloat(form.lat);
    const lon = parseFloat(form.lon);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError(
        form.lat
          ? "Latitude must be between -90 and 90."
          : "Please select an address from the suggestions, or enter coordinates manually."
      );
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setError(
        form.lon
          ? "Longitude must be between -180 and 180."
          : "Please select an address from the suggestions, or enter coordinates manually."
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/businesses", {
        business_name: form.business_name,
        owner_name: form.owner_name,
        email: form.email,
        password: form.password,
        phone_number: form.phone_number,
        postal_address: form.postal_address,
        location: { lat, lon },
      });
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
    <div className="RegisterBusiness page-enter">
      <div className="auth-card">
        <h1>Register your clinic</h1>
        <p className="auth-subtitle">Create a business account</p>

        <form onSubmit={handleSubmit}>
          {error && <p className="error-message">{error}</p>}

          <input
            name="business_name"
            type="text"
            placeholder="Business name"
            value={form.business_name}
            onChange={handleChange}
            required
          />

          <input
            name="owner_name"
            type="text"
            placeholder="Owner name"
            value={form.owner_name}
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
            placeholder="Phone number"
            value={form.phone_number}
            onChange={handleChange}
            required
          />

          {/* address autocomplete — populates postal_address, lat, lon on selection */}
          <AddressSearch placeholder="Clinic address" onSelect={handleAddressSelect} required />

          {/* lat/lon are auto-filled by autocomplete; editable for manual override */}
          <div className="form-row">
            <input
              name="lat"
              type="number"
              step="any"
              placeholder="Latitude"
              value={form.lat}
              onChange={handleChange}
            />
            <input
              name="lon"
              type="number"
              step="any"
              placeholder="Longitude"
              value={form.lon}
              onChange={handleChange}
            />
          </div>
          <p className="hint">Filled automatically — you can also enter coordinates manually</p>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
