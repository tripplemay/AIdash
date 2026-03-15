"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface TopBarState {
  breadcrumb: ReactNode | null;
}

const TopBarContext = createContext<{
  state: TopBarState;
  setBreadcrumb: (breadcrumb: ReactNode | null) => void;
}>({
  state: { breadcrumb: null },
  setBreadcrumb: () => {},
});

export function TopBarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TopBarState>({ breadcrumb: null });

  const setBreadcrumb = useCallback((breadcrumb: ReactNode | null) => {
    setState({ breadcrumb });
  }, []);

  return (
    <TopBarContext.Provider value={{ state, setBreadcrumb }}>
      {children}
    </TopBarContext.Provider>
  );
}

export function useTopBar() {
  return useContext(TopBarContext);
}

/** 页面级组件：挂载时设置面包屑，卸载时清除 */
export function SetBreadcrumb({ children }: { children: ReactNode }) {
  const { setBreadcrumb } = useTopBar();

  useEffect(() => {
    setBreadcrumb(children);
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
