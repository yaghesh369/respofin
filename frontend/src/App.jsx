import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import AppLoader from './components/common/AppLoader.jsx'
import { useAuth } from './hooks/useAuth.js'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import CustomersPage from './pages/CustomersPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import RecommendationsPage from './pages/RecommendationsPage.jsx'
import SegmentationPage from './pages/SegmentationPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

function ProtectedRoute() {
  const { isAuthenticated, isBooting } = useAuth()
  const location = useLocation()

  if (isBooting) {
    return <AppLoader label="Restoring your workspace" />
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/auth" />
  }

  return <AppLayout />
}

function PublicOnlyRoute() {
  const { isAuthenticated, isBooting } = useAuth()

  if (isBooting) {
    return <AppLoader label="Preparing sign in" />
  }

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />
  }

  return <AuthPage />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<PublicOnlyRoute />} path="/auth" />
        <Route element={<ProtectedRoute />} path="/">
          <Route element={<DashboardPage />} path="dashboard" />
          <Route element={<CustomersPage />} path="customers" />
          <Route element={<SegmentationPage />} path="segmentation" />
          <Route element={<RecommendationsPage />} path="recommendations" />
          <Route element={<NotificationsPage />} path="notifications" />
          <Route element={<AnalyticsPage />} path="analytics" />
          <Route element={<SettingsPage />} path="settings" />
        </Route>
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}

export default App
