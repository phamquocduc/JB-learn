import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import HomePage from '../pages/HomePage';
import CoursesPage from '../pages/CoursesPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ShadowingLibraryPage from '../pages/ShadowingLibraryPage';
import ShadowingWorkspacePage from '../pages/ShadowingWorkspacePage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Main Application Layout with Sidebar */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage key="home-all" defaultScope="all" />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/my-cards" element={<HomePage key="home-mine" defaultScope="mine" />} />
        <Route path="shadowing" element={<ShadowingLibraryPage />} />
        <Route path="shadowing/:videoId" element={<ShadowingWorkspacePage />} />
      </Route>

      {/* Dedicated Authentication Layout for /login & /register URLs */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
