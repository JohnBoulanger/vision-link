import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { useNegotiation } from "../../contexts/NegotiationContext/NegotiationContext";
import Navbar from "../Navbar";
import "./style.css";

// sidebar links per role
const regularLinks = [
  { to: "/jobs", label: "Browse jobs" },
  { to: "/my-jobs", label: "My jobs" },
  { to: "/qualifications", label: "Qualifications" },
  { to: "/negotiations/me", label: "Negotiation" },
  { to: "/profile", label: "Profile" },
];

const businessLinks = [
  { to: "/business/jobs", label: "My jobs" },
  { to: "/business/jobs/new", label: "Post job" },
  { to: "/business/negotiations/me", label: "Negotiation" },
  { to: "/business/profile", label: "Profile" },
];

const adminLinks = [
  { to: "/admin/users", label: "Users" },
  { to: "/admin/businesses", label: "Businesses" },
  { to: "/admin/position-types", label: "Positions" },
  { to: "/admin/qualifications", label: "Qualifications" },
  { to: "/admin/settings", label: "Settings" },
];

export default function DashboardLayout() {
  const { role } = useAuth();
  const { hasActiveNeg } = useNegotiation();

  const links =
    role === "regular" ? regularLinks : role === "business" ? businessLinks : adminLinks;

  return (
    <>
      <Navbar />
      <div className="dashboard-shell">
        {/* left sidebar navigation */}
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            {links.map((link) => {
              // show a live badge on the negotiation link when active
              const isNegLink =
                link.to === "/negotiations/me" || link.to === "/business/negotiations/me";
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/business/jobs"}
                  className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
                >
                  {link.label}
                  {isNegLink && hasActiveNeg && (
                    <span className="sidebar-neg-dot" aria-label="active negotiation" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* main content area */}
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
