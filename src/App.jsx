import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

// ========== CONFIG ==========
const GAS_URL = "https://script.google.com/macros/s/AKfycbw1kUftvbVemV80gPpuIQbyDZPJdh87S500UpmkmKmzDDobvqdwFKCzLPd7-8fVgrw/exec"; // GAS 部署 URL
const DEMO_MODE = false; // 關閉 demo，使用 GAS 後端

// ========== MOCK DATA ==========
const generateMockData = () => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const ha = Math.random() > 0.6;
    data.push({
      date: dateStr,
      headache: ha ? 1 : 0,
      intensity: ha ? Math.floor(Math.random() * 6) + 3 : 0,
      neckPain: Math.floor(Math.random() * 7),
      sleepHours: +(5 + Math.random() * 4).toFixed(1),
      sleepQuality: Math.floor(Math.random() * 5) + 1,
      stress: Math.floor(Math.random() * 5) + 1,
      menstrualPhase: ["無", "無", "無", "經前", "月經中"][Math.floor(Math.random() * 5)],
      sittingTime: ["<2hr", "2-6hr", ">6hr"][Math.floor(Math.random() * 3)],
      exercise: Math.random() > 0.5 ? 1 : 0,
      caffeine: Math.random() > 0.4 ? 1 : 0,
      weather_temp: +(24 + Math.random() * 8).toFixed(1),
      weather_pressure: +(1005 + Math.random() * 15).toFixed(0),
    });
  }
  return data;
};

// ========== THEME ==========
const T = {
  bg: "#FFF8F3",
  card: "#FFFFFF",
  primary: "#D4A0B9",
  primaryLight: "#F3E1EB",
  accent: "#9DB5C9",
  accentLight: "#E3EDF4",
  warm: "#E8C4A0",
  warmLight: "#FFF0E0",
  text: "#5A4A5C",
  textLight: "#9A8A9C",
  danger: "#E09090",
  dangerLight: "#FDECEC",
  success: "#8DBB9A",
  successLight: "#E6F5EB",
  border: "#F0E8EE",
  shadow: "0 2px 12px rgba(90,74,92,0.06)",
};

const font = `'Zen Maru Gothic', 'Noto Sans TC', -apple-system, sans-serif`;

// ========== COMPONENTS ==========

const ToggleButton = ({ active, onClick, children, color = T.primary, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 16px",
      borderRadius: 20,
      border: active ? `2px solid ${color}` : `2px solid ${T.border}`,
      background: active ? color + "22" : T.card,
      color: active ? color : T.textLight,
      fontFamily: font,
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      cursor: "pointer",
      transition: "all 0.2s",
      ...style,
    }}
  >
    {children}
  </button>
);

const SliderRow = ({ label, emoji, value, onChange, max = 10, showValue = true }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 14, color: T.text, fontFamily: font }}>
        {emoji} {label}
      </span>
      {showValue && (
        <span style={{
          fontSize: 13, fontWeight: 600, color: value > max * 0.7 ? T.danger : value > max * 0.4 ? T.warm : T.success,
          background: value > max * 0.7 ? T.dangerLight : value > max * 0.4 ? T.warmLight : T.successLight,
          padding: "2px 10px", borderRadius: 12, fontFamily: font,
        }}>
          {value}/{max}
        </span>
      )}
    </div>
    <input
      type="range" min={0} max={max} value={value} onChange={e => onChange(+e.target.value)}
      style={{ width: "100%", accentColor: T.primary, height: 6 }}
    />
  </div>
);

const EmojiSelector = ({ options, value, onChange, multi = false }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => {
          if (multi) {
            const arr = value || [];
            onChange(arr.includes(opt.value) ? arr.filter(v => v !== opt.value) : [...arr, opt.value]);
          } else {
            onChange(opt.value);
          }
        }}
        style={{
          padding: "6px 12px",
          borderRadius: 16,
          border: (multi ? (value || []).includes(opt.value) : value === opt.value)
            ? `2px solid ${T.primary}` : `2px solid ${T.border}`,
          background: (multi ? (value || []).includes(opt.value) : value === opt.value)
            ? T.primaryLight : T.card,
          fontSize: 13,
          fontFamily: font,
          cursor: "pointer",
          transition: "all 0.15s",
          color: T.text,
        }}
      >
        {opt.emoji} {opt.label}
      </button>
    ))}
  </div>
);

