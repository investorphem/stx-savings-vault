/* global BigInt */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { AppConfig, UserSession, showConnect, openContractCall } from "@stacks/connect";
import { StacksMainnet } from "@stacks/network";
import { 
  uintCV, 
  contractPrincipalCV,
  PostConditionMode, 
  FungibleConditionCode,
  makeStandardSTXPostCondition,
  callReadOnlyFunction, 
  cvToJSON 
} from "@stacks/transactions";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogOut, ArrowUpRight, Loader2, Coins, Clock, RefreshCw, 
  ShieldAlert, X, AlertTriangle, Info, BookOpen, 
  Lock, Scale, ShieldCheck, FileText, Share2, Trophy, ChevronDown, Wallet, Megaphone, Bell,
  Activity, Users, DollarSign, Key, Anchor
} from "lucide-react";

// ==========================================
// 1. CONFIGURATION & THEME
// ==========================================
const APP_VERSION = "11.1.0";
const IS_MAINTENANCE = false;

const ADMIN_ADDRESS = "SPYOURMAINNETADDRESSHERE"; 
const contractAddress = "SPYOURMAINNETADDRESSHERE"; 
const contractName = "stx-vault-v11"; // Upgraded to v11 for Iron Vault

const ADMIN_BROADCAST = {
  id: "broadcast-004",
  title: "Dual Vault Isolation Complete",
  message: "Flex and Iron vaults are now fully separated. Iron Vault durations are rigidly enforced for partner yield.",
  type: "success", 
  date: "Mar 26, 2026"
}

const theme = {
  primary: "#5546FF", bg: "#0B0E14", card: "#161B22", cardBorder: "#30363D",
  textMain: "#FFFFFF", textMuted: "#8B949E", danger: "#EF4444", warning: "#F59E0B", info: "#0EA5E9", success: "#10B981",
  iron: "#9CA3AF" // Specific color for Iron Vault
};

const ASSETS = {
  STX: { symbol: "STX", decimals: 1000000, isToken: false },
  USDA: { symbol: "USDA", decimals: 1000000, isToken: true, contract: "SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR", name: "usda-token" },
  WELSH: { symbol: "WELSH", decimals: 1000000, isToken: true, contract: "SP3NE50GEXFG9SZGTT51P40X2CKYSZ5CC4ZTZ7A2G", name: "welshcorgicoin-token" }
};

// Enforced Yield Cycles for Vault B
const IRON_DURATIONS = [
  { days: 30, label: "30 Days (1 Yield Cycle)" },
  { days: 90, label: "90 Days (3 Yield Cycles)" },
  { days: 180, label: "180 Days (6 Yield Cycles)" }
];

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

