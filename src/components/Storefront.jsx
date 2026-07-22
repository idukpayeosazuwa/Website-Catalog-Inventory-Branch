import React, { useState, useEffect } from 'react';
import { databases, Query, DATABASE_ID, SHOPS_COLLECTION_ID, PRODUCTS_COLLECTION_ID, getFilePreviewUrl, formatPrice, CATEGORIES } from '../lib/appwrite';

export default function Storefront({ shopSlug, onSelectProduct, onNavigate }) {
    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState('newest');
    const [productTotal, setProductTotal] = useState(0);

    const [loadingMore, setLoadingMore] = useState(false);
    const PAGE_SIZE = 24;

    useEffect(() => {
        if (!shopSlug) {
            setError('No shop specified. Use ?shop=your-shop-slug in the URL.');
            setLoading(false);
            return;
        }

        async function loadShopAndProducts() {
            try {
                setLoading(true);
                const shopRes = await databases.listDocuments(DATABASE_ID, SHOPS_COLLECTION_ID, [
                    Query.equal('slug', shopSlug),
                    Query.limit(1)
                ]);

                if (shopRes.documents.length === 0) {
                    setError('Shop not found. Please check the URL slug.');
                    setLoading(false);
                    return;
                }

                const shopDoc = shopRes.documents[0];
                setShop(shopDoc);
                document.title = `${shopDoc.name} | Premium Gadgets`;

                const prodRes = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
                    Query.equal('shopId', shopDoc.$id),
                    Query.orderDesc('$createdAt'),
                    Query.limit(PAGE_SIZE),
                    Query.offset(0)
                ]);
                setProducts(prodRes.documents);
                setProductTotal(prodRes.total);
            } catch (err) {
                console.error('Failed to load shop storefront:', err);
                setError('Failed to load shop. Please try again later.');
            } finally {
                setLoading(false);
            }
        }

        loadShopAndProducts();

        return () => {
            document.title = 'Inventory Manager';
        };
    }, [shopSlug]);

    const handleLoadMore = async () => {
        if (!shop || loadingMore || products.length >= productTotal) return;
        try {
            setLoadingMore(true);
            const prodRes = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
                Query.equal('shopId', shop.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(PAGE_SIZE),
                Query.offset(products.length)
            ]);
            setProducts(prev => [...prev, ...prodRes.documents]);
            setProductTotal(prodRes.total);
        } catch (err) {
            console.error('Failed to load more products:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleWhatsAppInquire = (e, product) => {
        e.stopPropagation();
        if (!shop || !shop.whatsappNumber) return;
        const msg = `Hello, I am interested in the *${product.name}* listed on your catalog.`;
        window.open(`https://wa.me/${shop.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    // Filter & Sort
    const filteredProducts = products.filter(p => {
        if (activeCategory !== 'All' && p.category !== activeCategory) return false;
        if (searchQuery) {
            const q = searchQuery.trim().toLowerCase();
            const nameMatch = p.name ? p.name.toLowerCase().includes(q) : false;
            const categoryMatch = p.category ? p.category.toLowerCase().includes(q) : false;
            const conditionMatch = p.condition ? p.condition.toLowerCase().includes(q) : false;
            let specMatch = false;
            if (p.specifications) {
                try {
                    specMatch = p.specifications.toLowerCase().includes(q);
                } catch (e) {}
            }
            return nameMatch || categoryMatch || conditionMatch || specMatch;
        }
        return true;
    }).sort((a, b) => {
        if (sortMode === 'price-low') return (a.sellingPrice ?? 0) - (b.sellingPrice ?? 0);
        if (sortMode === 'price-high') return (b.sellingPrice ?? 0) - (a.sellingPrice ?? 0);
        // newest first — sort by createdAt descending
        return new Date(b.$createdAt) - new Date(a.$createdAt);
    });

    if (loading) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
                <div className="store-loader">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <button className="pill active" style={{ marginTop: '1rem' }} onClick={() => onNavigate('dashboard')}>
                    Manage Shop
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Top Navigation */}
            <header className="top-nav">
                <div className="logo">
                    <i className="ph-fill ph-planet"></i>
                    <span>{shop?.name || 'Shop'}</span>
                </div>
                <div className="nav-icons">
                    <button className="nav-login-link" onClick={() => onNavigate('login')}>
                        <i className="ph ph-sign-in"></i> Manage Shop
                    </button>
                </div>
            </header>

            {/* Mobile Header */}
            <header className="mobile-header">
                <div className="logo">
                    <i className="ph-fill ph-planet"></i>
                    <span>{shop?.name || 'Shop'}</span>
                </div>
                <button className="mobile-search-btn" onClick={() => document.getElementById('product-search')?.focus()}>
                    <i className="ph ph-magnifying-glass"></i>
                </button>
            </header>

            <main className="container">
                {/* Hero Section */}
                <section className="hero">
                    <h1>{shop?.name}</h1>
                    <p>{shop?.description || 'Browse our device catalog'}</p>
                </section>

                {/* Category Pills */}
                <div className="category-pills">
                    <button
                        className={`pill ${activeCategory === 'All' ? 'active' : ''}`}
                        onClick={() => setActiveCategory('All')}
                    >
                        All
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`pill ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="search-bar" style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        id="product-search"
                        placeholder="Search by name, specs (e.g. i5, 16GB, UK Used)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            fontSize: '0.95rem',
                            outline: 'none',
                            fontFamily: 'inherit',
                            background: '#ffffff'
                        }}
                    />
                    <i className="ph ph-magnifying-glass" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '1.1rem' }}></i>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.2rem' }}
                        >
                            &times;
                        </button>
                    )}
                </div>

                {/* Controls Bar */}
                <div className="controls-bar">
                    <div></div>
                    <div className="sort-dropdown">
                        <span>Sort by:</span>
                        <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                            <option value="newest">Date, new to old</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                        </select>
                    </div>
                </div>

                {/* Product Grid */}
                <section className="product-grid">
                    {filteredProducts.length === 0 ? (
                        <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            No products found.
                        </p>
                    ) : (
                        filteredProducts.map(p => {
                            const imageUrl = (p.imageFileIds && p.imageFileIds.length > 0)
                                ? getFilePreviewUrl(p.imageFileIds[0])
                                : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f2f5" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23ccc" font-size="14">No Image</text></svg>');

                            let specsList = [];
                            if (p.specifications) {
                                try {
                                    const parsed = JSON.parse(p.specifications);
                                    specsList = Object.entries(parsed).filter(([, v]) => v).slice(0, 3);
                                } catch (e) {}
                            }

                            return (
                                <article
                                    key={p.$id}
                                    className={`product-card ${p.availability === 'Sold' ? 'card-sold' : ''}`}
                                    onClick={() => onSelectProduct(p.$id)}
                                >
                                    <div className="image-container">
                                        {p.availability === 'Out of Stock' && <span className="badge-status badge-oos">OUT OF STOCK</span>}
                                        <img src={imageUrl} alt={p.name} loading="lazy" />
                                    </div>
                                    <div className="product-info">

                                        <h2 className="product-title">{p.name}</h2>
                                        <div className="product-specs">
                                            {specsList.map(([key, val]) => (
                                                <span key={key} className="spec-pill">
                                                    <i className="ph ph-dot-outline"></i> {val}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="product-footer">
                                        <div className="price-group">
                                            <span className="product-price">{formatPrice(p.sellingPrice)}</span>

                                        </div>
                                        <button
                                            className="add-btn"
                                            aria-label="Inquire on WhatsApp"
                                            onClick={(e) => handleWhatsAppInquire(e, p)}
                                            style={{ backgroundColor: '#25D366', color: 'white' }}
                                        >
                                            <i className="ph-fill ph-whatsapp-logo"></i>
                                        </button>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </section>

                {/* Load More Products Button */}
                {products.length < productTotal && (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            style={{
                                padding: '0.75rem 2rem',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--accent)',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: loadingMore ? 0.7 : 1
                            }}
                        >
                            {loadingMore ? 'Loading More Products...' : `Load More Products (Showing ${products.length} of ${productTotal})`}
                        </button>
                    </div>
                )}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="bottom-nav">
                <a href="#" className="active" onClick={(e) => { e.preventDefault(); }}>
                    <i className="ph-fill ph-house"></i>
                    <span>Home</span>
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); document.getElementById('product-search')?.focus(); }}>
                    <i className="ph ph-magnifying-glass"></i>
                    <span>Search</span>
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('dashboard'); }}>
                    <i className="ph ph-user"></i>
                    <span>Manage</span>
                </a>
            </nav>
        </div>
    );
}
