import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./index";
import { ConfigProvider } from "antd";

// Antd uses some browser APIs that might need mocking in happy-dom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("App Component with Ant Design", () => {
  beforeEach(() => {
    // 使用 happy-dom 自带的 fetch，或者通过 vi.spyOn 拦截
    vi.spyOn(window, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render and switch tabs", async () => {
    (window.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    await act(async () => {
      render(
        <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
          <App />
        </ConfigProvider>,
      );
    });

    expect(screen.getByText("长时记忆")).toBeInTheDocument();
    expect(screen.getByText("短时记忆")).toBeInTheDocument();

    const shortTermTab = screen.getByText("短时记忆");
    await act(async () => {
      fireEvent.click(shortTermTab);
    });

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining("/short-term?"));
    });
  });

  it("should show list of memories", async () => {
    const mockMemories = {
      data: [
        { id: 1, role_name: "小猪", content: "测试长时记忆 1", created_at: "2026-04-15" },
        { id: 2, role_name: "小 R", content: "测试长时记忆 2", created_at: "2026-04-15" },
      ],
      total: 2,
    };

    (window.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockMemories,
    });

    await act(async () => {
      render(
        <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
          <App />
        </ConfigProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText("测试长时记忆 1")).toBeInTheDocument();
      expect(screen.getByText("测试长时记忆 2")).toBeInTheDocument();
    });

    expect(screen.getByText("共 2 条记录")).toBeInTheDocument();
  });

  it("should filter by role when clicking search button", async () => {
    (window.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    await act(async () => {
      render(
        <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
          <App />
        </ConfigProvider>,
      );
    });

    const filterInput = screen.getByPlaceholderText("搜索角色...");
    await act(async () => {
      fireEvent.change(filterInput, { target: { value: "小 G" } });
    });

    const searchButton = screen.getByRole("button", { name: /search 搜索/i });
    await act(async () => {
      fireEvent.click(searchButton);
    });

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/role_name=%E5%B0%8F(\+|%20)G/),
      );
    });
  });
});
