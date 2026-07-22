import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import Storefront from './components/Storefront';
import ProductDetail from './components/ProductDetail';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import PWAInstallPrompt from './components/PWAInstallPrompt';

function ShopRoute() {
    const { slug } = useParams();
    const navigate = useNavigate();

    return (
        <Storefront
            shopSlug={slug}
            onSelectProduct={(id) => navigate(`/product/${id}`)}
            onNavigate={(view) => {
                if (view === 'login') navigate('/login');
                else if (view === 'dashboard') navigate('/dashboard');
            }}
        />
    );
}

function HomeRoute() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const shopSlug = searchParams.get('shop');

    if (!shopSlug) {
        return (
            <LandingPage
                onNavigate={(view) => {
                    if (view === 'login') navigate('/login');
                    else if (view === 'dashboard') navigate('/dashboard');
                }}
            />
        );
    }

    return (
        <Storefront
            shopSlug={shopSlug}
            onSelectProduct={(id) => navigate(`/product/${id}`)}
            onNavigate={(view) => {
                if (view === 'login') navigate('/login');
                else if (view === 'dashboard') navigate('/dashboard');
            }}
        />
    );
}

function ProductDetailRoute() {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <ProductDetail
            productId={id}
            onBack={() => navigate(-1)}
        />
    );
}

function AuthRoute() {
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (user) navigate('/dashboard', { replace: true });
    }, [user, navigate]);

    if (user) return null;

    return (
        <AuthPage onLoginSuccess={() => navigate('/dashboard')} />
    );
}

function DashboardRoute() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { replace: true });
        }
    }, [user, loading, navigate]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <Dashboard
            onNavigate={(view, extra) => {
                if (view === 'storefront') navigate(extra ? `/shops/${extra}` : '/');
            }}
        />
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <PWAInstallPrompt />
                <Routes>
                    <Route path="/" element={<HomeRoute />} />
                    <Route path="/shops/:slug" element={<ShopRoute />} />
                    <Route path="/s/:slug" element={<ShopRoute />} />
                    <Route path="/product/:id" element={<ProductDetailRoute />} />
                    <Route path="/login" element={<AuthRoute />} />
                    <Route path="/dashboard" element={<DashboardRoute />} />
                    <Route path="*" element={<HomeRoute />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

