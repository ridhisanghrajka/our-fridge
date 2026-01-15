import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Share, Clipboard } from 'react-native';
import { usePairing } from '../hooks/usePairing';
import Svg, { Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const EditIcon = ({ size = 20, color = "#948B84" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const SettingsIcon = ({ size = 28, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.72 8.87c-.11.2-.06.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.2.06-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </Svg>
);

const CameraIcon = ({ size = 16, color = "#FFFFFF" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2"/>
    </Svg>
);

const HeartIcon = ({ size = 18, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </Svg>
);

const CopyIcon = ({ size = 20, color = "#FFFFFF" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M8 4V1c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1h-3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M4 8v11c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const ShareIcon = ({ size = 20, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

export const ProfileScreen: React.FC = () => {
    const { pair, pairId, userName, updateFridgeName, updateUserName, unpair } = usePairing();
    const [isEditingFridge, setIsEditingFridge] = useState(false);
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [tempFridgeName, setTempFridgeName] = useState('');
    const [tempUserName, setTempUserName] = useState('');

    const handleCopyCode = () => {
        if (pairId) {
            Clipboard.setString(pairId);
        }
    };

    const handleShareCode = async () => {
        if (pairId) {
            try {
                await Share.share({
                    message: `Join my fridge on DumbFridge! Use code: ${pairId}`,
                });
            } catch (error) {
                console.error('Error sharing code:', error);
            }
        }
    };

    const saveFridgeName = async () => {
        if (tempFridgeName.trim()) {
            await updateFridgeName(tempFridgeName.trim());
        }
        setIsEditingFridge(false);
    };

    const saveUserName = async () => {
        if (tempUserName.trim()) {
            await updateUserName(tempUserName.trim());
        }
        setIsEditingUser(false);
    };

    const getPartnerName = () => {
        if (!pair || !userName) return 'Partner';
        const partnerName = pair.userAName === userName ? pair.userBName : pair.userAName;
        return partnerName || 'Partner';
    };

    const getFridgeNameDisplay = () => {
        if (pair?.fridgeName) return pair.fridgeName;
        if (pair) {
            const names = [pair.userAName, pair.userBName].filter(Boolean);
            return names.length === 2 ? `${names[0]} & ${names[1]}'s Fridge` : `${names[0]}'s Fridge`;
        }
        return `${userName}'s Fridge`;
    };

    return (
        <LinearGradient
            colors={['#DDF3FF', '#FFF6EA']}
            style={styles.container}
        >
            <View style={styles.header}>
                <View style={styles.settingsRow}>
                    <TouchableOpacity style={styles.settingsButton}>
                        <SettingsIcon color="#6B4B3E" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainCard}>
                    <View style={styles.fridgeNameRow}>
                        {isEditingFridge ? (
                            <View style={styles.editInputContainer}>
                                <TextInput
                                    style={styles.fridgeNameInput}
                                    value={tempFridgeName}
                                    onChangeText={setTempFridgeName}
                                    autoFocus
                                    onBlur={saveFridgeName}
                                    onSubmitEditing={saveFridgeName}
                                />
                            </View>
                        ) : (
                            <>
                                <Text style={styles.fridgeNameText}>{getFridgeNameDisplay()}</Text>
                                <TouchableOpacity 
                                    style={{ marginLeft: 8 }}
                                    onPress={() => {
                                        setTempFridgeName(getFridgeNameDisplay());
                                        setIsEditingFridge(true);
                                    }}
                                >
                                    <EditIcon color="#6B4B3E" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    <View style={styles.avatarsRow}>
                        <View style={styles.avatarContainer}>
                            <View style={[styles.avatarCircle, { backgroundColor: '#6B4B3E' }]}>
                                <Svg width={60} height={60} viewBox="0 0 24 24">
                                    <Path fill="#FFFFFF" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4s-4 1.79-4 4s1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </Svg>
                                <TouchableOpacity style={styles.cameraIconContainer}>
                                    <CameraIcon />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.userNameRow}>
                                {isEditingUser ? (
                                    <TextInput
                                        style={styles.userNameInput}
                                        value={tempUserName}
                                        onChangeText={setTempUserName}
                                        autoFocus
                                        onBlur={saveUserName}
                                        onSubmitEditing={saveUserName}
                                    />
                                ) : (
                                    <>
                                        <Text style={styles.avatarLabel}>{userName || 'User'}</Text>
                                        <TouchableOpacity 
                                            style={{ marginLeft: 6 }}
                                            onPress={() => {
                                                setTempUserName(userName || '');
                                                setIsEditingUser(true);
                                            }}
                                        >
                                            <EditIcon size={14} color="#6B4B3E" />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>

                        <View style={styles.heartContainer}>
                            <HeartIcon color="#E79B74" />
                        </View>

                        <View style={styles.avatarContainer}>
                            <View style={[styles.avatarCircle, { backgroundColor: '#E79B74' }]}>
                                <Svg width={60} height={60} viewBox="0 0 24 24">
                                    <Path fill="#FFFFFF" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4s-4 1.79-4 4s1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </Svg>
                            </View>
                            <Text style={styles.avatarLabel}>{getPartnerName()}</Text>
                        </View>
                    </View>
                </View>

                {pair && !pair.userBName && (
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

                <Text style={styles.sectionTitle}>Important Dates</Text>
                <View style={styles.datesCard}>
                    <Text style={styles.placeholderText}>No dates added yet</Text>
                </View>

                <TouchableOpacity style={styles.unpairLink} onPress={unpair}>
                    <Text style={styles.unpairLinkText}>Unpair Fridge</Text>
                </TouchableOpacity>
            </ScrollView>
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
        fontSize: 32,
        fontWeight: 'bold',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    fridgeNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    fridgeNameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6B4B3E',
        marginRight: 8,
    },
    fridgeNameInput: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6B4B3E',
        borderBottomWidth: 1,
        borderBottomColor: '#E79B74',
        minWidth: 150,
        textAlign: 'center',
    },
    avatarsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    avatarContainer: {
        alignItems: 'center',
        flex: 1,
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        position: 'relative',
        borderWidth: 2,
        borderColor: '#6B4B3E',
    },
    cameraIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#E79B74', // Use clip color
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF7EE',
    },
    avatarLabel: {
        fontSize: 16,
        color: '#6B4B3E',
        fontWeight: '600',
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userNameInput: {
        fontSize: 16,
        color: '#6B4B3E',
        fontWeight: '600',
        borderBottomWidth: 1,
        borderBottomColor: '#E79B74',
        minWidth: 60,
        textAlign: 'center',
    },
    heartContainer: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6B4B3E',
        marginBottom: 16,
        marginLeft: 4,
    },
    inviteCard: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#6B4B3E',
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6B4B3E',
    },
    inviteSubtitle: {
        fontSize: 14,
        color: '#A89B8F',
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
        fontSize: 12,
        color: '#6B4B3E',
        marginBottom: 4,
        fontWeight: '600',
    },
    codeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6B4B3E',
        letterSpacing: 2,
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
        fontWeight: '600',
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
        fontWeight: '600',
    },
    datesCard: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 24,
        height: 80,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#6B4B3E',
        borderStyle: 'dashed',
    },
    placeholderText: {
        color: '#A89B8F',
        fontStyle: 'italic',
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
        fontWeight: '500',
    },
});

