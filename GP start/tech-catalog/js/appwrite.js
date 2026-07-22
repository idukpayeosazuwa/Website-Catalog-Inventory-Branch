/**
 * Appwrite SDK Configuration & Shared Helpers
 * 
 * ⚠️  UPDATE the values below with your Appwrite project credentials.
 *     Then create the database, collections, and bucket as described in setup/SETUP.md
 */

// ============================================================
//  CONFIGURATION — Replace with your Appwrite project details
// ============================================================
const APPWRITE_ENDPOINT = 'https://sfo.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6a60924c003a3b2ef5d0';

const DATABASE_ID = '6a6092c80024a6ead6af';
const SHOPS_COLLECTION_ID = 'shops';
const PRODUCTS_COLLECTION_ID = 'products';
const BUCKET_ID = '6a6093820013929975b3';
// ============================================================

import {
    Client, Account, Databases, Storage, ID, Query, Permission, Role
} from 'https://cdn.jsdelivr.net/npm/appwrite/+esm';

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// ─── Verify Appwrite Connection on Load ─────────────────────
// This ping runs automatically when the module is imported to
// confirm the Appwrite backend is reachable.
client.ping()
    .then(() => console.log('✅ Appwrite connection verified successfully'))
    .catch((err) => console.error('❌ Appwrite connection failed:', err.message));

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export {
    client, account, databases, storage,
    ID, Query, Permission, Role,
    DATABASE_ID, SHOPS_COLLECTION_ID, PRODUCTS_COLLECTION_ID, BUCKET_ID,
    APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID
};

// ─── File URL Helpers ────────────────────────────────────────

export function getFilePreviewUrl(fileId) {
    // Return direct view URL to avoid Appwrite Cloud free plan transformation restrictions
    return getFileViewUrl(fileId);
}

export function getFileViewUrl(fileId) {
    return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
}

// ─── Price Formatting ────────────────────────────────────────

export function formatPrice(amount) {
    if (!amount && amount !== 0) return '';
    return '₦' + Number(amount).toLocaleString('en-NG');
}

// ─── Toast Notifications ─────────────────────────────────────

export function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="ph ${type === 'success' ? 'ph-check-circle' : type === 'error' ? 'ph-warning-circle' : 'ph-info'}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.closest('.toast-notification').remove()">&times;</button>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ─── Product Constants ───────────────────────────────────────

export const CATEGORIES = [
    'Laptops', 'Phones', 'Tablets', 'Desktops',
    'Audio', 'Accessories', 'Components', 'Other'
];

export const CONDITIONS = ['Brand New', 'UK Used', 'Nigerian Used', 'Refurbished'];

export const AVAILABILITY_OPTIONS = ['Available', 'Sold', 'Out of Stock'];

export const CATEGORY_SPECS = {
    'Laptops': ['Processor', 'RAM', 'Storage', 'Screen Size', 'Graphics Card', 'Battery Life', 'OS'],
    'Phones': ['Storage', 'RAM', 'Battery Health', 'Network', 'Screen Size', 'Camera', 'OS'],
    'Tablets': ['Storage', 'RAM', 'Screen Size', 'Battery', 'Connectivity', 'OS'],
    'Desktops': ['Processor', 'RAM', 'Storage', 'Graphics Card', 'Power Supply', 'OS'],
    'Audio': ['Type', 'Connectivity', 'Battery Life', 'Driver Size', 'Noise Cancellation'],
    'Accessories': ['Compatibility', 'Color', 'Version', 'Material'],
    'Components': ['Capacity', 'Compatibility', 'Wattage', 'Interface'],
    'Other': []
};

// ─── Auth Guard ──────────────────────────────────────────────

export async function getCurrentUser() {
    try {
        return await account.get();
    } catch {
        return null;
    }
}

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

export async function getUserShop(userId) {
    try {
        const res = await databases.listDocuments(DATABASE_ID, SHOPS_COLLECTION_ID, [
            Query.equal('ownerId', userId)
        ]);
        return res.documents.length > 0 ? res.documents[0] : null;
    } catch {
        return null;
    }
}
