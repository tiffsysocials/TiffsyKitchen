import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('🛑 ErrorBoundary caught:', error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Icon name="error-outline" size={64} color="#FF3B30" />
          <Text style={styles.title}>{this.props.fallbackTitle || 'Something went wrong'}</Text>
          <Text style={styles.subtitle}>
            The screen ran into an unexpected error. Try again, or go back and reopen.
          </Text>
          {__DEV__ && this.state.error && (
            <ScrollView style={styles.debug} contentContainerStyle={{ padding: 12 }}>
              <Text style={styles.debugText}>{this.state.error.message}</Text>
            </ScrollView>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  debug: {
    marginTop: 16,
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#991b1b',
    fontFamily: 'monospace',
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FE8733',
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default ErrorBoundary;
