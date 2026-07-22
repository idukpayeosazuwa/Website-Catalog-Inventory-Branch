import React, { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Don't prompt if already running in standalone mode
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            return;
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Don't show if user dismissed in this session
            if (!sessionStorage.getItem('pwa_prompt_dismissed')) {
                setShowBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!showBanner) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1rem',
                left: '1rem',
                right: '1rem',
                maxWidth: '420px',
                margin: '0 auto',
                zIndex: 9999,
                background: '#ffffff',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: '16px',
                padding: '0.85rem 1rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}
        >
            <div
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '1.2rem',
                    flexShrink: 0
                }}
            >
                <i className="ph-fill ph-storefront"></i>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    Install Inventory App
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                    Add to home screen for 1-tap fast access
                </div>
            </div>
            <button
                onClick={handleInstallClick}
                style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
                }}
            >
                Install
            </button>
            <button
                onClick={handleDismiss}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    padding: '0 0.2rem'
                }}
                title="Dismiss"
            >
                &times;
            </button>
        </div>
    );
}
