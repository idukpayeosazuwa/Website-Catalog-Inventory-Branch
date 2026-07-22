/**
 * Dashboard Logic — Full Inventory CRUD, Image Upload, WhatsApp Share
 */
import {
    account, databases, storage,
    ID, Query, Permission, Role,
    DATABASE_ID, SHOPS_COLLECTION_ID, PRODUCTS_COLLECTION_ID, BUCKET_ID,
    APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID,
    getFilePreviewUrl, getFileViewUrl, formatPrice, showToast,
    getCurrentUser, getUserShop, requireAuth,
    CATEGORIES, CONDITIONS, AVAILABILITY_OPTIONS, CATEGORY_SPECS
} from './appwrite.js';

// ─── State ───────────────────────────────────────────────────
let currentUser = null;
let currentShop = null;
let allProducts = [];
let filteredProducts = [];
let editingProductId = null;
let pendingDeleteId = null;
let pendingImageFiles = [];       // Files to upload (new product / new images)
let existingImageIds = [];        // Already-uploaded image IDs (edit mode)
let removedImageIds = [];         // Images to delete on save
let currentShareText = '';
let activeFilter = 'all';
let searchQuery = '';

// ─── Init ────────────────────────────────────────────────────
(async function init() {
    currentUser = await requireAuth();
    if (!currentUser) return;

    currentShop = await getUserShop(currentUser.$id);

    if (!currentShop) {
        // Show shop setup
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('shop-setup-view').style.display = 'block';
        document.getElementById('dash-bottom-nav').style.display = 'none';
        document.getElementById('dash-header').style.display = 'none';
    } else {
        await showDashboard();
    }
})();

// ─── Show Dashboard ──────────────────────────────────────────
async function showDashboard() {
    updateShopHeader();
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('shop-setup-view').style.display = 'none';
    document.getElementById('inventory-view').style.display = 'block';
    document.getElementById('fab-add').style.display = 'flex';
    document.getElementById('dash-bottom-nav').style.display = 'flex';
    document.getElementById('dash-header').style.display = 'flex';

    populateFormSelects();
    bindSearchAndFilters();
    await loadProducts();
}

function updateShopHeader() {
    const nameEl = document.getElementById('shop-name');
    const avatarEl = document.getElementById('shop-avatar');
    nameEl.textContent = currentShop.name;
    avatarEl.textContent = currentShop.name.charAt(0).toUpperCase();
    document.title = `${currentShop.name} — Inventory Manager`;
}

// ─── Populate Select Options ─────────────────────────────────
function populateFormSelects() {
    const catSelect = document.getElementById('prod-category');
    const condSelect = document.getElementById('prod-condition');
    const availSelect = document.getElementById('prod-availability');

    // Categories
    catSelect.innerHTML = '<option value="">Select...</option>';
    CATEGORIES.forEach(c => {
        catSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });

    // Conditions
    condSelect.innerHTML = '<option value="">Select...</option>';
    CONDITIONS.forEach(c => {
        condSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });

    // Availability
    availSelect.innerHTML = '<option value="">Select...</option>';
    AVAILABILITY_OPTIONS.forEach(a => {
        availSelect.innerHTML += `<option value="${a}">${a}</option>`;
    });
}

// ─── Search & Filter Binding ─────────────────────────────────
function bindSearchAndFilters() {
    // Search
    const searchInput = document.getElementById('dash-search');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        applyFilters();
    });

    // Filter pills
    document.querySelectorAll('.dash-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelector('.dash-filter-pill.active').classList.remove('active');
            pill.classList.add('active');
            activeFilter = pill.dataset.filter;
            applyFilters();
        });
    });
}

// ─── Load Products ───────────────────────────────────────────
async function loadProducts() {
    try {
        const res = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
            Query.equal('shopId', currentShop.$id),
            Query.orderDesc('$createdAt'),
            Query.limit(100)
        ]);
        allProducts = res.documents;
        applyFilters();
        updateStats();
    } catch (err) {
        console.error('Failed to load products:', err);
        showToast('Failed to load products', 'error');
    }
}

