import React, { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

const BACKEND_URL = 'http://192.168.1.24:3001';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [message, setMessage] = useState('');

  const [chat, setChat] = useState([
    {
      sender: 'Jarvis',
      text: 'Welcome back. I can help you track expenses, sleep, notes, schedules, reminders, and finance goals.',
    },
  ]);

  const [dashboardData, setDashboardData] = useState({
    totalSpent: 0,
    averageSleep: 0,
    pendingTasks: 0,
    notesCount: 0,
    income: 0,
    savingGoal: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/dashboard`);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.log('Dashboard fetch failed:', error.message);
    }
  };

  const scheduleReminderFromMessage = async (currentMessage) => {
    const lower = currentMessage.toLowerCase();

    const secondsMatch = lower.match(/in (\d+) seconds?/);
    const minutesMatch = lower.match(/in (\d+) minutes?/);
    const hoursMatch = lower.match(/in (\d+) hours?/);
    const daysMatch = lower.match(/in (\d+) days?/);
    const monthsMatch = lower.match(/in (\d+) months?/);

    let seconds = 10;

    if (secondsMatch) seconds = Number(secondsMatch[1]);
    if (minutesMatch) seconds = Number(minutesMatch[1]) * 60;
    if (hoursMatch) seconds = Number(hoursMatch[1]) * 60 * 60;
    if (daysMatch) seconds = Number(daysMatch[1]) * 24 * 60 * 60;
    if (monthsMatch) seconds = Number(monthsMatch[1]) * 30 * 24 * 60 * 60;

    const taskText = currentMessage
      .replace(/remind me in \d+ seconds? to/i, '')
      .replace(/remind me in \d+ minutes? to/i, '')
      .replace(/remind me in \d+ hours? to/i, '')
      .replace(/remind me in \d+ days? to/i, '')
      .replace(/remind me in \d+ months? to/i, '')
      .trim();

    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow notifications first.');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mini Jarvis Reminder',
        body: taskText || 'You have a reminder.',
      },
      trigger: {
        seconds,
      },
    });
  };

  const sendTestNotification = async () => {
    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow notifications first.');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mini Jarvis Reminder',
        body: 'This is your test reminder.',
      },
      trigger: {
        seconds: 5,
      },
    });

    Alert.alert('Reminder set', 'You will get a notification in 5 seconds.');
  };

  const sendMessage = async () => {
    if (message.trim() === '') return;

    const currentMessage = message.trim();

    setChat(prev => [
      ...prev,
      {
        sender: 'You',
        text: currentMessage,
      },
    ]);

    setMessage('');

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentMessage }),
      });

      const data = await response.json();

      if (currentMessage.toLowerCase().includes('remind me in')) {
        await scheduleReminderFromMessage(currentMessage);
      }

      setChat(prev => [
        ...prev,
        {
          sender: 'Jarvis',
          text: data.reply,
        },
      ]);

      fetchDashboardData();
    } catch (error) {
      setChat(prev => [
        ...prev,
        {
          sender: 'Jarvis',
          text: 'Connection failed. Make sure your backend server is running on your Mac.',
        },
      ]);
    }
  };

  const sendQuickCommand = (command) => {
    setMessage(command);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={10}
      >
        <ScrollView style={styles.mainScroll}>
          <View style={styles.header}>
            <Text style={styles.smallText}>PERSONAL AI SYSTEM</Text>
            <Text style={styles.title}>Mini Jarvis</Text>
            <Text style={styles.subtitle}>
              Your smart life, money, health, reminder, and productivity assistant.
            </Text>
          </View>

          <View style={styles.dashboard}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Finance</Text>
              <Text style={styles.cardValue}>£{dashboardData.totalSpent} spent</Text>
              <Text style={styles.cardSmall}>Goal: £{dashboardData.savingGoal}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Health</Text>
              <Text style={styles.cardValue}>{dashboardData.averageSleep}h sleep</Text>
              <Text style={styles.cardSmall}>Average rest</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Tasks</Text>
              <Text style={styles.cardValue}>{dashboardData.pendingTasks} pending</Text>
              <Text style={styles.cardSmall}>Scheduled items</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Memory</Text>
              <Text style={styles.cardValue}>{dashboardData.notesCount} notes</Text>
              <Text style={styles.cardSmall}>Saved logs</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => sendQuickCommand('finance advice')}
            >
              <Text style={styles.quickButtonText}>Finance Advice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => sendQuickCommand('health summary')}
            >
              <Text style={styles.quickButtonText}>Health Summary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => sendQuickCommand('show notes')}
            >
              <Text style={styles.quickButtonText}>Show Notes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => sendQuickCommand('show schedule')}
            >
              <Text style={styles.quickButtonText}>Show Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => sendQuickCommand('summary')}
            >
              <Text style={styles.quickButtonText}>Spending Summary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={sendTestNotification}
            >
              <Text style={styles.quickButtonText}>Test Reminder</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hintBox}>
            <Text style={styles.hintTitle}>Try commands</Text>
            <Text style={styles.hintText}>spent 5 on coffee</Text>
            <Text style={styles.hintText}>sleep 6 hours</Text>
            <Text style={styles.hintText}>note I studied React Native today</Text>
            <Text style={styles.hintText}>set income 1500</Text>
            <Text style={styles.hintText}>set saving goal 500</Text>
            <Text style={styles.hintText}>remind me in 10 seconds to drink water</Text>
          </View>

          <Text style={styles.sectionTitle}>Chat</Text>

          <View style={styles.chatBox}>
            {chat.map((item, index) => (
              <View
                key={index}
                style={
                  item.sender === 'You'
                    ? styles.userMessage
                    : styles.jarvisMessage
                }
              >
                <Text style={styles.sender}>{item.sender}</Text>
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask Jarvis..."
            placeholderTextColor="#7D8EA8"
            value={message}
            onChangeText={setMessage}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />

          <TouchableOpacity style={styles.button} onPress={sendMessage}>
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B18',
  },

  keyboardView: {
    flex: 1,
  },

  mainScroll: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 55,
  },

  header: {
    backgroundColor: '#0B1730',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#123B5D',
    marginBottom: 18,
  },

  smallText: {
    color: '#00D8FF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: 'bold',
    marginTop: 8,
  },

  subtitle: {
    color: '#A9B8D0',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  dashboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    backgroundColor: '#101E35',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F3B5C',
  },

  cardLabel: {
    color: '#7D8EA8',
    fontSize: 13,
    marginBottom: 8,
  },

  cardValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },

  cardSmall: {
    color: '#7D8EA8',
    fontSize: 12,
    marginTop: 6,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 10,
  },

  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  quickButton: {
    width: '48%',
    backgroundColor: '#082A3D',
    padding: 13,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#00D8FF',
  },

  quickButtonText: {
    color: '#00D8FF',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 13,
  },

  hintBox: {
    backgroundColor: '#0B1730',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#123B5D',
    marginTop: 8,
  },

  hintTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  hintText: {
    color: '#A9B8D0',
    fontSize: 13,
    marginBottom: 4,
  },

  chatBox: {
    paddingBottom: 20,
  },

  userMessage: {
    backgroundColor: '#1E2A3A',
    padding: 15,
    borderRadius: 18,
    marginBottom: 10,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },

  jarvisMessage: {
    backgroundColor: '#10213D',
    padding: 15,
    borderRadius: 18,
    marginBottom: 10,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: '#123B5D',
  },

  sender: {
    color: '#00D8FF',
    fontWeight: 'bold',
    marginBottom: 5,
  },

  messageText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },

  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#050B18',
    borderTopWidth: 1,
    borderTopColor: '#123B5D',
  },

  input: {
    flex: 1,
    backgroundColor: '#101E35',
    color: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#1F3B5C',
  },

  button: {
    backgroundColor: '#00D8FF',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 16,
  },

  buttonText: {
    color: '#00111A',
    fontWeight: 'bold',
    fontSize: 16,
  },
});