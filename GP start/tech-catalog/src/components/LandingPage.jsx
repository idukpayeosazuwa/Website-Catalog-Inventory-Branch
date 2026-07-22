import React from 'react';

export default function LandingPage({ onNavigate }) {
    return (
        <div className="landing-page">
            <div className="landing-content">
                <div className="landing-icon">
                    <i className="ph-fill ph-planet"></i>
                </div>
                <h1 className="landing-title">Inventory Manager</h1>
                <p className="landing-subtitle">
                    The simplest way to manage and share your product catalog.
                </p>

                <div className="landing-actions">
                    <button
                        className="landing-btn landing-btn-primary"
                        onClick={() => onNavigate('dashboard')}
                    >
                        <i className="ph ph-sign-in"></i>
                        Manage My Shop
                    </button>
                </div>

                <div className="landing-footer">
                    <p>Built for Nigerian tech merchants 🇳🇬</p>
                </div>
            </div>
        </div>
    );
}