const StarRating = ({ value, onChange, max = 5 }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: max }, (_, i) => (
      <button
        key={i}
        onClick={() => onChange(i + 1)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 2,
          fontSize: 22, filter: i < value ? "none" : "grayscale(1) opacity(0.3)",
          transition: "all 0.15s",
        }}
      >
        ⭐
      </button>
    ))}
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: T.card, borderRadius: 20, padding: 20,
    boxShadow: T.shadow, border: `1px solid ${T.border}`,
    marginBottom: 14, ...style,
  }}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 12, color: T.textLight, fontFamily: font, fontWeight: 500,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 10,
  }}>
    {children}
  </div>
);

// ========== RECORD TAB ==========
const RecordTab = ({ onSave }) => {
  const [form, setForm] = useState({
    headache: false,
    intensity: 5,
    location: [],
    neckPain: 3,
    sleepHours: 7,
    sleepQuality: 3,
    menstrualPhase: "無",
    stress: 2,
    sittingTime: "2-6hr",
    exercise: false,
    caffeine: false,
  });
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const todayStr = new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" });

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 16, padding: "10px 0" }}>
        <div style={{ fontSize: 14, color: T.textLight, fontFamily: font }}>{todayStr}</div>
        <div style={{ fontSize: 20, color: T.text, fontFamily: font, fontWeight: 600, marginTop: 4 }}>
          今天感覺怎麼樣？🌸
        </div>
      </div>

      {/* Headache */}
      <Card>
        <SectionLabel>頭痛狀況</SectionLabel>
        <div style={{ display: "flex", gap: 10, marginBottom: form.headache ? 16 : 0 }}>
          <ToggleButton
            active={!form.headache}
            onClick={() => set("headache", false)}
            color={T.success}
            style={{ flex: 1 }}
          >
            😊 沒有頭痛
          </ToggleButton>
          <ToggleButton
            active={form.headache}
            onClick={() => set("headache", true)}
            color={T.danger}
            style={{ flex: 1 }}
          >
            🤕 有頭痛
          </ToggleButton>
        </div>
        {form.headache && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <SliderRow label="疼痛強度" emoji="💥" value={form.intensity} onChange={v => set("intensity", v)} />
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 13, color: T.textLight, fontFamily: font, display: "block", marginBottom: 8 }}>
                📍 疼痛位置（可多選）
              </span>
              <EmojiSelector
                multi
                value={form.location}
                onChange={v => set("location", v)}
                options={[
                  { value: "左側", label: "左側", emoji: "◀️" },
                  { value: "右側", label: "右側", emoji: "▶️" },
                  { value: "後腦", label: "後腦", emoji: "🔙" },
                  { value: "眼窩", label: "眼窩", emoji: "👁" },
                  { value: "整圈", label: "整圈", emoji: "🔵" },
                ]}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Neck & Sleep */}
      <Card>
        <SectionLabel>身體 & 睡眠</SectionLabel>
        <SliderRow label="肩頸痠痛" emoji="🦴" value={form.neckPain} onChange={v => set("neckPain", v)} />
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 14, color: T.text, fontFamily: font, whiteSpace: "nowrap" }}>😴 睡眠</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => set("sleepHours", Math.max(0, form.sleepHours - 0.5))}
              style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.card, cursor: "pointer", fontSize: 16, color: T.text }}>−</button>
            <span style={{ fontSize: 18, fontWeight: 600, color: T.primary, fontFamily: font, minWidth: 40, textAlign: "center" }}>
              {form.sleepHours}h
            </span>
            <button onClick={() => set("sleepHours", Math.min(14, form.sleepHours + 0.5))}
              style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.card, cursor: "pointer", fontSize: 16, color: T.text }}>+</button>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <StarRating value={form.sleepQuality} onChange={v => set("sleepQuality", v)} />
          </div>
        </div>
      </Card>

      {/* Context */}
      <Card>
        <SectionLabel>生活狀態</SectionLabel>
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: T.textLight, fontFamily: font, display: "block", marginBottom: 8 }}>🌙 月經週期</span>
          <EmojiSelector
            value={form.menstrualPhase}
            onChange={v => set("menstrualPhase", v)}
            options={[
              { value: "無", label: "無", emoji: "—" },
              { value: "經前", label: "經前", emoji: "🌙" },
              { value: "月經中", label: "月經中", emoji: "🩸" },
              { value: "排卵期", label: "排卵期", emoji: "🌟" },
            ]}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: T.textLight, fontFamily: font, display: "block", marginBottom: 8 }}>😰 壓力程度</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { v: 1, e: "😌" }, { v: 2, e: "🙂" }, { v: 3, e: "😐" }, { v: 4, e: "😣" }, { v: 5, e: "🤯" },
            ].map(({ v, e }) => (
              <button key={v} onClick={() => set("stress", v)}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 14,
                  border: form.stress === v ? `2px solid ${T.primary}` : `2px solid ${T.border}`,
                  background: form.stress === v ? T.primaryLight : T.card,
                  fontSize: 20, cursor: "pointer", transition: "all 0.15s",
                }}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: T.textLight, fontFamily: font, display: "block", marginBottom: 8 }}>🪑 久坐時間</span>
          <EmojiSelector
            value={form.sittingTime}
            onChange={v => set("sittingTime", v)}
            options={[
              { value: "<2hr", label: "<2hr", emoji: "🏃" },
              { value: "2-6hr", label: "2-6hr", emoji: "🪑" },
              { value: ">6hr", label: ">6hr", emoji: "🧱" },
            ]}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <ToggleButton active={form.exercise} onClick={() => set("exercise", !form.exercise)} color={T.success} style={{ flex: 1 }}>
            {form.exercise ? "🏋️ 有運動" : "🛋 沒運動"}
          </ToggleButton>
          <ToggleButton active={form.caffeine} onClick={() => set("caffeine", !form.caffeine)} color={T.warm} style={{ flex: 1 }}>
            {form.caffeine ? "☕ 有咖啡因" : "🚫 無咖啡因"}
          </ToggleButton>
        </div>
      </Card>

      {/* Save */}
      <button onClick={handleSave}
        style={{
          width: "100%", padding: "16px 0", borderRadius: 20, border: "none",
          background: saved ? T.success : `linear-gradient(135deg, ${T.primary}, ${T.accent})`,
          color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: font,
          cursor: "pointer", transition: "all 0.3s", boxShadow: `0 4px 16px ${T.primary}44`,
          transform: saved ? "scale(0.98)" : "scale(1)",
        }}>
        {saved ? "✅ 已儲存！辛苦了～" : "💾 儲存今日紀錄"}
      </button>
    </div>
  );
};

