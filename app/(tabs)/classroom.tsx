import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useClassroom } from '@/hooks/useClassroom';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function ClassroomScreen() {
    const {
        session,
        isSessionActive,
        isConnected,
        inputText,
        outputText,
        startSession,
        stopSession,
    } = useClassroom();

    const primaryColor = '#10B981'; // Emerald Green
    const secondaryColor = '#F0FFF4'; // Fresh Mint

    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation when session is active
    useEffect(() => {
        if (isSessionActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isSessionActive]);

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerInfo}>
                    <ThemedText style={styles.title}>Live Classroom</ThemedText>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: isConnected ? primaryColor : '#94A3B8' }]} />
                        <ThemedText style={styles.statusText}>{isConnected ? 'LIVE' : 'OFFLINE'}</ThemedText>
                    </View>
                </View>
                {isConnected && (
                    <TouchableOpacity onPress={stopSession} style={styles.stopButton}>
                        <Ionicons name="stop-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Message Area */}
            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                ref={(ref) => ref?.scrollToEnd({ animated: true })}
            >
                {session?.messages.length === 0 && !isConnected && (
                    <View style={styles.emptyState}>
                        <Ionicons name="mic-outline" size={64} color="#CBD5E1" />
                        <ThemedText style={styles.emptyText}>Namaste! Tap Start to begin your class.</ThemedText>
                    </View>
                )}

                {session?.messages.map((msg) => (
                    <View
                        key={msg.id}
                        style={[
                            styles.messageBubble,
                            msg.role === 'user' ? styles.userBubble : styles.vishwaBubble
                        ]}
                    >
                        <ThemedText style={styles.roleLabel}>{msg.role === 'user' ? 'Student' : 'Vishwa'}</ThemedText>
                        <ThemedText style={styles.messageText}>{msg.text}</ThemedText>
                    </View>
                ))}

                {inputText !== '' && (
                    <View style={[styles.messageBubble, styles.userBubble, { opacity: 0.6 }]}>
                        <ThemedText style={styles.roleLabel}>Listening...</ThemedText>
                        <ThemedText style={styles.messageText}>{inputText}</ThemedText>
                    </View>
                )}

                {outputText !== '' && (
                    <View style={[styles.messageBubble, styles.vishwaBubble, { opacity: 0.6 }]}>
                        <ThemedText style={styles.roleLabel}>Speaking...</ThemedText>
                        <ThemedText style={styles.messageText}>{outputText}</ThemedText>
                    </View>
                )}
            </ScrollView>

            {/* Controls */}
            <View style={styles.footer}>
                <View style={styles.micContainer}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <TouchableOpacity
                            style={[styles.micButton, {
                                backgroundColor: isSessionActive ? '#EF4444' : primaryColor
                            }]}
                            onPress={isSessionActive ? stopSession : startSession}
                        >
                            <Ionicons
                                name={isSessionActive ? "stop" : "mic"}
                                size={40}
                                color="white"
                            />
                        </TouchableOpacity>
                    </Animated.View>
                    <ThemedText style={styles.hintText}>
                        {isSessionActive ? 'Conversation Active - Tap to End' : 'Tap Microphone to Start'}
                    </ThemedText>
                </View>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0FFF4',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerInfo: {
        flexDirection: 'column',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748B',
        letterSpacing: 1,
    },
    stopButton: {
        padding: 8,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    emptyState: {
        flex: 1,
        height: 400,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 20,
        textAlign: 'center',
        fontSize: 16,
        color: '#64748B',
        width: width * 0.7,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 15,
        borderRadius: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: 'white',
        borderBottomRightRadius: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
    },
    vishwaBubble: {
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        borderBottomLeftRadius: 2,
        borderRightWidth: 4,
        borderRightColor: '#94A3B8',
    },
    roleLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 18,
        lineHeight: 26,
    },
    footer: {
        padding: 30,
        paddingBottom: 50,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        alignItems: 'center',
    },
    startButton: {
        width: '100%',
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
    },
    startButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    micContainer: {
        alignItems: 'center',
    },
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    hintText: {
        marginTop: 15,
        fontSize: 14,
        color: '#64748B',
        fontWeight: 'medium',
    },
});
