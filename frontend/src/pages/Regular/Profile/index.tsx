import { useEffect, useRef, useState } from "react";
import axios from "axios";
import api from "../../../utils/api";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  postal_address: string;
  birthday: string;
  biography: string;
  avatar: string | null;
  resume: string | null;
  available: boolean;
  suspended: boolean;
}

interface ApprovedQual {
  id: number;
  position_type: { id: number; name: string };
  updatedAt: string;
}

export default function UserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [approvedQuals, setApprovedQuals] = useState<ApprovedQual[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadLoading, setUploadLoading] = useState<"avatar" | "resume" | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState("");

  // form state — separate from profile to allow cancel-style editing
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    postal_address: "",
    birthday: "",
    biography: "",
  });

  const avatarRef = useRef<HTMLInputElement | null>(null);
  const resumeRef = useRef<HTMLInputElement | null>(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  // load profile and approved qualifications on mount
  useEffect(() => {
    async function load() {
      try {
        const [profileRes, qualsRes] = await Promise.all([
          api.get("/users/me"),
          api.get("/qualifications/me", { params: { limit: 50 } }),
        ]);
        const p = profileRes.data as UserProfile;
        setProfile(p);
        setForm({
          first_name: p.first_name ?? "",
          last_name: p.last_name ?? "",
          phone_number: p.phone_number ?? "",
          postal_address: p.postal_address ?? "",
          birthday: p.birthday ? p.birthday.slice(0, 10) : "",
          biography: p.biography ?? "",
        });
        // only show approved qualifications on the profile
        setApprovedQuals(
          (qualsRes.data.results as ApprovedQual[]).filter(
            (q: ApprovedQual & { status: string }) => q.status === "approved"
          )
        );
      } catch {
        // profile load failure handled by the null check below
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // save editable profile fields — only send fields with a value
  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      // filter out empty strings so the backend doesn't reject a blank-field save
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      if (Object.keys(payload).length === 0) {
        setSaveError("Please fill in at least one field.");
        return;
      }
      const res = await api.patch("/users/me", payload);
      setProfile((prev) => (prev ? { ...prev, ...res.data } : prev));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(
        axios.isAxiosError(err) ? err.response?.data?.error || "Save failed." : "Save failed."
      );
    } finally {
      setSaving(false);
    }
  }

  // upload avatar or resume
  async function handleFileUpload(type: "avatar" | "resume", file: File) {
    setUploadLoading(type);
    setUploadError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.put(`/users/me/${type}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((prev) => (prev ? { ...prev, [type]: res.data[type] } : prev));
    } catch (err) {
      setUploadError(
        axios.isAxiosError(err) ? err.response?.data?.error || "Upload failed." : "Upload failed."
      );
    } finally {
      setUploadLoading(null);
    }
  }

  // toggle availability
  async function handleAvailability(value: boolean) {
    setAvailLoading(true);
    setAvailError("");
    try {
      await api.patch("/users/me/available", { available: value });
      setProfile((prev) => (prev ? { ...prev, available: value } : prev));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setAvailError("You need at least one approved qualification to set yourself as available.");
      } else {
        setAvailError("Failed to update availability.");
      }
    } finally {
      setAvailLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!profile) return <p className="error-message">Failed to load profile.</p>;

  return (
    <div className="UserProfile page-enter">
      <h1>Profile</h1>

      {/* avatar + quick info */}
      <div className="profile-top">
        <div className="profile-avatar-wrap">
          {profile.avatar ? (
            <img src={`${backendUrl}${profile.avatar}`} alt="avatar" className="profile-avatar" />
          ) : (
            <div className="profile-avatar-placeholder">
              {profile.first_name?.[0]}
              {profile.last_name?.[0]}
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            ref={avatarRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload("avatar", file);
            }}
          />
          <button
            className="avatar-upload-btn"
            onClick={() => avatarRef.current?.click()}
            disabled={uploadLoading === "avatar"}
          >
            {uploadLoading === "avatar" ? "Uploading..." : "Change photo"}
          </button>
        </div>

        <div className="profile-quick-info">
          <p className="profile-name">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="profile-email">{profile.email}</p>

          {/* availability toggle */}
          <div className="profile-availability">
            <span className="avail-label">Available for shifts</span>
            <button
              className={`avail-toggle ${profile.available ? "avail-on" : "avail-off"}`}
              onClick={() => handleAvailability(!profile.available)}
              disabled={availLoading || profile.suspended}
            >
              {profile.available ? "Available" : "Unavailable"}
            </button>
          </div>
          {availError && <p className="error-message small">{availError}</p>}
          {profile.suspended && <p className="profile-suspended">Account suspended</p>}
        </div>
      </div>

      {uploadError && <p className="error-message">{uploadError}</p>}

      {/* resume */}
      <div className="profile-resume">
        <span className="detail-label">Resume</span>
        <div className="profile-resume-row">
          {profile.resume ? (
            <a
              href={`${backendUrl}${profile.resume}`}
              target="_blank"
              rel="noreferrer"
              className="resume-link"
            >
              View resume (PDF)
            </a>
          ) : (
            <span className="resume-missing">No resume uploaded</span>
          )}
          <input
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            ref={resumeRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload("resume", file);
            }}
          />
          <button
            className="btn-secondary btn-sm"
            onClick={() => resumeRef.current?.click()}
            disabled={uploadLoading === "resume"}
          >
            {uploadLoading === "resume"
              ? "Uploading..."
              : profile.resume
                ? "Replace"
                : "Upload PDF"}
          </button>
        </div>
      </div>

      {/* approved qualifications */}
      <div className="profile-quals">
        <span className="detail-label">Approved qualifications</span>
        {approvedQuals.length === 0 ? (
          <p className="profile-quals-empty">None yet — submit a qualification request to get started.</p>
        ) : (
          <div className="profile-quals-list">
            {approvedQuals.map((q) => (
              <span key={q.id} className="profile-qual-badge">
                {q.position_type.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* editable fields form */}
      <form onSubmit={handleSave} className="profile-form">
        <h2>Edit details</h2>

        {saveError && <p className="error-message">{saveError}</p>}
        {saveSuccess && <p className="success-message">Profile saved.</p>}

        <div className="form-row">
          <div className="form-field">
            <label>First name</label>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              placeholder="First name"
            />
          </div>
          <div className="form-field">
            <label>Last name</label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="form-field">
          <label>Phone number</label>
          <input
            name="phone_number"
            value={form.phone_number}
            onChange={handleChange}
            placeholder="Phone number"
          />
        </div>

        <div className="form-field">
          <label>Postal address</label>
          <input
            name="postal_address"
            value={form.postal_address}
            onChange={handleChange}
            placeholder="Postal address"
          />
        </div>

        <div className="form-field">
          <label>Birthday</label>
          <input name="birthday" type="date" value={form.birthday} onChange={handleChange} />
        </div>

        <div className="form-field">
          <label>Biography</label>
          <textarea
            name="biography"
            value={form.biography}
            onChange={handleChange}
            placeholder="Tell clinics a bit about yourself..."
            rows={4}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