// ========== TRENDS TAB ==========
const TrendsTab = ({ records }) => {
  const last14 = records.slice(-14);
  const chartData = last14.map(r => ({
    date: r.date.slice(5),
    頭痛: r.intensity,
    肩頸: r.neckPain,
    睡眠: r.sleepHours,
    壓力: r.stress * 2,
  }));

  const headacheDays = records.filter(r => r.headache).length;
  const totalDays = records.length;
  const avgIntensity = headacheDays > 0
    ? (records.filter(r => r.headache).reduce((s, r) => s + r.intensity, 0) / headacheDays).toFixed(1)
    : 0;
  const avgSleep = (records.reduce((s, r) => s + r.sleepHours, 0) / totalDays).toFixed(1);

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 16, padding: "10px 0" }}>
        <div style={{ fontSize: 20, color: T.text, fontFamily: font, fontWeight: 600 }}>
          📊 最近 30 天趨勢
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "頭痛天數", value: `${headacheDays}/${totalDays}`, emoji: "🤕", color: T.danger },
          { label: "平均強度", value: avgIntensity, emoji: "💥", color: T.warm },
          { label: "平均睡眠", value: `${avgSleep}h`, emoji: "😴", color: T.accent },
        ].map(({ label, value, emoji, color }) => (
          <Card key={label} style={{ textAlign: "center", padding: 14, marginBottom: 0 }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: font }}>{value}</div>
            <div style={{ fontSize: 11, color: T.textLight, fontFamily: font }}>{label}</div>
          </Card>
        ))}
      </div>

      {/* Line Chart */}
      <Card>
        <SectionLabel>疼痛 & 睡眠趨勢（14 日）</SectionLabel>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.textLight }} />
            <YAxis tick={{ fontSize: 10, fill: T.textLight }} domain={[0, 10]} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: font, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="頭痛" stroke={T.danger} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="肩頸" stroke={T.warm} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="睡眠" stroke={T.accent} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Headache by Day of Week */}
      <Card>
        <SectionLabel>星期幾最容易頭痛？</SectionLabel>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={(() => {
            const days = ["日", "一", "二", "三", "四", "五", "六"];
            const counts = Array(7).fill(0);
            const totals = Array(7).fill(0);
            records.forEach(r => {
              const dow = new Date(r.date).getDay();
              totals[dow]++;
              if (r.headache) counts[dow]++;
            });
            return days.map((d, i) => ({
              day: d,
              比率: totals[i] > 0 ? Math.round(counts[i] / totals[i] * 100) : 0,
            }));
          })()}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: T.textLight }} />
            <YAxis tick={{ fontSize: 10, fill: T.textLight }} unit="%" />
            <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: font, fontSize: 12 }} />
            <Bar dataKey="比率" fill={T.primary} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// ========== INSIGHTS TAB ==========
