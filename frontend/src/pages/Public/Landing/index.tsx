import { Link } from "react-router-dom";

// position types shown in the scrolling ticker
const TICKER_ITEMS = [
  "Dental Hygienist",
  "Orthodontist",
  "Registered Dental Assistant",
  "Oral Surgeon",
  "Periodontist",
  "Endodontist",
  "Dental Therapist",
  "General Dentist",
  "Prosthodontist",
  "Pediatric Dentist",
];
import { useAuth } from "../../../contexts/AuthContext/AuthContext";
import "./style.css";

export default function Landing() {
  const { isAuthenticated, role } = useAuth();

  // redirect authenticated users to their dashboard
  function getDashboardPath() {
    if (role === "business") return "/business/jobs";
    if (role === "admin") return "/admin/users";
    return "/jobs";
  }

  return (
    <div className="Landing">
      {/* full-screen hero */}
      <section className="hero">
        <div className="hero-inner">
          <p className="hero-eyebrow">dental staffing, simplified</p>
          <h1>
            The modern way to
            <br />
            staff dental clinics
          </h1>
          <p className="hero-subtitle">
            Connect qualified professionals with clinics that need them. Flexible shifts, verified
            credentials, real-time matching.
          </p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to={getDashboardPath()} className="btn-primary hero-btn">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary hero-btn">
                  Get started
                </Link>
                <Link to="/login" className="hero-signin">
                  Sign in →
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* getting started */}
      <section className="how-it-works">
        <p className="section-label">Getting started</p>
        <div className="steps">
          <div className="step">
            <span className="step-num">01</span>
            <h2>Create your account</h2>
            <p>Register as a dental professional or a clinic. Activation takes under a minute.</p>
          </div>
          <div className="step-divider" aria-hidden="true" />
          <div className="step">
            <span className="step-num">02</span>
            <h2>Get qualified</h2>
            <p>
              Submit credentials for review. Once approved, you appear in search results for
              matching positions.
            </p>
          </div>
          <div className="step-divider" aria-hidden="true" />
          <div className="step">
            <span className="step-num">03</span>
            <h2>Negotiate and match</h2>
            <p>
              Express interest or receive invitations. Negotiate terms and confirm your shift in
              real time.
            </p>
          </div>
        </div>
      </section>

      {/* scrolling position types ticker */}
      <section className="ticker-section" aria-label="Position types we staff">
        <p className="ticker-label">positions we staff</p>
        {/* duplicate items so the loop is seamless */}
        <div className="ticker-viewport" aria-hidden="true">
          <div className="ticker-track">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((name, i) => (
              <span key={i} className="ticker-item">
                {name}
                <span className="ticker-dot">·</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="browse-cta">
        <Link to="/businesses">Browse clinics →</Link>
      </section>
    </div>
  );
}
