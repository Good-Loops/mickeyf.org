import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./Header";
import Home from "./pages/Home";
import Animations from "./pages/Animations";
import DancingCircles from "./pages/animations/DancingCircles";
import Games from "./pages/Games";
import Leaderboard from "./pages/Leaderboard";
import Social from "./pages/Social";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const App: React.FC = () => {
  return (
    <div className="app-shell">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/animations/*" element={<Animations />} />
          <Route path="/animations/dancing-circles" element={<DancingCircles />} />
          
          <Route path="/games" element={<Games />} />
          
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/social" element={<Social />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <p className="footer__text">
          <a className="footer__link" href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0 Universal</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
