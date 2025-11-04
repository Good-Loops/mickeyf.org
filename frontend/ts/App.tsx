import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import Animations from "./pages/Animations";
import Games from "./pages/Games";

const App: React.FC = () => {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <nav className="nav">
          <ul className="nav__list">
            <li className="nav__item">
              <NavLink className="nav__link" to="/" end>
                Home
              </NavLink>
            </li>
            <li className="nav__item">
              <NavLink className="nav__link" to="/animations">Animations</NavLink>
            </li>
            <li className="nav__item">
              <NavLink className="nav__link" to="/games">Games</NavLink>
            </li>
            <li className="nav__item">
              <NavLink className="nav__link" to="/leaderboard">Leaderboard</NavLink>
            </li>
            <li className="nav__item">
              <NavLink className="nav__link" to="/social">Social</NavLink>
            </li>
            <li className="nav__item">
              <NavLink className="nav__link" to="/login">Login</NavLink>
            </li>
            <li className="nav__item">
              <NavLink className="nav__link" to="/register">Register</NavLink>
            </li>
          </ul>
        </nav>
      </header>

      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/animations" element={<Animations />} />
          <Route path="/games" element={<Games />} />
          {/* <Route path="/leaderboard" element={<Leaderboard />} /> */}
          {/* <Route path="/login" element={<Login />} /> */}
          {/* <Route path="/register" element={<Register />} /> */}
          {/* <Route path="/social" element={<Social />} /> */}
          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
      </main>
    </div>
  );
}

export default App;
