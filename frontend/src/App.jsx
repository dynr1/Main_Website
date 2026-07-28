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
import GuestJoin from "./pages/GuestJoin";

function SiteLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

function App() {
  return (
    <Routes>
      {/* Standalone — no dynR navbar/footer, branded as the restaurant only */}
      <Route path="/join/:slug" element={<GuestJoin />} />

      {/* Everything else keeps the normal site layout */}
      <Route
        path="/"
        element={
          <SiteLayout>
            <Home />
          </SiteLayout>
        }
      />
      <Route
        path="/what-we-do"
        element={
          <SiteLayout>
            <WhatWeDo />
          </SiteLayout>
        }
      />
      <Route
        path="/our-story"
        element={
          <SiteLayout>
            <OurStory />
          </SiteLayout>
        }
      />
      <Route
        path="/for-restaurants"
        element={
          <SiteLayout>
            <ForRestaurants />
          </SiteLayout>
        }
      />
      <Route
        path="/contact"
        element={
          <SiteLayout>
            <Contact />
          </SiteLayout>
        }
      />
      <Route
        path="/login"
        element={
          <SiteLayout>
            <Login />
          </SiteLayout>
        }
      />
      <Route
        path="/membership"
        element={
          <SiteLayout>
            <AdminGate>
              <Membership />
            </AdminGate>
          </SiteLayout>
        }
      />
      <Route
        path="/dashboard"
        element={
          <SiteLayout>
            <Dashboard />
          </SiteLayout>
        }
      />
    </Routes>
  );
}

export default App;