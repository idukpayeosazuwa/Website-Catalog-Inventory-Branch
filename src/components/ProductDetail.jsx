import React, { useState, useEffect } from 'react';
import { databases, Query, DATABASE_ID, SHOPS_COLLECTION_ID, PRODUCTS_COLLECTION_ID, getFilePreviewUrl, getFileViewUrl, formatPrice } from '../lib/appwrite';

export default function ProductDetail({ productId, onBack }) {
    const [product, setProduct] = useState(null);
    const [shop, setShop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentImgIndex, setCurrentImgIndex] = useState(0);

    useEffect(() => {
        if (!productId) {
            setError('No product specified.');
            setLoading(false);
            return;
        }

        async function loadProductDetails() {
            try {
                setLoading(true);
                const p = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, productId);
                setProduct(p);

                if (p.shopId) {
                    try {
                        const shopDoc = await databases.getDocument(DATABASE_ID, SHOPS_COLLECTION_ID, p.shopId);
                        setShop(shopDoc);
                    } catch (e) { /* shop not found, leave null */ }
                }
            } catch (err) {
                console.error('Failed to load product detail:', err);
                setError('Product not found or has been removed.');
            } finally {
                setLoading(false);
            }
        }

        loadProductDetails();
    }, [productId]);

    if (loading) {
        return (
            <div className="pd-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
                <div className="detail-loader">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="pd-container" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <i className="ph-duotone ph-magnifying-glass" style={{ fontSize: '3rem', color: 'var(--text-secondary)', opacity: 0.4, marginBottom: '1rem' }}></i>
                <p style={{ color: 'var(--text-secondary)' }}>{error || 'Product not found.'}</p>
                <button className="pd-back" style={{ marginTop: '1rem' }} onClick={onBack}>
                    ← Back to Storefront
                </button>
            </div>
        );
    }

    const images = product.imageFileIds || [];
    let specsObj = {};
    if (product.specifications) {
        try {
            specsObj = JSON.parse(product.specifications);
        } catch (e) {}
    }
    const specsEntries = Object.entries(specsObj).filter(([, v]) => v);

    return (
        <div>
            {/* Mobile Header */}
            <header className="mobile-header">
                <button className="pd-back" onClick={onBack}>
                    <i className="ph ph-arrow-left"></i> Back
                </button>
            </header>

            {/* Desktop Header */}
            <header className="top-nav">
                <div className="logo">
                    <i className="ph-fill ph-planet"></i>
                    <span>{shop?.name || 'Inventory Manager'}</span>
                </div>
                <nav className="desktop-links">
                    <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>← Back to Catalog</a>
                </nav>
                <div className="nav-icons"></div>
            </header>

            <div className="pd-container">
                {/* Gallery */}
                <div className="pd-gallery">
                    {images.length > 0 ? (
                        <>
                            <div className="pd-main-image">
                                <img src={getFilePreviewUrl(images[currentImgIndex])} alt={product.name} />
                                {images.length > 1 && (
                                    <>
                                        <button className="gallery-nav prev" onClick={() => setCurrentImgIndex((currentImgIndex - 1 + images.length) % images.length)}>
                                            <i className="ph ph-caret-left"></i>
                                        </button>
                                        <button className="gallery-nav next" onClick={() => setCurrentImgIndex((currentImgIndex + 1) % images.length)}>
                                            <i className="ph ph-caret-right"></i>
                                        </button>
                                        <div className="gallery-dots">
                                            {images.map((_, i) => (
                                                <span
                                                    key={i}
                                                    className={`dot ${i === currentImgIndex ? 'active' : ''}`}
                                                    onClick={() => setCurrentImgIndex(i)}
                                                ></span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            {images.length > 1 && (
                                <div className="pd-thumbnails">
                                    {images.map((id, i) => (
                                        <button
                                            key={id}
                                            className={`thumb ${i === currentImgIndex ? 'active' : ''}`}
                                            onClick={() => setCurrentImgIndex(i)}
                                        >
                                            <img src={getFilePreviewUrl(id)} alt={`Thumb ${i + 1}`} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="pd-main-image pd-no-image">
                            <i className="ph ph-image" style={{ fontSize: '4rem', color: 'var(--text-secondary)', opacity: 0.3 }}></i>
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="pd-info">
                    <div className="pd-badges">
                        <span className={`pd-status ${product.availability === 'Sold' ? 'pd-sold' : product.availability === 'Out of Stock' ? 'pd-oos' : 'pd-available'}`}>
                            {product.availability}
                        </span>
                        {product.condition && <span className="pd-condition">{product.condition}</span>}
                        {product.category && <span className="pd-category">{product.category}</span>}
                    </div>


                    <h1 className="pd-title">{product.name}</h1>

                    <div className="pd-price-row">
                        <span className="pd-price">{formatPrice(product.sellingPrice)}</span>

                    </div>

                    {product.quantity !== null && product.quantity !== undefined && (
                        <div className="pd-quantity">
                            <i className="ph ph-package"></i> {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
                        </div>
                    )}

                    {/* Specs Table */}
                    {specsEntries.length > 0 && (
                        <div className="pd-specs">
                            <h3>Specifications</h3>
                            <table className="specs-table">
                                <tbody>
                                    {specsEntries.map(([k, v]) => (
                                        <tr key={k}>
                                            <td className="spec-label">{k}</td>
                                            <td className="spec-value">{v}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Shop Info */}
                    {shop && (
                        <div className="pd-shop-info">
                            <div className="pd-shop-avatar">{shop.name.charAt(0).toUpperCase()}</div>
                            <div>
                                <div className="pd-shop-name">{shop.name}</div>
                                {shop.address && (
                                    <div className="pd-shop-address">
                                        <i className="ph ph-map-pin"></i> {shop.address}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pd-actions">
                        {shop?.whatsappNumber && (
                            <a
                                href={`https://wa.me/${shop.whatsappNumber}?text=${encodeURIComponent(`Hello, I am interested in the ${product.name} listed on your catalog.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pd-whatsapp-btn"
                            >
                                <i className="ph-fill ph-whatsapp-logo"></i> Inquire on WhatsApp
                            </a>
                        )}
                        {shop?.phoneNumber && (
                            <a href={`tel:${shop.phoneNumber}`} className="pd-call-btn">
                                <i className="ph ph-phone"></i> Call
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
