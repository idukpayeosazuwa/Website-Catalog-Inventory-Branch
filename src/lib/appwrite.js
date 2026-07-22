import { Client, Account, Databases, Storage, ID, Query, Permission, Role } from 'appwrite';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const SHOPS_COLLECTION_ID = import.meta.env.VITE_SHOPS_COLLECTION_ID || 'shops';
const PRODUCTS_COLLECTION_ID = import.meta.env.VITE_PRODUCTS_COLLECTION_ID || 'products';
const BUCKET_ID = import.meta.env.VITE_BUCKET_ID;

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export {
    client, account, databases, storage,
    ID, Query, Permission, Role,
    DATABASE_ID, SHOPS_COLLECTION_ID, PRODUCTS_COLLECTION_ID, BUCKET_ID,
    APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID
};

export function getFileViewUrl(fileId) {
    if (!fileId) return '';
    try {
        return storage.getFileView(BUCKET_ID, fileId).toString();
    } catch (e) {
        return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
    }
}

export function getFilePreviewUrl(fileId) {
    return getFileViewUrl(fileId);
}

export function formatPrice(amount) {
    if (!amount && amount !== 0) return '';
    return '₦' + Number(amount).toLocaleString('en-NG');
}

export const CATEGORIES = [
    'Laptops', 'Phones', 'Tablets', 'Components', 'Other'
];

export const CONDITIONS = ['Brand New', 'UK Used', 'Nigerian Used', 'Refurbished'];

export const AVAILABILITY_OPTIONS = ['Available', 'Out of Stock'];

export const CATEGORY_SPECS = {
    'Laptops': ['Processor', 'RAM', 'Storage', 'Screen Size', 'Graphics Card', 'Battery Life', 'OS'],
    'Phones': ['Storage', 'RAM', 'Battery Health', 'Network', 'Screen Size', 'Camera', 'OS'],
    'Tablets': ['Storage', 'RAM', 'Screen Size', 'Battery', 'Connectivity', 'OS'],
    'Components': ['Capacity', 'Compatibility', 'Wattage', 'Interface'],
    'Other': []
};
