import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
    const { user } = useAuth();
    const [stores, setStores] = useState([]);
    const [currentStore, setCurrentStore] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStores = async () => {
        try {
            const res = await axios.get('/stores');
            setStores(res.data);

            // If user has a store_id, try to set it as default
            if (user?.store_id) {
                const myStore = res.data.find(s => s.id === user.store_id);
                if (myStore) setCurrentStore(myStore);
            }

            // Fallback: if no current store yet, set to first one (or Main Store)
            if (!currentStore && res.data.length > 0) {
                setCurrentStore(res.data[0]);
            }

        } catch (e) {
            console.error("Error fetching stores", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchStores();
        }
    }, [user]);

    // If user acts as admin, they can switch manually
    // If we switch currentStore, all child components should re-fetch data
    const setStore = (storeId) => {
        if (user?.role !== 'admin') {
            console.warn("Only admins can switch stores manually");
            return;
        }
        const target = stores.find(s => s.id === parseInt(storeId));
        if (target) setCurrentStore(target);
    };

    return (
        <StoreContext.Provider value={{ stores, currentStore, setStore, refreshStores: fetchStores, loading }}>
            {children}
        </StoreContext.Provider>
    );
};
