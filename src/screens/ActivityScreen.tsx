import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { collection, query, where, orderBy, limit, startAfter, getDocs, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { usePairing } from '../hooks/usePairing';
import { ActivityLog, ActivityAction } from '../types/ActivityLog';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

interface GroupedActivity {
    id: string;
    userId: string;
    userName: string;
    userPhoto: string | null;
    actionType: ActivityAction;
    items: string[];
    timestamp: Date;
}

const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export const ActivityScreen: React.FC = () => {
    const { pairId } = usePairing();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchLogs = async (isMore = false) => {
        if (!pairId) return;
        if (isMore && !hasMore) return;

        if (isMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            let q = query(
                collection(db, 'activityLogs'),
                where('pairId', '==', pairId),
                where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo)),
                orderBy('timestamp', 'desc'),
                limit(30)
            );

            if (isMore && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            const newLogs: ActivityLog[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: (doc.data() as any).timestamp.toDate(),
            })) as ActivityLog[];

            if (isMore) {
                setLogs(prev => {
                    const logMap = new Map(prev.map(log => [log.id, log]));
                    newLogs.forEach(log => logMap.set(log.id, log));
                    return Array.from(logMap.values())
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                });
            } else {
                setLogs(newLogs);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === 30);
        } catch (error) {
            console.error('Error fetching activity logs:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        // fetchLogs(); // REMOVED: Rely on onSnapshot for initial load to prevent duplicates

        // Real-time listener for the first page
        if (pairId) {
            setLoading(true); // Set loading for initial snapshot
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const q = query(
                collection(db, 'activityLogs'),
                where('pairId', '==', pairId),
                where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo)),
                orderBy('timestamp', 'desc'),
                limit(30)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const updatedLogs: ActivityLog[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: (doc.data() as any).timestamp.toDate(),
                })) as ActivityLog[];
                
                setLogs(prev => {
                    // Use a Map to ensure each log ID is unique
                    const logMap = new Map(prev.map(log => [log.id, log]));
                    
                    // Overwrite/Add the new live logs
                    updatedLogs.forEach(log => logMap.set(log.id, log));
                    
                    // Convert back to array and sort by timestamp descending
                    return Array.from(logMap.values())
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                });

                // Set lastDoc if it's not already set (for initial pagination)
                if (!lastDoc && snapshot.docs.length > 0) {
                    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                    setHasMore(snapshot.docs.length === 30);
                }
                setLoading(false);
            }, (error) => {
                console.error('Error in activity onSnapshot:', error);
                setLoading(false);
            });

            return () => unsubscribe();
        }
    }, [pairId]);

    const groupedLogs = useMemo(() => {
        const groups: GroupedActivity[] = [];
        logs.forEach(log => {
            const lastGroup = groups[groups.length - 1];
            // Use a more robust check for grouping
            const isWithinTenMins = lastGroup && 
                Math.abs(lastGroup.timestamp.getTime() - log.timestamp.getTime()) < 10 * 60 * 1000;

            if (lastGroup && 
                lastGroup.userId === log.userId && 
                lastGroup.actionType === log.actionType && 
                isWithinTenMins) {
                // Only add the item if it's not already in the list for this group
                if (!lastGroup.items.includes(log.itemName)) {
                    lastGroup.items.push(log.itemName);
                }
            } else {
                groups.push({
                    // Create a more unique ID for the group to prevent FlatList key collisions
                    id: `${log.id}-${log.timestamp.getTime()}`,
                    userId: log.userId,
                    userName: log.userName,
                    userPhoto: log.userPhoto,
                    actionType: log.actionType,
                    items: [log.itemName],
                    timestamp: log.timestamp,
                });
            }
        });
        return groups;
    }, [logs]);

    const renderActivityText = (group: GroupedActivity) => {
        const { items, actionType } = group;
        const verb = actionType === 'ADD' ? 'added' : 'updated';
        
        if (items.length === 1) {
            return <Text style={styles.actionText}><Text style={styles.userName}>{group.userName}</Text> {verb} <Text style={styles.itemName}>{items[0]}</Text></Text>;
        }
        
        if (items.length <= 3) {
            const displayItems = [...items];
            const lastItem = displayItems.pop();
            return <Text style={styles.actionText}><Text style={styles.userName}>{group.userName}</Text> {verb} <Text style={styles.itemName}>{displayItems.join(', ')}</Text> and <Text style={styles.itemName}>{lastItem}</Text></Text>;
        }
        
        return <Text style={styles.actionText}><Text style={styles.userName}>{group.userName}</Text> {verb} <Text style={styles.itemName}>{items[0]}, {items[1]}</Text> and <Text style={styles.itemName}>{items.length - 2} more items</Text></Text>;
    };

    if (loading && logs.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#6B4B3E" />
            </View>
        );
    }

    return (
        <LinearGradient colors={['#DDF3FF', '#FFF6EA']} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Activity</Text>
            </View>

            <FlatList
                data={groupedLogs}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.logCard}>
                        <View style={styles.avatarContainer}>
                            {item.userPhoto ? (
                                <Image 
                                    source={{ uri: item.userPhoto }} 
                                    style={styles.avatar}
                                    contentFit="cover"
                                    cachePolicy="disk"
                                />
                            ) : (
                                <View style={styles.initialCircle}>
                                    <Text style={styles.initialText}>{item.userName.charAt(0).toUpperCase()}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.contentContainer}>
                            {renderActivityText(item)}
                            <Text style={styles.timestamp}>{formatTimeAgo(item.timestamp)}</Text>
                        </View>
                    </View>
                )}
                onEndReached={() => fetchLogs(true)}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Image 
                            source={require('../../assets/fridge_pushing_cart.png')} 
                            style={styles.emptyImage} 
                            resizeMode="contain"
                        />
                        <Text style={styles.emptyText}>No recent activity. Time to go shopping?</Text>
                    </View>
                }
                ListFooterComponent={loadingMore ? <ActivityIndicator color="#6B4B3E" style={{ marginVertical: 20 }} /> : null}
                contentContainerStyle={styles.listContent}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#DDF3FF',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 120, // Adjusted to match Profile screen alignment
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 34,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    logCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF7EE',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(107, 75, 62, 0.1)',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: '#6B4B3E',
    },
    initialCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E79B74',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#6B4B3E',
    },
    initialText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontFamily: 'Inter-Bold',
    },
    contentContainer: {
        flex: 1,
    },
    userName: {
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
    },
    actionText: {
        fontSize: 15,
        color: '#6B4B3E',
        fontFamily: 'Inter-Regular',
        lineHeight: 20,
    },
    itemName: {
        fontFamily: 'Inter-SemiBold',
    },
    timestamp: {
        fontSize: 12,
        color: '#A89B8F',
        marginTop: 4,
        fontFamily: 'Inter-Medium',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyImage: {
        width: 250,
        height: 250,
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 18,
        color: '#6B4B3E',
        fontFamily: 'Inter-Medium',
        textAlign: 'center',
        opacity: 0.6,
        paddingHorizontal: 40,
    },
});
