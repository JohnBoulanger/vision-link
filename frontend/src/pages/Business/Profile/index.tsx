import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface BusinessProfile {
  id: number;
  business_name: string;
  owner_name: string;
  email: string;
  phone_number: string | null;
  postal_address: string | null;
  location: { lat: number; lon: number } | null;
  avatar: string | null;
  biography: string | null;
  verified: boolean;
  activated: boolean;
  createdAt: string;
}

export default function BusinessProfile() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const avatarRef = useRef<HTMLInputElement | null>(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  useEffect(() => {
    api
      .get("/businesses/me")
      .then((res) => setProfile(res.data))
      .catch((err) =>
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load profile."
            : "Failed to load profile."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  // upload avatar directly from profile page
  async function handleAvatarUpload(file: File) {
    setUploadLoading(true);
    setUploadError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.put("/businesses/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((prev) => (prev ? { ...prev, avatar: res.data.avatar } : prev));
    } catch (err) {
      setUploadError(
        axios.isAxiosError(err) ? err.response?.data?.error || "Upload failed." : "Upload failed."
      );
    } finally {
      setUploadLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="error-message">{error}</p>;
  if (!profile) return null;

  // two-letter initials for avatar placeholder
  const initials = profile.business_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="BusinessProfile page-enter">
      {/* header row with edit button */}
      <div className="biz-profile-header">
        <h1>Business Profile</h1>
        <Link to="/business/profile/edit" className="btn-secondary btn-sm">
          Edit profile
        </Link>
      </div>

      {/* avatar + name block */}
      <div className="biz-profile-top">
        <div className="biz-avatar-wrap">
          {profile.avatar ? (
            <img
              src={`${backendUrl}${profile.avatar}`}
              alt="business avatar"
              className="biz-avatar"
            />
          ) : (
            <div className="biz-avatar-placeholder">{initials}</div>
          )}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            ref={avatarRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarUpload(file);
            }}
          />
          <button
            className="avatar-upload-btn"
            onClick={() => avatarRef.current?.click()}
            disabled={uploadLoading}
          >
            {uploadLoading ? "Uploading..." : "Change photo"}
          </button>
          {uploadError && <p className="error-message small">{uploadError}</p>}
        </div>

        <div className="biz-profile-identity">
          <div className="biz-name-row">
            <h2>{profile.business_name}</h2>
            {profile.verified ? (
              <span className="biz-badge verified">Verified</span>
            ) : (
              <span className="biz-badge unverified">Unverified</span>
            )}
          </div>
          <p className="biz-owner">Owner: {profile.owner_name}</p>
          <p className="biz-email">{profile.email}</p>
        </div>
      </div>

      {/* details grid */}
      <div className="biz-details-grid">
        {profile.phone_number && (
          <div className="biz-detail-item">
            <span className="detail-label">Phone</span>
            <span>{profile.phone_number}</span>
          </div>
        )}
        {profile.postal_address && (
          <div className="biz-detail-item">
            <span className="detail-label">Address</span>
            <span>{profile.postal_address}</span>
          </div>
        )}
        {profile.location && (
          <div className="biz-detail-item">
            <span className="detail-label">Coordinates</span>
            <span>
              {profile.location.lat.toFixed(4)}, {profile.location.lon.toFixed(4)}
            </span>
          </div>
        )}
        <div className="biz-detail-item">
          <span className="detail-label">Member since</span>
          <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* biography */}
      {profile.biography && (
        <div className="biz-bio">
          <span className="detail-label">About</span>
          <p>{profile.biography}</p>
        </div>
      )}

      {/* unverified warning — jobs can't be posted until admin verifies */}
      {!profile.verified && (
        <div className="biz-unverified-notice">
          Your account is pending verification by an administrator. You can browse the platform but
          cannot post jobs until verified.
        </div>
      )}
    </div>
  );
}
