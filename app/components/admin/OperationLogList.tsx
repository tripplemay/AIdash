"use client";

interface LogEntry {
  id: string;
  module: string;
  action: string;
  targetName: string | null;
  detail: string | null;
  createdAt: Date;
  user: { name: string; role: string };
}

const MODULE_LABELS: Record<string, string> = {
  package: "课程包",
  user: "用户",
};

const ACTION_LABELS: Record<string, string> = {
  upload: "上传",
  publish: "发布",
  online: "上线",
  offline: "下线",
  delete: "删除",
  create: "新建",
  edit: "编辑",
  reset_password: "重置密码",
};

export default function OperationLogList({ logs }: { logs: LogEntry[] }) {
  return (
    <>
      <div className="admin-header">
        <div>
          <h2 className="admin-header__title">操作日志</h2>
          <p className="admin-header__subtitle">共 {logs.length} 条记录</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {["时间", "操作人", "模块", "操作", "对象", "详情"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={6} className="table__empty">暂无操作记录</td></tr>
            )}
            {logs.map(log => (
              <tr key={log.id}>
                <td className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                  {new Date(log.createdAt).toLocaleString("zh-CN")}
                </td>
                <td className="bold" style={{ fontSize: 13 }}>{log.user.name}</td>
                <td style={{ fontSize: 13 }}>{MODULE_LABELS[log.module] ?? log.module}</td>
                <td style={{ fontSize: 13 }}>{ACTION_LABELS[log.action] ?? log.action}</td>
                <td style={{ fontSize: 13 }}>{log.targetName ?? "-"}</td>
                <td className="muted" style={{ fontSize: 12 }}>{log.detail ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