function applyFilters() {
    filteredProducts = allProducts.filter(p => {
        // Status filter
        if (activeFilter !== 'all' && p.availability !== activeFilter) return false;

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

    renderProductList();
}

function updateStats() {
    const total = allProducts.length;
    const available = allProducts.filter(p => p.availability === 'Available').length;
    const sold = allProducts.filter(p => p.availability === 'Sold').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-available').textContent = available;
    document.getElementById('stat-sold').textContent = sold;
}

// ─── Render Product List ─────────────────────────────────────
function renderProductList() {
    const container = document.getElementById('product-list');

    if (filteredProducts.length === 0) {
        if (allProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph-duotone ph-package"></i>
                    <h3>No products yet</h3>
                    <p>Add your first product to start managing your inventory.</p>
                    <button class="btn-primary" onclick="openProductForm()">
                        <i class="ph ph-plus"></i> Add Product
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph-duotone ph-magnifying-glass"></i>
                    <h3>No matching products</h3>
                    <p>Try a different search term or filter.</p>
                </div>
            `;
        }
        return;
    }

    container.innerHTML = filteredProducts.map(product => {
        const statusClass = product.availability === 'Available' ? 'status-available'
            : product.availability === 'Sold' ? 'status-sold'
            : 'status-out-of-stock';

        const imageHtml = (product.imageFileIds && product.imageFileIds.length > 0)
            ? `<img src="${getFilePreviewUrl(product.imageFileIds[0], 112, 112)}" alt="${product.name}" loading="lazy">`
            : `<div class="no-image"><i class="ph ph-image"></i></div>`;

        return `
            <div class="product-list-item" onclick="openProductForm('${product.$id}')">
                <div class="item-image">${imageHtml}</div>
                <div class="item-info">
                    <div class="item-name">${escapeHtml(product.name)}</div>
                    <div class="item-meta">
                        <span class="item-price">${formatPrice(product.sellingPrice)}</span>
                        <span class="item-category">${product.category}</span>
                        <span class="status-badge ${statusClass}">${product.availability}</span>
                    </div>
                </div>
                <div class="item-actions" onclick="event.stopPropagation()">
                    <div class="more-actions">
                        <button class="action-btn" onclick="toggleMoreMenu(event, '${product.$id}')" title="More actions">
                            <i class="ph ph-dots-three-vertical"></i>
                        </button>
                        <div class="more-menu" id="menu-${product.$id}">
                            <button onclick="openProductForm('${product.$id}')">
                                <i class="ph ph-pencil-simple"></i> Edit
                            </button>
                            <button onclick="openShareModal('${product.$id}')">
                                <i class="ph-fill ph-whatsapp-logo" style="color:#25D366"></i> Share
                            </button>
                            <div class="divider"></div>
                            ${product.availability !== 'Available' ? `
                            <button onclick="quickStatusChange('${product.$id}', 'Available')">
                                <i class="ph ph-check-circle" style="color:var(--dash-success)"></i> Mark Available
                            </button>` : ''}
                            ${product.availability !== 'Sold' ? `
                            <button onclick="quickStatusChange('${product.$id}', 'Sold')">
                                <i class="ph ph-tag" style="color:var(--dash-sold)"></i> Mark Sold
                            </button>` : ''}
                            ${product.availability !== 'Out of Stock' ? `
                            <button onclick="quickStatusChange('${product.$id}', 'Out of Stock')">
                                <i class="ph ph-warning" style="color:var(--dash-warning)"></i> Out of Stock
                            </button>` : ''}
                            <div class="divider"></div>
                            <button class="danger" onclick="openDeleteConfirm('${product.$id}', '${escapeHtml(product.name)}')">
                                <i class="ph ph-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ─── More Menu Toggle ────────────────────────────────────────
window.toggleMoreMenu = function(e, productId) {
    e.stopPropagation();
    // Close all other menus
    document.querySelectorAll('.more-menu.show').forEach(m => m.classList.remove('show'));
    const menu = document.getElementById('menu-' + productId);
    menu.classList.toggle('show');
};

// Close menus on outside click
document.addEventListener('click', () => {
    document.querySelectorAll('.more-menu.show').forEach(m => m.classList.remove('show'));
});

// ─── Quick Status Change ─────────────────────────────────────
window.quickStatusChange = async function(productId, status) {
    document.querySelectorAll('.more-menu.show').forEach(m => m.classList.remove('show'));
    try {
        await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, productId, {
            availability: status
        });
        showToast(`Product marked as ${status}`, 'success');
        await loadProducts();
    } catch (err) {
        console.error('Status change error:', err);
        showToast('Failed to update status', 'error');
    }
};

// ─── Product Form ────────────────────────────────────────────
window.openProductForm = function(productId = null) {
    document.querySelectorAll('.more-menu.show').forEach(m => m.classList.remove('show'));
    editingProductId = productId;
    pendingImageFiles = [];
    removedImageIds = [];

    const form = document.getElementById('product-form');
    form.reset();
    document.getElementById('specs-builder').innerHTML = '';
    document.getElementById('image-previews').innerHTML = '';
    document.getElementById('prod-edit-id').value = '';

    if (productId) {
        // Edit mode
        const product = allProducts.find(p => p.$id === productId);
        if (!product) return;

        document.getElementById('modal-title').textContent = 'Edit Product';
        document.getElementById('prod-edit-id').value = productId;
        document.getElementById('prod-name').value = product.name;
        document.getElementById('prod-category').value = product.category;
        document.getElementById('prod-brand').value = product.brand || '';
        document.getElementById('prod-condition').value = product.condition;
        document.getElementById('prod-availability').value = product.availability;
        document.getElementById('prod-price').value = product.sellingPrice;
        document.getElementById('prod-prev-price').value = product.previousPrice || '';
        document.getElementById('prod-quantity').value = product.quantity ?? 1;
        document.getElementById('prod-sku').value = product.sku || '';

        // Load specs
        if (product.specifications) {
            try {
                const specs = JSON.parse(product.specifications);
                Object.entries(specs).forEach(([key, val]) => {
                    addSpecRow(key, val);
                });
            } catch (e) { /* ignore parse errors */ }
        }

        // Load existing images
        existingImageIds = product.imageFileIds ? [...product.imageFileIds] : [];
        renderImagePreviews();
    } else {
        // Add mode
        document.getElementById('modal-title').textContent = 'Add Product';
        existingImageIds = [];
        // Auto-set availability to "Available"
        document.getElementById('prod-availability').value = 'Available';
    }

    document.getElementById('product-modal').classList.add('show');
};

window.closeProductForm = function() {
    document.getElementById('product-modal').classList.remove('show');
    editingProductId = null;
    pendingImageFiles = [];
    existingImageIds = [];
    removedImageIds = [];
};

// ─── Category Change → Populate Specs ────────────────────────
window.onCategoryChange = function() {
    const cat = document.getElementById('prod-category').value;
    const builder = document.getElementById('specs-builder');

    // Only populate if empty (don't overwrite existing specs in edit mode)
    if (builder.children.length > 0) return;

    const templates = CATEGORY_SPECS[cat] || [];
    templates.forEach(key => addSpecRow(key, ''));
};

// ─── Dynamic Spec Rows ───────────────────────────────────────
window.addSpecRow = function(key = '', value = '') {
    const builder = document.getElementById('specs-builder');
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `
        <input type="text" placeholder="e.g. Processor" value="${escapeHtml(key)}" class="spec-key">
        <input type="text" placeholder="e.g. Intel Core i5" value="${escapeHtml(value)}" class="spec-value">
        <button type="button" class="remove-spec" onclick="this.parentElement.remove()">
            <i class="ph ph-x"></i>
        </button>
    `;
    builder.appendChild(row);
};

// ─── Image Handling ──────────────────────────────────────────
window.handleImageSelect = function(e) {
    const files = Array.from(e.target.files);
    const totalCount = existingImageIds.length + pendingImageFiles.length + files.length;

    if (totalCount > 5) {
        showToast(`Maximum 5 images allowed. You can add ${5 - existingImageIds.length - pendingImageFiles.length} more.`, 'error');
        return;
    }

    pendingImageFiles.push(...files);
    renderImagePreviews();
    // Reset input so same file can be selected again
    e.target.value = '';
};

function renderImagePreviews() {
    const container = document.getElementById('image-previews');
    container.innerHTML = '';

    // Existing uploaded images
    existingImageIds.forEach((fileId, idx) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
            <img src="${getFilePreviewUrl(fileId, 144, 144)}" alt="Product image">
            <button type="button" class="remove-image" onclick="removeExistingImage(${idx})">
                <i class="ph ph-x"></i>
            </button>
        `;
        container.appendChild(div);
    });

    // Pending new images
    pendingImageFiles.forEach((file, idx) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        const url = URL.createObjectURL(file);
        div.innerHTML = `
            <img src="${url}" alt="New image">
            <button type="button" class="remove-image" onclick="removePendingImage(${idx})">
                <i class="ph ph-x"></i>
            </button>
        `;
        container.appendChild(div);
    });

    // Update upload zone visibility
    const total = existingImageIds.length + pendingImageFiles.length;
    const zone = document.getElementById('image-upload-zone');
    zone.style.display = total >= 5 ? 'none' : 'block';
}

window.removeExistingImage = function(idx) {
    const fileId = existingImageIds.splice(idx, 1)[0];
    removedImageIds.push(fileId);
    renderImagePreviews();
};

window.removePendingImage = function(idx) {
    pendingImageFiles.splice(idx, 1);
    renderImagePreviews();
};

// Drag & drop
const uploadZone = document.getElementById('image-upload-zone');
if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        const totalCount = existingImageIds.length + pendingImageFiles.length + files.length;
        if (totalCount > 5) {
            showToast('Maximum 5 images allowed.', 'error');
            return;
        }
        pendingImageFiles.push(...files);
        renderImagePreviews();
    });
}

// ─── Submit Product Form ─────────────────────────────────────
window.handleProductSubmit = async function(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('btn-product-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';

    try {
        // Collect specs
        const specRows = document.querySelectorAll('.spec-row');
        const specs = {};
        specRows.forEach(row => {
            const key = row.querySelector('.spec-key').value.trim();
            const val = row.querySelector('.spec-value').value.trim();
            if (key) specs[key] = val;
        });

        // Upload new images
        const newImageIds = [];
        for (const file of pendingImageFiles) {
            const uploaded = await storage.createFile(
                BUCKET_ID,
                ID.unique(),
                file,
                [
                    Permission.read(Role.any()),
                    Permission.write(Role.user(currentUser.$id)),
                    Permission.update(Role.user(currentUser.$id)),
                    Permission.delete(Role.user(currentUser.$id))
                ]
            );
            newImageIds.push(uploaded.$id);
        }

        // Delete removed images
        for (const fileId of removedImageIds) {
            try {
                await storage.deleteFile(BUCKET_ID, fileId);
            } catch (err) {
                console.warn('Failed to delete image:', fileId, err);
            }
        }

        // Build final image array
        const finalImageIds = [...existingImageIds, ...newImageIds];

        // Build document data
        const data = {
            shopId: currentShop.$id,
            name: document.getElementById('prod-name').value.trim(),
            category: document.getElementById('prod-category').value,
            brand: document.getElementById('prod-brand').value.trim(),
            condition: document.getElementById('prod-condition').value,
            availability: document.getElementById('prod-availability').value,
            sellingPrice: parseInt(document.getElementById('prod-price').value) || 0,
            previousPrice: parseInt(document.getElementById('prod-prev-price').value) || null,
            quantity: parseInt(document.getElementById('prod-quantity').value) || 1,
            sku: document.getElementById('prod-sku').value.trim() || null,
            specifications: Object.keys(specs).length > 0 ? JSON.stringify(specs) : null,
            imageFileIds: finalImageIds,
            ownerId: currentUser.$id
        };

        const editId = document.getElementById('prod-edit-id').value;

        if (editId) {
            // Update existing
            await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, editId, data);
            showToast('Product updated!', 'success');
        } else {
            // Create new
            await databases.createDocument(
                DATABASE_ID, PRODUCTS_COLLECTION_ID, ID.unique(), data,
                [
                    Permission.read(Role.any()),
                    Permission.write(Role.user(currentUser.$id)),
                    Permission.update(Role.user(currentUser.$id)),
                    Permission.delete(Role.user(currentUser.$id))
                ]
            );
            showToast('Product added!', 'success');
        }

        closeProductForm();
        await loadProducts();
    } catch (err) {
        console.error('Product save error:', err);
        showToast(err.message || 'Failed to save product', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="ph ph-check"></i> Save Product';
    }
};

// ─── Delete Product ──────────────────────────────────────────
window.openDeleteConfirm = function(productId, name) {
    document.querySelectorAll('.more-menu.show').forEach(m => m.classList.remove('show'));
    pendingDeleteId = productId;
    document.getElementById('confirm-message').textContent = `"${name}" will be permanently deleted.`;
    document.getElementById('confirm-dialog').classList.add('show');
};

window.closeConfirmDialog = function() {
    document.getElementById('confirm-dialog').classList.remove('show');
    pendingDeleteId = null;
};

window.confirmDelete = async function() {
    if (!pendingDeleteId) return;

    const product = allProducts.find(p => p.$id === pendingDeleteId);

    try {
        // Delete images first
        if (product && product.imageFileIds) {
            for (const fileId of product.imageFileIds) {
                try { await storage.deleteFile(BUCKET_ID, fileId); } catch (e) { /* ignore */ }
            }
        }

        await databases.deleteDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, pendingDeleteId);
        showToast('Product deleted', 'success');
        closeConfirmDialog();
        await loadProducts();
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Failed to delete product', 'error');
    }
};

// ─── Shop Setup ──────────────────────────────────────────────
window.handleShopSetup = async function(e) {
    e.preventDefault();

    const btn = document.getElementById('btn-shop-setup');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Creating...';

    try {
        const name = document.getElementById('setup-shop-name').value.trim();
        const slug = generateSlug(name);

        const data = {
            name: name,
            slug: slug,
            whatsappNumber: document.getElementById('setup-whatsapp').value.trim(),
            phoneNumber: document.getElementById('setup-phone').value.trim() || null,
            address: document.getElementById('setup-address').value.trim() || null,
            description: document.getElementById('setup-description').value.trim() || null,
            googleMapsLink: null,
            logoFileId: null,
            coverFileId: null,
            ownerId: currentUser.$id
        };

        currentShop = await databases.createDocument(
            DATABASE_ID, SHOPS_COLLECTION_ID, ID.unique(), data,
            [
                Permission.read(Role.any()),
                Permission.write(Role.user(currentUser.$id)),
                Permission.update(Role.user(currentUser.$id)),
                Permission.delete(Role.user(currentUser.$id))
            ]
        );

        showToast('Shop created! Let\'s add your first product.', 'success');
        await showDashboard();
    } catch (err) {
        console.error('Shop setup error:', err);
        showToast(err.message || 'Failed to create shop', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-rocket-launch"></i> Launch My Shop';
    }
};

// ─── Shop Settings ───────────────────────────────────────────
window.openShopSettings = function() {
    if (!currentShop) return;

    document.getElementById('settings-shop-name').value = currentShop.name;
    document.getElementById('settings-whatsapp').value = currentShop.whatsappNumber;
    document.getElementById('settings-phone').value = currentShop.phoneNumber || '';
    document.getElementById('settings-address').value = currentShop.address || '';
    document.getElementById('settings-maps').value = currentShop.googleMapsLink || '';
    document.getElementById('settings-description').value = currentShop.description || '';

    document.getElementById('shop-modal').classList.add('show');
};

window.closeShopSettings = function() {
    document.getElementById('shop-modal').classList.remove('show');
};

window.handleShopUpdate = async function(e) {
    e.preventDefault();

    const btn = document.getElementById('btn-shop-update');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';

    try {
        const name = document.getElementById('settings-shop-name').value.trim();

        const data = {
            name: name,
            slug: generateSlug(name),
            whatsappNumber: document.getElementById('settings-whatsapp').value.trim(),
            phoneNumber: document.getElementById('settings-phone').value.trim() || null,
            address: document.getElementById('settings-address').value.trim() || null,
            googleMapsLink: document.getElementById('settings-maps').value.trim() || null,
            description: document.getElementById('settings-description').value.trim() || null
        };

        currentShop = await databases.updateDocument(
            DATABASE_ID, SHOPS_COLLECTION_ID, currentShop.$id, data
        );

        updateShopHeader();
        showToast('Shop settings updated!', 'success');
        closeShopSettings();
    } catch (err) {
        console.error('Shop update error:', err);
        showToast(err.message || 'Failed to update shop', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-check"></i> Save Changes';
    }
};

// ─── WhatsApp Share ──────────────────────────────────────────
window.openShareModal = function(productId) {
    document.querySelectorAll('.more-menu.show').forEach(m => m.classList.remove('show'));
    const product = allProducts.find(p => p.$id === productId);
    if (!product) return;

    currentShareText = generateWhatsAppPost(product);
    document.getElementById('share-preview-text').textContent = currentShareText;
    document.getElementById('btn-copy-share').classList.remove('copied');
    document.getElementById('btn-copy-share').innerHTML = '<i class="ph ph-copy"></i> Copy';
    document.getElementById('share-modal').classList.add('show');
};

window.closeShareModal = function() {
    document.getElementById('share-modal').classList.remove('show');
};

window.copyShareText = async function() {
    try {
        await navigator.clipboard.writeText(currentShareText);
        const btn = document.getElementById('btn-copy-share');
        btn.classList.add('copied');
        btn.innerHTML = '<i class="ph ph-check"></i> Copied!';
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy', 'error');
    }
};

window.openWhatsAppShare = function() {
    const encoded = encodeURIComponent(currentShareText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
};

function generateWhatsAppPost(product) {
    const conditionEmoji = product.condition === 'Brand New' ? '🆕' : '✅';
    const arrivalEmoji = product.condition === 'Brand New' ? '🔥 NEW ARRIVAL' : '📦 IN STOCK';

    let text = `${arrivalEmoji}\n\n`;
    text += `*${product.name}*\n\n`;

    // Specs
    if (product.specifications) {
        try {
            const specs = JSON.parse(product.specifications);
            Object.entries(specs).forEach(([key, val]) => {
                if (val) text += `• ${key}: ${val}\n`;
            });
            text += '\n';
        } catch (e) { /* ignore */ }
    }

    text += `Condition: ${conditionEmoji} ${product.condition}\n\n`;
    text += `*${formatPrice(product.sellingPrice)}*`;

    if (product.previousPrice && product.previousPrice > product.sellingPrice) {
        text += ` ~${formatPrice(product.previousPrice)}~`;
    }

    text += '\n';

    // Product link
    const baseUrl = window.location.origin + window.location.pathname.replace('dashboard.html', '');
    text += `\nView more:\n${baseUrl}product.html?id=${product.$id}`;

    return text;
}

// ─── View Public Store ───────────────────────────────────────
window.viewPublicStore = function() {
    if (!currentShop) return;
    const baseUrl = window.location.origin + window.location.pathname.replace('dashboard.html', '');
    window.open(`${baseUrl}index.html?shop=${currentShop.slug}`, '_blank');
};

// ─── Dashboard View Switching (Bottom Nav) ───────────────────
window.switchDashView = function(view, event) {
    if (event) event.preventDefault();

    // Update nav
    document.querySelectorAll('.dash-bottom-nav a').forEach(a => a.classList.remove('active'));

    if (view === 'inventory') {
        document.getElementById('nav-inventory').classList.add('active');
        document.getElementById('inventory-view').style.display = 'block';
        document.getElementById('fab-add').style.display = 'flex';
    } else if (view === 'shop') {
        document.getElementById('nav-shop').classList.add('active');
        openShopSettings();
    }
};

// ─── Logout ──────────────────────────────────────────────────
window.handleLogout = async function() {
    try {
        await account.deleteSession('current');
    } catch (e) { /* ignore */ }
    window.location.href = 'login.html';
};

// ─── Utility ─────────────────────────────────────────────────
function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
