import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import WhatWeDo from "./pages/WhatWeDo";
import OurStory from "./pages/OurStory";
import ForRestaurants from "./pages/ForRestaurants";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import AdminGate from "./components/AdminGate";
import Membership from "./pages/Membership";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/what-we-do" element={<WhatWeDo />} />
        <Route path="/our-story" element={<OurStory />} />
        <Route path="/for-restaurants" element={<ForRestaurants />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/membership"
          element={
            <AdminGate>
              <Membership />
            </AdminGate>
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>

      <Footer />
    </>
  );
}

export default App;