"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { TopBarProvider } from "./TopBarContext";
import { ToastProvider } from "./Toast";

interface AppShellProps {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}

export default function AppShell({ userName, userRole, children }: AppShellProps) {
  const pathname = usePathname();
  const isLessonPage = pathname.startsWith("/lesson/");
  const isChatPage = pathname.startsWith("/chat");
  const isFullscreenPage = isLessonPage || isChatPage;

  return (
    <TopBarProvider>
      <ToastProvider>
      <div className="page-wrap">
        <div className="page-shell">
          {!isLessonPage && (
            <>
              <div className="page-shell__orb page-shell__orb--blue" aria-hidden />
              <div className="page-shell__orb page-shell__orb--purple" aria-hidden />
            </>
          )}

          <div className="page-shell__inner shell">
            <Sidebar userName={userName} userRole={userRole} />

            <main className="main" style={isFullscreenPage ? { overflow: "hidden" } : undefined}>
              {/* 课次页不显示通用 TopBar，由页面自行渲染 lesson-topbar */}
              {!isLessonPage && <TopBar userName={userName} userRole={userRole} />}

              {/* 课次页/对话页无 main__content 包裹（需要自定义布局） */}
              {isFullscreenPage ? children : (
                <div className="main__content">{children}</div>
              )}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
    </TopBarProvider>
  );
}
