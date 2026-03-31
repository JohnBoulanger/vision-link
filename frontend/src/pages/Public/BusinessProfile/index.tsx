import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface BusinessData {
  id: number;
  business_name: string;
  email: string;
  phone_number: string;
  postal_address: string;
  location?: { lat: number; lon: number };
  avatar?: string;
  biography?: string;
}

export default function PublicBusinessProfile() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBusiness() {
      setLoading(true);
      try {
        const response = await api.get(`/businesses/${businessId}`);
        setBusiness(response.data);
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load business"
            : "Failed to load business"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchBusiness();
  }, [businessId]);

  if (loading) return <LoadingSpinner />;

  if (error || !business) {
    return (
      <div className="BusinessProfile page-enter">
        <p className="error-message">{error || "Business not found"}</p>
        <Link to="/businesses">&larr; Back to clinics</Link>
      </div>
    );
  }

  // build avatar url from backend
  const avatarUrl = business.avatar
    ? `${import.meta.env.VITE_BACKEND_URL}${business.avatar}`
    : null;

  return (
    <div className="BusinessProfile page-enter">
      <Link to="/businesses" className="back-link">
        &larr; All clinics
      </Link>

      <div className="profile-header">
        {/* avatar or initials placeholder */}
        {avatarUrl ? (
          <img src={avatarUrl} alt={business.business_name} className="profile-avatar" />
        ) : (
          <div className="profile-avatar-placeholder" aria-hidden="true">
            {business.business_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1>{business.business_name}</h1>
          <p className="profile-email">{business.email}</p>
        </div>
      </div>

      <div className="profile-details">
        <div className="detail-row">
          <span className="detail-label">Phone</span>
          <span>{business.phone_number}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Address</span>
          <span>{business.postal_address}</span>
        </div>
        {business.location && (
          <div className="detail-row">
            <span className="detail-label">Location</span>
            {/* link to google maps instead of showing raw coordinates */}
            <a
              href={`https://www.google.com/maps?q=${business.location.lat},${business.location.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="map-link"
            >
              View on map ↗
            </a>
          </div>
        )}
      </div>

      {business.biography && (
        <div className="profile-bio">
          <h3>About</h3>
          <p>{business.biography}</p>
        </div>
      )}
    </div>
  );
}
