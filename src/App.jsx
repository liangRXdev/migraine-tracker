import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ComposedChart, Area,
} from "recharts";


// ========== CONFIG ==========
const GAS_URL = "https://script.google.com/macros/s/AKfycbw1kUftvbVemV80gPpuIQbyDZPJdh87S500UpmkmKmzDDobvqdwFKCzLPd7-8fVgrw/exec";
const DEMO_MODE = false;
const TOKEN = import.meta.env.VITE_GAS_TOKEN ?? "";
const WEATHER_LAT = 24.15;
const WEATHER_LON = 120.67;

// ========== WEATHER UTILS ==========
const wmoEmoji = (code) => {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌡️";
};

const fetchWeather = async () => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current=temperature_2m,surface_pressure,weather_code&timezone=Asia%2FTaipei`;
  const res = await fetch(url);
  const data = await res.json();
  const c = data.current;
  return {
    weather_temp: c.temperature_2m,
    weather_pressure: Math.round(c.surface_pressure),
    weather_code: c.weather_code,
  };
};

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
      location: ha ? ["左側"] : [],
      neckPain: Math.floor(Math.random() * 7),
      neckSide: Math.random() > 0.5 ? ["左側"] : ["右側"],
      sleepHours: +(5 + Math.random() * 4).toFixed(1),
      sleepQuality: Math.floor(Math.random() * 5) + 1,
      stress: Math.floor(Math.random() * 5) + 1,
      lastPeriodDate: i === 20 ? new Date(now.getTime() - 20 * 86400000).toISOString().split("T")[0] : "",
      sittingTime: ["<2hr", "2-6hr", ">6hr"][Math.floor(Math.random() * 3)],
      exercise: Math.random() > 0.5 ? 1 : 0,
      caffeine: Math.random() > 0.4 ? 1 : 0,
      waterOver1500: Math.random() > 0.5,
      notes: "",
      weather_temp: +(24 + Math.random() * 8).toFixed(1),
      weather_pressure: +(1005 + Math.random() * 15).toFixed(0),
      weather_code: [0, 1, 2, 3, 61, 80][Math.floor(Math.random() * 6)],
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

// ========== BASE COMPONENTS ==========

const ToggleButton = ({ active, onClick, children, color = T.primary, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 16px", borderRadius: 20,
      border: active ? `2px solid ${color}` : `2px solid ${T.border}`,
      background: active ? color + "22" : T.card,
      color: active ? color : T.textLight,
      fontFamily: font, fontSize: 14, fontWeight: active ? 600 : 400,
      cursor: "pointer", transition: "all 0.2s", ...style,
    }}
  >
    {children}
  </button>
);

const SliderRow = ({ label, emoji, value, onChange, max = 10, showValue = true }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 14, color: T.text, fontFamily: font }}>{emoji} {label}</span>
      {showValue && (
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: value > max * 0.7 ? T.danger : value > max * 0.4 ? T.warm : T.success,
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
          padding: "6px 12px", borderRadius: 16,
          border: (multi ? (value || []).includes(opt.value) : value === opt.value)
            ? `2px solid ${T.primary}` : `2px solid ${T.border}`,
          background: (multi ? (value || []).includes(opt.value) : value === opt.value)
            ? T.primaryLight : T.card,
          fontSize: 13, fontFamily: font, cursor: "pointer", transition: "all 0.15s", color: T.text,
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
      <button key={i} onClick={() => onChange(i + 1)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 2,
          fontSize: 22, filter: i < value ? "none" : "grayscale(1) opacity(0.3)", transition: "all 0.15s",
        }}>
        ⭐
      </button>
    ))}
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: T.card, borderRadius: 20, padding: 20,
    boxShadow: T.shadow, border: `1px solid ${T.border}`, marginBottom: 14, ...style,
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

// ========== PASSWORD GATE ==========
const PasswordGate = ({ onVerified }) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${GAS_URL}?action=verify_password&token=${TOKEN}&password=${encodeURIComponent(input)}`
      );
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem("migraine_auth", "1");
        onVerified();
      } else {
        setError("密碼不對，再試試看 ～");
      }
    } catch {
      setError("連線有點問題，請稍後再試");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24, fontFamily: font,
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🧠✨</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4 }}>小腦袋日記</div>
      <div style={{ fontSize: 13, color: T.textLight, marginBottom: 32 }}>請輸入密碼繼續</div>
      <div style={{
        background: T.card, borderRadius: 24, padding: 28, boxShadow: T.shadow,
        border: `1px solid ${T.border}`, width: "100%", maxWidth: 340,
      }}>
        <input
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="輸入密碼…"
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 14,
            border: `2px solid ${error ? T.danger : T.border}`,
            fontSize: 16, fontFamily: font, color: T.text, outline: "none",
            background: T.bg, boxSizing: "border-box", marginBottom: 8,
          }}
        />
        {error && (
          <div style={{ fontSize: 13, color: T.danger, marginBottom: 10, textAlign: "center" }}>
            {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`,
            color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: font,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          }}>
          {loading ? "驗證中…" : "進入 💕"}
        </button>
      </div>
    </div>
  );
};

// ========== WARM MESSAGES ==========
const WARM_MESSAGES = [
  "辛苦了親愛的～頭痛很難受，記得多休息、讓自己好好放鬆 💕",
  "頭痛的時候最難熬了，你已經很努力了，先好好躺一會兒吧 🌸",
  "記得喝點水、關掉螢幕讓眼睛休息一下，你值得被好好照顧 🫧",
  "頭在鬧脾氣呢～深呼吸、把燈光調暗，小腦袋需要你的溫柔 🌙",
  "知道你在撐著，謝謝你還願意記錄下來。好好照顧自己 💗",
];

const WarmMessageCard = ({ onClose }) => {
  const msg = useMemo(() => WARM_MESSAGES[Math.floor(Math.random() * WARM_MESSAGES.length)], []);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(90,74,92,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 24,
    }}>
      <div style={{
        background: T.card, borderRadius: 24, padding: 28, maxWidth: 340, width: "100%",
        boxShadow: "0 8px 32px rgba(90,74,92,0.18)", textAlign: "center",
        animation: "fadeIn 0.3s ease",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌸</div>
        <div style={{ fontSize: 15, color: T.text, fontFamily: font, lineHeight: 1.8, marginBottom: 20 }}>
          {msg}
        </div>
        <button onClick={onClose} style={{
          padding: "10px 28px", borderRadius: 14, border: "none",
          background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`,
          color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: font, cursor: "pointer",
        }}>
          謝謝你 💕
        </button>
      </div>
    </div>
  );
};

