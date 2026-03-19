"use client";

import GuideCard from "./GuideCard";
import GuideFaq from "./GuideFaq";

export default function RdManagerGuide() {
  return (
    <div className="guide-content">
      <div className="guide-header">
        <span className="guide-header__badge">教学主管版</span>
        <h1 className="guide-header__title">AI Dash 快速入门</h1>
        <p className="guide-header__desc">掌握课程浏览 + AI 课程研发全流程</p>
      </div>

      <div className="guide-body">
        {/* Part 1: 课程浏览 */}
        <div className="guide-section-title">课程浏览</div>
        <p className="guide-section-subtitle">查看和使用已发布的课程，与教师相同</p>

        <GuideCard step={1} title="登录 → 找到课程 → 进入授课">
          <ol className="guide-steps">
            <li>输入账号密码登录系统，进入课程列表</li>
            <li>左侧边栏可按<strong>年龄段</strong>和<strong>难度</strong>筛选课程</li>
            <li>点击「进入详情」查看课程信息和课次列表</li>
            <li>点击「进入本课」打开课程内容，左侧有目录导航</li>
          </ol>
          <div className="guide-tip"><strong>实用工具：</strong>课程中的 AI 对话模板可以一键复制；顶部有「打印本课」按钮。</div>
        </GuideCard>

        <GuideCard step={2} title="问 AI 助手">
          <ol className="guide-steps">
            <li>点击左侧边栏「问AI」，新建对话</li>
            <li>选择<strong>通用模式</strong>（问任何问题）或<strong>课程设计模式</strong>（AI 懂课程设计）</li>
            <li>输入消息按 <kbd>Enter</kbd> 发送，AI 实时回复，支持多轮对话</li>
          </ol>
        </GuideCard>

        <hr className="guide-divider" />

        {/* Part 2: AI 课程研发 */}
        <div className="guide-section-title">AI 课程研发</div>
        <p className="guide-section-subtitle">从零开始，用 AI 设计完整课程并发布到课程库</p>

        <div className="guide-flow">
          {["新建项目", "填写方向", "AI 生成框架", "修改框架", "确认框架", "逐课生成", "逐课修订", "审核定稿", "发布"].map((step, i, arr) => (
            <span key={step}>
              <span className="guide-flow__pill">{step}</span>
              {i < arr.length - 1 && <span className="guide-flow__arrow">→</span>}
            </span>
          ))}
        </div>

        <GuideCard step={3} title="新建项目 + 填写课程方向">
          <ol className="guide-steps">
            <li>点击左侧边栏「课程研发」，进入研发看板</li>
            <li>点击「+ 新建项目」</li>
            <li>填写课程信息：
              <br />- <strong>年龄段和难度</strong>（必选）
              <br />- <strong>课程方向</strong>：选择预设或自己描述
              <br />- <strong>项目标题</strong>：手动输入或点「AI 生成」自动起名
              <br />- 课次数量、产出物类型、图片风格等
            </li>
            <li>「核心诉求」和「补充约束」可以点击标签快速选择</li>
          </ol>
          <div className="guide-tip"><strong>信息越详细，AI 生成质量越高。</strong>特别是&quot;课程方向&quot;和&quot;核心诉求&quot;，直接影响框架质量。</div>
        </GuideCard>

        <GuideCard step={4} title="AI 生成框架 + 修改">
          <ol className="guide-steps">
            <li>点击「生成课程框架」，AI 实时生成课程大纲和封面图</li>
            <li>右侧面板展示生成结果：课程总结 + 每课标题和概述</li>
            <li>不满意？在输入框写<strong>修改意见</strong>提交，AI 只调整您指出的部分</li>
            <li>可反复修改，直到满意</li>
            <li>封面图也可以单独重新生成</li>
          </ol>
          <div className="guide-tip"><strong>AI 是&quot;改&quot;不是&quot;重写&quot;：</strong>每次修改只动您指出的部分，其余内容保持不变。</div>
        </GuideCard>

        <GuideCard step={5} title="工作台：逐课生成和修订">
          <ol className="guide-steps">
            <li>确认框架后进入工作台，显示所有课次卡片（初始为空）</li>
            <li>点击某个课次的「生成」按钮，AI 生成详细方案（含 7 个板块）</li>
            <li>方案包含：核心信息、AI 环节说明、备课提示、课堂流程、学生应对策略、附件模板、课后复盘</li>
            <li>要修改？<strong>点击预览中的板块标题或图片</strong>，底部弹出输入栏，写修改意见提交</li>
            <li>也可以整体重新生成某个课次</li>
          </ol>
          <div className="guide-tip"><strong>分页加载：</strong>课次多时默认显示前几课，点击底部「加载更多」查看后续课次。</div>
        </GuideCard>

        <GuideCard step={6} title="审核 → 定稿 → 发布">
          <ol className="guide-steps">
            <li>所有课次方案就绪后，点击顶部「审核并定稿」</li>
            <li>AI 对每节课做 <strong>10 项质量检查</strong>（目标清晰度、AI 价值、时间分配等），逐项显示结果</li>
            <li>审核通过后自动定稿，方案锁定不可修改</li>
            <li>页面底部出现<strong>发布面板</strong>：确认标题 → 点击「发布」</li>
            <li>发布成功后，课程立即出现在教师端的课程列表中</li>
          </ol>
          <div className="guide-tip"><strong>需要改？</strong>点击「撤回定稿」可解锁方案继续修改。已发布的内容不受影响，修改后需重新定稿并发布。</div>
        </GuideCard>

        <hr className="guide-divider" />

        {/* Part 3: 课程包管理 */}
        <div className="guide-section-title">课程包管理</div>
        <p className="guide-section-subtitle">管理已发布的课程包</p>

        <GuideCard step={7} title="管理课程包">
          <ol className="guide-steps">
            <li>点击左侧「管理后台」→「课程包管理」</li>
            <li>表格展示所有课程包，可执行以下操作：
              <br />- <strong>编辑</strong>：修改标题、年龄段、难度
              <br />- <strong>下线</strong>：教师端暂时不可见
              <br />- <strong>上线</strong>：恢复教师可见
              <br />- <strong>删除</strong>：永久删除（不可撤销）
            </li>
          </ol>
        </GuideCard>

        <hr className="guide-divider" />

        {/* Part 4: 查看配置 */}
        <div className="guide-section-title">查看系统配置</div>
        <p className="guide-section-subtitle">以下页面您可以查看但不能修改，修改权限属于管理员</p>

        <GuideCard step={8} title="可查看的配置页面">
          <ol className="guide-steps">
            <li><strong>AI 服务配置</strong>：查看当前使用的 AI 模型和用量统计</li>
            <li><strong>AI 生成规则</strong>（Prompt 配置）：查看课程设计标准、AI 生成指令模板、预设选项</li>
            <li><strong>AI 调用记录</strong>：查看您自己项目的 AI 使用记录和费用</li>
            <li><strong>操作日志</strong>：查看您自己的操作记录</li>
          </ol>
        </GuideCard>

        <hr className="guide-divider" />

        {/* FAQ */}
        <div className="guide-section-title">我想做什么？</div>

        <GuideFaq question="我想从零开始设计一个新课程" defaultOpen>
          点击左侧「课程研发」→「+ 新建项目」→ 填写课程方向信息 → 点击「生成课程框架」。AI 会生成完整的课程大纲，您可以反复修改直到满意，然后逐课生成详细方案。
        </GuideFaq>

        <GuideFaq question="AI 生成的课程框架不太对，我想调整">
          在框架结果面板的输入框中，用自然语言描述您想改什么。比如&quot;第 3 课的主题改为 XX&quot;或&quot;把课次数量从 10 减到 8&quot;。AI 只会调整您指出的部分，其余保持不变。可以反复修改。
        </GuideFaq>

        <GuideFaq question="某节课的方案质量不好，我想改进">
          在工作台中，点击该课次预览中的<strong>板块标题或图片</strong>，底部弹出修改意见输入栏。描述具体要改什么，AI 会针对性调整。如果整体不满意，也可以点击「重新生成」彻底重做。
        </GuideFaq>

        <GuideFaq question="课程定稿后发现问题，能改吗">
          可以。点击工作台顶部的「撤回定稿」，方案会解锁恢复可编辑状态。修改完成后重新点击「审核并定稿」。如果已经发布到课程库，已发布的内容不会受影响，修改后需要重新发布。
        </GuideFaq>

        <GuideFaq question="我想查看 AI 生成这个课程花了多少钱">
          两个地方可以看：<br />
          1. 工作台页面内有 <strong>AI 使用统计</strong>面板，显示当前项目的总费用、调用次数、每课均价<br />
          2. 「管理后台」→「AI 调用记录」可以看到每次 AI 调用的详细费用
        </GuideFaq>

        <GuideFaq question="我想用 AI 咨询课程设计的问题">
          点击左侧「问AI」→ 新建对话 → 选择「课程设计模式」。这个模式下 AI 了解课程设计标准，能提供更专业的建议。
        </GuideFaq>

        <GuideFaq question="我想下线一个课程包">
          「管理后台」→「课程包管理」→ 找到目标课程包 → 点击「下线」。下线后教师端不再显示。需要恢复时点击「上线」即可。
        </GuideFaq>

        <GuideFaq question={'AI 生成时提示"服务未配置"'}>
          这说明管理员还没有配置对应的 AI 模型。请联系管理员，在「AI 服务配置」中为相应的动作配置模型。
        </GuideFaq>

        <GuideFaq question="封面图或课次图片生成失败">
          通常是图片生成的 AI 模型未配置或额度不足。请联系管理员检查「AI 服务配置」中图片相关动作的模型配置。
        </GuideFaq>

        <GuideFaq question="我忘记密码了">
          请联系系统管理员，管理员可以在后台为您重置密码。
        </GuideFaq>
      </div>
    </div>
  );
}
