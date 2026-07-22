/**
 * Storefront Logic — Public product catalog backed by Appwrite
 * 
 * Reads the `shop` query parameter to load the correct shop and its products.
 */
import {
    databases, Query,
    DATABASE_ID, SHOPS_COLLECTION_ID, PRODUCTS_COLLECTION_ID,
    getFilePreviewUrl, formatPrice, CATEGORIES
} from './appwrite.js';

// ─── State ───────────────────────────────────────────────────
let shop = null;
let products = [];
let filteredProducts = [];
let activeCategory = 'All';
let searchQuery = '';
let sortMode = 'newest';

// ─── Init ────────────────────────────────────────────────────
(async function init() {
    const params = new URLSearchParams(window.location.search);
    const shopSlug = params.get('shop');

    if (!shopSlug) {
        showError('No shop specified. Use ?shop=your-shop-slug in the URL.');
        return;
    }

    try {
        // Load shop by slug
        const shopRes = await databases.listDocuments(DATABASE_ID, SHOPS_COLLECTION_ID, [
            Query.equal('slug', shopSlug),
            Query.limit(1)
        ]);

        if (shopRes.documents.length === 0) {
            showError('Shop not found. Check the URL and try again.');
            return;
        }

        shop = shopRes.documents[0];
        renderShopBranding();
        await loadProducts();
        bindEvents();
    } catch (err) {
        console.error('Failed to load shop:', err);
        showError('Failed to load shop. Please try again later.');
    }
})();

// ─── Render Shop Branding ────────────────────────────────────
function renderShopBranding() {
    // Update page title
    document.title = `${shop.name} | Premium Gadgets`;

    // Update hero
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    if (heroTitle) heroTitle.textContent = shop.name;
    if (heroSubtitle) heroSubtitle.textContent = shop.description || 'We sell, repair, and fix your devices.';

    // Update header
    const logoText = document.getElementById('logo-text');
    if (logoText) logoText.textContent = shop.name;

    const mobileLogoText = document.getElementById('mobile-logo-text');
    if (mobileLogoText) mobileLogoText.textContent = shop.name;

    // Update OG tags
    updateMetaTag('og:title', `${shop.name} | Premium Gadgets`);
    updateMetaTag('og:description', shop.description || 'Shop premium tech gadgets.');

    // Build category pills dynamically
    renderCategoryPills();
}

function updateMetaTag(property, content) {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (tag) tag.setAttribute('content', content);
}

function renderCategoryPills() {
    const container = document.getElementById('category-pills');
    if (!container) return;

    // Start with "All"
    let html = '<button class="pill active" data-category="All">All</button>';

    // Get unique categories from products after they load
    // For now, show common categories
    CATEGORIES.forEach(cat => {
        html += `<button class="pill" data-category="${cat}">${cat}</button>`;
    });

    container.innerHTML = html;

    // Bind clicks
    container.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            container.querySelector('.pill.active').classList.remove('active');
            pill.classList.add('active');
            activeCategory = pill.dataset.category;
            applyFilters();
        });
    });
}

// ─── Load Products ───────────────────────────────────────────
async function loadProducts() {
    try {
        const res = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
            Query.equal('shopId', shop.$id),
            Query.orderDesc('$createdAt'),
            Query.limit(100)
        ]);

        products = res.documents;
        applyFilters();

        // Hide loading
        const loader = document.getElementById('store-loader');
        if (loader) loader.style.display = 'none';

    } catch (err) {
        console.error('Failed to load products:', err);
        const grid = document.getElementById('product-grid');
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-secondary)">Failed to load products. Please try again.</p>';
    }
}

