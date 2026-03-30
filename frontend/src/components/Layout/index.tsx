import { Outlet } from "react-router-dom";
import Navbar from "../Navbar";
import "./style.css";

export default function Layout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
}
