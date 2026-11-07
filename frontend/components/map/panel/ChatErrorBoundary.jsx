"use client";

import { Component } from "react";

export class ChatErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("PersonalChat error caught by boundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className={`fixed z-[1005] left-4 bottom-4 w-[340px] sm:w-[360px] p-4 rounded-2xl flex flex-col gap-3 shadow-2xl border ${
            this.props.isMapDark
              ? "bg-[#111b21] border-white/20 text-white"
              : "bg-white border-black text-black"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">Personal Chat</span>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onCloseChat?.();
              }}
              className="text-xs px-2.5 py-1 rounded-md bg-[#ef4444] text-white font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-xs opacity-75">
            Unable to load conversation. Please try reloading the chat.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className={`w-full py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              this.props.isMapDark ? "bg-white text-black" : "bg-black text-white"
            }`}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
