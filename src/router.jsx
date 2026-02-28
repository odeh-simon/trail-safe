import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import RoleGuard from "@/components/layout/RoleGuard";
import AuthProvider from "@/components/layout/AuthProvider";
import OfflineBanner from "@/components/layout/OfflineBanner";
import Landing from "@/pages/Landing";
import JoinAsLeader from "@/pages/JoinAsLeader";
import JoinAsHiker from "@/pages/JoinAsHiker";
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
      { path: "/join/leader/:hikeId", element: <JoinAsLeader /> },
      { path: "/join/hiker/:hikeId", element: <JoinAsHiker /> },
      { path: "/register", element: <RoleGuard requiredRole="hiker"><Register /></RoleGuard> },
      { path: "/hiker", element: <RoleGuard requiredRole="hiker"><HikerHome /></RoleGuard> },
      { path: "/leader", element: <RoleGuard requiredRole="leader"><LeaderHome /></RoleGuard> },
      { path: "/organizer", element: <RoleGuard requiredRole="organizer"><OrganizerDashboard /></RoleGuard> },
      { path: "/compass/:incidentId", element: <RoleGuard requiredRole="leader"><Compass /></RoleGuard> },
      { path: "/emergency-card", element: <RoleGuard requiredRole={["hiker", "organizer", "leader"]}><EmergencyCard /></RoleGuard> },
      { path: "/incident/:id", element: <RoleGuard requiredRole={["organizer", "leader"]}><IncidentView /></RoleGuard> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
