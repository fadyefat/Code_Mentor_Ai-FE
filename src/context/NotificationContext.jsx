import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
    // 1. Manage Push Preferences
    const [pushEnabled, setPushEnabled] = useState(() => {
        const stored = localStorage.getItem('pushEnabled');
        return stored !== null ? JSON.parse(stored) : true;
    });

    useEffect(() => {
        localStorage.setItem('pushEnabled', JSON.stringify(pushEnabled));
    }, [pushEnabled]);

    const togglePush = () => {
        setPushEnabled(prev => !prev);
    };

    // 2. Manage Notifications Array and Unread State
    const [notifications, setNotifications] = useState(() => {
        const stored = localStorage.getItem('notifications');
        return stored ? JSON.parse(stored) : [];
    });
    
    // Derived state for red dot logic
    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }, [notifications]);

    // Format: { id, title, message, route, time }
    const addNotification = (notif) => {
        if (!pushEnabled) return; // Completely silently ignore if toggled off

        const newNotif = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            title: notif.title || 'Notification',
            message: notif.message || '',
            route: notif.route || '/dashboard',
            time: 'Just now',
            read: false,
            timestamp: Date.now()
        };

        setNotifications(prev => {
            const updated = [newNotif, ...prev];
            // Keep maximum history to 20 to avoid bloat
            return updated.slice(0, 20);
        });
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    return (
        <NotificationContext.Provider value={{
            pushEnabled,
            togglePush,
            notifications,
            unreadCount,
            addNotification,
            markAllAsRead
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
