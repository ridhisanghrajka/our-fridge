import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Share, Clipboard, Platform, Switch, ActivityIndicator, Alert, Modal, Pressable, Image } from 'react-native';
import { usePairing } from '../hooks/usePairing';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import Svg, { Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { checkPremiumStatus, presentPaywall } from '../services/billing';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase.config';
import { SettingsModal } from '../components/SettingsModal';

const CrownIcon = ({ size = 24, color = "#FFD700" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19Z" />
    </Svg>
);

const EditIcon = ({ size = 20, color = "#948B84" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const SettingsIcon = ({ size = 28, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.72 8.87c-.11.2-.06.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.2.06-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </Svg>
);

const CameraIcon = ({ size = 16, color = "#FFFFFF" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.8"/>
    </Svg>
);

const HeartIcon = ({ size = 18, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </Svg>
);

const CopyIcon = ({ size = 20, color = "#FFFFFF" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M8 4V1c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1h-3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M4 8v11c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const ShareIcon = ({ size = 20, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const MapPinIcon = ({ size = 24, color = "#E79B74" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const HomeIcon = ({ size = 24, color = "#E79B74" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 22V12h6v10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const ProfileScreen: React.FC = () => {
    const { pair, pairId, user, userName, updateFridgeName, updateUserName, updateUserPhoto, unpair, logout } = usePairing();
    const { reminders } = useNotificationPrefs(pairId, userName);
    const [isPremium, setIsPremium] = useState(false);
    const [checkingPremium, setCheckingPremium] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            const status = await checkPremiumStatus();
            setIsPremium(status);
            setCheckingPremium(false);
        };
        checkStatus();
    }, []);

    const pickImage = async () => {
        Alert.alert(
            "Profile Picture",
            "Would you like to take a photo or choose from your gallery?",
            [
                { text: "Take Photo", onPress: () => launchCamera() },
                { text: "Choose from Gallery", onPress: () => launchLibrary() },
                { text: "Cancel", style: "cancel" },
            ]
        );
    };

    const launchCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera permissions to take a photo.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0].uri) {
            uploadImage(result.assets[0].uri);
        }
    };

    const launchLibrary = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need gallery permissions to choose a photo.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0].uri) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        if (!user) return;
        setIsUploading(true);
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const storageRef = ref(storage, `profile_images/${user.uid}_${Date.now()}`);
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            await updateUserPhoto(downloadURL);
            Alert.alert('Success', 'Profile picture updated!');
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', 'Failed to upload image.');
        } finally {
            setIsUploading(false);
        }
    };

    const handlePresentPaywall = async () => {
        const purchased = await presentPaywall();
        if (purchased) {
            setIsPremium(true);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getDaysSince = (date: Date) => {
        const diffTime = Math.abs(new Date().getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const handleCopyCode = () => {
        if (pairId) {
            Clipboard.setString(pairId);
        }
    };

    const handleShareCode = async () => {
        if (pairId) {
            try {
                await Share.share({
                    message: `Join my fridge on Our Fridge! Use code: ${pairId}`,
                });
            } catch (error) {
                console.error('Error sharing code:', error);
            }
        }
    };

    const getFridgeNameDisplay = () => {
        if (pair?.fridgeName) return pair.fridgeName;
        if (pair && user) {
            const partnerUid = pair.memberUids.find(uid => uid !== user.uid);
            const partnerName = partnerUid ? pair.memberNames[partnerUid] : null;
            if (partnerName) {
                return `${userName} & ${partnerName}'s Fridge`;
            }
        }
        return `${userName || 'User'}'s Fridge`;
    };

    return (
        <LinearGradient
            colors={['#DDF3FF', '#FFF6EA']}
            style={styles.container}
        >
            <View style={styles.header}>
                <View style={styles.settingsRow}>
                    <TouchableOpacity 
                        style={styles.settingsButton}
                        onPress={() => setIsSettingsVisible(true)}
                    >
                        <SettingsIcon color="#6B4B3E" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainCard}>
                    {pair && pair.memberUids.length < 4 && (
                        <TouchableOpacity 
                            style={styles.addMemberButton} 
                            onPress={() => setShowInviteModal(true)}
                        >
                            <Text style={styles.plusText}>+</Text>
                        </TouchableOpacity>
                    )}
                    <View style={styles.fridgeNameRow}>
                        <Text style={styles.fridgeNameText}>{getFridgeNameDisplay()}</Text>
                    </View>

                    <View style={styles.membersList}>
                        {pair?.memberUids.map((uid) => {
                            const isUser = uid === user?.uid;
                            const name = pair.memberNames[uid] || (isUser ? userName : 'Member');
                            const photoURL = pair.memberPhotos?.[uid] || (isUser ? user?.photoURL : null);
                            
                            return (
                                <View key={uid} style={styles.memberAvatarContainer}>
                                    <View style={[styles.avatarCircleSmall, { backgroundColor: isUser ? '#6B4B3E' : '#E79B74' }]}>
                                        {photoURL ? (
                                            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
                                        ) : (
                                            <Svg width={40} height={40} viewBox="0 0 24 24">
                                                <Path fill="#FFFFFF" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4s-4 1.79-4 4s1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                            </Svg>
                                        )}
                                        {isUser && (
                                            <TouchableOpacity 
                                                style={styles.cameraIconTiny}
                                                onPress={pickImage}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                                ) : (
                                                    <CameraIcon size={10} />
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={styles.userNameRow}>
                                        <Text style={styles.memberLabel} numberOfLines={1}>
                                            {name}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {pair && pair.memberUids.length < 2 && (
                    <>
                        <Text style={styles.sectionTitle}>Invite Your Partner</Text>
                        <View style={styles.inviteCard}>
                            <View style={styles.inviteHeader}>
                                <View style={styles.smallHeartCircle}>
                                    <HeartIcon size={14} color="#E79B74" />
                                </View>
                                <View>
                                    <Text style={styles.inviteTitle}>Waiting for Partner</Text>
                                    <Text style={styles.inviteSubtitle}>Share your invite code to connect</Text>
                                </View>
                            </View>

                            <View style={styles.codeSection}>
                                <Text style={styles.codeLabel}>Invite Code</Text>
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeText}>{pairId}</Text>
                                </View>
                            </View>

                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                                    <CopyIcon />
                                    <Text style={styles.copyButtonText}>Copy Code</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
                                    <ShareIcon color="#6B4B3E" />
                                    <Text style={styles.shareButtonText}>Share</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}

                <Text style={styles.sectionTitle}>Smart Reminders</Text>
                <TouchableOpacity 
                    style={styles.remindersCard}
                    onPress={() => setIsSettingsVisible(true)}
                    activeOpacity={0.8}
                >
                    <View style={styles.reminderRow}>
                        <View style={styles.reminderIconContainer}>
                            <HomeIcon size={20} />
                        </View>
                        <View style={styles.reminderTextContainer}>
                            <Text style={styles.reminderTitle}>Leave a location</Text>
                            <Text style={styles.reminderStatus}>
                                {reminders?.departureLocation ? `Active: ${reminders.departureLocation.label || reminders.departureLocation.address}` : "Not set up"}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.reminderDivider} />
                    <View style={styles.reminderRow}>
                        <View style={styles.reminderIconContainer}>
                            <MapPinIcon size={20} />
                        </View>
                        <View style={styles.reminderTextContainer}>
                            <Text style={styles.reminderTitle}>Near the store</Text>
                            <Text style={styles.reminderStatus}>
                                {reminders?.storeLocation ? `Active: ${reminders.storeLocation.label || reminders.storeLocation.address}` : "Not set up"}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>Fridge Moments</Text>
                <View style={styles.datesCard}>
                    {pair ? (
                        <View style={styles.momentRow}>
                            <View style={styles.momentTextContainer}>
                                <Text style={styles.momentTitle}>This fridge began on</Text>
                                <Text style={styles.momentDate}>{formatDate(pair.createdAt)}</Text>
                                <Text style={styles.momentSubtext}>
                                    {getDaysSince(pair.createdAt)} days with this fridge
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.placeholderText}>No moments added yet</Text>
                    )}
                </View>

                <Text style={styles.sectionTitle}>Subscription</Text>
                <View style={styles.proCard}>
                    {checkingPremium ? (
                        <ActivityIndicator color="#6B4B3E" />
                    ) : isPremium ? (
                        <View style={styles.proStatusRow}>
                            <CrownIcon size={32} />
                            <View style={styles.proTextContainer}>
                                <Text style={styles.proTitle}>Our Fridge Pro Member</Text>
                                <Text style={styles.proSubtitle}>Thank you for supporting us!</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.proStatusRow}>
                            <View style={styles.proTextContainer}>
                                <Text style={styles.proTitle}>Get Our Fridge Pro</Text>
                                <Text style={styles.proSubtitle}>Unlock all magnets and special features</Text>
                            </View>
                            <TouchableOpacity style={styles.proButton} onPress={handlePresentPaywall}>
                                <Text style={styles.proButtonText}>Go Pro</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            <Modal
                visible={showInviteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowInviteModal(false)}
            >
                <Pressable 
                    style={styles.modalOverlay} 
                    onPress={() => setShowInviteModal(false)}
                >
                    <Pressable 
                        style={styles.invitePopup} 
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.popupTitle}>Add to Fridge</Text>
                        <View style={styles.popupCodeBox}>
                            <Text style={styles.popupCodeLabel}>Invite Code</Text>
                            <Text style={styles.popupCodeText}>{pairId}</Text>
                        </View>
                        <View style={styles.popupActions}>
                            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                                <CopyIcon size={18} />
                                <Text style={styles.actionBtnText}>Copy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode}>
                                <ShareIcon size={18} color="#6B4B3E" />
                                <Text style={styles.shareBtnText}>Share</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.popupCapacityRow}>
                            <Text style={styles.capacityLabel}>Current Capacity</Text>
                            <Text style={styles.capacityValue}>{pair?.memberUids.length || 0} / 4 Members</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.closeModalButton} 
                            onPress={() => setShowInviteModal(false)}
                            activeOpacity={0.7}
                        >
                            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6l12 12" stroke="#6B4B3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
                            </Svg>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <SettingsModal 
                visible={isSettingsVisible} 
                onClose={() => setIsSettingsVisible(false)} 
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 10,
    },
    settingsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 34,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
        textAlign: 'left',
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF7EE',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    mainCard: {
        backgroundColor: '#FFF7EE',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#6B4B3E',
        position: 'relative',
    },
    addMemberButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3E3D7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#6B4B3E',
        zIndex: 10,
    },
    plusText: {
        fontSize: 24,
        color: '#6B4B3E',
        fontFamily: 'Poppins-Bold',
        marginTop: -2,
    },
    membersList: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
    },
    memberAvatarContainer: {
        alignItems: 'center',
        width: 65,
    },
    avatarCircleSmall: {
        width: 65,
        height: 65,
        borderRadius: 32.5,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#6B4B3E',
        position: 'relative',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 32.5,
    },
    memberLabel: {
        fontSize: 12,
        color: '#6B4B3E',
        fontFamily: 'Inter-SemiBold',
        marginTop: 6,
        textAlign: 'center',
    },
    cameraIconTiny: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#E79B74',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFF7EE',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(61, 46, 37, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    invitePopup: {
        backgroundColor: '#FFF7EE',
        borderRadius: 28,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: '#6B4B3E',
        elevation: 10,
        position: 'relative',
    },
    closeModalButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        elevation: 10,
    },
    closeModalText: {
        fontSize: 18,
        color: '#6B4B3E',
        opacity: 0.5,
    },
    popupTitle: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
        marginBottom: 20,
        textAlign: 'center',
    },
    popupCodeBox: {
        backgroundColor: '#F3E3D7',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#DCC8B9',
        alignItems: 'center',
    },
    popupCodeLabel: {
        fontSize: 11,
        color: '#6B4B3E',
        marginBottom: 4,
        fontFamily: 'Inter-Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    popupCodeText: {
        fontSize: 24,
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
        letterSpacing: 2,
    },
    popupActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    copyBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#6B4B3E',
        borderRadius: 12,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    shareBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F3E3D7',
        borderRadius: 12,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    actionBtnText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#FFFFFF',
    },
    shareBtnText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#6B4B3E',
    },
    popupCapacityRow: {
        marginTop: 4,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3E3D7',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    capacityLabel: {
        fontSize: 13,
        color: '#6B4B3E',
        opacity: 0.6,
        fontFamily: 'Inter-Medium',
    },
    capacityValue: {
        fontSize: 13,
        color: '#E79B74',
        fontFamily: 'Inter-Bold',
    },
    fridgeNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    fridgeNameText: {
        fontSize: 24,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
        marginRight: 8,
    },
    fridgeNameInput: {
        fontSize: 24,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
        borderBottomWidth: 1,
        borderBottomColor: '#E79B74',
        minWidth: 150,
        textAlign: 'center',
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userNameInput: {
        fontSize: 16,
        color: '#6B4B3E',
        fontFamily: 'Inter-SemiBold',
        borderBottomWidth: 1,
        borderBottomColor: '#E79B74',
        minWidth: 60,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        color: '#6B4B3E',
        marginBottom: 16,
        marginLeft: 4,
    },
    inviteCard: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 5,
    },
    inviteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    smallHeartCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3E3D7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    inviteTitle: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
    },
    inviteSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.6,
    },
    codeSection: {
        backgroundColor: '#F3E3D7',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#DCC8B9',
    },
    codeLabel: {
        fontSize: 11,
        color: '#6B4B3E',
        marginBottom: 4,
        fontFamily: 'Inter-Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    codeText: {
        fontSize: 24,
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
        letterSpacing: 2,
        fontVariant: ['tabular-nums'],
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    copyButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#6B4B3E',
        borderRadius: 12,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    copyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F3E3D7',
        borderRadius: 12,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    shareButtonText: {
        color: '#6B4B3E',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    datesCard: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
    },
    momentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    momentTextContainer: {
        flex: 1,
    },
    momentTitle: {
        fontSize: 13,
        color: '#6B4B3E',
        opacity: 0.6,
        marginBottom: 4,
        fontFamily: 'Inter-Medium',
    },
    momentDate: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
        marginBottom: 4,
        fontVariant: ['tabular-nums'],
    },
    momentSubtext: {
        fontSize: 12,
        color: '#E79B74',
        fontFamily: 'Inter-SemiBold',
    },
    momentEditButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3E3D7',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    pickerContainer: {
        marginTop: 16,
        backgroundColor: '#FFF7EE',
        borderRadius: 12,
        overflow: 'hidden',
    },
    iosPickerButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    iosPickerCancel: {
        padding: 8,
    },
    iosPickerCancelText: {
        color: '#A89B8F',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    iosPickerDone: {
        padding: 8,
        backgroundColor: '#6B4B3E',
        borderRadius: 8,
        paddingHorizontal: 16,
    },
    iosPickerDoneText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    placeholderText: {
        color: '#A89B8F',
        fontStyle: 'italic',
    },
    settingsCard: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 5,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingTextContainer: {
        flex: 1,
        marginRight: 16,
    },
    settingTitle: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.6,
    },
    unpairLink: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    unpairLinkText: {
        color: '#6B4B3E',
        fontSize: 14,
        textDecorationLine: 'underline',
        fontFamily: 'Inter-Medium',
    },
    proCard: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 20,
        marginBottom: 32,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 5,
    },
    proStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    proTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    proTitle: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
        marginBottom: 2,
    },
    proSubtitle: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.6,
    },
    proButton: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    proButtonText: {
        color: '#6B4B3E',
        fontFamily: 'Inter-Bold',
        fontSize: 16,
    },
    remindersCard: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 20,
        marginBottom: 32,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    reminderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reminderIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3E3D7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    reminderTextContainer: {
        flex: 1,
    },
    reminderTitle: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
    },
    reminderStatus: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.6,
        marginTop: 1,
    },
    reminderDivider: {
        height: 1,
        backgroundColor: '#F3E3D7',
        marginVertical: 12,
        marginLeft: 48,
    },
});

