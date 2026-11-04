"use client";
import * as React from "react";

/** Renders nothing if an effect layer throws (e.g. no WebGL context left), so the page itself never breaks. */
export default class FxBoundary extends React.Component {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}
