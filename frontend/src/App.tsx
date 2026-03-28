import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Layout from "./components/Layout";
import Landing from "./pages/Public/Landing";
import NotFound from "./pages/NotFound";
import AuthProvider from "./contexts/AuthContext/AuthProvider";
import Login from "./pages/Auth/Login";
import RegisterUser from "./pages/Auth/RegisterUser";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registerUser" element={<RegisterUser />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
