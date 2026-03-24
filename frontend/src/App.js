/* global BigInt */
// ... imports stay the same ...

function App() {
  // ... existing states ...
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Wrap your fetch logic in a way we can trigger it easily
  const refreshData = useCallback(async () => {
    if (!userData) return;
    setIsRefreshing(true);
    await fetchVaultStatus(userData.profile.stxAddress.mainnet);
    
    // If the amount changed, we can assume the transaction confirmed
    setIsRefreshing(false);
  }, [userData, fetchVaultStatus]);

  // 2. AUTO-REFRESH LOGIC
  useEffect(() => {
    let interval;
    if (userData) {
      // Poll every 30 seconds to update the UI with new block heights/balances
      interval = setInterval(() => {
        refreshData();
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [userData, refreshData]);

  // 3. TRIGGER REFRESH ON TRANSACTION FINISH
  // Update your handleDeposit and handleWithdraw 'onFinish' to trigger a check
  // (Though the blockchain takes time, this starts the polling immediately)

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ... Header stays the same ... */}

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        {userData && (
          <div style={{ maxWidth: "1000px", width: "100%" }}>
            
            {/* --- REFRESH INDICATOR --- */}
            <div style={{ textAlign: "right", marginBottom: "10px" }}>
              <button 
                onClick={refreshData}
                style={{ background: "none", border: "none", color: theme.textMuted, cursor: "pointer", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
              >
                <Loader2 size={14} className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "Updating..." : "Last updated just now"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "30px" }}>
              {/* --- STATS CARD (Now with dynamic progress) --- */}
              <div style={cardStyle}>
                <h3 style={cardTitle}>Your Holdings</h3>
                <div style={statBox}>
                   <Coins size={24} color={theme.primary} />
                   <div>
                     <p style={statLabel}>Locked Balance</p>
                     <p style={statValue}>{vaultData.amount.toLocaleString()} STX</p>
                   </div>
                </div>
                <div style={statBox}>
                   <Clock size={24} color={theme.primary} />
                   <div>
                     <p style={statLabel}>Unlock Block</p>
                     <p style={statValue}>#{vaultData.unlock || "---"}</p>
                   </div>
                </div>
                {/* Visual indicator of "Pending" state */}
                {txId && status === "Broadcasted!" && (
                  <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#FFFBEB", borderRadius: "10px", border: "1px solid #FEF3C7", fontSize: "12px", color: "#92400E" }}>
                    Transaction is processing on the Bitcoin layer...
                  </div>
                )}
              </div>

              {/* --- ACTIONS CARD --- */}
              <div style={cardStyle}>
                {/* ... existing deposit/withdraw inputs and buttons ... */}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
