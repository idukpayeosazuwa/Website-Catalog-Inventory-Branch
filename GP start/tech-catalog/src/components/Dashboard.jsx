import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    databases, storage, ID, Query, Permission, Role,
    DATABASE_ID, SHOPS_COLLECTION_ID, PRODUCTS_COLLECTION_ID, BUCKET_ID,
    getFilePreviewUrl, formatPrice, CATEGORIES, CONDITIONS, AVAILABILITY_OPTIONS, CATEGORY_SPECS
} from '../lib/appwrite';

export default function Dashboard({ onNavigate }) {
    const { user, currentShop, setCurrentShop, logout } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [toast, setToast] = useState(null);

    // Shop Setup Form state
    const [setupName, setSetupName] = useState('');
    const [setupWhatsapp, setSetupWhatsapp] = useState('');
    const [setupPhone, setSetupPhone] = useState('');
    const [setupAddress, setSetupAddress] = useState('');
    const [setupDesc, setSetupDesc] = useState('');
    const [setupLoading, setSetupLoading] = useState(false);

    // Progressive Form Modal state
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formStep, setFormStep] = useState(1); // Step 1: Basics, Step 2: Pricing/Stock, Step 3: Specs/Media
    const [prodName, setProdName] = useState('');
    const [prodCategory, setProdCategory] = useState('');
    const [prodCondition, setProdCondition] = useState('');
    const [prodAvailability, setProdAvailability] = useState('Available');
    const [prodPrice, setProdPrice] = useState('');
    const [prodQuantity, setProdQuantity] = useState(1);
    const [specRows, setSpecRows] = useState([]);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [existingImageIds, setExistingImageIds] = useState([]);
    const [originalImageIds, setOriginalImageIds] = useState([]);
    const [saveLoading, setSaveLoading] = useState(false);

    // Share Modal state
    const [shareModalProduct, setShareModalProduct] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const generateSlug = (str) => {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const loadProducts = async () => {
        if (!currentShop) return;
        try {
            setLoading(true);
            const res = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
                Query.equal('shopId', currentShop.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            setProducts(res.documents);
        } catch (err) {
            console.error('Failed to load products:', err);
            showToast('Failed to load products', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentShop) {
            loadProducts();
        } else {
            setLoading(false);
        }
    }, [currentShop]);

    // Handle Shop Creation Setup
    const handleCreateShop = async (e) => {
        e.preventDefault();
        if (!setupName || !setupWhatsapp) {
            showToast('Please fill in required fields.', 'error');
            return;
        }

        setSetupLoading(true);
        try {
            let slug = generateSlug(setupName);

            // Check for slug uniqueness and append suffix if needed
            const existing = await databases.listDocuments(DATABASE_ID, SHOPS_COLLECTION_ID, [
                Query.equal('slug', slug),
                Query.limit(1)
            ]);
            if (existing.documents.length > 0) {
                slug = `${slug}-${Date.now().toString(36)}`;
            }

            const data = {
                name: setupName,
                slug: slug,
                whatsappNumber: setupWhatsapp,
                phoneNumber: setupPhone || null,
                address: setupAddress || null,
                description: setupDesc || null,
                googleMapsLink: null,
                logoFileId: null,
                coverFileId: null,
                ownerId: user.$id
            };

            const created = await databases.createDocument(
                DATABASE_ID, SHOPS_COLLECTION_ID, ID.unique(), data,
                [
                    Permission.read(Role.any()),
                    Permission.write(Role.user(user.$id)),
                    Permission.update(Role.user(user.$id)),
                    Permission.delete(Role.user(user.$id))
                ]
            );

            setCurrentShop(created);
            showToast('Shop created! Welcome to your dashboard.', 'success');
        } catch (err) {
            console.error('Shop setup error:', err);
            showToast(err.message || 'Failed to create shop', 'error');
        } finally {
            setSetupLoading(false);
        }
    };

    // Quick Quantity Update (+ / -)
    const handleUpdateQuantity = async (product, delta) => {
        const currentQty = product.quantity ?? 0;
        const newQty = Math.max(0, currentQty + delta);
        const updates = { quantity: newQty };

        if (newQty === 0 && product.availability === 'Available') {
            updates.availability = 'Out of Stock';
        } else if (newQty > 0 && product.availability === 'Out of Stock') {
            updates.availability = 'Available';
        }

        try {
            await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, product.$id, updates);
            setProducts(products.map(p => p.$id === product.$id ? { ...p, ...updates } : p));
            showToast(`Updated ${product.name} quantity to ${newQty}`);
        } catch (err) {
            console.error('Quantity update error:', err);
            showToast('Failed to update quantity', 'error');
        }
    };

    // Delete Product
    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            const product = products.find(p => p.$id === productId);
            await databases.deleteDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, productId);
            // Clean up associated images from storage
            if (product?.imageFileIds) {
                for (const fileId of product.imageFileIds) {
                    try { await storage.deleteFile(BUCKET_ID, fileId); } catch (e) { /* ignore cleanup errors */ }
                }
            }
            showToast('Product deleted successfully');
            loadProducts();
        } catch (err) {
            console.error('Delete error:', err);
            showToast('Failed to delete product', 'error');
        }
    };

    // Modal Handlers
    const openAddProductModal = () => {
        setEditingProduct(null);
        setFormStep(1);
        setProdName('');
        setProdCategory('');
        setProdCondition('');
        setProdAvailability('Available');
        setProdPrice('');
        setProdQuantity(1);
        setSpecRows([]);
        setPendingFiles([]);
        setExistingImageIds([]);
        setOriginalImageIds([]);
        setIsProductModalOpen(true);
    };

    const openEditProductModal = (product) => {
        setEditingProduct(product);
        setFormStep(1);
        setProdName(product.name || '');
        setProdCategory(product.category || '');
        setProdCondition(product.condition || '');
        setProdAvailability(product.availability || 'Available');
        setProdPrice(product.sellingPrice || '');
        setProdQuantity(product.quantity ?? 1);

        let specs = [];
        if (product.specifications) {
            try {
                const parsed = JSON.parse(product.specifications);
                specs = Object.entries(parsed).map(([key, value]) => ({ key, value }));
            } catch (e) {}
        }
        setSpecRows(specs);
        const imageIds = product.imageFileIds ? [...product.imageFileIds] : [];
        setExistingImageIds(imageIds);
        setOriginalImageIds(imageIds);
        setPendingFiles([]);
        setIsProductModalOpen(true);
    };

    const handleCategoryChange = (e) => {
        const cat = e.target.value;
        setProdCategory(cat);
        const hasEnteredValues = specRows.some(row => row.value.trim() !== '');
        if (!hasEnteredValues && CATEGORY_SPECS[cat]) {
            setSpecRows(CATEGORY_SPECS[cat].map(key => ({ key, value: '' })));
        }
    };

    // Step Validation & Navigation
    const handleNextStep = (e) => {
        if (e) e.preventDefault();
        if (formStep === 1) {
            if (!prodName.trim() || !prodCategory) {
                showToast('Please fill in Product Name and Category.', 'error');
                return;
            }
            setFormStep(2);
        } else if (formStep === 2) {
            if (!prodPrice || !prodCondition) {
                showToast('Please fill in Price and Condition.', 'error');
                return;
            }
            setFormStep(3);
        }
    };

    const handlePrevStep = (e) => {
        if (e) e.preventDefault();
        if (formStep > 1) {
            setFormStep(formStep - 1);
        }
    };

    const handleSaveProduct = async (e) => {
        if (e) e.preventDefault();
        if (!prodName.trim() || !prodCategory || !prodCondition || !prodAvailability || !prodPrice) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        setSaveLoading(true);
        try {
            const newUploadedIds = [];
            const totalFiles = pendingFiles.length;
            for (let i = 0; i < pendingFiles.length; i++) {
                if (totalFiles > 1) {
                    showToast(`Uploading image ${i + 1} of ${totalFiles}...`, 'info');
                }
                const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), pendingFiles[i]);
                newUploadedIds.push(uploaded.$id);
            }

            const finalImageIds = [...existingImageIds, ...newUploadedIds];

            const specsObj = {};
            specRows.forEach(row => {
                if (row.key.trim()) {
                    specsObj[row.key.trim()] = row.value.trim();
                }
            });

            const data = {
                shopId: currentShop.$id,
                name: prodName.trim(),
                category: prodCategory,
                condition: prodCondition,
                availability: prodAvailability,
                sellingPrice: Math.round(Number(prodPrice)),
                quantity: prodQuantity ? parseInt(prodQuantity, 10) : 1,
                specifications: JSON.stringify(specsObj),
                imageFileIds: finalImageIds,
                ownerId: user.$id
            };

            if (editingProduct) {
                await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, editingProduct.$id, data);
                showToast('Product updated successfully');
            } else {
                await databases.createDocument(
                    DATABASE_ID, PRODUCTS_COLLECTION_ID, ID.unique(), data,
                    [
                        Permission.read(Role.any()),
                        Permission.write(Role.user(user.$id)),
                        Permission.update(Role.user(user.$id)),
                        Permission.delete(Role.user(user.$id))
                    ]
                );
                showToast('Product created successfully');
            }

            // Clean up removed images from storage
            if (editingProduct) {
                const removedIds = originalImageIds.filter(id => !finalImageIds.includes(id));
                for (const fileId of removedIds) {
                    try { await storage.deleteFile(BUCKET_ID, fileId); } catch (e) { /* ignore cleanup errors */ }
                }
            }

            setIsProductModalOpen(false);
            loadProducts();
        } catch (err) {
            console.error('Save product error:', err);
            showToast(err.message || 'Failed to save product', 'error');
        } finally {
            setSaveLoading(false);
        }
    };

    // Mobile Copy Helper
    const handleCopyShareText = (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => showToast('Copied to clipboard!'))
                .catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (text) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 99999);
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast('Copied to clipboard!');
            } else {
                showToast('Please copy text manually.', 'error');
            }
        } catch (err) {
            showToast('Failed to copy text.', 'error');
        }
        document.body.removeChild(textArea);
    };

    // Format WhatsApp Share Text
    const getShareText = (p) => {
        if (!p) return '';
        let specsList = '';
        if (p.specifications) {
            try {
                const parsed = JSON.parse(p.specifications);
                specsList = Object.entries(parsed)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `• ${k}: ${v}`)
                    .join('\n');
            } catch (e) {}
        }

        const lines = [
            `🔥 *${p.name}*`,
            specsList ? `\n${specsList}` : '',
            `\nCondition: ${p.condition}`,
            `Price: ${formatPrice(p.sellingPrice)}`,
            `Quantity Available: ${p.quantity ?? 0}`,
            `\nView Catalog: ${window.location.origin}/?shop=${currentShop?.slug}`
        ].filter(Boolean);

        return lines.join('\n');
    };

    // Filtered Products
    const filteredProducts = products.filter(p => {
        if (activeFilter !== 'all' && p.availability !== activeFilter) return false;
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
    });

    const availableCount = products.filter(p => p.availability === 'Available' && (p.quantity ?? 0) > 0).length;
    const outOfStockCount = products.filter(p => p.availability === 'Out of Stock' || (p.quantity ?? 0) === 0).length;
    const totalCount = products.length;

    // View: No shop yet (Shop Setup Wizard)
    if (!currentShop && !loading) {
        return (
            <div className="dashboard-page">
                {toast && <div className={`toast-notification toast-${toast.type} show`}><span>{toast.message}</span></div>}
                <header className="dash-header">
                    <div className="dash-header-left">
                        <div className="shop-avatar">N</div>
                        <span className="shop-name">New Merchant</span>
                    </div>
                    <button className="pill" onClick={logout}>Sign Out</button>
                </header>

                <div className="dash-content" style={{ maxWidth: '480px', marginTop: '2rem' }}>
                    <div className="stat-card" style={{ padding: '2rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <i className="ph-fill ph-storefront" style={{ fontSize: '2.5rem', color: 'var(--dash-accent)' }}></i>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.5rem' }}>Set Up Your Shop</h2>
                            <p style={{ color: 'var(--dash-text-secondary)', fontSize: '0.9rem' }}>
                                Create your store identity to start managing your inventory.
                            </p>
                        </div>
                        <form onSubmit={handleCreateShop} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="input-group">
                                <label>Shop Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. GP Star Tech"
                                    value={setupName}
                                    onChange={(e) => setSetupName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>WhatsApp Phone Number *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 2347012345678"
                                    value={setupWhatsapp}
                                    onChange={(e) => setSetupWhatsapp(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Phone Number (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 08012345678"
                                    value={setupPhone}
                                    onChange={(e) => setSetupPhone(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label>Address (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Computer Village, Ikeja"
                                    value={setupAddress}
                                    onChange={(e) => setSetupAddress(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label>Description (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="We sell & repair laptops and phones"
                                    value={setupDesc}
                                    onChange={(e) => setSetupDesc(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="auth-submit" disabled={setupLoading}>
                                {setupLoading ? 'Creating...' : 'Launch My Shop'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            {toast && (
                <div className={`toast-notification toast-${toast.type} show`}>
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Dashboard Header */}
            <header className="dash-header">
                <div className="dash-header-left">
                    <div className="shop-avatar">{currentShop?.name?.charAt(0).toUpperCase()}</div>
                    <span className="shop-name">{currentShop?.name}</span>
                </div>
                <div className="dash-header-actions">
                    <button onClick={() => onNavigate('storefront', currentShop?.slug)}>
                        View my Store
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="dash-content">
                {/* 2-Card Stats Row: Available & Out of Stock */}
                <div className="stats-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div className="stat-card available">
                        <div className="stat-value">{availableCount}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--dash-text-secondary)', fontWeight: 600 }}>Available</div>
                    </div>
                    <div className="stat-card sold" style={{ borderLeftColor: 'var(--dash-danger)' }}>
                        <div className="stat-value">{outOfStockCount}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--dash-text-secondary)', fontWeight: 600 }}>Out of Stock</div>
                    </div>
                </div>

                {/* Search & Filter Header */}
                <div className="controls-bar" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                        <input
                            type="text"
                            placeholder="Search inventory (e.g. i5, 16GB, Laptop)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.65rem 2.2rem 0.65rem 2.2rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--dash-border)',
                                fontSize: '0.9rem',
                                outline: 'none',
                                background: '#ffffff'
                            }}
                        />
                        <i className="ph ph-magnifying-glass" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--dash-text-secondary)' }}></i>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--dash-text-secondary)', fontSize: '1.1rem' }}
                            >
                                &times;
                            </button>
                        )}
                    </div>
                    <div className="category-pills" style={{ paddingBottom: 0 }}>
                        {['all', 'Available', 'Out of Stock'].map(f => (
                            <button
                                key={f}
                                className={`pill ${activeFilter === f ? 'active' : ''}`}
                                onClick={() => setActiveFilter(f)}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Responsive Product Inventory List */}
                <div id="product-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {filteredProducts.length === 0 ? (
                        <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: 'var(--dash-radius)', border: '1px solid var(--dash-border)' }}>
                            <i className="ph-duotone ph-package" style={{ fontSize: '2.5rem', opacity: 0.4 }}></i>
                            <h3 style={{ marginTop: '0.5rem' }}>No products found</h3>
                            <p style={{ color: 'var(--dash-text-secondary)', fontSize: '0.85rem' }}>Add a new product or change your search filter.</p>
                            <button className="auth-submit" style={{ maxWidth: '200px', margin: '1rem auto 0' }} onClick={openAddProductModal}>
                                + Add Product
                            </button>
                        </div>
                    ) : (
                        filteredProducts.map(product => {
                            const imgUrl = (product.imageFileIds && product.imageFileIds.length > 0)
                                ? getFilePreviewUrl(product.imageFileIds[0])
                                : null;

                            const isOos = product.availability === 'Out of Stock' || product.availability === 'Sold' || (product.quantity ?? 0) === 0;
                            const statusText = isOos ? 'Out of Stock' : 'Available';
                            const statusClass = isOos ? 'pd-oos' : 'pd-available';

                            return (
                                <div key={product.$id} className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.1rem' }}>
                                    {/* Card Header: Availability Tag (Top Left) & Price (Top Right) */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className={`pd-status ${statusClass}`} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                            {statusText}
                                        </span>
                                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--dash-text)' }}>
                                            {formatPrice(product.sellingPrice)}
                                        </span>
                                    </div>

                                    {/* Product Title & Info (Spacious Breathing Room) */}
                                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', margin: '0.25rem 0' }}>
                                        <div style={{ width: '60px', height: '60px', borderRadius: '10px', background: 'var(--dash-bg)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--dash-border)' }}>
                                            {imgUrl ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <i className="ph ph-image" style={{ opacity: 0.3 }}></i>}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: '1.35', color: 'var(--dash-text)', wordBreak: 'break-word' }}>
                                                {product.name}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--dash-text-secondary)', marginTop: '0.35rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                <span>{product.category}</span>
                                                <span>•</span>
                                                <span>{product.condition}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quantity Adjuster Bar */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--dash-bg)', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--dash-border)' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dash-text-secondary)' }}>Stock Quantity</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <button
                                                type="button"
                                                title="Decrease Quantity"
                                                onClick={() => handleUpdateQuantity(product, -1)}
                                                style={{ border: 'none', background: '#ffffff', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: 'var(--dash-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                            >
                                                -
                                            </button>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                                                {product.quantity ?? 0}
                                            </span>
                                            <button
                                                type="button"
                                                title="Increase Quantity"
                                                onClick={() => handleUpdateQuantity(product, 1)}
                                                style={{ border: 'none', background: '#ffffff', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: 'var(--dash-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bottom Action Bar: Delete (Left), WhatsApp (Center), Edit (Right) */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '0.6rem', borderTop: '1px solid var(--dash-border)' }}>
                                        <button
                                            className="btn-outline"
                                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', borderRadius: '8px', color: 'var(--dash-danger)', borderColor: '#fecaca' }}
                                            onClick={() => handleDeleteProduct(product.$id)}
                                            title="Delete Product"
                                        >
                                            <i className="ph ph-trash"></i> Delete
                                        </button>

                                        <button
                                            className="btn-outline"
                                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', borderRadius: '8px', color: '#25D366', borderColor: '#25D366' }}
                                            onClick={() => setShareModalProduct(product)}
                                            title="Share to WhatsApp"
                                        >
                                            <i className="ph-fill ph-whatsapp-logo"></i> Share
                                        </button>

                                        <button
                                            className="btn-outline"
                                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', borderRadius: '8px' }}
                                            onClick={() => openEditProductModal(product)}
                                            title="Edit Product"
                                        >
                                            <i className="ph ph-pencil-simple"></i> Edit
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Floating Add Product Button */}
            <button
                onClick={openAddProductModal}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--dash-accent)',
                    color: 'white',
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 90
                }}
            >
                <i className="ph ph-plus"></i>
            </button>

            {/* Progressive 3-Step Product Wizard Modal */}
            {isProductModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="auth-card" style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                                {editingProduct ? 'Edit Product' : 'Add Product'}
                            </h2>
                            <button onClick={() => setIsProductModalOpen(false)} style={{ fontSize: '1.2rem', border: 'none', background: 'none', cursor: 'pointer' }}>&times;</button>
                        </div>

                        {/* Step Progress Indicator Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.25rem' }}>
                            {[1, 2, 3].map(step => (
                                <div
                                    key={step}
                                    style={{
                                        flex: 1,
                                        height: '6px',
                                        borderRadius: '3px',
                                        background: formStep >= step ? 'var(--dash-accent)' : 'var(--dash-border)',
                                        transition: 'all 0.3s ease'
                                    }}
                                />
                            ))}
                        </div>

                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--dash-accent)', marginBottom: '1rem' }}>
                            {formStep === 1 && 'Step 1 of 3: Basic Info'}
                            {formStep === 2 && 'Step 2 of 3: Pricing & Stock'}
                            {formStep === 3 && 'Step 3 of 3: Specs & Photos'}
                        </div>

                        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* STEP 1: Basic Info */}
                            {formStep === 1 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    <div className="input-group">
                                        <label>Product Name *</label>
                                        <input
                                            type="text"
                                            value={prodName}
                                            onChange={(e) => setProdName(e.target.value)}
                                            required
                                            placeholder="e.g. HP EliteBook 840 G5"
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label>Category *</label>
                                        <select
                                            value={prodCategory}
                                            onChange={handleCategoryChange}
                                            required
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', fontFamily: 'inherit' }}
                                        >
                                            <option value="">Select Category...</option>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Pricing & Stock */}
                            {formStep === 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    <div className="input-group">
                                        <label>Selling Price (₦) *</label>
                                        <input
                                            type="number"
                                            value={prodPrice}
                                            onChange={(e) => setProdPrice(e.target.value)}
                                            required
                                            placeholder="e.g. 350000"
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label>Condition *</label>
                                        <select
                                            value={prodCondition}
                                            onChange={(e) => setProdCondition(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', fontFamily: 'inherit' }}
                                        >
                                            <option value="">Select Condition...</option>
                                            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div className="input-group">
                                            <label>Quantity *</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={prodQuantity}
                                                onChange={(e) => setProdQuantity(parseInt(e.target.value, 10) || 0)}
                                                required
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Availability *</label>
                                            <select
                                                value={prodAvailability}
                                                onChange={(e) => setProdAvailability(e.target.value)}
                                                required
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', fontFamily: 'inherit' }}
                                            >
                                                {AVAILABILITY_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Specs & Media */}
                            {formStep === 3 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {/* Dynamic Specifications */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Specifications</label>
                                            <button
                                                type="button"
                                                onClick={() => setSpecRows([...specRows, { key: '', value: '' }])}
                                                style={{ fontSize: '0.8rem', color: 'var(--dash-accent)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                + Add Attribute
                                            </button>
                                        </div>
                                        {specRows.map((row, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Spec"
                                                    value={row.key}
                                                    onChange={(e) => {
                                                        setSpecRows(specRows.map((r, i) =>
                                                            i === idx ? { ...r, key: e.target.value } : r
                                                        ));
                                                    }}
                                                    style={{ width: '110px', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid var(--dash-border)', fontSize: '0.85rem', fontWeight: 600, background: 'var(--dash-bg)' }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Value (e.g. 16GB)"
                                                    value={row.value}
                                                    onChange={(e) => {
                                                        setSpecRows(specRows.map((r, i) =>
                                                            i === idx ? { ...r, value: e.target.value } : r
                                                        ));
                                                    }}
                                                    style={{ width: '140px', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid var(--dash-border)', fontSize: '0.85rem' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setSpecRows(specRows.filter((_, i) => i !== idx))}
                                                    style={{ padding: '0 0.4rem', color: 'var(--dash-danger)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Image Upload */}
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Product Images</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => setPendingFiles([...pendingFiles, ...Array.from(e.target.files)])}
                                            style={{ fontSize: '0.85rem' }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                            {existingImageIds.map((id, idx) => (
                                                <div key={id} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--dash-border)' }}>
                                                    <img src={getFilePreviewUrl(id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button
                                                        type="button"
                                                        onClick={() => setExistingImageIds(existingImageIds.filter((_, i) => i !== idx))}
                                                        style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' }}
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                            {pendingFiles.map((file, idx) => (
                                                <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--dash-border)', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: '#666' }}>New</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPendingFiles(pendingFiles.filter((_, i) => i !== idx))}
                                                        style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' }}
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal Progressive Navigation Bar */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--dash-border)' }}>
                                {formStep > 1 && (
                                    <button
                                        type="button"
                                        className="btn-outline"
                                        onClick={handlePrevStep}
                                        style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)' }}
                                    >
                                        ← Back
                                    </button>
                                )}

                                {formStep < 3 ? (
                                    <button
                                        type="button"
                                        className="auth-submit"
                                        onClick={handleNextStep}
                                        style={{ marginLeft: 'auto' }}
                                    >
                                        Next Step →
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="auth-submit"
                                        disabled={saveLoading}
                                        onClick={handleSaveProduct}
                                        style={{ marginLeft: 'auto' }}
                                    >
                                        {saveLoading ? 'Saving...' : editingProduct ? 'Save Changes' : 'Complete & Save'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* WhatsApp Share Modal */}
            {shareModalProduct && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="auth-card" style={{ maxWidth: '400px', width: '100%', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Share to WhatsApp</h2>
                            <button onClick={() => setShareModalProduct(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--dash-text-secondary)' }}>&times;</button>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--dash-text-secondary)', marginBottom: '0.6rem' }}>
                            Copy or tap below to open WhatsApp with formatted text:
                        </p>
                        <textarea
                            readOnly
                            rows={6}
                            value={getShareText(shareModalProduct)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--dash-border)', fontFamily: 'inherit', fontSize: '0.8rem', resize: 'none', marginBottom: '0.85rem', background: 'var(--dash-bg)' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className="btn-outline"
                                style={{ flex: 1, padding: '0.55rem 0.5rem', fontSize: '0.825rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', borderRadius: '8px' }}
                                onClick={() => handleCopyShareText(getShareText(shareModalProduct))}
                            >
                                <i className="ph ph-copy" style={{ fontSize: '1rem' }}></i> Copy Text
                            </button>
                            <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getShareText(shareModalProduct))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ flex: 1, padding: '0.55rem 0.5rem', fontSize: '0.825rem', fontWeight: 600, background: '#25D366', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: '0 2px 8px rgba(37,211,102,0.25)' }}
                            >
                                <i className="ph-fill ph-whatsapp-logo" style={{ fontSize: '1rem' }}></i> Open WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
