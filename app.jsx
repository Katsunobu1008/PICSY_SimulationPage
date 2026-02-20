const { useState, useEffect, useRef } = React;

const App = () => {
    // 【状態管理】IDカウンター：新規メンバーに追加する一意の識別子。初期メンバー4人がいるため次は4から開始。
    const [nextId, setNextId] = useState(4);

    // 【状態管理】メンバーリスト：現在のネットワーク参加者を管理。
    // 各メンバーは固有の id, 名前(name), 購買力(P), 貢献度(C) を保持します。
    const [members, setMembers] = useState([
        { id: 0, name: "田中", P: 1.0, C: 1.0 },
        { id: 1, name: "徳永", P: 1.0, C: 1.0 },
        { id: 2, name: "藤井", P: 1.0, C: 1.0 },
        { id: 3, name: "山本", P: 1.0, C: 1.0 },
    ]);

    // 【状態管理】評価行列 (Matrix)：各メンバーから他メンバーへの評価/信頼度（PICSYの最も根幹）。
    // matrix[i][j] は「メンバー j(送信者) から メンバー i(受信者) への評価値」を示します。
    const [matrix, setMatrix] = useState([
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
    ]);

    // 【UI状態管理】各種入力・選択状態
    const [newMemberName, setNewMemberName] = useState("");      // 新規追加メンバーの名前入力値
    const [focusMemberId, setFocusMemberId] = useState(0);       // 個人ログパネルで表示中のメンバーID
    const [removeMemberId, setRemoveMemberId] = useState(0);     // 削除プルダウンで選択されているメンバーID

    const [txSenderId, setTxSenderId] = useState(0);             // 取引の「送信者」ID
    const [txReceiverId, setTxReceiverId] = useState(1);         // 取引の「受信者」ID
    const [txAmount, setTxAmount] = useState(0.1);               // 取引金額（PICSY）のスライダー値

    const [recoveryRate, setRecoveryRate] = useState(0.05);      // 自然回収システムにおける減価率 (γ)

    // 【ログ管理】システム内で発生したトランザクションを保持する配列
    const [logs, setLogs] = useState([]);

    // 【モード管理】「生活感モード」トグル。1＝デフォルト表示、10000＝全数値を1万倍にして馴染みやすく表示
    const [multiplier, setMultiplier] = useState(1);

    // 【参照】ログパネルの一番下に自動スクロールするためのDOM参照
    const logsEndRef = useRef(null);

    // 【副作用フック】メンバーの増減時、UIのプルダウン選択値が存在しないメンバーを指さないように自動修正します。
    useEffect(() => {
        if (members.length > 0) {
            if (!members.find(m => m.id === parseInt(txSenderId))) setTxSenderId(members[0].id);
            if (!members.find(m => m.id === parseInt(txReceiverId))) setTxReceiverId(members[members.length > 1 ? 1 : 0].id);
            if (!members.find(m => m.id === parseInt(focusMemberId))) setFocusMemberId(members[0].id);
            if (!members.find(m => m.id === parseInt(removeMemberId))) setRemoveMemberId(members[0].id);
        }
    }, [members]);

    // 【副作用フック】システムログが追加されるたび、ログパネル内のみ（画面全体ではなく）最下部へスクロールさせます。
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [logs]);

    // 【ユーティリティ】現在時刻付きで新しいログを配列に追加します。
    const addLog = (message) => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        setLogs(prev => [...prev, { time: timeStr, msg: message }]);
    };

    // 【ユーティリティ】表示モード(multiplier)に応じて数値をフォーマットします。
    // 通常モード時は小数点以下(fixedDecimals)を表示し、1万倍モード時は整数としてカンマ区切リで表示します。
    const formatValue = (val, fixedDecimals = 3) => {
        if (multiplier === 10000) {
            return Math.round(val * 10000).toLocaleString();
        }
        return val.toFixed(fixedDecimals);
    };

    // 【アクション】新規メンバーをネットワークに追加します。
    const addMember = () => {
        if (members.length >= 30) return; // 描画負荷等を考慮した安全策の上限設定

        let name = newMemberName.trim();
        // 名前が空欄の場合の自動命名ロジック（要求された特定の人名＋以降の連番）
        if (!name) {
            if (nextId === 4) {
                name = "棚橋";
            } else if (nextId === 5) {
                name = "田村";
            } else {
                name = `メンバー ${nextId + 1}`;
            }
        }

        // 追加メンバーの初期パラメーター。全メンバー平等に P=1.0, C=1.0 からスタートします。
        const newMember = { id: nextId, name: name, P: 1.0, C: 1.0 };

        setMembers(prev => [...prev, newMember]);

        // 評価行列(E)に対する初期化。
        // 全員が新メンバーを 1.0 と評価し、新メンバーも全員を 1.0 と評価するように行・列を拡張します。
        setMatrix(prev => {
            const nextMatrix = prev.map(row => [...row, 1.0]);           // 既存のすべての行に列を1つ追加
            nextMatrix.push(new Array(members.length + 1).fill(1.0));    // 新メンバー用の行を新規作成
            return nextMatrix;
        });

        setNextId(prev => prev + 1);
        setNewMemberName("");

        addLog(`参加：${name}さんがネットワークに参加しました。`);
    };

    // 【アクション】ネットワークから既存メンバーを削除（退出）させます。
    const removeMember = () => {
        if (members.length <= 1) {
            alert('メンバーは少なくとも1人必要です。');
            return;
        }
        const rmId = parseInt(removeMemberId);
        const memberToRemove = members.find(m => m.id === rmId);
        if (!memberToRemove) return;

        const rmIndex = members.findIndex(m => m.id === rmId);

        setMembers(prev => prev.filter(m => m.id !== rmId));

        // 該当メンバーに関わる評価行列の行（自分が受ける評価）と列（自分が送った評価）を取り除きます。
        setMatrix(prev => {
            const nextMatrix = prev.filter((_, i) => i !== rmIndex); // 該当行の削除
            return nextMatrix.map(row => row.filter((_, j) => j !== rmIndex)); // 残った各行から該当列を削除
        });

        addLog(`退出：${memberToRemove.name}さんがネットワークから退出しました。`);
    };

    // 【アルゴリズム PICSYの要】貢献度(C)の再計算・仮想中央銀行（VCB）アルゴリズム（PageRank類似）
    const recalculateC = () => {
        const N = members.length;
        if (N === 0) return;
        let E = matrix;

        // Step 2.1: マルコフ推移確率行列 (W) の生成。列ごとに総和をとり、各評価を割合（確率）に正規化します。
        let W = Array.from({ length: N }, () => new Array(N).fill(0));
        for (let j = 0; j < N; j++) {
            let colSum = 0;
            for (let k = 0; k < N; k++) colSum += E[k][j]; // M_j から送信されたすべての評価の合計
            for (let i = 0; i < N; i++) {
                W[i][j] = colSum === 0 ? 0 : E[i][j] / colSum; // その中で M_i が受け取った割合
            }
        }

        // Step 2.2: ダンピングファクター（仮想中央銀行への依存）を適用し、不自然なループを回避する修正行列 W_prime を作成します。
        const alpha = 0.15; // 仮想中央銀行(VCB)と呼ばれる、全体への等配分のためのダンピング係数
        let W_prime = Array.from({ length: N }, () => new Array(N).fill(0));
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                // 通常の評価遷移(1-alpha) ＋ 全体への平等な底上げ(alpha/N)
                W_prime[i][j] = (1.0 - alpha) * W[i][j] + (alpha / N);
            }
        }

        // Step 2.3: べき乗法 (Power Iteration) により定常分布である固有ベクトルを求めます。
        let temp_C = new Array(N).fill(1.0 / N); // 全員が等しい状態からスタート
        for (let iter = 0; iter < 50; iter++) {       // 50回程度のイテレーションで十分に収束します
            let next_C = new Array(N).fill(0);
            // 現在の評価の偏りを掛け合わせて、次のステップの貢献度ベクトルを生成
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    next_C[i] += W_prime[i][j] * temp_C[j];
                }
            }
            // 浮動小数点計算の誤差防止のための L1正規化
            let sumNextC = next_C.reduce((a, b) => a + b, 0);
            for (let i = 0; i < N; i++) temp_C[i] = next_C[i] / sumNextC;
        }

        // Step 2.4: 貢献度の合計値が全人口 N に等しくなるようにスケーリングして適用します。
        const newMembers = [...members];
        for (let i = 0; i < N; i++) {
            newMembers[i] = { ...newMembers[i], C: temp_C[i] * N };
        }
        setMembers(newMembers);

        addLog('計算：全員の貢献度(C)を最新の評価行列に基づいて再計算しました。');
    };

    // 【アルゴリズム PICSYの要】手動取引による購買力(P)の移動と、受信者から送信者への「評価」の加算
    const executeTransaction = () => {
        const s = parseInt(txSenderId);
        const r = parseInt(txReceiverId);
        const amt = parseFloat(txAmount);

        const sIndex = members.findIndex(m => m.id === s);
        const rIndex = members.findIndex(m => m.id === r);

        if (sIndex === -1 || rIndex === -1) return;

        if (s === r) {
            alert('送信者と受信者は異なる必要があります。');
            return;
        }
        if (members[sIndex].P < amt) {
            alert('送信者の購買力 (P) が不足しています。');
            return;
        }

        // 送信者(s)のPを減らし、受信者(r)のPを増やします（通常の取引と同じ動き）
        const newMembers = [...members];
        newMembers[sIndex] = { ...newMembers[sIndex], P: newMembers[sIndex].P - amt };
        newMembers[rIndex] = { ...newMembers[rIndex], P: newMembers[rIndex].P + amt };

        // ★ PICSYの特徴的機能：サービスの「受信者」から、対価を支払った「送信者」への「評価（感謝の証）」として加算する。
        // 列(送信側=サービス受信者)は r, 行(受信側=サービス送信者)は s 。
        const newMatrix = matrix.map(row => [...row]);
        newMatrix[sIndex][rIndex] += amt;

        setMembers(newMembers);
        setMatrix(newMatrix);

        const displayAmt = formatValue(amt, 2);
        const unit = multiplier === 10000 ? "" : " PICSY";
        addLog(`取引：${members[sIndex].name}さんから${members[rIndex].name}さんへ ${displayAmt}${unit} 転送されました。`);
    };

    // 【アルゴリズム PICSYの要】自然回収システム（減価と再分配）
    // 通貨が滞留しないよう、定期的に全員の財布(P)から一定割合(γ)を回収し、貢献度(C)に比例して戻す仕組み。
    const executeRecovery = () => {
        const gamma = parseFloat(recoveryRate);
        let V = 0; // 回収されたPICSYが集まる仮想的な「プール」
        let newMembers = [...members];

        // Step 4.1: 全員から現在の持っている額(P)に γ を掛けた分を徴収し、プール(V)に集める
        for (let i = 0; i < newMembers.length; i++) {
            let collected = newMembers[i].P * gamma;
            V += collected;
            newMembers[i] = { ...newMembers[i], P: newMembers[i].P - collected };
        }

        // Step 4.2: プールされた資金 V を、現在の各自の貢献度(C)のシェアに応じて全員に再分配する
        let sum_C = newMembers.reduce((acc, m) => acc + m.C, 0);
        for (let i = 0; i < newMembers.length; i++) {
            let ratio = sum_C > 0 ? newMembers[i].C / sum_C : 0;
            newMembers[i].P += V * ratio;
        }

        setMembers(newMembers);

        addLog(`更新：減価率 ${gamma.toFixed(2)} で時間を進め、自然回収を実行しました。`);
    };

    const focusMember = members.find(m => m.id === parseInt(focusMemberId)) || members[0];
    const focusMemberIndex = members.findIndex(m => m.id === (focusMember ? focusMember.id : -1));

    return (
        <div className="container mx-auto px-4 py-8 max-w-[95%] xl:max-w-[1400px]">
            {/* ================= ヘッダーセクション ================= */}
            <header className="mb-10 text-center relative flex flex-col md:flex-row justify-between items-center border-b border-slate-200/60 pb-6 gap-4">
                <div className="flex flex-col items-start">
                    {/* 信頼感のある深い青緑色の単色タイトル */}
                    <h1 className="text-4xl font-extrabold text-teal-800 tracking-tight drop-shadow-sm mb-1">
                        PICSY Simulator
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">伝播的投資貨幣PICSY (Propagational Investment Currency)</p>
                </div>

                {/* 画面上部のグローバル情報表示＆操作エリア */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* 人口表示パネル */}
                    <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <span className="text-slate-500 text-sm font-bold">総人口</span>
                        <span className="text-blue-600 font-mono font-bold text-lg bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{members.length} <span className="text-sm font-sans">人</span></span>
                    </div>

                    {/* 表示モード（基本倍率⇔1万倍）のトグルスイッチ */}
                    <button
                        onClick={() => setMultiplier(prev => prev === 1 ? 10000 : 1)}
                        className={`px-5 py-3 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all ${multiplier === 10000
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:opacity-90'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                    >
                        {/* トグルアイコン */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        {multiplier === 10000 ? '通常表示 (1x) に戻す' : '生活感モード (10,000倍) に切り替え'}
                    </button>
                </div>
            </header>

            {/* ================= メインレイアウトグリッド ================= */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* ---------------- 左カラム(全体の幅の2/3を占有)：行列とログ ---------------- */}
                <div className="xl:col-span-2 space-y-8 flex flex-col h-full">

                    {/* ====== 評価行列 (Evaluation Matrix) パネル ====== */}
                    <div className="glass-panel p-6 sm:p-8 flex-none shadow-lg border border-slate-200/60 bg-white/70">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-slate-800">
                                {/* タイトル左の装飾バー */}
                                <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full shadow-sm"></div>
                                評価行列 (Evaluation Matrix)
                            </h2>
                            {/* 「貢献度再計算」はシステムにおいて最重要アクションのため、視線を惹きつける青ベースのグラデーションボタンを配置 */}
                            <button onClick={recalculateC} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 w-full md:w-auto px-6 py-2.5 rounded-xl font-bold text-sm shadow-md flex justify-center items-center gap-2 text-white transition-all transform active:scale-[0.98]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                貢献度(C)を再計算する
                            </button>
                        </div>

                        {/* ================= メンバー追加/削除コントロール ================= */}
                        {/* ユーザー利便性のため、長い行列テーブルをスクロールする前に操作できるようにテーブル上部へ配置 */}
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-slate-200/80">

                            {/* メンバー追加枠 */}
                            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-2">
                                <h3 className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wide">
                                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    メンバー追加
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-2 items-center">
                                    <input
                                        type="text"
                                        placeholder="名前 (省略可)"
                                        value={newMemberName}
                                        onChange={e => setNewMemberName(e.target.value)}
                                        className="w-full sm:flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition-all placeholder-slate-400 text-slate-700 shadow-inner"
                                    />
                                    <button
                                        onClick={addMember}
                                        disabled={members.length >= 30}
                                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-bold text-sm text-white transition-all shadow-sm flex justify-center items-center gap-1.5"
                                    >
                                        追加
                                    </button>
                                </div>
                            </div>

                            {/* メンバー削除枠 */}
                            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-2">
                                <h3 className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wide">
                                    <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                                    メンバー削除
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-2 items-center">
                                    <select
                                        value={removeMemberId}
                                        onChange={e => setRemoveMemberId(e.target.value)}
                                        className="w-full sm:flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 focus:outline-none appearance-none font-medium text-slate-700 shadow-inner"
                                    >
                                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <button
                                        onClick={removeMember}
                                        disabled={members.length <= 1}
                                        className="w-full sm:w-auto bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm flex justify-center items-center gap-1.5"
                                    >
                                        削除
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ================= マトリックス（評価行列）テーブル ================= */}
                        {/* 画面幅が小さい時のためにスクロール可能にし、ヘッダー行と左の固定列を設定 */}
                        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm max-h-[460px] custom-scrollbar">
                            <table className="w-full text-sm text-left relative">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-100/95 sticky top-0 z-20 border-b border-slate-200/80 backdrop-blur-md">
                                    <tr>
                                        {/* 左端の交差する固定セル：見栄えのため空白として扱う */}
                                        <th className="px-3 md:px-5 py-3 font-bold text-slate-700 sticky left-0 bg-slate-100/95 z-30">&nbsp;</th>

                                        {/* 購買力・貢献度ヘッダ */}
                                        <th className="px-3 md:px-5 py-3 font-bold text-emerald-600 whitespace-nowrap"><div className="flex flex-col"><span>購買力</span><span className="text-[10px] text-emerald-400">Power (P)</span></div></th>
                                        <th className="px-3 md:px-5 py-3 font-bold text-indigo-600 whitespace-nowrap"><div className="flex flex-col"><span>貢献度</span><span className="text-[10px] text-indigo-400">Contrib (C)</span></div></th>

                                        {/* 各メンバーの「送信側」列ヘッダ。認知ノイズを抑えるため、極力シンプルな名前のみ、かつ文字色を薄く表示する。 */}
                                        {members.map(m => (
                                            <th key={m.id} className="px-3 py-3 text-center font-bold text-xs text-slate-500 whitespace-nowrap" title={`送信者: ${m.name}`}>{m.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {members.map((receiver, i) => (
                                        <tr key={receiver.id} className="hover:bg-blue-50/40 transition-colors">
                                            {/* 左端（受信側）の固定氏名セル */}
                                            <td className="px-3 md:px-5 py-2.5 font-bold text-slate-700 whitespace-nowrap sticky left-0 bg-white/95 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{receiver.name}</td>

                                            {/* 対象メンバーの現在保有している P 購買力。緑系統でハイライト */}
                                            <td className="px-3 md:px-5 py-2.5 text-emerald-700 font-mono font-bold tracking-tight bg-emerald-50/40 whitespace-nowrap text-right pr-4">{formatValue(receiver.P)}</td>
                                            {/* 対象メンバーのシステムによって計算された C 貢献度。インディゴ系統でハイライト */}
                                            <td className="px-3 md:px-5 py-2.5 text-indigo-700 font-mono font-bold tracking-tight bg-indigo-50/40 whitespace-nowrap text-right pr-4">{formatValue(receiver.C)}</td>

                                            {/* ここから右が「相手からの評価」数値セル */}
                                            {members.map((sender, j) => (
                                                <td key={`${i}-${j}`} className={`px-3 py-2.5 text-center matrix-cell font-mono text-sm tracking-tight ${i === j
                                                    ? 'bg-indigo-100/40 text-indigo-900 font-semibold' // 自分自身（対角要素）は特別に色付け
                                                    : 'text-slate-600'
                                                    }`}>
                                                    {formatValue(matrix[i][j])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ====== システムログ用パネル ====== */}
                    <div className="glass-panel p-6 sm:p-8 flex-1 flex flex-col min-h-[250px] shadow-lg border border-slate-200/60 bg-white/70">
                        <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800 mb-4 border-b border-slate-200/60 pb-3">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full"></div>
                            システムログ (System Logs)
                        </h2>
                        {/* ログが溜まるインナーウィンドウ。このウィンドウ内部だけがスクロールする。 */}
                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto custom-scrollbar shadow-inner text-slate-300 text-sm font-mono h-[200px]">
                            <div className="space-y-1">
                                {logs.length === 0 ? (
                                    <p className="text-slate-500 text-center mt-4">ログはありません。</p>
                                ) : (
                                    logs.map((log, idx) => (
                                        <div key={idx} className="flex gap-3 px-2 py-1.5 hover:bg-slate-800/80 rounded transition-colors break-words items-start">
                                            {/* 時刻表示 */}
                                            <span className="text-slate-500 whitespace-nowrap shrink-0">[{log.time}]</span>
                                            {/* メッセージ内容（先頭の種別文字列で文字色を分岐表示） */}
                                            <span className={`${log.msg.startsWith('取引') ? 'text-emerald-400 font-bold' :
                                                log.msg.startsWith('計算') ? 'text-blue-300' :
                                                    log.msg.startsWith('更新') ? 'text-amber-300' :
                                                        log.msg.startsWith('退出') ? 'text-rose-400' :
                                                            log.msg.startsWith('参加') ? 'text-fuchsia-300' : 'text-slate-300'
                                                }`}>{log.msg}</span>
                                        </div>
                                    ))
                                )}
                                {/* オートスクロールのアンカー */}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </div>

                </div>

                {/* ---------------- 右カラム(全体の幅の1/3を占有)：操作・詳細パネル ---------------- */}
                <div className="space-y-6">

                    {/* ====== 取引 (Transaction) パネル ====== */}
                    <div className="glass-panel p-7 shadow-lg border border-slate-200/60 bg-white/70">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
                            {/* 「取引」のアクションカラーであるマゼンタ系のグラデーション */}
                            <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full shadow-sm"></div>
                            手動取引 (Manual Transaction)
                        </h2>

                        <div className="space-y-3">
                            {/* 送信者（お金を払う側＝他者を評価する側）の選択 */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative z-10">
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">送信者 (Sender)</label>
                                <select
                                    value={txSenderId}
                                    onChange={e => setTxSenderId(e.target.value)}
                                    // 送信者はパープル系の下地
                                    className="w-full bg-purple-50/50 border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:outline-none appearance-none font-bold text-slate-700"
                                >
                                    {members.map(m => <option key={m.id} value={m.id}>{m.name} (残高: {formatValue(m.P)})</option>)}
                                </select>
                            </div>

                            {/* 資金（価値）の流れを表す下向き矢印。 */}
                            {/* [デザイン改善] アイコンのサイズを控えめにし、上下均等の余白 `my-2` を確保することで、視線が滑らかに下へ誘導されるように設計しています。 */}
                            <div className="flex justify-center my-2 relative z-20">
                                <div className="bg-white p-1.5 rounded-full shadow-sm border border-slate-200 text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                                </div>
                            </div>

                            {/* 受信者（サービス提供側＝他者から評価される側）の選択 */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative z-10">
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">受信者 (Receiver)</label>
                                <select
                                    value={txReceiverId}
                                    onChange={e => setTxReceiverId(e.target.value)}
                                    // 受信者はピンク系の下地
                                    className="w-full bg-pink-50/50 border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 focus:outline-none appearance-none font-bold text-slate-700"
                                >
                                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>

                            {/* 取引金額(PICSY)を決めるスライダー */}
                            <div className="px-2 pt-4 pb-2">
                                <div className="flex justify-between text-sm font-bold mb-3">
                                    <label className="text-slate-600">金額 (Amount)</label>
                                    <span className="text-purple-700 font-mono bg-purple-100 px-3 py-1 rounded shadow-sm border border-purple-200">{formatValue(parseFloat(txAmount), 2)}</span>
                                </div>
                                {/* 金額は一度に大量移動しすぎないよう 0.00 〜 1.00 で制限。 */}
                                <input
                                    type="range" min="0" max="1" step="0.01" value={txAmount}
                                    onChange={e => setTxAmount(e.target.value)}
                                    className="w-full accent-purple-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                                    <span>{formatValue(0)}</span>
                                    <span>{formatValue(1)}</span>
                                </div>
                            </div>

                            <button
                                onClick={executeTransaction}
                                // 信頼感と押下感を意識したソリッドなブルーの単色ボタン
                                className="w-full bg-blue-600 hover:bg-blue-500 py-3.5 rounded-xl font-bold text-white transition-all shadow-md mt-2 active:scale-[0.98] border border-blue-700/50"
                            >
                                評価を転送して取引を確定する
                            </button>
                        </div>
                    </div>

                    {/* ====== 自然回収 (Recovery) パネル ====== */}
                    <div className="glass-panel p-7 shadow-lg border border-slate-200/60 bg-white/70">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-sm"></div>
                            自然回収 (Recovery System)
                        </h2>

                        <div className="space-y-6">
                            <div className="px-2">
                                <div className="flex justify-between text-sm font-bold mb-3">
                                    <label className="text-slate-600">減価率 (γ Rate)</label>
                                    <span className="text-emerald-700 font-mono bg-emerald-100 px-3 py-1 rounded shadow-sm border border-emerald-200">{parseFloat(recoveryRate).toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0" max="0.2" step="0.01" value={recoveryRate}
                                    onChange={e => setRecoveryRate(e.target.value)}
                                    className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* [デザイン改善] 
                                同一画面上において、システム全体の色数を減らすためメンバー追加ボタンと同じエメラルド系（緑）に統一。
                                中を白抜き（背景白、枠線と文字が緑）のスタイルを維持し、直感的に操作しやすいデザインへ。
                            */}
                            <button
                                onClick={executeRecovery}
                                className="w-full bg-white hover:bg-emerald-50 py-3.5 rounded-xl font-bold text-emerald-600 transition-all shadow-sm active:scale-[0.98] border-2 border-emerald-500/80 flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                時間を進める（自然回収を実行）
                            </button>
                        </div>
                    </div>

                    {/* ====== 個人ログ パネル ====== */}
                    <div className="glass-panel p-7 shadow-lg border border-slate-200/60 bg-white/70">
                        <h2 className="text-xl font-bold mb-5 flex items-center gap-3 text-slate-800">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-teal-400 to-emerald-500 rounded-full shadow-sm"></div>
                            個人ログ (Log)
                        </h2>

                        <div className="bg-white p-2 rounded-xl border border-slate-200 mb-5 shadow-sm">
                            <select
                                value={focusMember ? focusMember.id : ""}
                                onChange={e => setFocusMemberId(e.target.value)}
                                className="w-full bg-transparent border-0 px-3 py-2 font-bold text-slate-700 appearance-none focus:outline-none"
                            >
                                {members.map(m => <option key={m.id} value={m.id}>対象: {m.name}</option>)}
                            </select>
                        </div>

                        {/* 対象メンバーが存在し、正常にインデックスが引けた場合のみ表示 */}
                        {focusMember && focusMemberIndex !== -1 && (
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-5 mb-5">
                                    <div className="flex flex-col gap-1 items-start">
                                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">購買力 (P)</span>
                                        <span className="text-emerald-700 font-mono font-bold text-xl">{formatValue(focusMember.P)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 items-start">
                                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">貢献度 (C)</span>
                                        <span className="text-indigo-700 font-mono font-bold text-xl">{formatValue(focusMember.C)}</span>
                                    </div>
                                </div>

                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                    他者からの評価（取引あり）
                                </h3>

                                {/* 該メンバーに対して、誰がどれだけ評価を送金している（取引した）かの一覧 */}
                                <ul className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                    {members.map((sender, sIndex) => {
                                        // 自身からの評価ベクトル（対角成分）は表示から除外
                                        if (sender.id === focusMember.id) return null;

                                        // 相手（sender）から自身（focusMember=受信側）に対しての評価値
                                        // matrix は [受信者(receiver)][送信者(sender)] の順で格納されています
                                        const rawVal = matrix[focusMemberIndex][sIndex];

                                        // 初期値(1.0)以下のまま場合は取引が発生していないため、リスト表示をスキップ
                                        if (rawVal <= 1.0) return null;

                                        return (
                                            <li key={sender.id} className="flex justify-between text-sm items-center bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm transition-all hover:border-cyan-300">
                                                <span className="text-slate-700 font-bold">{sender.name}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-cyan-700 font-mono font-bold">{formatValue(rawVal)}</span>
                                                    <span className="text-[10px] text-slate-400">累計送金額（＋評価値）</span>
                                                </div>
                                            </li>
                                        );
                                    })}

                                    {/* 全員をチェックしても、評価値が初期値1.0を超える相手が一人もいなかった時のフォールバック */}
                                    {members.filter((s, i) => s.id !== focusMember.id && matrix[focusMemberIndex][i] > 1.0).length === 0 && (
                                        <div className="text-center text-slate-400 text-xs py-4">まだ誰からも取引を受けていません</div>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
