"use client";

import { useState, useEffect } from "react";
import { SetTopBar } from "@/components/TopBarContext";
import { useToast } from "@/components/Toast";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import AvatarSelector from "./AvatarSelector";
import PasswordChangeModal from "./PasswordChangeModal";

interface ProfileData {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  departmentId: string | null;
}

interface Department {
  id: string;
  name: string;
}

export default function ProfilePage() {
  const { showToast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/user/profile").then(r => r.json()),
      fetch("/api/admin/departments").then(r => r.json()).catch(() => []),
    ]).then(([profileData, deptData]) => {
      setProfile(profileData);
      setName(profileData.name ?? "");
      setEmail(profileData.email ?? "");
      setPhone(profileData.phone ?? "");
      setDepartmentId(profileData.departmentId ?? "");
      setAvatarUrl(profileData.avatarUrl ?? "");
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setLoading(false);
    }).catch(() => {
      showToast("加载个人资料失败", "error");
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          departmentId: departmentId || null,
          avatarUrl: avatarUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "保存失败", "error");
      } else {
        setProfile(json);
        showToast("个人资料已更新", "success");
      }
    } catch {
      showToast("网络错误，请重试", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <SetTopBar title="个人资料" />
        <div className="profile-page">
          <div className="profile-page__card">
            <p style={{ textAlign: "center", color: "var(--muted)" }}>加载中...</p>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <SetTopBar title="个人资料" />
        <div className="profile-page">
          <div className="profile-page__card">
            <p style={{ textAlign: "center", color: "var(--danger)" }}>无法加载个人资料</p>
          </div>
        </div>
      </>
    );
  }

  const roleLabel = ROLE_LABELS[profile.role as Role] ?? "教师";

  return (
    <>
      <SetTopBar title="个人资料" />

      <div className="profile-page">
        <div className="profile-page__card">
          {/* Avatar Selector */}
          <div className="profile-page__avatar-section">
            <AvatarSelector value={avatarUrl} onChange={setAvatarUrl} />
          </div>

          {/* Form Fields */}
          <div className="profile-page__form">
            <div className="profile-page__field">
              <label className="field-label">姓名</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>

            <div className="profile-page__field">
              <label className="field-label">用户名</label>
              <input
                className="input"
                value={profile.username}
                disabled
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
              <span className="profile-page__hint">用户名创建后不可修改</span>
            </div>

            <div className="profile-page__field">
              <label className="field-label">角色</label>
              <input
                className="input"
                value={roleLabel}
                disabled
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>

            <div className="profile-page__field">
              <label className="field-label">邮箱 <span className="profile-page__optional">选填</span></label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="请输入邮箱"
              />
            </div>

            <div className="profile-page__field">
              <label className="field-label">手机 <span className="profile-page__optional">选填</span></label>
              <input
                className="input"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="请输入手机号"
              />
            </div>

            {departments.length > 0 && (
              <div className="profile-page__field">
                <label className="field-label">部门 <span className="profile-page__optional">选填</span></label>
                <select
                  className="select"
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                >
                  <option value="">请选择部门</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="profile-page__actions">
              <button className="btn" onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                className="btn btn--soft"
                onClick={() => setShowPasswordModal(true)}
              >
                修改密码
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
}
