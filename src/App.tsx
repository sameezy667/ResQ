/**
 * Main Application Component
 * 
 * Wraps the entire app with necessary providers:
 * - BrowserRouter for routing
 * - AuthProvider for authentication state management
 * 
 * Routes:
 * - / : Landing page
 * - /dashboard : Main dashboard (citizen/responder mode)
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { useResQStore } from './store/useResQStore';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';

export default function App() {
	const isDarkMode = useResQStore((state) => state.isDarkMode);

	// Apply theme on mount and when it changes
	useEffect(() => {
		if (isDarkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, [isDarkMode]);

	return (
		<AuthProvider>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<Landing />} />
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/analytics" element={<Analytics />} />
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}
