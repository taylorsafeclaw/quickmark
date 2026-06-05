// src/hooks/useDebouncedSave.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedSave } from "./useDebouncedSave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebouncedSave", () => {
  it("saves once after the delay, with the latest value", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useDebouncedSave(save, 500));
    act(() => { result.current("v1"); result.current("v2"); });
    expect(save).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(500); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("v2");
  });

  it("flush() saves immediately", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useDebouncedSave(save, 500));
    act(() => { result.current("x"); result.current.flush(); });
    expect(save).toHaveBeenCalledWith("x");
  });
});