// ==========================================
// 2. STYLES 
// ==========================================
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", borderBottom: `1px solid ${theme.cardBorder}`, backgroundColor: "rgba(11,14,20,0.8)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 };
const cardStyle = { backgroundColor: theme.card, padding: "24px", borderRadius: "20px", border: `1px solid ${theme.cardBorder}` };
const gridContainer = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" };
const inputStyle = { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "10px", border: `1px solid ${theme.cardBorder}`, backgroundColor: "#000", color: "#fff", outline: "none", boxSizing: "border-box" };
const actionBtn = { width: "100%", padding: "14px", borderRadius: "10px", backgroundColor: theme.primary, color: "#fff", border: "none", fontWeight: "800", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" };
const actionBtnIron = { ...actionBtn, backgroundColor: theme.iron, color: "#000" };
const connectBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" };
const exitBtn = { backgroundColor: "rgba(239,68,68,0.1)", border: `1px solid ${theme.danger}44`, color: theme.danger, padding: "8px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center" };
const addressPill = { backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: "8px 12px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", color: theme.primary };
const badge = { color: theme.primary, border: `1px solid ${theme.primary}`, padding: "6px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: "900", marginBottom: "20px", display: "inline-block", letterSpacing: "1.5px" };
const heroBtn = { backgroundColor: theme.primary, color: "#fff", padding: "18px 48px", borderRadius: "14px", fontSize: "18px", fontWeight: "800", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center" };
const shareBtn = { width: "100%", padding: "12px", marginTop: "15px", borderRadius: "10px", backgroundColor: "#000", border: `1px solid ${theme.cardBorder}`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" };
const statusDotSmall = { width: "6px", height: "6px", borderRadius: "50%", marginRight: "8px" };
const pillStyle = { display: "flex", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: "100px", border: `1px solid ${theme.cardBorder}` };
const cardHead = { display: "flex", alignItems: "center", gap: "10px", margin: 0 };
const statRow = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" };
const statValue = { fontSize: "20px", fontWeight: "800" };
const historyRow = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "10px", marginBottom: "8px", textDecoration: "none", color: "inherit", fontSize: "13px", border: `1px solid ${theme.cardBorder}` };
const leaderRow = { display: "flex", justifyContent: "space-between", padding: "12px", borderBottom: `1px solid ${theme.cardBorder}`, fontSize: "13px" };
const footerStyle = { padding: "40px", borderTop: `1px solid ${theme.cardBorder}`, marginTop: "60px", display: "flex", justifyContent: "center" };
const tabContainer = { display: "flex", gap: "10px", padding: "6px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "14px", width: "fit-content", margin: "0 auto", border: `1px solid ${theme.cardBorder}` };
const activeTabStyle = { padding: "10px 24px", backgroundColor: theme.cardBorder, color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "0.2s" };
const inactiveTabStyle = { padding: "10px 24px", backgroundColor: "transparent", color: theme.textMuted, border: "none", borderRadius: "10px", fontWeight: "600", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "0.2s" };
const adminTabStyle = { padding: "10px 24px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: theme.danger, border: `1px solid ${theme.danger}44`, borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "0.2s" };
const selectDropdownStyle = { backgroundColor: "#000", color: theme.textMain, border: `1px solid ${theme.cardBorder}`, padding: "12px 30px", borderRadius: "10px", outline: "none", width: "100%", appearance: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px", marginBottom: "10px" };
const assetDropdownStyle = { backgroundColor: "#000", color: theme.textMain, border: `1px solid ${theme.cardBorder}`, padding: "8px 30px", borderRadius: "8px", outline: "none", width: "100%", appearance: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" };
const modalContent = { backgroundColor: theme.card, padding: "40px", borderRadius: "30px", border: `1px solid ${theme.cardBorder}`, textAlign: "center", maxWidth: "400px", width: "100%" };
const legalContent = { backgroundColor: theme.card, padding: "30px", borderRadius: "28px", maxWidth: "500px", width: "100%", border: `1px solid ${theme.cardBorder}`, textAlign: "left" };
const legalScrollArea = { height: "220px", overflowY: "auto", padding: "20px", backgroundColor: "#000", borderRadius: "12px", marginBottom: "20px", border: `1px solid ${theme.cardBorder}` };
const legalHeading = { fontSize: "14px", color: theme.primary, marginBottom: "8px", margin: 0 };
const legalText = { fontSize: "13px", color: theme.textMuted, marginBottom: "20px", lineHeight: "1.6" };
const confirmBtn = { flex: 1, padding: "14px", backgroundColor: theme.danger, color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer" };
const secondaryBtn = { flex: 1, padding: "14px", backgroundColor: "#30363D", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer" };
const dangerBtn = { backgroundColor: "transparent", color: theme.danger, border: `1px solid ${theme.danger}`, padding: "10px", borderRadius: "10px", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6x" };
const maintCard = { textAlign: "center", padding: "100px 20px", backgroundColor: theme.card, borderRadius: "30px", border: `1px solid ${theme.cardBorder}` };
const bellBtn = { background: "transparent", border: "none", cursor: "pointer", position: "relative", padding: "8px", display: "flex", alignItems: "center" };
const badgeStyle = { position: "absolute", top: "0px", right: "2px", backgroundColor: theme.danger, color: "#fff", fontSize: "1px", fontWeight: "900", height: "16px", width: "16px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", border: `2px solid ${theme.bg}` };
const notifDropdown = { position: "absolute", top: "45px", right: "-10px", width: "320px", backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", zIndex: 1000, overflow: "hidden" };
const notifItem = { padding: "12px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", marginBottom: "8px" };
const sectionTitle = { fontSize: "28px", fontWeight: "800", marginBottom: "30px", textAlign: "center", color: theme.textMain };
const iconBox = (color) => ({ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: `${color}1A`, display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "20px" });

const vaultTypeContainer = { display: "flex", backgroundColor:"#000", borderRadius: "12px", padding: "6px", marginBottom: "24px", border: `1px solid ${theme.cardBorder}` };
const vaultBtnActive = { flex: 1, padding: "12px", backgroudColor: theme.cardBorder, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px", transition: "0.2s" };
const vaultBtnInactive = { flex: 1, padding: "12px", backgroundColor: "transparent", color: theme.textMuted, border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13px", transition: "0.2s" };

// ==========================================
// 3. SUB-COMPONENTS
// ==========================================
const NetworkStatus = () => {
  const [net, setNet] = useState({ online: false, height: 0 });
  const check = useCallback(async () => {
    try {
      const res = await fetch("https://api.mainnet.hiro.so/v2/info");
      const data = await res.json();
      setNet({ online: true, height: data.stacks_tip_height })
    } catch { setNet({ online: false, height: 0 }); }
  }, []);
  useEffect(() => { check(); const i = setInterval(check, 30000); return () => clearInterval(i); }, [check]);
  return (
    <div style={pillStyle}>
      <div style={{ ...statusDotSmall, backgroundColor: net.online ? theme.success : theme.danger }} /
      <span style={{ fontSize: "11px", fontWeight: "700", color: theme.textMuted }}>{net.online ? `BLOCK #${net.height}` : "OFFLINE"}</span>
    </div>
  );
};

const KnowledgeBase = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const faqs = [
    { q: "What is the difference between Flex and Iron Vaults?", a: "Vault A (Flex) allows custom lock durations and an early emergency exit for a 10% penalty. Vault B (Iron) rigidly enforces specific duration cycles (30, 90, 180 days) to route funds securely to our yield partner. It cannot be unlocked early under any circumstances." },
    { q: "Why can't I choose my own days in Vault B?", a: "Because Vault B generates passive native yield, your assets are delegated to an institutional Stacking pool. These pools operate on strict blockchain cycles, so your lock times must mathematically align with them." },
    { q: "Is the multi-asset vault safe?", a: "Yes. STX Vault uses the official SIP-010 trait to securely interact with verified fungible tokens. Both vaults remain 100% non-custodial." }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "60px", padding: "20px 0" }}>
      <div>
        <h2 style={sectionTitle}>Multi-Asset Diamond Hands</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          <div style={cardStyle}>
            <div style={iconBox(theme.primary)}><Lock size={24} color={theme.primary} /></div>
            <h3 style={{ marginBottom: "12px", fontSize: "18px", margin: 0 }}>Dual Vault System</h3>
            <p style={{ color: theme.textMuted, fontSize: "14px", lineHeight: "1.6" }}>Choose the Flex Vault for a liquid escape hatch, or commit to the Iron Vault's strict cycles to maximize yield generation.</p>
          </div>
          <div style={cardStyle}>
            <div style={iconBox(theme.success)}><Anchor size={24} color={theme.success} /></div>
            <h3 style={{ marginBottom: "12px", fontSize: "18px", margin: 0 }}>Partner Yield Integration</h3>
            <p style={{ color: theme.textMuted, fontSize: "14px", lineHeight: "1.6" }}>Iron Vault duration rules are mathematically hardcoded to map perfectly with our institutional yield generation partners.</p>
          </div>
          <div style={cardStyle}>
            <div style={iconBox(theme.info)}><FileText size={24} color={theme.info} /></div>
            <h3 style={{ marginBottom: "12px", fontSize: "18px", margin: 0 }}>100% Non-Custodial</h3>
            <p style={{ color: theme.textMuted, fontSize: "14px", lineHeight: "1.6" }}>You retain total ownership. The protocol simply enforces the mathematical rules you set for yourself.</p>
          </div>
        </div>
      </div>
      <div>
        <h2 style={sectionTitle}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {faqs.map((faq, index) => (
            <div key={index} style={{ ...cardStyle, padding: "24px", cursor: "pointer" }} onClick={() => setOpenFaq(openFaq === index ? nll : index)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: "16px", margin: 0 }}>{faq.q}</h4>
                <ChevronDown size={20} style={{ transform: openFaq === index ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }} color={theme.textMuted} />
              </div>
              <AnimatePresence>
                {openFaq === index && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                    <p style={{ color: theme.textMuted, fontSize: "14px", marginTop: "16px", lineHeight: "1.6", margin: "16px 0 0 0" }}>{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Changelog = () => {
  const releases = [
    {
      version: "v11.1.0", date: "Mar 26, 2026", title: "Complete UI Data Isolation",
      changes: [ "Vault A (Flex) and Vault B (Iron) now track separate deposit statuses and transaction histories.", "Iron Vault now restricts users to exact yield cycles (30, 90, 180 days) for partner protocol mapping.", "Redesigned dashboard logic to prevent data overlap between vaults." ],
      benefit: "You get a crystal clear view of your liquid assets vs your strictly locked yield assets without the data tangling together."
    },
    {
      version: "v11.0.0", date: "Mar 26, 2026", title: "The Iron Vault (Vault B)",
      changes: [ "Introduced the Iron Vault for hardcore diamond hands.", "Separated Flex Vault (with early exit) from Iron Vault (strict lock).", "Prepared architecture for upcoming native Bitcoin (BTC) yield generation." ],
      benefit: "Maximize your discipline. Lock assets without the temptation of an emergency exit and prepare for future passive yield."
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px 0", maxWidth: "800px", margin: "0 auto" }}>
      <h2 style={{ ...sectionTitle, marginBottom: "10px" }}>Protocol Updates</h2>
      <p style={{ color: theme.textMuted, textAlign: "center", marginBottom: "30px", fontSize: "15px" }}>We constantly improve STX Vault. Here is a transparent look at what we are building for you.</p>
      {releases.map((release, index) => (
        <div key={index} style={{ ...cardStyle, padding: "30px", borderLeft: index === 0 ? `4px solid ${theme.primary}` : `1px solid ${theme.cardBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: "900", color: index === 0 ? theme.primary : theme.textMain }}>{release.version}</span>
                <span style={{ fontSize: "12px", color: theme.textMuted, backgroundColor: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "6px" }}>{release.date}</span>
              </div>
              <h3 style={{ fontSize: "20px", margin: 0 }}>{release.title}</h3>
            </div>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ fontSize: "12px", textTransform: "uppercase", color: theme.textMuted, letterSpacing: "1px", marginBottom: "10px", margin: "0 0 10px 0" }}>What Changed</h4>
            <ul style={{ margin: 0, paddingLeft: "20px", color: theme.textMain, fontSize: "14px", lineHeight: "1.6" }}>
              {release.changes.map((change, i) => <li key={i} style={{ marginBottom: "6px" }}>{change}</li>)}
            </ul>
          </div>
          <div style={{ backgroundColor: "rgba(16, 185, 129, 0.05)", padding: "16px", borderRadius: "12px", border: `1px solid ${theme.success}33` }}>
            <h4 style={{ fontSize: "12px", textTransform: "uppercase", color: theme.success, letterSpacing: "1px", display: "flex", alignItems: "center", gap: "6px", margin: "0 0 6px 0" }}>User Benefit</h4>
            <p style={{ margin: 0, color: theme.textMuted, fontSize: "13px", lineHeight: "1.5" }}>{release.benefit}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminPanel = ({ history }) => {
  const emergencyExits = history.filter(tx => tx.contract_call && tx.contract_call.function_name.includes("emergency-withdraw"));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: "900", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "10px" }}><Key color={theme.danger} size={28}/> CEO Mission Control</h2>
          <p style={{ color: theme.textMuted, margin: 0, fontSize: "14px" }}>Protocol metrics and revenue tracking.</p>
        </div>
        <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "8px 16px", borderRadius: "100px", border: `1px solid ${theme.danger}44`, color: theme.danger, fontSize: "12px", fontWeight: "800" }}>ADMIN ACCESS VERIFIED</div>
      </div>

      <div style={gridContainer}>
        <div style={{ ...cardStyle, borderTop: `4px solid ${theme.primary}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={iconBox(theme.primary)}><Users size={20} color={theme.primary}/></div>
            <h4 style={{ margin: 0, fontSize: "14px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Total Network Txs</h4>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{history.length} <span style={{fontSize: "14px", color: theme.textMuted, fontWeight: "500"}}>Last 50 Blocks</span></div>
        </div>

        <div style={{ ...cardStyle, borderTop: `4px solid ${theme.danger}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={iconBox(theme.danger)}><Activity size={20} color={theme.danger}/></div>
            <h4 style={{ margin: 0, fontSize: "14px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Rage-Quits Logged</h4>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{emergencyExits.length} <span style={{fontSize: "14px", color: theme.textMuted, fontWeight: "500"}}>Penalties Collected</span></div>
        </div>

        <div style={{ ...cardStyle, borderTop: `4px solid ${theme.success}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={iconBox(theme.success)}><DollarSign size={20} color={theme.success}/></div>
            <h4 style={{ margin: 0, fontSize: "14px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Estimated Revenue</h4>
          </div>
          <div style={{ fontSize: "24px", fontWeight: "900", color: theme.success }}>Multi-Asset Routing...</div>
          <p style={{ fontSize: "12px", color: theme.textMuted, margin: "8px 0 0 0" }}>Check Stacks Explorer for precise SIP-010 admin wallet balances.</p>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={cardHead}><Activity size={20} color={theme.info}/> Penalty Log Feed</h3>
        {emergencyExits.length === 0 ? <div style={{ color: theme.textMuted, fontSize: "13px" }}>No early exits recorded in recent history.</div> : 
          emergencyExits.map((tx, index) => (
            <div key={index} style={historyRow}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", color: theme.textMain }}>
                <AlertTriangle size={14} color={theme.danger}/> {tx.sender_address.substring(0,6)}...{tx.sender_address.slice(-4)}
              </span>
              <span style={{color:theme.danger, fontSize: "12px", fontWeight: "bold" }}>FEE COLLECTED</span>
            </div>
          ))
        }
      </div>
    </div>
  );
};

// ==========================================
// 4. MAIN APP COMPONENT
// ==========================================
function App() {
  const [userData, setUserData] = useState(null);
  const [dynamicAssets, setDynamicAssets] = useState({ STX: { symbol: "STX", decimals: 1000000, isToken: false, balance: 0 } });
  
  // Isolated Vault States
  const [vaultType, setVaultType] = useState("flex"); 
  const [flexAsset, setFlexAsset] = useState("STX");
  const [ironAsset, setIronAsset] = useState("STX"); // Usually STX only for native yield, but keeping dynamic
  
  const [flexVaultData, setFlexVaultData] = useState({ amount: 0, unlock: 0 });
  const [ironVaultData, setIronVaultData] = useState({ amount: 0, unlock: 0 });
  
  const [flexAmount, setFlexAmount] = useState("");
  const [flexLockDays, setFlexLockDays] = useState("");
  
  const [ironAmount, setIronAmount] = useState("");
  const [ironLockDuration, setIronLockDuration] = useState("90"); // Default 90 day cycle
  
  const [networkHeight, setNetworkHeight] = useState(0); 
  const [history, setHistory] = useState([]);
  const [isPending, setIsPending] = useState(false);
  const [txId, setTxId] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [activeTab, setActiveTab] = useState("vault");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const isAdmin = userData?.profile?.stxAddress?.mainnet === ADMIN_ADDRESS;

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifications(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifRef]);

  useEffect(() => {
    const savedNotifs = JSON.parse(localStorage.getItem("vault_notifs") || "[]");
    let currentNotifs = [...savedNotifs];
    if (!currentNotifs.find(n => n.id === ADMIN_BROADCAST.id)) {
      currentNotifs.unshift({ ...ADMIN_BROADCAST, isRead: false });
    }
    setNotifications(currentNotifs);
    setUnreadCount(currentNotifs.filter(n => !n.isRead).length);

    if (userSession.isUserSignedIn()) {
      const user = userSession.loadUserData();
      setUserData(user);
      const address = user.profile.stxAddress.mainnet;
      fetchWalletBalances(address);
      fetchHistory(address);
      fetchNetworkHeight();
    }
  }, []);

  // Fetch Data for BOTH vaults independently whenever asset selection changes
  useEffect(() => {
    if (userData) {
      const address = userData.profile.stxAddress.mainnet;
      if (dynamicAssets[flexAsset]) fetchVaultStatus(address, flexAsset, "flex");
      if (dynamicAssets[ironAsset]) fetchVaultStatus(address, ironAsset, "iron");
    }
  }, [flexAsset, ironAsset, userData, dynamicAssets]);

  const fetchNetworkHeight = async () => {
    try {
      const res = await fetch("https://api.mainnet.hiro.so/v2/info");
      const data = await res.json();
      setNetworkHeight(data.stacks_tip_height);
    } catch (e) { console.error(e); }
  };

  const addNotification = (notif) => {
    setNotifications(prev => {
      if (prev.find(n => n.id === notif.id)) return prev;
      const newNotifs = [{ ...notif, date: new Date().toLocaleDateString(), isRead: false }, ...prev].slice(0, 10);
      localStorage.setItem("vault_notifs", JSON.stringify(newNotifs));
      setUnreadCount(newNotifs.filter(n => !n.isRead).length);
      return newNotifs;
    });
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    setUnreadCount(0);
    localStorage.setItem("vault_notifs", JSON.stringify(updated));
  };

  const fetchWalletBalances = async (address) => {
    try {
      const res = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/balances`);
      const data = await res.json();
      
      const stxBal = Number(data.stx.balance) / 1000000;
      const parsedAssets = { STX: { symbol: "STX", decimals: 1000000, isToken: false, balance: stxBal } };

      if (data.fungible_tokens) {
        Object.keys(data.fungible_tokens).forEach(key => {
          const balanceMicro = Number(data.fungible_tokens[key].balance);
          if (balanceMicro > 0) {
            const [contractStr, tokenName] = key.split('::');
            const [contract, name] = contractStr.split('.');
            let symbol = tokenName.toUpperCase();
            if (symbol.length > 8) symbol = symbol.substring(0, 8); 
            parsedAssets[symbol] = { symbol, decimals: 1000000, isToken: true, contract, name, balance: balanceMicro / 1000000 };
          }
        });
      }
      setDynamicAssets(parsedAssets);
      if (!parsedAssets[flexAsset] && flexAsset !== "STX") setFlexAsset("STX");
      if (!parsedAssets[ironAsset] && ironAsset !== "STX") setIronAsset("STX");
    } catch (e) { console.error("Balance fetch error:", e); }
  };

  const fetchVaultStatus = async (address, assetSymbol, type) => {
    const asset = dynamicAssets[assetSymbol] || dynamicAssets["STX"];
    if (!asset) return;

    try {
      // Assuming v11 contract separates flex and iron getters
      let functionName = type === "flex" ? "get-flex-stx-status" : "get-iron-stx-status";
      let functionArgs = [uintCV(address)];

      if (asset.isToken) {
        functionName = type === "flex" ? "get-flex-token-status" : "get-iron-token-status";
        functionArgs = [uintCV(address), contractPrincipalCV(asset.contract, asset.name)];
      }

      const result = await callReadOnlyFunction({
        network: new StacksMainnet(), contractAddress, contractName, functionName, functionArgs, senderAddress: address,
      });
      
      const json = cvToJSON(result);
      if (json?.value) {
        const payload = { amount: Number(json.value.amount.value) / asset.decimals, unlock: Number(json.value["unlock-block"].value) };
        type === "flex" ? setFlexVaultData(payload) : setIronVaultData(payload);
      } else {
        type === "flex" ? setFlexVaultData({ amount: 0, unlock: 0 }) : setIronVaultData({ amount: 0, unlock: 0 });
      }
    } catch (e) { 
      // Fails silently if contract hasn't upgraded to v11 yet
      type === "flex" ? setFlexVaultData({ amount: 0, unlock: 0 }) : setIronVaultData({ amount: 0, unlock: 0 });
    }
  };

  const fetchHistory = async (address) => {
    try {
      const res = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/transactions?limit=20`);
      const data = await res.json();
      const filtered = data.results.filter(tx => JSON.stringify(tx).includes(contractName));
      setHistory(filtered);
    } catch (e) { console.error(e); }
  };

  const handleConnect = () => {
    showConnect({ userSession, appDetails: { name: "STX Vault", icon: window.location.origin + "/logo192.png" }, onFinish: () => window.location.reload() });
  };

  const handleDeposit = async (type) => {
    const isFlex = type === "flex";
    const targetAsset = isFlex ? flexAsset : ironAsset;
    const targetAmount = isFlex ? flexAmount : ironAmount;
    const targetDays = isFlex ? flexLockDays : ironLockDuration;
    
    const asset = dynamicAssets[targetAsset];
    if (!targetAmount || !userData || !asset) return;
    setIsPending(true);
    
    const amountMicro = BigInt(Math.floor(Number(targetAmount) * asset.decimals));
    const address = userData.profile.stxAddress.mainnet;

    try {
      // Direct routing based on vault isolation
      let functionName = isFlex ? "deposit-flex-stx" : "deposit-iron-stx";
      let functionArgs = [uintCV(amountMicro), uintCV(Math.floor(Number(targetDays) * 144))];
      let postConditions = [];

      if (!asset.isToken) {
        postConditions = [makeStandardSTXPostCondition(address, FungibleConditionCode.Equal, amountMicro)];
      } else {
        functionName = isFlex ? "deposit-flex-token" : "deposit-iron-token";
        functionArgs = [uintCV(amountMicro), uintCV(Math.floor(Number(targetDays) * 144)), contractPrincipalCV(asset.contract, asset.name)];
      }

      await openContractCall({
        network: new StacksMainnet(), contractAddress, contractName, functionName, functionArgs, postConditions,
        postConditionMode: asset.isToken ? PostConditionMode.Allow : PostConditionMode.Deny,
        onFinish: (data) => {
          setTxId(data.txId);
          addNotification({ id: data.txId, title: `Secured in ${isFlex ? 'Flex' : 'Iron'} Vault ⏳`, message: `Locking ${targetAmount} ${targetAsset}.`, type: "info" });
        },
      });
    } catch (e) { console.error(e); } finally { setIsPending(false); }
  };

  const executeWithdrawal = async (emergency, type) => {
    setShowConfirm(false); setIsPending(true);
    const isFlex = type === "flex";
    const targetAsset = isFlex ? flexAsset : ironAsset;
    const asset = dynamicAssets[targetAsset];
    if (!asset) return;

    try {
      let functionName = emergency ? "emergency-withdraw-flex-stx" : (isFlex ? "withdraw-flex-stx" : "withdraw-iron-stx");
      let functionArgs = [];

      if (asset.isToken) {
        functionName = emergency ? "emergency-withdraw-flex-token" : (isFlex ? "withdraw-flex-token" : "withdraw-iron-token");
        functionArgs = [contractPrincipalCV(asset.contract, asset.name)];
      }

      await openContractCall({
        network: new StacksMainnet(), contractAddress, contractName, functionName, functionArgs,
        postConditionMode: PostConditionMode.Allow, 
        onFinish: (data) => {
          setTxId(data.txId);
          addNotification({ id: data.txId, title: "Withdrawal Initiated 💸", message: `Transaction broadcasted to Stacks network.`, type: "success" });
        },
      });
    } catch (e) { console.error(e); } finally { setIsPending(false); }
  };

  const shareToX = () => {
    const text = `Secured my assets in the @STXVault! 💎🙌 Enforcing my diamond hands on @Stacks. #Bitcoin #DeFi`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const resetToHome = () => { setTxId(""); setFlexAmount(""); setIronAmount(""); setActiveTab("vault"); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const userAddress = userData?.profile?.stxAddress?.mainnet;

  // Filter Data Arrays for UI Isolation
  const flexHistory = history.filter(tx => tx.contract_call && !tx.contract_call.function_name.includes("iron"));
  const ironHistory = history.filter(tx => tx.contract_call && tx.contract_call.function_name.includes("iron"));

  // --- RENDER HELPERS ---
  const renderFlexVault = () => {
    const currentAssetObj = dynamicAssets[flexAsset] || dynamicAssets["STX"];
    return (
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={gridContainer}>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <h3 style={cardHead}><ShieldCheck size={20} color={theme.success}/> Vault A Status</h3>
              <div style={{ position: "relative", width: "140px" }}>
                <Wallet size={14} color={theme.textMuted} style={{ position: "absolute", left: "10px", top: "12px", pointerEvents: "none" }} />
                <select value={flexAsset} onChange={(e) => setFlexAsset(e.target.value)} style={assetDropdownStyle}>
                  {Object.keys(dynamicAssets).map(key => <option key={key} value={key}>{key}</option>)}
                </select>
                <ChevronDown size={14} color={theme.textMuted} style={{ position: "absolute", right: "10px", top: "12px", pointerEvents: "none" }} />
              </div>
            </div>
            <div style={statRow}><Coins color={theme.primary}/><div style={statValue}>{flexVaultData.amount} {flexAsset}</div></div>
            <div style={statRow}><Clock color={theme.primary}/><div style={statValue}>Block #{flexVaultData.unlock || "0"}</div></div>
            {flexVaultData.amount > 0 && <button onClick={shareToX} style={shareBtn}><Share2 size={16}/> Brag on X</button>}
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={cardHead}>Manage Flex Vault</h3>
              <span style={{ fontSize: "12px", color: theme.success, fontWeight: "700" }}>Avail: {currentAssetObj.balance.toLocaleString()} {flexAsset}</span>
            </div>
            <input type="number" placeholder={`Amount (${flexAsset})`} value={flexAmount} onChange={e=>setFlexAmount(e.target.value)} style={inputStyle}/>
            <input type="number" placeholder="Custom Days to Lock" value={flexLockDays} onChange={e=>setFlexLockDays(e.target.value)} style={inputStyle}/>
            <button onClick={() => handleDeposit("flex")} disabled={isPending} style={actionBtn}>
              {isPending ? <Loader2 className="animate-spin"/> : `Secure ${flexAsset}`}
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
              <button onClick={()=>executeWithdrawal(false, "flex")} style={secondaryBtn}>Standard Exit</button>
              <button onClick={()=>setShowConfirm(true)} style={dangerBtn}><ShieldAlert size={14}/> Early Exit</button>
            </div>
          </div>
        </div>

        <div style={gridContainer}>
          <div style={cardStyle}>
            <h3 style={cardHead}><RefreshCw size={20} color={theme.info}/> Flex Activity</h3>
            {flexHistory.length === 0 ? <div style={{ color: theme.textMuted, fontSize: "13px" }}>No recent Flex vault activity.</div> : 
              flexHistory.map((tx, index) => (
                <div key={index} style={historyRow}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {tx.contract_call.function_name.includes("deposit") ? <ArrowUpRight size={14} color={theme.success}/> : <LogOut size={14} color={theme.warning}/>}
                    {tx.contract_call.function_name.replace("-stx","").replace("-token", "").replace("-flex", "")}
                  </span>
                  <a href={`https://explorer.hiro.so/txid/${tx.tx_id}`} target="_blank" rel="noreferrer" style={{color:theme.success, fontSize: "11px", fontWeight: "bold", textDecoration: "none" }}>CONFIRMED</a>
                </div>
              ))
            }
          </div>
          <div style={cardStyle}>
            <h3 style={cardHead}><Trophy size={20} color={theme.warning}/> Flex Top Savers</h3>
            <div style={leaderRow}><span>1. SP2J...X7R4</span><strong>25,400 STX</strong></div>
            <div style={leaderRow}><span>2. SP3M...9QW2</span><strong>18,250 STX</strong></div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderIronVault = () => {
    const currentAssetObj = dynamicAssets[ironAsset] || dynamicAssets["STX"];
    return (
      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={gridContainer}>
          <div style={{...cardStyle, borderTop: `4px solid ${theme.iron}`}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <h3 style={cardHead}><ShieldCheck size={20} color={theme.iron}/> Vault B Status</h3>
              <div style={{ position: "relative", width: "140px" }}>
                <Wallet size={14} color={theme.textMuted} style={{ position: "absolute", left: "10px", top: "12px", pointerEvents: "none" }} />
                <select value={ironAsset} onChange={(e) => setIronAsset(e.target.value)} style={assetDropdownStyle}>
                  {Object.keys(dynamicAssets).map(key => <option key={key} value={key}>{key}</option>)}
                </select>
                <ChevronDown size={14} color={theme.textMuted} style={{ position: "absolute", right: "10px", top: "12px", pointerEvents: "none" }} />
              </div>
            </div>
            <div style={statRow}><Coins color={theme.iron}/><div style={statValue}>{ironVaultData.amount} {ironAsset}</div></div>
            <div style={statRow}><Clock color={theme.iron}/><div style={statValue}>Block #{ironVaultData.unlock || "0"}</div></div>
            {ironVaultData.amount > 0 && <button onClick={shareToX} style={shareBtn}><Share2 size={16}/> Brag on X</button>}
          </div>

          <div style={{...cardStyle, borderTop: `4px solid ${theme.iron}`}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={cardHead}>Manage Iron Vault</h3>
              <span style={{ fontSize: "12px", color: theme.success, fontWeight: "700" }}>Avail: {currentAssetObj.balance.toLocaleString()} {ironAsset}</span>
            </div>
            <input type="number" placeholder={`Amount (${ironAsset})`} value={ironAmount} onChange={e=>setIronAmount(e.target.value)} style={inputStyle}/>
            
            {/* ENFORCED DURATION SELECTOR FOR YIELD PARTNER */}
            <div style={{ position: "relative", width: "100%" }}>
                <select value={ironLockDuration} onChange={(e) => setIronLockDuration(e.target.value)} style={selectDropdownStyle}>
                    {IRON_DURATIONS.map(cycle => (
                        <option key={cycle.days} value={cycle.days}>{cycle.label}</option>
                    ))}
                </select>
                <ChevronDown size={14} color={theme.textMuted} style={{ position: "absolute", right: "14px", top: "16px", pointerEvents: "none" }} />
            </div>

            <button onClick={() => handleDeposit("iron")} disabled={isPending} style={actionBtnIron}>
              {isPending ? <Loader2 className="animate-spin"/> : `Lock & Yield ${ironAsset}`}
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
              <button onClick={()=>executeWithdrawal(false, "iron")} style={secondaryBtn}>Standard Exit</button>
              <div style={{ padding: "10px", backgroundColor: "rgba(156, 163, 175, 0.1)", border: `1px solid ${theme.iron}44`, borderRadius: "10px", color: theme.iron, fontSize: "11px", textAlign: "center", lineHeight: "1.4" }}>
                <strong>🔒 Iron Vault Active:</strong> Emergency exits are disabled. Duration cycles are rigidly enforced for partner yield integration.
              </div>
            </div>
          </div>
        </div>

        <div style={gridContainer}>
          <div style={{...cardStyle, borderTop: `4px solid ${theme.iron}`}}>
            <h3 style={cardHead}><RefreshCw size={20} color={theme.info}/> Iron Activity</h3>
            {ironHistory.length === 0 ? <div style={{ color: theme.textMuted, fontSize: "13px" }}>No recent Iron vault activity.</div> : 
              ironHistory.map((tx, index) => (
                <div key={index} style={historyRow}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {tx.contract_call.function_name.includes("deposit") ? <ArrowUpRight size={14} color={theme.success}/> : <LogOut size={14} color={theme.warning}/>}
                    {tx.contract_call.function_name.replace("-stx","").replace("-token", "").replace("-iron", "")}
                  </span>
                  <a href={`https://explorer.hiro.so/txid/${tx.tx_id}`} target="_blank" rel="noreferrer" style={{color:theme.success, fontSize: "11px", fontWeight: "bold", textDecoration: "none" }}>CONFIRMED</a>
                </div>
              ))
            }
          </div>
          <div style={{...cardStyle, borderTop: `4px solid ${theme.iron}`}}>
            <h3 style={cardHead}><Trophy size={20} color={theme.warning}/> Iron Top Yielders</h3>
            <div style={leaderRow}><span>1. SP3M...9QW2</span><strong>32,000 STX</strong></div>
            <div style={leaderRow}><span>2. SP2J...X7R4</span><strong>14,100 STX</strong></div>
          </div>
        </div>
      </motion.div>
    );
  };

  let mainContent;
  if (IS_MAINTENANCE) {
    mainContent = (
      <div style={maintCard}><Loader2 className="animate-spin" size={40} color={theme.warning}/><h1 style={{marginTop:"20px"}}>Upgrading Protocol...</h1><p>Funds are safe on-chain.</p></div>
    );
  } else if (!userData) {
    mainContent = (
      <div style={{ display: "flex", flexDirection: "column", gap: "60px" }}>
        <div style={{ textAlign: "center", paddingTop: "60px", paddingBottom: "40px" }}>
          <div style={badge}>TRUST-FIRST DEFI</div>
          <h1 style={{ fontSize: "64px", fontWeight: "900", lineHeight: "1.1", marginBottom: "20px", margin: "0 0 20px 0" }}>Save Assets with <br/><span style={{ color: theme.primary }}>Institutional Security.</span></h1>
          <p style={{ color: theme.textMuted, marginBottom: "40px", fontSize: "18px", maxWidth: "600px", margin: "0 auto 40px", lineHeight: "1.6" }}>Secure your STX and SIP-010 tokens using time-locked smart contracts.</p>
          <button onClick={handleConnect} style={heroBtn}>Enter the Vault <ArrowUpRight size={22} style={{ marginLeft: "8px" }} /></button>
        </div>
        <KnowledgeBase />
      </div>
    );
  } else {
    mainContent = (
      <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
        <div style={tabContainer}>
          <button onClick={() => setActiveTab("vault")} style={activeTab === "vault" ? activeTabStyle : inactiveTabStyle}><ShieldCheck size={16} /> Dashboard</button>
          <button onClick={() => setActiveTab("guide")} style={activeTab === "guide" ? activeTabStyle : inactiveTabStyle}><BookOpen size={16} /> Guide & FAQ</button>
          <button onClick={() => setActiveTab("updates")} style={activeTab === "updates" ? activeTabStyle : inactiveTabStyle}><Megaphone size={16} /> Updates</button>
          {isAdmin && <button onClick={() => setActiveTab("admin")} style={activeTab === "admin" ? adminTabStyle : { ...adminTabStyle, backgroundColor: "transparent" }}><Key size={16} /> Admin</button>}
        </div>

        {activeTab === "guide" && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><KnowledgeBase /></motion.div>}
        {activeTab === "updates" && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><Changelog /></motion.div>}
        {activeTab === "admin" && isAdmin && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><AdminPanel history={history} /></motion.div>}

        {activeTab === "vault" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={vaultTypeContainer}>
              <button onClick={() => setVaultType("flex")} style={vaultType === "flex" ? vaultBtnActive : vaultBtnInactive}>Vault A: Flex (10% Penalty Exit)</button>
              <button onClick={() => setVaultType("iron")} style={vaultType === "iron" ? {...vaultBtnActive, backgroundColor: theme.cardBorder} : vaultBtnInactive}>Vault B: Iron (Locked + Yield)</button>
            </div>
            {vaultType === "flex" ? renderFlexVault() : renderIronVault()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", color: theme.textMain, fontFamily: "'Inter', sans-serif" }}>
      <header style={headerStyle}>
        <div onClick={resetToHome} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
          <img src="/logo192.png" alt="L" style={{ width: "32px", borderRadius: "8px" }} />
          <span style={{ fontWeight: "900", fontSize: "20px" }}>STX VAULT</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div ref={notifRef} style={{ position: "relative" }}>
            <button onClick={() => { setShowNotifications(!showNotifications); if(unreadCount > 0) markAllRead(); }} style={bellBtn}>
              <Bell size={20} color={theme.textMain} />
              {unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} style={notifDropdown}>
                  <div style={{ padding: "16px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0, fontSize: "16px" }}>Notifications</h4>
                    {unreadCount > 0 && <span style={{ fontSize: "12px", color: theme.primary, cursor: "pointer" }} onClick={markAllRead}>Mark all read</span>}
                  </div>
                  <div style={{ maxHeight: "300px", overflowY: "auto", padding: "10px" }}>
                    {notifications.length === 0 ? <p style={{ textAlign: "center", color: theme.textMuted, fontSize: "13px", padding: "20px 0" }}>No new alerts.</p> : 
                      notifications.map(n => (
                        <div key={n.id} style={{ ...notifItem, borderLeft: `3px solid ${theme[n.type] || theme.info}`, opacity: n.isRead ? 0.7 : 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <strong style={{ fontSize: "13px", color: theme.textMain }}>{n.title}</strong>
                            <span style={{ fontSize: "11px", color: theme.textMuted }}>{n.date}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "12px", color: theme.textMuted, lineHeight: "1.4" }}>{n.message}</p>
                        </div>
                      ))
                    }
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <NetworkStatus />
          {!userData ? <button onClick={handleConnect} style={connectBtn}>Connect</button> : 
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={addressPill}>{userAddress.substring(0,5)}...{userAddress.slice(-4)}</div>
              <button onClick={() => { userSession.signUserOut(); window.location.reload(); }} style={exitBtn}><LogOut size={16}/></button>
            </div>
          }
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        {mainContent}
      </main>

      <footer style={footerStyle}>
        <div style={{ display: "flex", gap: "30px", color: theme.textMuted, fontSize: "13px", alignItems: "center" }}>
          <span onClick={()=>setShowLegal(true)} style={{cursor:"pointer", display: "flex", alignItems: "center", gap: "6px"}}><Scale size={14}/> Terms & Privacy</span>
          <span>© 2026 STX Vault v{APP_VERSION}</span>
        </div>
      </footer>

      <AnimatePresence>
        {showConfirm && (
          <div style={modalOverlay}>
            <motion.div initial={{scale:0.9, opacity: 0}} animate={{scale:1, opacity: 1}} exit={{scale:0.9, opacity: 0}} style={modalContent}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "15px" }}><AlertTriangle size={40} color={theme.warning} /></div>
              <h2 style={{ marginBottom: "10px", margin: "0 0 10px 0" }}>Emergency Withdrawal?</h2>
              <p style={{ color: theme.textMuted, fontSize: "14px", lineHeight: "1.5" }}>Bypassing the lock timer incurs a <strong style={{color: theme.danger}}>10% protocol fee</strong>.</p>
              <div style={{display:"flex", gap:"10px", marginTop:"20px"}}>
                <button onClick={()=>setShowConfirm(false)} style={secondaryBtn}>Cancel</button>
                <button onClick={()=>executeWithdrawal(true, "flex")} style={confirmBtn}>Withdraw Now</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLegal && (
          <div style={modalOverlay}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={legalContent}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "800", margin: 0 }}>Terms & Privacy</h2>
                <X size={20} style={{ cursor: "pointer", color: theme.textMuted }} onClick={() => setShowLegal(false)} />
              </div>
              <div style={legalScrollArea}>
                <h4 style={legalHeading}>1. Non-Custodial Protocol</h4>
                <p style={legalText}>STX Vault is a decentralized smart-contract tool. We never hold your private keys. You are solely responsible for your wallet's security and access.</p>
                <h4 style={legalHeading}>2. Penalty Transparency</h4>
                <p style={legalText}>By utilizing the "Early Exit" or Emergency Withdrawal function in the Flex Vault, you explicitly agree to a 10% protocol fee deducted from your principal amount.</p>
                <h4 style={legalHeading}>3. Yield Partner Enforcement</h4>
                <p style={legalText}>Iron Vault deposits are strictly locked into designated duration cycles. These cannot be accessed early under any circumstance.</p>
              </div>
              <button onClick={() => setShowLegal(false)} style={actionBtn}>I Understand & Accept</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
