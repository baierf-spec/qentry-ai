import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './styles.css';
import { SessionProvider } from './lib/session';
import { RequireAuth, Spinner } from './components';
import Landing from './pages/Landing';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Setup = lazy(() => import('./pages/Setup'));
const Line = lazy(() => import('./pages/app/Line'));
const Insights = lazy(() => import('./pages/app/Insights'));
const Settings = lazy(() => import('./pages/app/Settings'));
const TVs = lazy(() => import('./pages/app/TVs'));
const Poster = lazy(() => import('./pages/app/Poster'));
const Billing = lazy(() => import('./pages/app/Billing'));
const Customer = lazy(() => import('./pages/Customer'));
const TV = lazy(() => import('./pages/TV'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/setup" element={<RequireAuth needBusiness={false}><Setup /></RequireAuth>} />
            <Route path="/app" element={<RequireAuth><Line /></RequireAuth>} />
            <Route path="/app/insights" element={<RequireAuth><Insights /></RequireAuth>} />
            <Route path="/app/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/app/tv" element={<RequireAuth><TVs /></RequireAuth>} />
            <Route path="/app/poster" element={<RequireAuth><Poster /></RequireAuth>} />
            <Route path="/app/billing" element={<RequireAuth><Billing /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth needBusiness={false}><Admin /></RequireAuth>} />
            <Route path="/q/:slug" element={<Customer />} />
            <Route path="/tv" element={<TV />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>
);
