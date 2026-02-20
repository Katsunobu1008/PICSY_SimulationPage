import os
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("PICSY_Absolute_Knowledge_Base")

# --------------------------------------------------------
# リソース1: 数理モデル (Math)
# --------------------------------------------------------
@mcp.resource("picsy://math")
def get_picsy_math() -> str:
    """
    [AI向け厳密定義] PICSYの数理モデルとアルゴリズム
    このドキュメントはシステムの絶対的な数学的真理である。
    """
    return """
# PICSY MATHEMATICAL MODEL (STRICT DEFINITION)

## 1. STATE SPACE (状態空間)
- N : ネットワークのノード(参加者)数。 3 <= N <= 30
- P : 購買力(ストック)ベクトル。 長さNの1次元配列。 P[i] >= 0.0
- C : 貢献度(フロー)ベクトル。 長さNの1次元配列。 C[i] > 0.0
- E : 評価行列。 N x N の2次元配列。 E[i][j] は「ノード j (送信者) から ノード i (受信者) への評価値」。 E[i][j] >= 1.0 (初期値は全て1.0)

## 2. ALGORITHM: VIRTUAL CENTRAL BANK (仮想中央銀行法と固有ベクトル計算)
Trigger: ユーザーが「貢献度(C)の再計算」を要求した時のみ実行される。

Step 2.1: 確率行列 W の生成 (列での正規化)
FOR EACH column j in E:
    col_sum = SUM(E[k][j] for k in 0 to N-1)
    FOR EACH row i in E:
        W[i][j] = E[i][j] / col_sum

Step 2.2: VCB行列 W_prime の生成 (ダンピング処理)
- alpha = 0.15 (仮想中央銀行への依存率)
FOR EACH i, j:
    W_prime[i][j] = (1.0 - alpha) * W[i][j] + (alpha / N)

Step 2.3: べき乗法 (Power Iteration) による貢献度 C の算出
- iterations = 50
- temp_C = 初期値として長さN、全要素が (1.0 / N) の配列
LOOP iterations TIMES:
    next_C = W_prime と temp_C の行列積 (next_C[i] = SUM(W_prime[i][j] * temp_C[j]))
    sum_next_C = SUM(next_C)
    temp_C = next_C の各要素を sum_next_C で割る (L1正規化)
END LOOP

Step 2.4: 貢献度のスケーリングと反映
FOR i in 0 to N-1:
    C[i] = temp_C[i] * N  // 全員の貢献度の合計が N になるように調整

## 3. ALGORITHM: TRANSACTION (定価取引)
Trigger: SENDER(s) から RECEIVER(r) へ、AMOUNT(amount) の取引が実行された時。

Constraints:
- SENDERとRECEIVERは異なるノードでなければならない (s != r)
- SENDERの購買力は十分でなければならない (P[s] >= amount)

State Update:
- P[s] = P[s] - amount
- P[r] = P[r] + amount
- E[r][s] = E[r][s] + amount  // SENDER(s) から RECEIVER(r) への評価が加算される

## 4. ALGORITHM: RECOVERY SYSTEM (自然回収と循環)
Trigger: ユーザーが「時間を進める(RATE = gamma)」を実行した時。

- gamma : 減価率 (0.00 <= gamma <= 0.20)
- V : VCBプール (初期値 0.0)

Step 4.1: 回収 (Collection)
FOR i in 0 to N-1:
    collected = P[i] * gamma
    V = V + collected
    P[i] = P[i] - collected

Step 4.2: 再分配 (Redistribution)
- sum_C = SUM(C) // 現在の貢献度の合計
FOR i in 0 to N-1:
    ratio = C[i] / sum_C
    P[i] = P[i] + (V * ratio)
    """

# --------------------------------------------------------
# リソース2: 実装要件 (Requirements)
# --------------------------------------------------------
@mcp.resource("picsy://requirements")
def get_picsy_requirements() -> str:
    """
    [AI向け厳密定義] PICSYフロントエンドシミュレーターの実装要件
    このドキュメントはアプリケーションの振る舞いの絶対的仕様である。
    """
    return """
# PICSY FRONTEND REQUIREMENTS (STRICT DEFINITION)

## 1. ARCHITECTURE
- Framework: React 18 (Hooks) + Babel (Standalone) + Tailwind CSS
- Delivery: Single HTML file. No backend. No database.
- State Management: React `useState`. State is ephemeral (lost on reload).

## 2. DATA STRUCTURES (React State)
- `members`: Array of Objects. `{ id: Number, name: String, P: Number, C: Number }`
- `matrix`: 2D Array of Numbers. Represents mathematical matrix `E`.
- `focusMemberId`: Number. ID of the currently selected member for detailed view.

## 3. UI COMPONENTS & EVENT MAPPING

### 3.1 Header & Member Addition
- Input field for `newMemberName`.
- Button: "＋ メンバー追加".
- Event: Creates a new member with P=1.0, C=1.0. Appends a new row and column to `matrix` filled with 1.0.
- Constraint: Disable if `members.length >= 30`.

### 3.2 Evaluation Matrix Table (評価行列表示)
- Rows: Member (Receiver i), Columns: Member (Sender j).
- Display values: Member Name, P (styled green), C (styled indigo), and Matrix cells.
- Matrix cell formatting: `matrix[i][j].toFixed(3)`. Diagonal elements (i === j) MUST be highlighted with a different background color.
- Button: "貢献度(C)を再計算する".
- Event: Executes "ALGORITHM 2 (Virtual Central Bank)" from `picsy://math` and updates `C` values in `members`.

### 3.3 Transaction Panel (取引パネル)
- Selects: SENDER and RECEIVER.
- Input (Range): AMOUNT (0.00 to 2.00, step 0.01).
- Button: "評価を転送して取引する".
- Event: Executes "ALGORITHM 3 (Transaction)" from `picsy://math`. Updates `P` and `matrix`.

### 3.4 Recovery System Panel (自然回収パネル)
- Input (Range): RATE gamma (0.00 to 0.20, step 0.01).
- Button: "時間を進める（自然回収を実行）".
- Event: Executes "ALGORITHM 4 (Recovery System)" from `picsy://math`. Updates `P`.

### 3.5 Member Detail View (個別フォーカス)
- Select: Target member to inspect.
- Display: 
  1. Target member's current P and C.
  2. List of incoming evaluations. (Iterate through `matrix[target_id][j]` where j != target_id, display Sender Name and Value).
"""

# --------------------------------------------------------
# リソース3: 理論・概念モデル (Theory) - 動的ファイル読み込み
# --------------------------------------------------------
@mcp.resource("picsy://theory")
def get_picsy_theory() -> str:
    """
    [AI向け厳密定義] PICSYのモデルに関する追加ドキュメント（外部ファイル読み込み）
    同階層にある「PICSY のモデル.md」の内容を動的に読み込みます。
    """
    # このPythonファイルと同じディレクトリのパスを取得
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # 「PICSY のモデル.md」の絶対パスを構築
    file_path = os.path.join(current_dir, "PICSY のモデル.md")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"システムエラー: 'PICSY のモデル.md' が見つからないか読み込めません。詳細: {e}"

if __name__ == "__main__":
    mcp.run()