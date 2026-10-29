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
import DynRTeam from "./pages/dynR_team";
import MembershipInfo from "./pages/MembershipInfo";
import RegisterMember from "./pages/RegisterMember";
import PaymentResult from "./pages/PaymentResult";
import { Privacy, Terms } from "./pages/Legal";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import DashOverview from "./pages/DashOverview";
import DashReservations from "./pages/DashReservations";
import DashMembers from "./pages/DashMembers";
import DashMarketing from "./pages/DashMarketing";
import Unsubscribe from "./pages/Unsubscribe";
import GuestJoin from "./pages/GuestJoin";
import ReserveTable from "./pages/ReserveTable";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import FAQ from "./pages/FAQ";

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
      <Route path="/table/:slug" element={<ReserveTable />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />

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
        path="/faq"
        element={
          <SiteLayout>
            <FAQ />
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
  path="/forgot-password"
  element={
    <SiteLayout>
      <ForgotPassword />
    </SiteLayout>
  }
/>
<Route
  path="/reset-password"
  element={
    <SiteLayout>
      <ResetPassword />
    </SiteLayout>
  }
/>
      <Route
        path="/membership"
        element={
          <SiteLayout>
            <MembershipInfo />
          </SiteLayout>
        }
      />
      <Route
        path="/privacy"
        element={
          <SiteLayout>
            <Privacy />
          </SiteLayout>
        }
      />
      <Route
        path="/terms"
        element={
          <SiteLayout>
            <Terms />
          </SiteLayout>
        }
      />
      <Route
        path="/payment-success"
        element={
          <SiteLayout>
            <PaymentResult success />
          </SiteLayout>
        }
      />
      <Route
        path="/payment-cancelled"
        element={
          <SiteLayout>
            <PaymentResult success={false} />
          </SiteLayout>
        }
      />
      <Route
        path="/register-as-member"
        element={
          <SiteLayout>
            <RegisterMember />
          </SiteLayout>
        }
      />
      <Route
        path="/dynr-team-portal"
        element={
          <SiteLayout>
            <AdminGate>
              <DynRTeam />
            </AdminGate>
          </SiteLayout>
        }
      />
      {/* The restaurant's own workspace: sidebar layout, no public navbar/footer */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashOverview />} />
        <Route path="/dashboard/reservations" element={<DashReservations />} />
        <Route path="/dashboard/members" element={<DashMembers />} />
        <Route path="/dashboard/marketing" element={<DashMarketing />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route
        path="*"
        element={
          <SiteLayout>
            <NotFound />
          </SiteLayout>
        }
      />
    </Routes>
  );
}

export default App;