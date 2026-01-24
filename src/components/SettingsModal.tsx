import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Switch,
    Alert,
    Platform,
    Share,
    Clipboard,
    Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { usePairing } from '../hooks/usePairing';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { LocationPickerModal } from './LocationPickerModal';
import { requestLocationPermissions, registerGeofences } from '../services/locationService';

// Icons
const CloseIcon = ({ size = 24, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const ChevronRightIcon = ({ size = 20, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const MapPinIcon = ({ size = 20, color = "#E79B74" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const HomeIcon = ({ size = 20, color = "#E79B74" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 22V12h6v10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const EditIcon = ({ size = 18, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const CopyIcon = ({ size = 18, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M8 4V1c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1h-3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M4 8v11c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const ExternalLinkIcon = ({ size = 18, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M15 3H21V9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M10 14L21 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const BellIcon = ({ size = 20, color = "#E79B74" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M18 8A6 6 0 0 0 6 8C6 12 4 14 4 14H20C20 14 18 12 18 8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
    const { 
        pair, 
        pairId, 
        user, 
        userName, 
        updateFridgeName, 
        updateUserName, 
        unpair, 
        logout 
    } = usePairing();
    
    const { prefs, reminders, updatePrefs, updateLocationReminders } = useNotificationPrefs(pairId, userName);

    const [isEditingUser, setIsEditingUser] = useState(false);
    const [tempUserName, setTempUserName] = useState(userName || '');
    
    const [isEditingFridge, setIsEditingFridge] = useState(false);
    const [tempFridgeName, setTempFridgeName] = useState(pair?.fridgeName || '');

    const [locationPickerType, setLocationPickerType] = useState<'departure' | 'store' | null>(null);

    const handleOpenLocationPicker = (type: 'departure' | 'store') => {
        setLocationPickerType(type);
    };

    const handleSaveLocation = async (latitude: number, longitude: number, address: string, name: string) => {
        if (!pairId || !userName || !locationPickerType) return;

        // Request permissions if needed
        const hasPermission = await requestLocationPermissions();
        if (!hasPermission) {
            Alert.alert(
                "Permission Required",
                "To use location reminders, please enable 'Always' location access in your phone settings.",
                [{ text: "OK" }]
            );
            return;
        }

        const locationData = { latitude, longitude, address, label: name };
        await updateLocationReminders(locationPickerType, locationData);

        // Update geofencing
        const updatedReminders = { ...reminders };
        if (locationPickerType === 'departure') {
            updatedReminders.departureLocation = locationData;
        } else {
            updatedReminders.storeLocation = locationData;
        }
        
        await registerGeofences(updatedReminders.departureLocation, updatedReminders.storeLocation);
        
        setLocationPickerType(null);
    };

    const handleSaveUserName = async () => {
        if (tempUserName.trim() && tempUserName !== userName) {
            await updateUserName(tempUserName.trim());
        }
        setIsEditingUser(false);
    };

    const handleSaveFridgeName = async () => {
        if (tempFridgeName.trim() && tempFridgeName !== pair?.fridgeName) {
            await updateFridgeName(tempFridgeName.trim());
        }
        setIsEditingFridge(false);
    };

    const handleCopyCode = () => {
        if (pairId) {
            Clipboard.setString(pairId);
            Alert.alert("Success", "Invite code copied to clipboard!");
        }
    };

    const handleLeaveFridge = () => {
        Alert.alert(
            "Leave Fridge?",
            "Are you sure? You will lose access to all shared notes and groceries in this fridge.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Leave", 
                    style: "destructive",
                    onPress: async () => {
                        await unpair();
                        onClose();
                    }
                }
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Log Out", 
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        onClose();
                    }
                }
            ]
        );
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const openLink = (url: string) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <LinearGradient
                colors={['#DDF3FF', '#FFF6EA']}
                style={styles.container}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <TouchableOpacity onPress={onClose} style={styles.doneButton}>
                        <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* My Profile Section */}
                    <Text style={styles.sectionHeader}>My Profile</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Name</Text>
                            <View style={styles.rowRight}>
                                {isEditingUser ? (
                                    <TextInput
                                        style={styles.rowInput}
                                        value={tempUserName}
                                        onChangeText={setTempUserName}
                                        onBlur={handleSaveUserName}
                                        onSubmitEditing={handleSaveUserName}
                                        autoFocus
                                    />
                                ) : (
                                    <Text style={styles.rowValue}>{userName}</Text>
                                )}
                                <TouchableOpacity 
                                    onPress={() => {
                                        setTempUserName(userName || '');
                                        setIsEditingUser(true);
                                    }}
                                    style={styles.iconButton}
                                >
                                    <EditIcon />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={[styles.row, styles.noBorder]}>
                            <Text style={styles.rowLabel}>Email</Text>
                            <Text style={styles.rowValueSecondary} numberOfLines={1}>{user?.email || 'No email'}</Text>
                        </View>
                    </View>

                    {/* Current Fridge Section */}
                    <Text style={styles.sectionHeader}>Current Fridge</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Name</Text>
                            <View style={styles.rowRight}>
                                {isEditingFridge ? (
                                    <TextInput
                                        style={styles.rowInput}
                                        value={tempFridgeName}
                                        onChangeText={setTempFridgeName}
                                        onBlur={handleSaveFridgeName}
                                        onSubmitEditing={handleSaveFridgeName}
                                        autoFocus
                                    />
                                ) : (
                                    <Text style={styles.rowValue}>{pair?.fridgeName || 'Unnamed Fridge'}</Text>
                                )}
                                <TouchableOpacity 
                                    onPress={() => {
                                        setTempFridgeName(pair?.fridgeName || '');
                                        setIsEditingFridge(true);
                                    }}
                                    style={styles.iconButton}
                                >
                                    <EditIcon />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Invite Code</Text>
                            <View style={styles.rowRight}>
                                <Text style={[styles.rowValue, { color: '#6B4B3E', fontFamily: 'Inter-Bold' }]}>{pairId}</Text>
                                <TouchableOpacity onPress={handleCopyCode} style={styles.iconButton}>
                                    <CopyIcon />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Members</Text>
                            <Text style={styles.rowValueSecondary}>{pair?.memberUids.length || 0}/4</Text>
                        </View>
                        <View style={[styles.row, styles.noBorder]}>
                            <Text style={styles.rowLabel}>Created</Text>
                            <Text style={styles.rowValueSecondary}>{pair?.createdAt ? formatDate(pair.createdAt) : '-'}</Text>
                        </View>
                    </View>

                    {/* Notifications Section */}
                    <Text style={styles.sectionHeader}>Notifications</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.rowLabelWithIcon}>
                                <View style={styles.bellIconContainer}>
                                    <BellIcon />
                                </View>
                                <View>
                                    <Text style={styles.rowLabelBold}>Push Notifications</Text>
                                    <Text style={styles.rowSublabel}>Shared notes & fridge updates</Text>
                                </View>
                            </View>
                            <Switch
                                value={prefs.notifyFridgeUpdates && prefs.notifyNotes}
                                onValueChange={(val) => updatePrefs({ notifyFridgeUpdates: val, notifyNotes: val })}
                                trackColor={{ false: '#DCC8B9', true: '#E79B74' }}
                                thumbColor={prefs.notifyFridgeUpdates && prefs.notifyNotes ? '#6B4B3E' : '#FFF7EE'}
                            />
                        </View>

                        {/* Leave Location Reminder */}
                        <TouchableOpacity style={styles.row} onPress={() => handleOpenLocationPicker('departure')}>
                            <View style={styles.rowLabelWithIcon}>
                                <View style={styles.bellIconContainer}>
                                    <HomeIcon />
                                </View>
                                <View style={styles.reminderContent}>
                                    <Text style={styles.rowLabelBold}>Remind me when I leave a location</Text>
                                    <Text style={styles.rowSublabel} numberOfLines={1}>
                                        {reminders?.departureLocation?.label || reminders?.departureLocation?.address || "Tap to set work/gym/etc."}
                                    </Text>
                                </View>
                            </View>
                            <ChevronRightIcon />
                        </TouchableOpacity>

                        {/* Near Store Reminder */}
                        <TouchableOpacity style={[styles.row, styles.noBorder]} onPress={() => handleOpenLocationPicker('store')}>
                            <View style={styles.rowLabelWithIcon}>
                                <View style={styles.bellIconContainer}>
                                    <MapPinIcon />
                                </View>
                                <View style={styles.reminderContent}>
                                    <Text style={styles.rowLabelBold}>Remind me when I am near the store</Text>
                                    <Text style={styles.rowSublabel} numberOfLines={1}>
                                        {reminders?.storeLocation?.label || reminders?.storeLocation?.address || "Tap to set your favorite store"}
                                    </Text>
                                </View>
                            </View>
                            <ChevronRightIcon />
                        </TouchableOpacity>
                    </View>

                    {/* Support Section */}
                    <Text style={styles.sectionHeader}>Support</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.row} onPress={() => openLink('https://apps.apple.com/app/idYOUR_APP_ID')}>
                            <Text style={styles.rowLabel}>Rate our fridge</Text>
                            <ExternalLinkIcon />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.row} onPress={() => openLink('https://your-privacy-policy-link.com')}>
                            <Text style={styles.rowLabel}>Privacy policy</Text>
                            <ExternalLinkIcon />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.row, styles.noBorder]} onPress={() => openLink('https://your-contact-support-link.com')}>
                            <Text style={styles.rowLabel}>Contact support</Text>
                            <ExternalLinkIcon />
                        </TouchableOpacity>
                    </View>

                    {/* Danger Zone */}
                    <View style={styles.bottomButtons}>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutButtonText}>Log Out</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveFridge}>
                            <Text style={styles.leaveButtonText}>Leave Fridge</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                <LocationPickerModal
                    visible={locationPickerType !== null}
                    onClose={() => setLocationPickerType(null)}
                    onSave={handleSaveLocation}
                    title={locationPickerType === 'departure' ? 'Set Departure Location' : 'Set Store Location'}
                    placeholder={locationPickerType === 'departure' ? 'e.g. Work, Gym, Office' : 'e.g. Tesco, Whole Foods, Walmart...'}
                    initialLocation={locationPickerType === 'departure' ? reminders?.departureLocation : reminders?.storeLocation}
                />
            </LinearGradient>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        position: 'relative',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
    },
    doneButton: {
        position: 'absolute',
        right: 20,
        backgroundColor: '#FFF7EE',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    doneButtonText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#6B4B3E',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionHeader: {
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
        color: '#6B4B3E',
        marginTop: 24,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    card: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3E3D7',
        gap: 12,
    },
    noBorder: {
        borderBottomWidth: 0,
    },
    rowLabel: {
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        color: '#6B4B3E',
    },
    rowLabelBold: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#6B4B3E',
    },
    rowSublabel: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.6,
        marginTop: 2,
    },
    rowValue: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        flexShrink: 1,
        textAlign: 'right',
    },
    rowValueSecondary: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.6,
        maxWidth: '60%',
    },
    rowInput: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        borderBottomWidth: 1,
        borderBottomColor: '#E79B74',
        paddingVertical: 0,
        minWidth: 100,
        textAlign: 'right',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end',
    },
    iconButton: {
        padding: 4,
    },
    rowLabelWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    bellIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3E3D7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    reminderContent: {
        flex: 1,
        paddingRight: 8,
    },
    bottomButtons: {
        marginTop: 40,
        width: '100%',
        gap: 12,
        paddingBottom: 20,
    },
    logoutButton: {
        width: '50%',
        alignSelf: 'center',
        backgroundColor: '#FFF7EE',
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#6B4B3E',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    logoutButtonText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#BC4B41',
    },
    leaveButton: {
        width: '50%',
        alignSelf: 'center',
        backgroundColor: '#FFF7EE',
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#6B4B3E',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    leaveButtonText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#BC4B41',
    },
});
