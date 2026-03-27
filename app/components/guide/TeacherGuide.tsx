"use client";

import GuideCard from "./GuideCard";
import GuideFaq from "./GuideFaq";

export const TEACHER_SECTIONS = [
  { id: "section-browse", title: "课程浏览" },
  { id: "section-slideshow", title: "课件生成" },
  { id: "section-chat", title: "问AI助手" },
  { id: "section-settings", title: "个人设置" },
  { id: "section-faq", title: "常见问题" },
];

export default function TeacherGuide() {
  return (
    <div className="guide-content">
      <div className="guide-body">
        <span className="guide-role-badge">教师版</span>

        {/* ── 课程浏览 ── */}
        <div className="guide-section-title" id="section-browse">课程浏览</div>

        <GuideCard step={1} title="注册 / 登录">
          <ol className="guide-steps">
            <li>打开系统网址，进入登录页</li>
            <li>已有账号：输入<strong>账号</strong>和<strong>密码</strong>，点击「登录」</li>
            <li>新用户：点击「使用邀请码注册」，输入管理员提供的<strong>邀请码</strong>、设置用户名和密码，完成注册后返回登录</li>
          </ol>
          <div className="guide-tip"><strong>忘记密码？</strong>联系管理员，管理员可以在后台帮您重置。</div>
        </GuideCard>

        <GuideCard step={2} title="找到适合的课程">
          <ol className="guide-steps">
            <li>登录后自动进入<strong>课程列表</strong>，展示所有可用课程</li>
            <li>左侧边栏有<strong>筛选功能</strong>：按年龄段（如&quot;8-9岁&quot;）和难度筛选</li>
            <li>找到目标课程后，点击卡片上的「进入详情」</li>
          </ol>
          <div className="guide-tip"><strong>小技巧：</strong>筛选条件会自动记住，下次打开系统不用重新选。</div>
        </GuideCard>

        <GuideCard step={3} title="了解课程内容">
          <ol className="guide-steps">
            <li>详情页展示课程的<strong>完整信息</strong>：适用年龄、难度、简介</li>
            <li>下方是<strong>课次列表</strong>，每节课标注了时长、人数、AI 回合数</li>
            <li>点击某节课右侧的「进入本课」，打开课程内容</li>
          </ol>
        </GuideCard>

        <GuideCard step={4} title="进入课堂">
          <ol className="guide-steps">
            <li>课程页面顶部显示<strong>课次目标</strong>和<strong>核心成果</strong></li>
            <li>左侧有<strong>目录导航</strong>，点击可跳转到任意教学环节</li>
            <li>滚动阅读时，目录会<strong>自动跟踪</strong>您当前所在的位置</li>
            <li>左侧边栏底部可以<strong>快速切换</strong>到同一课程的其他课次</li>
          </ol>
        </GuideCard>

        <GuideCard step={5} title="课堂实用工具">
          <ol className="guide-steps">
            <li><strong>复制 AI 模板</strong>：课程中的对话模板右上角有复制按钮，一键复制到剪贴板</li>
            <li><strong>打印课程</strong>：点击顶部「打印本课」按钮，可打印纸质版或保存 PDF</li>
            <li><strong>阅读进度</strong>：页面最顶部的进度条显示您的阅读进度</li>
          </ol>
        </GuideCard>

        <hr className="guide-divider" />

        {/* ── 课件生成 ── */}
        <div className="guide-section-title" id="section-slideshow">课件生成</div>

        <GuideCard step={6} title="生成课堂 PPT 课件">
          <ol className="guide-steps">
            <li>点击左侧边栏「课件生成」进入课件生成页面</li>
            <li>选择一个已发布的课程包</li>
            <li>在页面顶部选择 PPT 模板主题（科技蓝/自然绿/创意橙/简约白）</li>
            <li>点击课次旁的「生成课件」按钮，AI 会将备课内容转写为学生课堂展示用的 PPT</li>
            <li>生成完成后点击「下载」获取 .pptx 文件</li>
            <li>可在 PowerPoint 或 WPS 中打开并二次编辑</li>
          </ol>
        </GuideCard>

        <GuideCard step={7} title="批量生成课件">
          <ol className="guide-steps">
            <li>点击「一键生成全部」按钮，系统会逐课次自动生成课件</li>
            <li>生成过程中会显示进度（如"正在生成第 3/8 课"）</li>
            <li>全部生成完成后，点击「下载全部」可逐个下载所有课件</li>
          </ol>
          <div className="guide-tip">课件模板基于 <a href="https://www.slidescarnival.com/" target="_blank" rel="noopener noreferrer">SlidesCarnival</a> 设计，采用 CC BY 4.0 许可。</div>
        </GuideCard>

        <hr className="guide-divider" />

        {/* ── 问AI助手 ── */}
        <div className="guide-section-title" id="section-chat">问AI助手</div>

        <GuideCard step={8} title="使用 AI 对话">
          <ol className="guide-steps">
            <li>点击左侧边栏「问AI」进入对话页面</li>
            <li>点击「新建对话」，选择模式：
              <br /><strong>通用模式</strong> — 问任何问题
              <br /><strong>课程设计模式</strong> — AI 懂课程设计，适合教学相关咨询
            </li>
            <li>在输入框打字，按 <kbd>Enter</kbd> 发送（<kbd>Shift</kbd>+<kbd>Enter</kbd> 换行）</li>
            <li>AI 实时回复，支持多轮对话，历史自动保存</li>
            <li>AI 会<strong>自动判断是否需要联网搜索</strong>，搜索结果以引用标注展示在回答中，底部附来源链接</li>
          </ol>
          <div className="guide-tip"><strong>课程设计模式</strong>下，AI 会参考系统内置的课程设计标准来回答，比通用模式更专业。</div>
        </GuideCard>

        <hr className="guide-divider" />

        {/* ── 个人设置 ── */}
        <div className="guide-section-title" id="section-settings">个人设置</div>

        <GuideCard step={7} title="资料与密码">
          <ol className="guide-steps">
            <li>点击页面右上角的<strong>头像</strong>，可进入以下设置：</li>
            <li><strong>个人资料</strong>：修改姓名、邮箱、手机、部门，选择头像（60 个预设卡通头像）</li>
            <li><strong>修改密码</strong>：输入当前密码 → 输入新密码（至少 6 位）→ 确认</li>
          </ol>
        </GuideCard>

        <hr className="guide-divider" />

        {/* ── 常见问题 ── */}
        <div className="guide-section-title" id="section-faq">常见问题</div>

        <GuideFaq question="我想找适合 8 岁孩子的课程">
          在左侧边栏点击「课程包列表」展开筛选树，选择对应的年龄段（如&quot;8-9岁&quot;），列表会自动过滤。还可以进一步选择难度等级。
        </GuideFaq>

        <GuideFaq question="我想在课堂上快速使用 AI 对话模板">
          进入课程后，找到标有&quot;AI 对话模板&quot;的内容块，点击右上角的<strong>复制按钮</strong>，模板内容会复制到剪贴板。然后切换到 AI 工具中直接粘贴使用。
        </GuideFaq>

        <GuideFaq question="我想把课程打印出来备课">
          进入课程后，点击页面顶部右侧的「打印本课」按钮。系统会自动优化排版：隐藏导航元素、展开所有折叠内容、切换为适合纸张的单栏布局。可以选择打印到纸张或保存为 PDF。
        </GuideFaq>

        <GuideFaq question="我想问 AI 一个教学相关的问题">
          点击左侧边栏「问AI」→ 新建对话 → 选择「课程设计模式」。这个模式下 AI 具备课程设计专业知识，能给出更专业的教学建议。如果是非教学问题，选「通用模式」即可。
        </GuideFaq>

        <GuideFaq question="AI 回答中的引用标注是什么">
          当 AI 判断需要联网搜索时，会自动搜索并在回答中用 [1]、[2] 标注引用来源。回答下方会列出来源链接，点击可查看原文。
        </GuideFaq>

        <GuideFaq question="我想继续之前和 AI 的对话">
          进入「问AI」页面后，左侧对话列表会显示您的所有历史对话。点击任意一条即可继续对话，之前的聊天记录都在。
        </GuideFaq>

        <GuideFaq question="我想快速跳到课程的某个环节">
          进入课程后，左侧有一个<strong>目录导航面板</strong>，列出了所有教学环节。直接点击环节名称就能跳转过去。当前正在看的环节会自动高亮。
        </GuideFaq>

        <GuideFaq question="我想切换到同一课程的下一节课">
          不用返回详情页。左侧边栏底部有一个<strong>课次导航</strong>区域，列出了当前课程的所有课次。直接点击就能切换。
        </GuideFaq>

        <GuideFaq question="我忘记密码了">
          请联系系统管理员，管理员可以在后台为您重置密码。重置后用新密码登录即可。
        </GuideFaq>

        <GuideFaq question="我筛选后看不到任何课程了">
          可能是筛选条件太精确。点击左侧筛选树最顶部的「全部课程」即可清除所有筛选条件，显示全部课程。
        </GuideFaq>

        <GuideFaq question={'课程显示"未接入"无法点击'}>
          这表示该课次的内容还没有录入系统。请联系教学主管或管理员了解进度。
        </GuideFaq>
      </div>
    </div>
  );
}
