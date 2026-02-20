from mcp.server.fastmcp import FastMCP

# コアエンジンとは別の独立した名前空間でサーバーを初期化
mcp = FastMCP("PICSY_Exchange_Knowledge_Base")

@mcp.resource("picsy-sgm://math")
def get_sgm_math() -> str:
    """
    [AI向け厳密定義] PICSY為替基盤（SGM: 単一ゲートウェイ方式）の数理モデル
    コアのPICSYモデルを拡張するトランザクションロジックである。
    """
    return """
# PICSY SGM MATHEMATICAL MODEL (EXCHANGE LOGIC)

## 1. EXTENDED STATE (拡張状態空間)
- Gateway Node : ネットワークのインデックス `0` (members[0]) は常に為替ゲートウェイ「Gateway (SGM)」として振る舞う。
- AMM State : `gateway` オブジェクトとして { M: 法定通貨プール残高, K: AMM不変量 } を保持。初期値は M = 10000, K = 9900。
- Matrix Initialization Constraints (列和1.0の死守): 
  - ゲートウェイ列 (j=0): E[0][0] = 0.99, E[i][0] = 0.01 / (N-1) (for i > 0)
  - ユーザー列 (j>0): E[j][j] = 0.99, E[0][j] = 0.01 (これを接続税と呼ぶ)

## 2. API 1: ENTRY TRANSACTION (日本円 -> PICSY)
Trigger: ユーザー u (u > 0) が 日本円 amount_jpy をシステムに投入する。

Step 2.1: AMM計算による放出量 alpha の決定
  next_M = M + amount_jpy
  next_E00 = K / next_M
  alpha = E[0][0] - next_E00

Step 2.2: ゲートウェイからの評価付与とストックの移動
  E[u][0] = E[u][0] + alpha   // ゲートウェイからユーザーuへの評価が増加
  E[0][0] = next_E00          // ゲートウェイの自己評価が減少
  P[u] = P[u] + alpha         // ユーザーの購買力が増加

Step 2.3: プール残高の更新
  M = next_M

## 3. API 2: EXIT TRANSACTION (PICSY -> 日本円)
Trigger: ユーザー u (u > 0) が PICSY評価量 alpha_amount を消費して日本円を引き出す。
Constraint: P[u] >= alpha_amount (購買力が不足している場合はエラー)

Step 3.1: 比例徴収 (Proportional Clawback)
  // ゲートウェイが社会全体に配っている評価から、alpha_amount分を比例回収してE[0][0]を回復させる。
  FOR j in 1 to N-1:
      proportion = E[j][0] / (1.0 - E[0][0])
      clawback = alpha_amount * proportion
      E[j][0] = E[j][0] - clawback
  
  next_E00 = E[0][0] + alpha_amount
  E[0][0] = next_E00

Step 3.2: AMMによる基本払出額の計算
  M_base = K / next_E00
  delta_M_out = M - M_base

Step 3.3: 貢献度連動型出口税 (Exit Tax) の適用
  c_target = 1.0  // 目標貢献度
  tau = MAX(0.0, 1.0 - (C[u] / c_target)^2)  // 貢献度C[u]が低いほど税率tauが高くなる
  final_payout = delta_M_out * (1.0 - tau)

Step 3.4: 状態の最終更新とシステムの成長(Kのアップデート)
  P[u] = P[u] - alpha_amount
  M = M - final_payout
  K = M * next_E00  // 徴収された税金分がシステムプールに残り、不変量Kが成長する
"""

@mcp.resource("picsy-sgm://requirements")
def get_sgm_requirements() -> str:
    """
    [AI向け厳密定義] 為替基盤（SGM）のフロントエンド実装要件
    既存の `app.jsx` に対して破壊的変更を行わずに拡張するためのUI仕様。
    """
    return """
# PICSY SGM FRONTEND REQUIREMENTS

## 1. DATA STRUCTURE EXTENSIONS
- Initialize `gateway` state using `useState({ M: 10000, K: 9900 })`.
- Ensure `members[0]` is hardcoded as: `{ id: 0, name: "Gateway (SGM)", P: 0, C: 1.0 }`. It cannot be deleted.

## 2. UI COMPONENTS TO ADD/MODIFY

### 2.1 System Liquidity Dashboard (Header Area)
- Display the current JPY Pool (M) and AMM Constant (K) prominently near the Population count in the header.

### 2.2 Evaluation Matrix Table updates
- The row and column for "Gateway (SGM)" (index 0) MUST be styled distinctively (e.g., using a dark slate or gold background) to visually separate the Gateway from regular human members.

### 2.3 New Component: Exchange Panel (為替 SGM)
- Add a completely new panel component dedicated to SGM transactions, placed alongside the "Manual Transaction" panel.
- This panel must have two distinct sections or a toggle for:
  - ENTRY (円 -> PICSY): Input for JPY Amount, Select target User. Triggers the ENTRY TRANSACTION logic.
  - EXIT (PICSY -> 円): Input for PICSY Amount, Select target User. Triggers the EXIT TRANSACTION logic.
- During EXIT, dynamically display the estimated "Exit Tax Rate (%)" and "Final Payout (JPY)" based on the selected user's current Contribution (C).
"""

if __name__ == "__main__":
    mcp.run()