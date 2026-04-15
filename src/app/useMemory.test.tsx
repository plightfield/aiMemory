import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { renderHook, act } from "@testing-library/react";
import { useMemory } from "./useMemory";

describe("useMemory hook", () => {
  beforeEach(() => {
    vi.spyOn(window, "fetch");
  });

  it("should fetch long-term memories correctly", async () => {
    const mockData = {
      data: [{ id: 1, role_name: "小猪", content: "测试内容", created_at: "2026-04-15" }],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    (window.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useMemory("long-term"));

    // 使用 await act 确保状态更新被正确处理
    await act(async () => {
      await result.current.fetchMemories();
    });

    expect(result.current.data).toEqual(mockData.data);
    expect(result.current.total).toBe(1);
    expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining("/long-term?"));
  });

  it("should handle fetch error", async () => {
    (window.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useMemory("short-term"));

    await act(async () => {
      await result.current.fetchMemories();
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toMatch(/500/);
  });

  it("should add memory and refresh", async () => {
    (window.fetch as any)
      .mockResolvedValueOnce({ ok: true }) // POST
      .mockResolvedValueOnce({
        // GET refresh
        ok: true,
        json: async () => ({ data: [], total: 0 }),
      });

    const { result } = renderHook(() => useMemory("long-term"));

    let success;
    await act(async () => {
      success = await result.current.addMemory("小猪", "新内容");
    });

    expect(success).toBe(true);
    expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/long-term"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
