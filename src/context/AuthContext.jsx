import React, { createContext, useContext, useState, useEffect } from 'react';
import { account, databases, Query, DATABASE_ID, SHOPS_COLLECTION_ID } from '../lib/appwrite';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [currentShop, setCurrentShop] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUserAndShop = async () => {
        try {
            const u = await account.get();
            setUser(u);
            if (u) {
                const shopRes = await databases.listDocuments(DATABASE_ID, SHOPS_COLLECTION_ID, [
                    Query.equal('ownerId', u.$id)
                ]);
                setCurrentShop(shopRes.documents.length > 0 ? shopRes.documents[0] : null);
            } else {
                setCurrentShop(null);
            }
        } catch (err) {
            setUser(null);
            setCurrentShop(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshUserAndShop();
    }, []);

    const logout = async () => {
        try {
            await account.deleteSession('current');
        } catch (e) {}
        setUser(null);
        setCurrentShop(null);
    };

    return (
        <AuthContext.Provider value={{ user, currentShop, loading, setUser, setCurrentShop, refreshUserAndShop, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
    return ctx;
}