const InsightsTab = ({ records }) => {
  const [aiResponse, setAiResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  // 規則分析（前端計算，不需 API）
  const ruleInsights = (() => {
    if (records.length < 7) return [];
    const ha = records.filter(r => r.headache);
    const noHa = records.filter(r => !r.headache);
    const insights = [];

    // 睡眠不足
    const lowSleepHa = ha.filter(r => r.sleepHours < 6).length;
    const lowSleepNoHa = noHa.filter(r => r.sleepHours < 6).length;
    const lowSleepTotal = lowSleepHa + lowSleepNoHa;
    if (lowSleepTotal >= 2) {
      const rate = Math.round(lowSleepHa / lowSleepTotal * 100);
      insights.push({ trigger: "睡眠不足 (<6hr)", rate, emoji: "😴", tip: "睡不夠的時候，小腦袋比較容易鬧脾氣喔～" });
    }

    // 經前
    const preHa = ha.filter(r => r.menstrualPhase === "經前").length;
    const preNoHa = noHa.filter(r => r.menstrualPhase === "經前").length;
    const preTotal = preHa + preNoHa;
    if (preTotal >= 2) {
      const rate = Math.round(preHa / preTotal * 100);
      insights.push({ trigger: "經前期", rate, emoji: "🌙", tip: "月經快來的時候要特別好好休息～" });
    }

    // 久坐
    const sitHa = ha.filter(r => r.sittingTime === ">6hr").length;
    const sitNoHa = noHa.filter(r => r.sittingTime === ">6hr").length;
    const sitTotal = sitHa + sitNoHa;
    if (sitTotal >= 2) {
      const rate = Math.round(sitHa / sitTotal * 100);
      insights.push({ trigger: "久坐 >6hr", rate, emoji: "🪑", tip: "坐太久肩膀會偷偷加班，記得站起來動一動！" });
    }

    // 高壓力
    const stressHa = ha.filter(r => r.stress >= 4).length;
    const stressNoHa = noHa.filter(r => r.stress >= 4).length;
    const stressTotal = stressHa + stressNoHa;
    if (stressTotal >= 2) {
      const rate = Math.round(stressHa / stressTotal * 100);
      insights.push({ trigger: "高壓力 (≥4)", rate, emoji: "😣", tip: "壓力大的日子，頭痛怪獸比較活躍呢…" });
    }

    // 咖啡因
    const cafHa = ha.filter(r => r.caffeine).length;
    const cafNoHa = noHa.filter(r => r.caffeine).length;
    const cafTotal = cafHa + cafNoHa;
    if (cafTotal >= 2) {
      const rate = Math.round(cafHa / cafTotal * 100);
      insights.push({ trigger: "咖啡因攝取", rate, emoji: "☕", tip: "咖啡和頭痛的關係有點微妙，觀察看看～" });
    }

    insights.sort((a, b) => b.rate - a.rate);
    return insights;
  })();

  // 本週 vs 上週比較
  const weekCompare = (() => {
    const now = new Date();
    const thisWeek = records.filter(r => {
      const d = new Date(r.date);
      return (now - d) / 86400000 < 7;
    });
    const lastWeek = records.filter(r => {
      const d = new Date(r.date);
      const diff = (now - d) / 86400000;
      return diff >= 7 && diff < 14;
    });
    if (thisWeek.length < 3 || lastWeek.length < 3) return null;

    const thisHa = thisWeek.filter(r => r.headache).length;
    const lastHa = lastWeek.filter(r => r.headache).length;
    const thisSleep = (thisWeek.reduce((s, r) => s + r.sleepHours, 0) / thisWeek.length).toFixed(1);
    const lastSleep = (lastWeek.reduce((s, r) => s + r.sleepHours, 0) / lastWeek.length).toFixed(1);

    return { thisHa, lastHa, thisSleep, lastSleep, thisLen: thisWeek.length, lastLen: lastWeek.length };
  })();

  // AI 分析（透過 GAS 代理呼叫 Gemini，API Key 保存在 GAS PropertiesService）
  const runAiAnalysis = async () => {
    setLoading(true);
    try {
      const last14 = records.slice(-14);
      const summary = last14.map(r =>
        `${r.date}: 頭痛=${r.headache ? `是(${r.intensity}/10,${Array.isArray(r.location) ? r.location.join("/") : ""})` : "無"} 肩頸=${r.neckPain}/10 睡=${r.sleepHours}h(品質${r.sleepQuality}/5) 月經=${r.menstrualPhase} 壓力=${r.stress}/5 久坐=${r.sittingTime} 運動=${r.exercise ? "有" : "無"} 咖啡因=${r.caffeine ? "有" : "無"}`
      ).join("\n");

      const prompt = `你是一個溫柔可愛的健康小助手，分析以下 14 天的偏頭痛追蹤資料。
請用溫暖、可愛、有陪伴感的語氣回覆（像朋友關心一樣，不要說教）。

格式要求：
1. 🔍 發現的規律（2-3 個重點）
2. ⚠️ 需要注意的事（如果有的話）
3. 💪 做得好的地方（鼓勵）
4. 💡 小建議（1-2 個，溫柔的）

資料：
${summary}

注意：回覆保持在 200 字以內，用繁體中文。`;

      // 不帶 Content-Type header，避免 CORS preflight 問題
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "ai_analysis", prompt }),
      });
      const data = await res.json();
      const text = data.text || data.error || "分析暫時無法完成，請稍後再試～";
      setAiResponse(text);
    } catch (e) {
      setAiResponse("🤖 AI 小助手暫時休息中…（請確認 GAS 連線設定）");
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 16, padding: "10px 0" }}>
        <div style={{ fontSize: 20, color: T.text, fontFamily: font, fontWeight: 600 }}>
          🧠 AI 洞察分析
        </div>
        <div style={{ fontSize: 13, color: T.textLight, fontFamily: font, marginTop: 4 }}>
          幫你找出自己沒發現的規律
        </div>
      </div>

      {/* Week Comparison */}
      {weekCompare && (
        <Card style={{ background: weekCompare.thisHa <= weekCompare.lastHa ? T.successLight : T.dangerLight, border: "none" }}>
          <div style={{ fontSize: 14, color: T.text, fontFamily: font, lineHeight: 1.8 }}>
            {weekCompare.thisHa < weekCompare.lastHa
              ? `🎉 這週頭痛 ${weekCompare.thisHa} 天，比上週少了 ${weekCompare.lastHa - weekCompare.thisHa} 天！繼續保持～`
              : weekCompare.thisHa === weekCompare.lastHa
                ? `📊 這週和上週一樣頭痛了 ${weekCompare.thisHa} 天，我們一起找找原因！`
                : `💭 這週頭痛 ${weekCompare.thisHa} 天，比上週多了 ${weekCompare.thisHa - weekCompare.lastHa} 天，辛苦了…`
            }
            <br />
            <span style={{ fontSize: 12, color: T.textLight }}>
              平均睡眠：本週 {weekCompare.thisSleep}h → 上週 {weekCompare.lastSleep}h
            </span>
          </div>
        </Card>
      )}

      {/* Trigger Ranking */}
      <Card>
        <SectionLabel>🎯 個人 Trigger 排行</SectionLabel>
        {ruleInsights.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: T.textLight, fontFamily: font, fontSize: 13 }}>
            再多記錄幾天就能看到分析結果囉 📝
          </div>
        ) : (
          ruleInsights.map((ins, i) => (
            <div key={ins.trigger} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0",
              borderBottom: i < ruleInsights.length - 1 ? `1px solid ${T.border}` : "none",
            }}>
              <span style={{ fontSize: 24 }}>{ins.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: font }}>{ins.trigger}</div>
                <div style={{ fontSize: 12, color: T.textLight, fontFamily: font, marginTop: 2 }}>{ins.tip}</div>
              </div>
              <div style={{
                fontSize: 16, fontWeight: 700, fontFamily: font,
                color: ins.rate > 70 ? T.danger : ins.rate > 50 ? T.warm : T.accent,
              }}>
                {ins.rate}%
              </div>
            </div>
          ))
        )}
      </Card>

      {/* AI Analysis */}
      <Card>
        <SectionLabel>🤖 AI 小助手分析</SectionLabel>
        {aiResponse ? (
          <div style={{
            fontSize: 14, color: T.text, fontFamily: font, lineHeight: 1.8,
            whiteSpace: "pre-wrap",
          }}>
            {aiResponse}
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <button onClick={runAiAnalysis} disabled={loading || records.length < 7}
              style={{
                padding: "12px 24px", borderRadius: 16, border: "none",
                background: records.length < 7 ? T.border : `linear-gradient(135deg, ${T.primary}, ${T.accent})`,
                color: records.length < 7 ? T.textLight : "#fff",
                fontSize: 14, fontWeight: 600, fontFamily: font, cursor: records.length < 7 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}>
              {loading ? "🔍 分析中..." : records.length < 7 ? "📝 累積 7 天資料後可分析" : "✨ 請 AI 小助手分析"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

// ========== MAIN APP ==========
export default function MigraineTracker() {
  const [tab, setTab] = useState("record");
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (DEMO_MODE) {
      setRecords(generateMockData());
    } else if (GAS_URL) {
      fetch(`${GAS_URL}?action=fetch`)
        .then(r => r.json())
        .then(d => setRecords(d.records || []))
        .catch(console.error);
    }
  }, []);

  const handleSave = useCallback((form) => {
    const today = new Date().toISOString().split("T")[0];
    const record = {
      date: today,
      headache: form.headache ? 1 : 0,
      intensity: form.headache ? form.intensity : 0,
      location: form.location,
      neckPain: form.neckPain,
      sleepHours: form.sleepHours,
      sleepQuality: form.sleepQuality,
      menstrualPhase: form.menstrualPhase,
      stress: form.stress,
      sittingTime: form.sittingTime,
      exercise: form.exercise ? 1 : 0,
      caffeine: form.caffeine ? 1 : 0,
    };

    // 更新本地
    setRecords(prev => {
      const filtered = prev.filter(r => r.date !== today);
      return [...filtered, record].sort((a, b) => a.date.localeCompare(b.date));
    });

    // 送到 GAS
    if (GAS_URL && !DEMO_MODE) {
      fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "record", ...record }),
      }).catch(console.error);
    }
  }, []);

  const tabs = [
    { id: "record", label: "紀錄", emoji: "📝" },
    { id: "trends", label: "趨勢", emoji: "📊" },
    { id: "insights", label: "洞察", emoji: "🧠" },
  ];

  return (
    <div style={{
      fontFamily: font, background: T.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto",
      paddingBottom: 80,
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        input[type="range"] { -webkit-appearance: none; appearance: none; background: ${T.border}; border-radius: 4px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: ${T.primary}; cursor: pointer; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: ${T.bg}; }
      `}</style>

      {/* App Header */}
      <div style={{
        textAlign: "center", padding: "24px 20px 12px",
        background: `linear-gradient(180deg, ${T.primaryLight} 0%, ${T.bg} 100%)`,
      }}>
        <div style={{ fontSize: 28 }}>🧠✨</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: font, letterSpacing: 1 }}>
          小腦袋日記
        </div>
        <div style={{ fontSize: 12, color: T.textLight, fontFamily: font, marginTop: 2 }}>
          陪你找到自己的規律
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 16px", animation: "fadeIn 0.3s ease" }}>
        {tab === "record" && <RecordTab onSave={handleSave} />}
        {tab === "trends" && <TrendsTab records={records} />}
        {tab === "insights" && <InsightsTab records={records} />}
      </div>

      {/* Tab Bar */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "10px 0 18px", background: T.card,
        borderTop: `1px solid ${T.border}`,
        boxShadow: "0 -2px 12px rgba(0,0,0,0.04)",
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              opacity: tab === t.id ? 1 : 0.5, transition: "all 0.2s",
              transform: tab === t.id ? "scale(1.05)" : "scale(1)",
            }}>
            <span style={{ fontSize: 20 }}>{t.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: T.text, fontFamily: font }}>
              {t.label}
            </span>
            {tab === t.id && (
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.primary, marginTop: 2 }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
