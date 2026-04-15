import { useState, useCallback } from "react";

export interface Memory {
  id: number;
  role_name: string;
  content: string;
  created_at: string | number;
}

export interface QueryParams {
  role_name?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  pageSize?: number;
}

const API_BASE = "http://localhost:4331";

export function useMemory(type: "long-term" | "short-term") {
  const [data, setData] = useState<Memory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMemories = useCallback(
    async (params: QueryParams = {}) => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) query.append(key, String(value));
        });

        const response = await fetch(`${API_BASE}/${type}?${query.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        setData(result.data);
        setTotal(result.total);
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  const addMemory = useCallback(
    async (role_name: string, content: string) => {
      try {
        const response = await fetch(`${API_BASE}/${type}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role_name, content }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        await fetchMemories();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Unknown error"));
        return false;
      }
    },
    [type, fetchMemories],
  );

  const deleteMemory = useCallback(
    async (id: number) => {
      try {
        const response = await fetch(`${API_BASE}/${type}/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        await fetchMemories();
        return true;
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Unknown error");
        setError(err);
        return false;
      }
    },
    [type, fetchMemories],
  );

  const updateMemory = useCallback(
    async (id: number, role_name: string, content: string) => {
      try {
        const response = await fetch(`${API_BASE}/${type}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role_name, content }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        await fetchMemories();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Unknown error"));
        return false;
      }
    },
    [type, fetchMemories],
  );

  return {
    data,
    total,
    loading,
    error,
    fetchMemories,
    addMemory,
    deleteMemory,
    updateMemory,
    setError,
  };
}
