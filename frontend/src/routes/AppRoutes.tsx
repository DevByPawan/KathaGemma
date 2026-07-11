import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Splash from '../pages/Splash';
import Welcome from '../pages/Welcome';
import Language from '../pages/Language';
import Avatar from '../pages/Avatar';
import Story from '../pages/Story';
import Voice from '../pages/Voice';
import Camera from '../pages/Camera';
import Celebration from '../pages/Celebration';
import Choice from '../pages/Choice';
import Parent from '../pages/Parent';
import { AppShell } from '../components/layout/AppShell';
import LoadingScreen from '../components/common/LoadingScreen';

// Lazy loaded core navigation tabs
const Home = lazy(() => import('../pages/Home'));
const Explore = lazy(() => import('../pages/Explore'));
const Rewards = lazy(() => import('../pages/Rewards'));
const Profile = lazy(() => import('../pages/Profile'));

const AppShellSuspended = () => (
  <Suspense fallback={<LoadingScreen />}>
    <AppShell />
  </Suspense>
);

const router = createBrowserRouter([
  { path: '/', element: <Splash /> },
  { path: '/welcome', element: <Welcome /> },
  { path: '/language', element: <Language /> },
  { path: '/avatar', element: <Avatar /> },
  {
    element: <AppShellSuspended />,
    children: [
      { path: '/home', element: <Home /> },
      { path: '/explore', element: <Explore /> },
      { path: '/rewards', element: <Rewards /> },
      { path: '/profile', element: <Profile /> },
    ],
  },
  { path: '/story', element: <Story /> },
  { path: '/choice', element: <Choice /> },
  { path: '/voice', element: <Voice /> },
  { path: '/camera', element: <Camera /> },
  { path: '/celebration', element: <Celebration /> },
  { path: '/parent', element: <Parent /> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
