import { Link } from "react-router-dom";
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
      {/* decorative floating shapes — scattered across the page */}
      <div className="deco-shapes" aria-hidden="true">
        {/* hero area — top right cluster */}
        <svg className="deco deco-ring" viewBox="0 0 80 80" width="80" height="80">
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke="var(--accent2)"
            strokeWidth="1.5"
            opacity="0.25"
          />
        </svg>
        <svg className="deco deco-cross" viewBox="0 0 40 40" width="40" height="40">
          <line
            x1="0"
            y1="20"
            x2="40"
            y2="20"
            stroke="var(--accent)"
            strokeWidth="1"
            opacity="0.15"
          />
          <line
            x1="20"
            y1="0"
            x2="20"
            y2="40"
            stroke="var(--accent)"
            strokeWidth="1"
            opacity="0.15"
          />
        </svg>
        <svg className="deco deco-dots" viewBox="0 0 60 20" width="60" height="20">
          <circle cx="10" cy="10" r="2.5" fill="var(--accent2)" opacity="0.2" />
          <circle cx="30" cy="10" r="2.5" fill="var(--accent2)" opacity="0.15" />
          <circle cx="50" cy="10" r="2.5" fill="var(--accent2)" opacity="0.1" />
        </svg>
        {/* mid-page — left side */}
        <svg className="deco deco-diamond" viewBox="0 0 50 50" width="50" height="50">
          <rect
            x="10"
            y="10"
            width="20"
            height="20"
            rx="2"
            fill="none"
            stroke="var(--accent2)"
            strokeWidth="1"
            opacity="0.18"
            transform="rotate(45 20 20)"
          />
        </svg>
        <svg className="deco deco-arc" viewBox="0 0 100 50" width="100" height="50">
          <path
            d="M10 40 Q50 0 90 40"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            opacity="0.12"
          />
        </svg>
        {/* lower area — right side */}
        <svg className="deco deco-triangle" viewBox="0 0 50 50" width="50" height="50">
          <polygon
            points="25,5 45,40 5,40"
            fill="none"
            stroke="var(--accent2)"
            strokeWidth="1"
            opacity="0.15"
          />
        </svg>
        <svg className="deco deco-line-cluster" viewBox="0 0 40 60" width="40" height="60">
          <line
            x1="10"
            y1="0"
            x2="10"
            y2="60"
            stroke="var(--accent2)"
            strokeWidth="0.8"
            opacity="0.12"
          />
          <line
            x1="20"
            y1="5"
            x2="20"
            y2="55"
            stroke="var(--accent)"
            strokeWidth="0.8"
            opacity="0.08"
          />
          <line
            x1="30"
            y1="10"
            x2="30"
            y2="50"
            stroke="var(--accent2)"
            strokeWidth="0.8"
            opacity="0.12"
          />
        </svg>
      </div>

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

      {/* how it works */}
      <section className="how-it-works">
        <p className="section-label">how it works</p>
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
            <h2>Get matched</h2>
            <p>
              Express interest or receive invitations. Negotiate terms and confirm your shift in
              real time.
            </p>
          </div>
        </div>
      </section>

      {/* feature cards */}
      <section className="features">
        <div className="feature-card">
          <span className="feature-num">01</span>
          <h2>For professionals</h2>
          <p>
            Browse available shifts, manage qualifications, and get matched with clinics near you.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-num">02</span>
          <h2>For clinics</h2>
          <p>
            Post positions, discover qualified candidates, and negotiate terms without
            back-and-forth.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-num">03</span>
          <h2>Verified credentials</h2>
          <p>Every professional is reviewed before appearing as a candidate for your role.</p>
        </div>
      </section>

      <section className="browse-cta">
        <Link to="/businesses">Browse clinics →</Link>
      </section>
    </div>
  );
}
