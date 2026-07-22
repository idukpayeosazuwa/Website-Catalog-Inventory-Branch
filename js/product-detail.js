/**
 * Product Detail — Single product view page
 */
import {
    databases, Query,
    DATABASE_ID, SHOPS_COLLECTION_ID, PRODUCTS_COLLECTION_ID,
    getFilePreviewUrl, getFileViewUrl, formatPrice
} from './appwrite.js';

let product = null;
let shop = null;
let currentImageIndex = 0;

// ─── Init ────────────────────────────────────────────────────
(async function init() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        showError('No product specified.');
        return;
    }

    try {
        // Load product
        product = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, productId);

        // Load shop
        const shopRes = await databases.listDocuments(DATABASE_ID, SHOPS_COLLECTION_ID, [
            Query.equal('$id', product.shopId),
            Query.limit(1)
        ]);
        shop = shopRes.documents.length > 0 ? shopRes.documents[0] : null;

        render();
    } catch (err) {
        console.error('Failed to load product:', err);
        showError('Product not found or has been removed.');
    }
})();

// ─── Render ──────────────────────────────────────────────────
function render() {
    document.title = `${product.name} — ${shop ? shop.name : 'Shop'}`;

    // Update OG tags
    updateMeta('og:title', product.name);
    updateMeta('og:description', `${product.condition} — ${formatPrice(product.sellingPrice)}`);
    if (product.imageFileIds && product.imageFileIds.length > 0) {
        updateMeta('og:image', getFileViewUrl(product.imageFileIds[0]));
    }

    const container = document.getElementById('product-detail');
    const images = product.imageFileIds || [];

    // Build image gallery
    let galleryHtml = '';
    if (images.length > 0) {
        galleryHtml = `
            <div class="pd-gallery">
                <div class="pd-main-image" id="pd-main-image">
                    <img src="${getFilePreviewUrl(images[0], 800, 800)}" alt="${escapeHtml(product.name)}" id="main-img">
                    ${images.length > 1 ? `
                    <button class="gallery-nav prev" onclick="prevImage()"><i class="ph ph-caret-left"></i></button>
                    <button class="gallery-nav next" onclick="nextImage()"><i class="ph ph-caret-right"></i></button>
                    <div class="gallery-dots" id="gallery-dots">
                        ${images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" onclick="goToImage(${i})"></span>`).join('')}
                    </div>
                    ` : ''}
                </div>
                ${images.length > 1 ? `
                <div class="pd-thumbnails">
                    ${images.map((id, i) => `
                        <button class="thumb ${i === 0 ? 'active' : ''}" onclick="goToImage(${i})">
                            <img src="${getFilePreviewUrl(id, 120, 120)}" alt="Thumbnail ${i + 1}">
                        </button>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        `;
    } else {
        galleryHtml = `
            <div class="pd-gallery">
                <div class="pd-main-image pd-no-image">
                    <i class="ph ph-image" style="font-size:4rem;color:var(--text-secondary);opacity:0.3"></i>
                </div>
            </div>
        `;
    }

    // Status badge
    let statusHtml = '';
    if (product.availability === 'Sold') {
        statusHtml = '<span class="pd-status pd-sold">Sold</span>';
    } else if (product.availability === 'Out of Stock') {
        statusHtml = '<span class="pd-status pd-oos">Out of Stock</span>';
    } else {
        statusHtml = '<span class="pd-status pd-available">Available</span>';
    }

    // Condition badge
    const conditionHtml = `<span class="pd-condition">${product.condition}</span>`;

    // Price
    let priceHtml = `<span class="pd-price">${formatPrice(product.sellingPrice)}</span>`;
    if (product.previousPrice && product.previousPrice > product.sellingPrice) {
        priceHtml += `<span class="pd-prev-price">${formatPrice(product.previousPrice)}</span>`;
    }

    // Specs table
    let specsHtml = '';
    if (product.specifications) {
        try {
            const specs = JSON.parse(product.specifications);
            const entries = Object.entries(specs).filter(([, v]) => v);
            if (entries.length > 0) {
                specsHtml = `
                    <div class="pd-specs">
                        <h3>Specifications</h3>
                        <table class="specs-table">
                            ${entries.map(([key, val]) => `
                                <tr>
                                    <td class="spec-label">${escapeHtml(key)}</td>
                                    <td class="spec-value">${escapeHtml(val)}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                `;
            }
        } catch (e) { /* ignore */ }
    }

    // Shop info
    let shopHtml = '';
    if (shop) {
        shopHtml = `
            <div class="pd-shop-info">
                <div class="pd-shop-avatar">${shop.name.charAt(0)}</div>
                <div>
                    <div class="pd-shop-name">${escapeHtml(shop.name)}</div>
                    ${shop.address ? `<div class="pd-shop-address"><i class="ph ph-map-pin"></i> ${escapeHtml(shop.address)}</div>` : ''}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        ${galleryHtml}
        <div class="pd-info">
            <div class="pd-badges">
                ${statusHtml}
                ${conditionHtml}
                ${product.category ? `<span class="pd-category">${product.category}</span>` : ''}
            </div>
            ${product.brand ? `<div class="pd-brand">${escapeHtml(product.brand)}</div>` : ''}
            <h1 class="pd-title">${escapeHtml(product.name)}</h1>
            <div class="pd-price-row">${priceHtml}</div>
            ${product.quantity !== null && product.quantity !== undefined ? `
            <div class="pd-quantity">
                <i class="ph ph-package"></i> ${product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
            </div>
            ` : ''}
            ${specsHtml}
            ${shopHtml}
            <div class="pd-actions">
                <a href="https://wa.me/${shop ? shop.whatsappNumber : ''}?text=${encodeURIComponent(`Hello, I am interested in the ${product.name} listed on your catalog.`)}" 
                   target="_blank" class="pd-whatsapp-btn">
                    <i class="ph-fill ph-whatsapp-logo"></i> Inquire on WhatsApp
                </a>
                ${shop && shop.phoneNumber ? `
                <a href="tel:${shop.phoneNumber}" class="pd-call-btn">
                    <i class="ph ph-phone"></i> Call
                </a>
                ` : ''}
            </div>
        </div>
    `;

    // Hide loader
    const loader = document.getElementById('detail-loader');
    if (loader) loader.style.display = 'none';
    container.style.display = 'block';
}

// ─── Image Gallery Navigation ────────────────────────────────
window.nextImage = function() {
    const images = product.imageFileIds || [];
    if (images.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % images.length;
    updateGalleryImage();
};

window.prevImage = function() {
    const images = product.imageFileIds || [];
    if (images.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    updateGalleryImage();
};

window.goToImage = function(idx) {
    currentImageIndex = idx;
    updateGalleryImage();
};

function updateGalleryImage() {
    const images = product.imageFileIds || [];
    const mainImg = document.getElementById('main-img');
    if (mainImg) {
        mainImg.src = getFilePreviewUrl(images[currentImageIndex], 800, 800);
    }

    // Update dots
    document.querySelectorAll('.gallery-dots .dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentImageIndex);
    });

    // Update thumbnails
    document.querySelectorAll('.pd-thumbnails .thumb').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === currentImageIndex);
    });
}

// ─── Back Navigation ─────────────────────────────────────────
window.goBack = function() {
    if (document.referrer && document.referrer.includes(window.location.origin)) {
        history.back();
    } else if (shop) {
        window.location.href = `index.html?shop=${shop.slug}`;
    } else {
        window.location.href = 'index.html';
    }
};

// ─── Error ───────────────────────────────────────────────────
function showError(msg) {
    const loader = document.getElementById('detail-loader');
    if (loader) loader.style.display = 'none';

    const container = document.getElementById('product-detail');
    container.style.display = 'block';
    container.innerHTML = `
        <div style="text-align:center;padding:3rem 1.5rem">
            <i class="ph-duotone ph-magnifying-glass" style="font-size:3rem;color:var(--text-secondary);opacity:0.4;margin-bottom:1rem"></i>
            <p style="color:var(--text-secondary)">${msg}</p>
            <a href="index.html" style="display:inline-block;margin-top:1rem;color:var(--accent);font-weight:600">← Back to Home</a>
        </div>
    `;
}

// ─── Utility ─────────────────────────────────────────────────
function updateMeta(property, content) {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (tag) tag.setAttribute('content', content);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
