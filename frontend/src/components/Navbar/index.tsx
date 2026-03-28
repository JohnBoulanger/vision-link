import { Link } from "react-router-dom";
import "./style.css";

export default function Navbar() {
  return (
    <>
      <header>
        <Link to="/">Home</Link>
        <Link to="/businessList">Business List</Link>
        <Link to="/businessProfile">Business Profile</Link>
        <Link to="/login">Login</Link>
        <Link to="/registerUser">Register</Link>
      </header>
    </>
  );
}
