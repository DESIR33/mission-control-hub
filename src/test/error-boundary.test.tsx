import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function Boom({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error("kaboom");
  return <div>child-ok</div>;
}

describe("ErrorBoundary", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs caught errors to console.error; silence for clean test output.
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("child-ok")).toBeInTheDocument();
  });

  it("catches render errors and shows fallback with section label", () => {
    render(
      <ErrorBoundary section="TestSection">
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/"TestSection" failed to load/)).toBeInTheDocument();
    expect(screen.getByText("kaboom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
  });

  it("resets to children after retry when the error is gone", () => {
    let shouldThrow = true;
    function Toggle() {
      return <Boom shouldThrow={shouldThrow} />;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <Toggle />
      </ErrorBoundary>
    );

    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    rerender(
      <ErrorBoundary>
        <Toggle />
      </ErrorBoundary>
    );
    expect(screen.getByText("child-ok")).toBeInTheDocument();
  });

  it("prefers the custom fallback prop when provided", () => {
    render(
      <ErrorBoundary fallback={<div>custom-fallback</div>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("custom-fallback")).toBeInTheDocument();
  });
});
