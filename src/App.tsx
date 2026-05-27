import { BrowserRouter, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { CheckCircle, Home as HomeIcon, Plus } from "lucide-react";
import Add from "./pages/Add";
import Home from "./pages/Home";
import ImageManager from "./pages/ImageManager";
import Quiz from "./pages/Quiz";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-white hover:text-gray-300${isActive ? " font-semibold" : ""}`;

  return (
    <>
      <nav className="bg-gray-800 p-4">
        <ul className="flex space-x-6 items-center">
          <li>
            <NavLink to="/" end className={linkClass}>
              <HomeIcon className="inline mr-3" />
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/Add" className={linkClass}>
              <Plus className="inline mr-3" />
              Add
            </NavLink>
          </li>
          <li>
            <NavLink to="/Quiz" className={linkClass}>
              <CheckCircle className="inline mr-3" />
              Flashcards
            </NavLink>
          </li>
        </ul>
      </nav>
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/Add" element={<Add />} />
          <Route path="/Quiz" element={<Quiz />} />
          <Route path="/ImageManager" element={<ImageManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
