"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { TopBarProvider } from "./TopBarContext";

interface AppShellProps {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}

export default function AppShell({ userName, userRole, children }: AppShellProps) {
  const pathname = usePathname();
  const isLessonPage = pathname.startsWith("/lesson/");

  return (
    <TopBarProvider>
      <div className="page-wrap">
        <div className="page-shell">
          {!isLessonPage && (
            <>
              <div className="page-shell__orb page-shell__orb--blue" aria-hidden />
              <div className="page-shell__orb page-shell__orb--purple" aria-hidden />
            </>
          )}

          <div
            className="page-shell__inner shell"
            style={isLessonPage ? { height: "calc(100vh - 40px)", minHeight: 0 } : undefined}
          >
            <Sidebar userName={userName} userRole={userRole} />

            <main className="main" style={isLessonPage ? { overflow: "hidden" } : undefined}>
              {/* 课次页不显示通用 TopBar，由页面自行渲染 lesson-topbar */}
              {!isLessonPage && <TopBar userName={userName} userRole={userRole} />}

              {/* 课次页无 main__content 包裹（需要自定义滚动结构） */}
              {isLessonPage ? children : (
                <div className="main__content">{children}</div>
              )}
            </main>
          </div>
        </div>
      </div>
    </TopBarProvider>
  );
}
