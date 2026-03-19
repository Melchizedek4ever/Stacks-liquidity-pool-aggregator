import { useEffect, useRef, useState } from "react";
import { fetchPools } from "../services/api";
import { Pool, PoolsState } from "../types/pool";

const REFRESH_INTERVAL_MS = 60_000;

const initialState: PoolsState = {
  pools: [],
  isLoading: true,
  isRefreshing: false,
  error: null,
  lastUpdated: null
};

export function usePoolsData() {
  const [state, setState] = useState<PoolsState>(initialState);
  const cachedPoolsRef = useRef<Pool[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async (isInitialLoad: boolean) => {
      setState((current) => ({
        ...current,
        isLoading: isInitialLoad && cachedPoolsRef.current.length === 0,
        isRefreshing: !isInitialLoad,
        error: null
      }));

      try {
        const pools = await fetchPools();
        if (cancelled) return;

        cachedPoolsRef.current = pools;
        setState({
          pools,
          isLoading: false,
          isRefreshing: false,
          error: null,
          lastUpdated: Date.now()
        });
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error ? error.message : "Failed to refresh liquidity pools";

        setState({
          pools: cachedPoolsRef.current,
          isLoading: false,
          isRefreshing: false,
          error: message,
          lastUpdated: cachedPoolsRef.current.length > 0 ? Date.now() : null
        });
      }
    };

    load(true);
    const intervalId = window.setInterval(() => {
      void load(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
}
