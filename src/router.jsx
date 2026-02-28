import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import AuthProvider from "@/components/layout/AuthProvider";
import OfflineBanner from "@/components/layout/OfflineBanner";
import Landing from "@/pages/Landing";
import Register from "@/pages/Register";
import HikerHome from "@/pages/HikerHome";
import LeaderHome from "@/pages/LeaderHome";
import OrganizerDashboard from "@/pages/OrganizerDashboard";
import Compass from "@/pages/Compass";
import EmergencyCard from "@/pages/EmergencyCard";
import IncidentView from "@/pages/IncidentView";

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <OfflineBanner />
        <Outlet />
      </AuthProvider>
    ),
    children: [
      { path: "/", element: <Landing /> },
      { path: "/register", element: <Register /> },
      { path: "/hiker", element: <HikerHome /> },
      { path: "/leader", element: <LeaderHome /> },
      { path: "/organizer", element: <OrganizerDashboard /> },
      { path: "/compass/:incidentId", element: <Compass /> },
      { path: "/emergency-card", element: <EmergencyCard /> },
      { path: "/incident/:id", element: <IncidentView /> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