// ========== CYCLE CALC ==========
const calcCycle = (lastPeriodDate) => {
  if (!lastPeriodDate) return null;
  const last = new Date(lastPeriodDate);
  const ovulation = new Date(last); ovulation.setDate(last.getDate() + 14);
  const nextPeriod = new Date(last); nextPeriod.setDate(last.getDate() + 28);
  const preStart = new Date(nextPeriod); preStart.setDate(nextPeriod.getDate() - 5);
  const fmt = (d) => d.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastD = new Date(last); lastD.setHours(0, 0, 0, 0);
  const menstrualEnd = new Date(lastD); menstrualEnd.setDate(lastD.getDate() + 7);
  let phase = "一般";
  if (today >= lastD && today < menstrualEnd) phase = "🩸 月經中";
  else if (today >= preStart && today < nextPeriod) phase = "🌙 經前期";
  else if (Math.abs(today - ovulation) <= 1.5 * 86400000) phase = "🌟 排卵期附近";
  return {
    ovulationStr: fmt(ovulation),
    nextPeriodStr: fmt(nextPeriod),
    preStartStr: fmt(preStart),
    phase,
    daysToNext: Math.ceil((nextPeriod - today) / 86400000),
  };
};

// ========== RECORD TAB ==========
const RecordTab = ({ onSave, initialLastPeriodDate }) => {
  const [form, setForm] = useState({
    headache: false,
    intensity: 5,
    location: [],
    neckPain: 3,
    neckSide: [],
    sleepHours: 7,
    sleepQuality: 3,
    lastPeriodDate: initialLastPeriodDate || "",
    stress: 2,
    sittingTime: "2-6hr",
    exercise: false,
    caffeine: false,
    waterOver1500: null,
    notes: "",
  });
  const [saved, setSaved] = useState(false);
  const [showWarm, setShowWarm] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const cycle = useMemo(() => calcCycle(form.lastPeriodDate), [form.lastPeriodDate]);

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    if (form.headache) setShowWarm(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const todayStr = new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" });

  return (
    <div>
      {showWarm && <WarmMessageCard onClose={() => setShowWarm(false)} />}

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
          <ToggleButton active={!form.headache} onClick={() => set("headache", false)} color={T.success} style={{ flex: 1 }}>
            😊 沒有頭痛
          </ToggleButton>
          <ToggleButton active={form.headache} onClick={() => set("headache", true)} color={T.danger} style={{ flex: 1 }}>
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
                multi value={form.location} onChange={v => set("location", v)}
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
        <SliderRow label="肩頸酸痛" emoji="🦴" value={form.neckPain} onChange={v => set("neckPain", v)} />
        {form.neckPain > 0 && (
          <div style={{ marginTop: -8, marginBottom: 14, animation: "fadeIn 0.2s ease" }}>
            <span style={{ fontSize: 13, color: T.textLight, fontFamily: font, display: "block", marginBottom: 6 }}>
              📍 酸痛側邊（可多選）
            </span>
            <EmojiSelector
              multi value={form.neckSide} onChange={v => set("neckSide", v)}
              options={[
                { value: "左側", label: "左側", emoji: "⬅️" },
                { value: "右側", label: "右側", emoji: "➡️" },
              ]}
            />
          </div>
        )}
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

      {/* Life Context */}
      <Card>
        <SectionLabel>生活狀態</SectionLabel>

        {/* 月經首日 */}
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: T.textLight, fontFamily: font, display: "block", marginBottom: 8 }}>
            🩸 最近月經首日
          </span>
          <input
            type="date"
            value={form.lastPeriodDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={e => set("lastPeriodDate", e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 12,
              border: `2px solid ${form.lastPeriodDate ? T.primary : T.border}`,
              fontSize: 14, fontFamily: font, color: T.text,
              background: T.bg, boxSizing: "border-box", outline: "none",
            }}
          />
          {cycle && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: T.textLight, fontFamily: font, marginBottom: 6 }}>
                目前週期狀態：<span style={{ fontWeight: 600, color: T.primary }}>{cycle.phase}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { label: "🌟 排卵期", val: cycle.ovulationStr, color: T.warm },
                  { label: "🌙 經前開始", val: cycle.preStartStr, color: T.accent },
                  {
                    label: "🩸 預估下次",
                    val: `${cycle.nextPeriodStr}（${cycle.daysToNext > 0 ? `${cycle.daysToNext}天後` : "快到了"}）`,
                    color: T.danger,
                  },
                ].map(item => (
                  <div key={item.label} style={{
                    background: item.color + "18", borderRadius: 10, padding: "5px 10px",
                    fontSize: 12, color: T.text, fontFamily: font,
                    border: `1px solid ${item.color}44`,
                  }}>
                    {item.label}：<strong>{item.val}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 壓力 */}
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: T.textLight, fontFamily: font, display: "block", marginBottom: 8 }}>😰 壓力程度</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ v: 1, e: "😌" }, { v: 2, e: "🙂" }, { v: 3, e: "😐" }, { v: 4, e: "😣" }, { v: 5, e: "🤯" }].map(({ v, e }) => (
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

        {/* 久坐 */}
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: T.textLight, fontFamily: font, display: "block", marginBottom: 8 }}>🪑 久坐時間</span>
          <EmojiSelector
            value={form.sittingTime} onChange={v => set("sittingTime", v)}
            options={[
              { value: "<2hr", label: "<2hr", emoji: "🏃" },
              { value: "2-6hr", label: "2-6hr", emoji: "🪑" },
              { value: ">6hr", label: ">6hr", emoji: "🧱" },
            ]}
          />
        </div>

        {/* 運動 + 咖啡因 */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <ToggleButton active={form.exercise} onClick={() => set("exercise", !form.exercise)} color={T.success} style={{ flex: 1 }}>
            {form.exercise ? "🏋️ 有運動" : "🛋 沒運動"}
          </ToggleButton>
          <ToggleButton active={form.caffeine} onClick={() => set("caffeine", !form.caffeine)} color={T.warm} style={{ flex: 1 }}>
            {form.caffeine ? "☕ 有咖啡因" : "🚫 無咖啡因"}
          </ToggleButton>
        </div>

        {/* 飲水超過 1500cc */}
        <div>
          <span style={{ fontSize: 13, color: T.textLight, fontFamily: font, display: "block", marginBottom: 8 }}>
            💧 今日飲水有超過 1500cc 嗎？
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { val: true, label: "✅ 有超過", color: T.success },
              { val: false, label: "❌ 不足", color: T.danger },
            ].map(opt => (
              <ToggleButton
                key={String(opt.val)}
                active={form.waterOver1500 === opt.val}
                onClick={() => set("waterOver1500", form.waterOver1500 === opt.val ? null : opt.val)}
                color={opt.color}
                style={{ flex: 1 }}
              >
                {opt.label}
              </ToggleButton>
            ))}
          </div>
        </div>
      </Card>

      {/* 備註 */}
      <Card>
        <SectionLabel>備註</SectionLabel>
        <textarea
          value={form.notes}
          onChange={e => set("notes", e.target.value)}
          placeholder="有什麼想記錄的都可以寫這裡…"
          rows={3}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 12,
            border: `2px solid ${form.notes ? T.primary : T.border}`,
            fontSize: 14, fontFamily: font, color: T.text, background: T.bg,
            resize: "vertical", boxSizing: "border-box", outline: "none",
            lineHeight: 1.6,
          }}
        />
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
    頭痛: r.intensity || 0,
    肩頸: r.neckPain || 0,
    睡眠: r.sleepHours || 0,
    壓力: (r.stress || 0) * 2,
    氣溫: r.weather_temp ?? null,
    氣壓: r.weather_pressure ?? null,
    天氣: r.weather_code ?? null,
  }));

  const hasWeather = last14.some(r => r.weather_temp != null);

  const headacheDays = records.filter(r => r.headache).length;
  const totalDays = records.length;
  const avgIntensity = headacheDays > 0
    ? (records.filter(r => r.headache).reduce((s, r) => s + r.intensity, 0) / headacheDays).toFixed(1)
    : 0;
  const avgSleep = totalDays > 0
    ? (records.reduce((s, r) => s + r.sleepHours, 0) / totalDays).toFixed(1)
    : 0;

  const CustomWeatherDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.天氣 == null || cx == null) return null;
    return (
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={13}>
        {wmoEmoji(payload.天氣)}
      </text>
    );
  };

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

      {/* Main Line Chart */}
      <Card>
        <SectionLabel>疼痛 & 睡眠趨勢（14 日）</SectionLabel>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.textLight }} />
            <YAxis tick={{ fontSize: 10, fill: T.textLight }} domain={[0, 10]} />
            <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: font, fontSize: 12 }} />
            <Line type="monotone" dataKey="頭痛" stroke={T.danger} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="肩頸" stroke={T.warm} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="睡眠" stroke={T.accent} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Weather Charts */}
      {hasWeather && (
        <>
          <Card>
            <SectionLabel>🌡️ 氣溫趨勢（14 日）</SectionLabel>
            <ResponsiveContainer width="100%" height={190}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.textLight }} />
                <YAxis tick={{ fontSize: 10, fill: T.textLight }} domain={["auto", "auto"]} unit="°C" />
                <Tooltip
                  formatter={(v) => [`${v}°C`, "氣溫"]}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: font, fontSize: 12 }}
                />
                <Area
                  type="monotone" dataKey="氣溫"
                  stroke="#FF8C42" fill="#FF8C4222" strokeWidth={2}
                  dot={<CustomWeatherDot />}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <SectionLabel>🌬️ 氣壓趨勢（14 日）</SectionLabel>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.textLight }} />
                <YAxis tick={{ fontSize: 10, fill: T.textLight }} domain={["auto", "auto"]} unit=" hPa" width={58} />
                <Tooltip
                  formatter={(v) => [`${v} hPa`, "氣壓"]}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: font, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="氣壓" stroke={T.accent} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 11, color: T.textLight, fontFamily: font, marginTop: 6, textAlign: "center" }}>
              氣壓急降時通常與頭痛發作有關，可對照上方趨勢圖觀察
            </div>
          </Card>
        </>
      )}

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

  const ruleInsights = (() => {
    if (records.length < 7) return [];
    const ha = records.filter(r => r.headache);
    const noHa = records.filter(r => !r.headache);
    const insights = [];

    const check = (label, emoji, tip, filterFn) => {
      const haN = ha.filter(filterFn).length;
      const noHaN = noHa.filter(filterFn).length;
      const total = haN + noHaN;
      if (total >= 2) insights.push({ trigger: label, rate: Math.round(haN / total * 100), emoji, tip });
    };

    check("睡眠不足 (<6hr)", "😴", "睡不夠的時候，小腦袋比較容易鬧脾氣喔～", r => r.sleepHours < 6);
    check("高壓力 (≥4)", "😣", "壓力大的日子，頭痛怪獸比較活躍呢…", r => r.stress >= 4);
    check("久坐 >6hr", "🪑", "坐太久肩膀會偷偷加班，記得站起來動一動！", r => r.sittingTime === ">6hr");
    check("咖啡因攝取", "☕", "咖啡和頭痛的關係有點微妙，觀察看看～", r => r.caffeine);
    check("飲水不足", "💧", "水喝不夠容易讓頭痛加劇，多補充水分吧～", r => r.waterOver1500 === false);

    insights.sort((a, b) => b.rate - a.rate);
    return insights;
  })();

  const weekCompare = (() => {
    const now = new Date();
    const thisWeek = records.filter(r => (now - new Date(r.date)) / 86400000 < 7);
    const lastWeek = records.filter(r => {
      const diff = (now - new Date(r.date)) / 86400000;
      return diff >= 7 && diff < 14;
    });
    if (thisWeek.length < 3 || lastWeek.length < 3) return null;
    const thisHa = thisWeek.filter(r => r.headache).length;
    const lastHa = lastWeek.filter(r => r.headache).length;
    const thisSleep = (thisWeek.reduce((s, r) => s + r.sleepHours, 0) / thisWeek.length).toFixed(1);
    const lastSleep = (lastWeek.reduce((s, r) => s + r.sleepHours, 0) / lastWeek.length).toFixed(1);
    return { thisHa, lastHa, thisSleep, lastSleep };
  })();

  const runAiAnalysis = async () => {
    setLoading(true);
    try {
      const last14 = records.slice(-14);
      const summary = last14.map(r =>
        `${r.date}: 頭痛=${r.headache ? `是(${r.intensity}/10,${Array.isArray(r.location) ? r.location.join("/") : ""})` : "無"} 肩頸=${r.neckPain}/10(${(r.neckSide || []).join("/") || "未記"}) 睡=${r.sleepHours}h(品質${r.sleepQuality}/5) 壓力=${r.stress}/5 久坐=${r.sittingTime} 運動=${r.exercise ? "有" : "無"} 咖啡因=${r.caffeine ? "有" : "無"} 飲水=${r.waterOver1500 === true ? "足" : r.waterOver1500 === false ? "不足" : "未記"} 氣溫=${r.weather_temp ?? "?"}°C 氣壓=${r.weather_pressure ?? "?"} ${r.notes ? `備註:${r.notes}` : ""}`
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

      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "ai_analysis", token: TOKEN, prompt }),
      });
      const data = await res.json();
      setAiResponse(data.text || data.error || "分析暫時無法完成，請稍後再試～");
    } catch {
      setAiResponse("🤖 AI 小助手暫時休息中…（請確認 GAS 連線設定）");
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 16, padding: "10px 0" }}>
        <div style={{ fontSize: 20, color: T.text, fontFamily: font, fontWeight: 600 }}>🧠 AI 洞察分析</div>
        <div style={{ fontSize: 13, color: T.textLight, fontFamily: font, marginTop: 4 }}>幫你找出自己沒發現的規律</div>
      </div>

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

      <Card>
        <SectionLabel>🤖 AI 小助手分析</SectionLabel>
        {aiResponse ? (
          <div style={{ fontSize: 14, color: T.text, fontFamily: font, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {aiResponse}
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <button onClick={runAiAnalysis} disabled={loading || records.length < 7}
              style={{
                padding: "12px 24px", borderRadius: 16, border: "none",
                background: records.length < 7 ? T.border : `linear-gradient(135deg, ${T.primary}, ${T.accent})`,
                color: records.length < 7 ? T.textLight : "#fff",
                fontSize: 14, fontWeight: 600, fontFamily: font,
                cursor: records.length < 7 ? "not-allowed" : "pointer", transition: "all 0.2s",
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
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem("migraine_auth"));
  const [tab, setTab] = useState("record");
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (!authed) return;
    if (DEMO_MODE) {
      setRecords(generateMockData());
    } else if (GAS_URL) {
      fetch(`${GAS_URL}?action=fetch&token=${TOKEN}`)
        .then(r => r.json())
        .then(d => setRecords(d.records || []))
        .catch(console.error);
    }
  }, [authed]);

  const initialLastPeriodDate = useMemo(() => {
    const withDate = records.filter(r => r.lastPeriodDate).sort((a, b) => b.date.localeCompare(a.date));
    if (withDate.length > 0) return withDate[0].lastPeriodDate;
    return localStorage.getItem("migraine_lastPeriodDate") || "";
  }, [records]);

  const handleSave = useCallback(async (form) => {
    const today = new Date().toISOString().split("T")[0];

    let weather = {};
    try {
      weather = await fetchWeather();
    } catch { /* weather is optional */ }

    const record = {
      date: today,
      headache: form.headache ? 1 : 0,
      intensity: form.headache ? form.intensity : 0,
      location: form.location,
      neckPain: form.neckPain,
      neckSide: form.neckSide,
      sleepHours: form.sleepHours,
      sleepQuality: form.sleepQuality,
      lastPeriodDate: form.lastPeriodDate,
      stress: form.stress,
      sittingTime: form.sittingTime,
      exercise: form.exercise ? 1 : 0,
      caffeine: form.caffeine ? 1 : 0,
      waterOver1500: form.waterOver1500,
      notes: form.notes,
      ...weather,
    };

    if (form.lastPeriodDate) {
      localStorage.setItem("migraine_lastPeriodDate", form.lastPeriodDate);
    }

    setRecords(prev => {
      const filtered = prev.filter(r => r.date !== today);
      return [...filtered, record].sort((a, b) => a.date.localeCompare(b.date));
    });

    if (GAS_URL && !DEMO_MODE) {
      fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "record", token: TOKEN, ...record }),
      }).catch(console.error);
    }
  }, []);

  if (!authed) {
    return <PasswordGate onVerified={() => setAuthed(true)} />;
  }

  const tabs = [
    { id: "record", label: "紀錄", emoji: "📝" },
    { id: "trends", label: "趨勢", emoji: "📊" },
    { id: "insights", label: "洞察", emoji: "🧠" },
  ];

  return (
    <div style={{
      fontFamily: font, background: T.bg, minHeight: "100vh",
      maxWidth: 480, margin: "0 auto", paddingBottom: 80,
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        input[type="range"] { -webkit-appearance: none; appearance: none; background: ${T.border}; border-radius: 4px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: ${T.primary}; cursor: pointer; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: ${T.bg}; }
        textarea { font-family: ${font}; }
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
        {tab === "record" && <RecordTab onSave={handleSave} initialLastPeriodDate={initialLastPeriodDate} />}
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
