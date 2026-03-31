import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import AuthProvider from "./contexts/AuthContext/AuthProvider";
import ThemeProvider from "./contexts/ThemeContext/ThemeProvider";
import NegotiationProvider from "./contexts/NegotiationContext/NegotiationProvider";
import Layout from "./components/Layout";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// public pages
import Landing from "./pages/Public/Landing";
import BusinessList from "./pages/Public/BusinessList";
import PublicBusinessProfile from "./pages/Public/BusinessProfile";

// auth pages
import Login from "./pages/Auth/Login";
import RegisterUser from "./pages/Auth/RegisterUser";
import RegisterBusiness from "./pages/Auth/RegisterBusiness";
import AccountActivation from "./pages/Auth/AccountActivation";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";

// regular user pages
import Jobs from "./pages/Regular/Jobs";
import JobDetail from "./pages/Regular/JobDetail";
import MyJobs from "./pages/Regular/MyJobs";
import Qualifications from "./pages/Regular/Qualifications";
import RegularPositionTypes from "./pages/Regular/PositionTypes";
import UserProfile from "./pages/Regular/Profile";
import Negotiation from "./pages/Regular/Negotiation";

// business pages
import BusinessJobs from "./pages/Business/Jobs";
import BusinessJobDetail from "./pages/Business/JobDetail";
import BusinessJobCreate from "./pages/Business/JobCreate";
import BusinessCandidates from "./pages/Business/Candidates";
import BusinessCandidateDetail from "./pages/Business/CandidateDetail";
import BusinessJobInterests from "./pages/Business/JobInterests";
import BusinessProfile from "./pages/Business/Profile";
import BusinessProfileEdit from "./pages/Business/ProfileEdit";

// admin pages
import AdminUsers from "./pages/Admin/Users";
import AdminBusinesses from "./pages/Admin/Businesses";
import AdminQualifications from "./pages/Admin/Qualifications";
import AdminPositionTypes from "./pages/Admin/PositionTypes";
import AdminSettings from "./pages/Admin/Settings";

// catch-all
import NotFound from "./pages/NotFound";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* negotiation provider needs router context for useNavigate */}
          <NegotiationProvider>
            <Routes>
              {/* public layout: navbar + centered content */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Landing />} />
                <Route path="businesses" element={<BusinessList />} />
                <Route path="businesses/:businessId" element={<PublicBusinessProfile />} />

                {/* auth routes */}
                <Route path="login" element={<Login />} />
                <Route path="register" element={<RegisterUser />} />
                <Route path="register/business" element={<RegisterBusiness />} />
                <Route path="activate/:resetToken" element={<AccountActivation />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password/:resetToken" element={<ResetPassword />} />

                <Route path="*" element={<NotFound />} />
              </Route>

              {/* regular user dashboard */}
              <Route element={<ProtectedRoute allowedRoles={["regular"]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/jobs/:jobId" element={<JobDetail />} />
                  <Route path="/my-jobs" element={<MyJobs />} />
                  <Route path="/qualifications" element={<Qualifications />} />
                  <Route path="/position-types" element={<RegularPositionTypes />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/negotiations/me" element={<Negotiation />} />
                </Route>
              </Route>

              {/* business dashboard */}
              <Route element={<ProtectedRoute allowedRoles={["business"]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/business/jobs" element={<BusinessJobs />} />
                  <Route path="/business/jobs/new" element={<BusinessJobCreate />} />
                  <Route path="/business/jobs/:jobId" element={<BusinessJobDetail />} />
                  <Route path="/business/jobs/:jobId/candidates" element={<BusinessCandidates />} />
                  <Route
                    path="/business/jobs/:jobId/candidates/:userId"
                    element={<BusinessCandidateDetail />}
                  />
                  <Route
                    path="/business/jobs/:jobId/interests"
                    element={<BusinessJobInterests />}
                  />
                  <Route path="/business/profile" element={<BusinessProfile />} />
                  <Route path="/business/profile/edit" element={<BusinessProfileEdit />} />
                  <Route path="/business/negotiations/me" element={<Negotiation />} />
                </Route>
              </Route>

              {/* admin dashboard */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/businesses" element={<AdminBusinesses />} />
                  <Route path="/admin/qualifications" element={<AdminQualifications />} />
                  <Route path="/admin/position-types" element={<AdminPositionTypes />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                </Route>
              </Route>
            </Routes>
          </NegotiationProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
