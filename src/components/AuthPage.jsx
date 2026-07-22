import React, { useState } from 'react';
import { account, ID } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ onLoginSuccess }) {
    const { refreshUserAndShop } = useAuth();
    const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        setLoading(true);
        try {
            await account.createEmailPasswordSession(email, password);
            await refreshUserAndShop();
            onLoginSuccess();
        } catch (err) {
            console.error('Login error:', err);
            if (err.code === 401) {
                setError('Invalid email or password. Please try again.');
            } else {
                setError(err.message || 'Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (!name || !email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            await account.create(ID.unique(), email, password, name);
            await account.createEmailPasswordSession(email, password);
            await refreshUserAndShop();
            onLoginSuccess();
        } catch (err) {
            console.error('Register error:', err);
            if (err.code === 409) {
                setError('An account with this email already exists.');
            } else {
                setError(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Brand */}
                <div className="auth-brand">
                    <div className="brand-icon">
                        <i className="ph-fill ph-planet"></i>
                    </div>
                    <h1>Inventory Manager</h1>
                    <p>Manage your computer shop inventory</p>
                </div>

                {/* Tabs */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('login'); setError(''); setEmail(''); setPassword(''); setName(''); }}
                    >
                        Sign In
                    </button>
                    <button
                        className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('register'); setError(''); setEmail(''); setPassword(''); setName(''); }}
                    >
                        Create Account
                    </button>
                </div>

                {/* Error */}
                {error && <div className="auth-error show">{error}</div>}

                {/* Login Form */}
                {activeTab === 'login' && (
                    <form className="auth-form active" onSubmit={handleLogin}>
                        <div className="input-group">
                            <label htmlFor="login-email">Email Address</label>
                            <input
                                type="email"
                                id="login-email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <i className="ph ph-envelope input-icon"></i>
                        </div>
                        <div className="input-group">
                            <label htmlFor="login-password">Password</label>
                            <input
                                type="password"
                                id="login-password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                            <i className="ph ph-lock input-icon"></i>
                        </div>
                        <button type="submit" className={`auth-submit ${loading ? 'loading' : ''}`} disabled={loading}>
                            <span className="btn-text">Sign In</span>
                            <div className="spinner"></div>
                        </button>
                    </form>
                )}

                {/* Register Form */}
                {activeTab === 'register' && (
                    <form className="auth-form active" onSubmit={handleRegister}>
                        <div className="input-group">
                            <label htmlFor="reg-name">Full Name</label>
                            <input
                                type="text"
                                id="reg-name"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <i className="ph ph-user input-icon"></i>
                        </div>
                        <div className="input-group">
                            <label htmlFor="reg-email">Email Address</label>
                            <input
                                type="email"
                                id="reg-email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <i className="ph ph-envelope input-icon"></i>
                        </div>
                        <div className="input-group">
                            <label htmlFor="reg-password">Password</label>
                            <input
                                type="password"
                                id="reg-password"
                                placeholder="Min 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                            <i className="ph ph-lock input-icon"></i>
                        </div>
                        <button type="submit" className={`auth-submit ${loading ? 'loading' : ''}`} disabled={loading}>
                            <span className="btn-text">Create Account</span>
                            <div className="spinner"></div>
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <p>Single source of truth for your inventory 🇳🇬</p>
                </div>
            </div>
        </div>
    );
}
