import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<any, any> {
  public state = {
    hasError: false,
    error: null as Error | null
  };

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030303] flex items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-black mb-4 text-white">Oops! Terjadi Kesalahan</h1>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
              Aplikasi mengalami kendala teknis. Silakan muat ulang halaman atau hubungi admin jika masalah berlanjut.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-white text-black px-8 py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all"
            >
              Muat Ulang Halaman
            </button>
            <pre className="mt-8 p-4 bg-white/5 rounded-xl text-[10px] text-red-400 overflow-x-auto text-left">
              {(this.state.error as any)?.message}
            </pre>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
