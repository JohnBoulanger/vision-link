import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import AddressSearch from "../../../components/AddressSearch";
import "./style.css";

interface ProfileForm {
  business_name: string;
  owner_name: string;
  phone_number: string;
  postal_address: string;
  lat: string;
  lon: string;
}

export default function BusinessProfileEdit() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileForm>({
    business_name: "",
    owner_name: "",
    phone_number: "",
    postal_address: "",
    lat: "",
    lon: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // load current profile on mount
  useEffect(() => {
    api
      .get("/businesses/me")
      .then((res) => {
        const d = res.data;
        setForm({
          business_name: d.business_name ?? "",
          owner_name: d.owner_name ?? "",
          phone_number: d.phone_number ?? "",
          postal_address: d.postal_address ?? "",
          lat: d.location?.lat != null ? String(d.location.lat) : "",
          lon: d.location?.lon != null ? String(d.location.lon) : "",
        });
      })
      .catch((err) =>
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load profile."
            : "Failed to load profile."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // called when user picks an address suggestion
  function handleAddressSelect(address: string, lat: number, lon: number) {
    setForm({ ...form, postal_address: address, lat: String(lat), lon: String(lon) });
    setError("");
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // validate coordinates only if filled (optional on edit)
    const lat = parseFloat(form.lat);
    const lon = parseFloat(form.lon);
    if (form.lat && (isNaN(lat) || lat < -90 || lat > 90)) {
      setError("Latitude must be between -90 and 90.");
      return;
    }
    if (form.lon && (isNaN(lon) || lon < -180 || lon > 180)) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (form.business_name) body.business_name = form.business_name;
      if (form.owner_name) body.owner_name = form.owner_name;
      if (form.phone_number) body.phone_number = form.phone_number;
      if (form.postal_address) body.postal_address = form.postal_address;
      // only send location if both coordinates are valid numbers
      if (!isNaN(lat) && !isNaN(lon) && form.lat && form.lon) {
        body.location = { lat, lon };
      }

      await api.patch("/businesses/me", body);
      setSuccess(true);
      // return to profile view after a short delay
      setTimeout(() => navigate("/business/profile"), 1200);
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Failed to save changes."
          : "Failed to save changes."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="BusinessProfileEdit">
        <p className="profile-edit-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="BusinessProfileEdit page-enter">
      <div className="profile-edit-card">
        <h2>Edit profile</h2>

        <form onSubmit={handleSubmit}>
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">Profile updated! Redirecting…</p>}

          <label className="profile-edit-label">
            Business name
            <input
              name="business_name"
              type="text"
              value={form.business_name}
              onChange={handleChange}
            />
          </label>

          <label className="profile-edit-label">
            Owner name
            <input name="owner_name" type="text" value={form.owner_name} onChange={handleChange} />
          </label>

          <label className="profile-edit-label">
            Phone number
            <input
              name="phone_number"
              type="text"
              value={form.phone_number}
              onChange={handleChange}
            />
          </label>

          {/* address autocomplete — populates postal_address, lat, lon.
              initialValue pre-fills the input when editing an existing profile */}
          <label className="profile-edit-label">
            Clinic address
            <AddressSearch
              placeholder="Search clinic address…"
              onSelect={handleAddressSelect}
              initialValue={form.postal_address}
            />
          </label>

          {/* lat/lon remain editable for manual override after autocomplete fill */}
          <div className="profile-edit-coords">
            <label className="profile-edit-label">
              Latitude
              <input
                name="lat"
                type="number"
                step="any"
                placeholder="–"
                value={form.lat}
                onChange={handleChange}
              />
            </label>
            <label className="profile-edit-label">
              Longitude
              <input
                name="lon"
                type="number"
                step="any"
                placeholder="–"
                value={form.lon}
                onChange={handleChange}
              />
            </label>
          </div>
          <p className="profile-edit-hint">
            Coordinates are filled automatically when you select an address
          </p>

          <div className="profile-edit-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/business/profile")}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
