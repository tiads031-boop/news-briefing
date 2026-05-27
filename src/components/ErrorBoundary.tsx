import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '800px',
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          <h1 style={{ color: '#c00', fontSize: '24px' }}>⚠️ 页面渲染出错</h1>
          <p style={{ color: '#666' }}>
            请截图此页面并反馈给开发者。错误信息如下：
          </p>
          <pre style={{
            background: '#f5f5f5',
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '14px',
            color: '#333',
            border: '1px solid #ddd',
          }}>
            {this.state.error?.name}: {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