// ─── Filter & Sort ───────────────────────────────────────────
function applyFilters() {
    filteredProducts = products.filter(p => {
        // Only show non-hidden products (all statuses visible on storefront for transparency)
        // Filter by category
        if (activeCategory !== 'All' && p.category !== activeCategory) return false;

        // Search
        if (searchQuery) {
            const q = searchQuery;
            return (
                p.name.toLowerCase().includes(q) ||
                (p.brand && p.brand.toLowerCase().includes(q)) ||
                p.category.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // Sort
    if (sortMode === 'price-low') {
        filteredProducts.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (sortMode === 'price-high') {
        filteredProducts.sort((a, b) => b.sellingPrice - a.sellingPrice);
    }
    // default: newest first (already ordered by $createdAt desc)

    renderGrid();
}

// ─── Render Product Grid ─────────────────────────────────────
function renderGrid() {
    const grid = document.getElementById('product-grid');

    if (filteredProducts.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-secondary)">No products found.</p>';
        return;
    }

    grid.innerHTML = filteredProducts.map(product => {
        // Image
        const imageUrl = (product.imageFileIds && product.imageFileIds.length > 0)
            ? getFilePreviewUrl(product.imageFileIds[0], 400, 400)
            : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f2f5" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23ccc" font-size="14">No Image</text></svg>');

        // Status badge
        let statusBadge = '';
        if (product.availability === 'Sold') {
            statusBadge = '<span class="badge-status badge-sold">SOLD</span>';
        } else if (product.availability === 'Out of Stock') {
            statusBadge = '<span class="badge-status badge-oos">OUT OF STOCK</span>';
        }

        // Condition badge
        let condBadge = '';
        if (product.condition === 'Brand New') {
            condBadge = '<span class="badge-sale">New</span>';
        } else if (product.condition === 'UK Used') {
            condBadge = '<span class="badge-condition">UK Used</span>';
        }

        // Specs
        let specsHtml = '';
        if (product.specifications) {
            try {
                const specs = JSON.parse(product.specifications);
                const entries = Object.entries(specs).slice(0, 3); // Show max 3
                specsHtml = entries.map(([key, val]) => {
                    if (!val) return '';
                    return `<span class="spec-pill"><i class="ph ph-dot-outline"></i> ${escapeHtml(val)}</span>`;
                }).join('');
            } catch (e) { /* ignore */ }
        }

        // Previous price
        let priceHtml = `<span class="product-price">${formatPrice(product.sellingPrice)}</span>`;
        if (product.previousPrice && product.previousPrice > product.sellingPrice) {
            priceHtml += `<span class="product-prev-price">${formatPrice(product.previousPrice)}</span>`;
        }

        return `
            <article class="product-card ${product.availability === 'Sold' ? 'card-sold' : ''}" 
                     onclick="window.location.href='product.html?id=${product.$id}'">
                <div class="image-container">
                    ${condBadge}
                    ${statusBadge}
                    <img src="${imageUrl}" alt="${escapeHtml(product.name)}" loading="lazy">
                </div>
                <div class="product-info">
                    ${product.brand ? `<div class="product-brand">${escapeHtml(product.brand)}</div>` : ''}
                    <h2 class="product-title">${escapeHtml(product.name)}</h2>
                    <div class="product-specs">${specsHtml}</div>
                </div>
                <div class="product-footer">
                    <div class="price-group">${priceHtml}</div>
                    <button class="add-btn" aria-label="Inquire on WhatsApp" 
                            onclick="event.stopPropagation(); inquireWhatsApp('${product.$id}')" 
                            style="background-color:#25D366;color:white">
                        <i class="ph-fill ph-whatsapp-logo"></i>
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

// ─── WhatsApp Inquiry ────────────────────────────────────────
window.inquireWhatsApp = function(productId) {
    const product = products.find(p => p.$id === productId);
    if (!product || !shop) return;

    const message = `Hello, I am interested in the *${product.name}* listed on your catalog.`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${shop.whatsappNumber}?text=${encoded}`, '_blank');
};

// ─── Bind Events ─────────────────────────────────────────────
function bindEvents() {
    // Search
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            applyFilters();
        });
    }

    // Sort
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'Price: Low to High') sortMode = 'price-low';
            else if (val === 'Price: High to Low') sortMode = 'price-high';
            else sortMode = 'newest';
            applyFilters();
        });
    }
}

// ─── Error Display ───────────────────────────────────────────
function showError(msg) {
    const loader = document.getElementById('store-loader');
    if (loader) loader.style.display = 'none';

    const grid = document.getElementById('product-grid');
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:3rem 1rem;color:var(--text-secondary)">${msg}</p>`;
}

// ─── Utility ─────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
