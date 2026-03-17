"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface TopBarState {
  breadcrumb: string | null;
  title: string | null;
  actions: ReactNode | null;
}

const EMPTY_STATE: TopBarState = { breadcrumb: null, title: null, actions: null };

const TopBarContext = createContext<{
  state: TopBarState;
  setTopBar: (state: Partial<TopBarState>) => void;
  clearTopBar: () => void;
}>({
  state: EMPTY_STATE,
  setTopBar: () => {},
  clearTopBar: () => {},
});

export function TopBarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TopBarState>(EMPTY_STATE);

  const setTopBar = useCallback((partial: Partial<TopBarState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const clearTopBar = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  return (
    <TopBarContext.Provider value={{ state, setTopBar, clearTopBar }}>
      {children}
    </TopBarContext.Provider>
  );
}

export function useTopBar() {
  return useContext(TopBarContext);
}

/** 页面级组件：挂载时设置 TopBar 内容，卸载时清除 */
export function SetTopBar({ breadcrumb, title, actions, actionsKey }: {
  breadcrumb?: string;
  title: string;
  actions?: ReactNode;
  /** 当 actions 内容变化时传入不同的 key 触发更新 */
  actionsKey?: string;
}) {
  const { setTopBar, clearTopBar } = useTopBar();

  useEffect(() => {
    setTopBar({ breadcrumb: breadcrumb ?? null, title, actions: actions ?? null });
    return () => clearTopBar();
  }, [breadcrumb, title, actionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
