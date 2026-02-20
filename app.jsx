const { useState, useEffect, useRef } = React;

const App = () => {
    // 【状態管理】IDカウンター
    const [nextId, setNextId] = useState(7);

    // 【状態管理】メンバーリスト
    // members[0] は Gateway 固定
    const [members, setMembers] = useState([
        { id: 0, name: "為替Gateway", P: 0, C: 1.0 },
        { id: 1, name: "田中", P: 1.0, C: 1.0 },
        { id: 2, name: "徳永", P: 1.0, C: 1.0 },
        { id: 3, name: "藤井", P: 1.0, C: 1.0 },
        { id: 4, name: "山本", P: 1.0, C: 1.0 },
        { id: 5, name: "田村", P: 1.0, C: 1.0 },
        { id: 6, name: "棚橋", P: 1.0, C: 1.0 },
    ]);

    // 【状態管理】SGM為替の状態（法定通貨プール M と不変量 K）
    const [gateway, setGateway] = useState({ M: 10000, K: 9900 });

    // 【状態管理】評価行列 (Matrix)
    const initialN = 7;
    const initialMatrix = Array.from({ length: initialN }, (_, i) => {
        return Array.from({ length: initialN }, (_, j) => {
            if (j === 0) {
                // Gateway列 (j=0)
                return i === 0 ? 0.99 : 0.01 / (initialN - 1);
            } else {
                // ユーザー列 (j>0)
                if (i === j) return 0.99;
                if (i === 0) return 0.01;
                return 0.0;
            }
        });
    });
    const [matrix, setMatrix] = useState(initialMatrix);

    // 【UI状態管理】
    const [newMemberName, setNewMemberName] = useState("");
    const [focusMemberId, setFocusMemberId] = useState(1);
    const [removeMemberId, setRemoveMemberId] = useState(1);

    const [txSenderId, setTxSenderId] = useState(1);
    const [txReceiverId, setTxReceiverId] = useState(2);
    const [txAmount, setTxAmount] = useState(0.1);

    const [recoveryRate, setRecoveryRate] = useState(0.05);

    // 為替(SGM)パネル用の状態
    const [activeTab, setActiveTab] = useState('entry'); // 'entry' or 'exit'
    const [entryUser, setEntryUser] = useState(1);
    const [entryJPY, setEntryJPY] = useState(1000);
    const [exitUser, setExitUser] = useState(1);
    const [exitAlpha, setExitAlpha] = useState(0.01);

    // 【ログと表示モード】
    const [logs, setLogs] = useState([]);
    const [multiplier, setMultiplier] = useState(1);
    const logsEndRef = useRef(null);

    // 【副作用フック】選択IDの自動補正
    useEffect(() => {
        if (members.length > 1) {
            if (!members.find(m => m.id === parseInt(txSenderId) && m.id !== 0)) setTxSenderId(members[1].id);
            if (!members.find(m => m.id === parseInt(txReceiverId) && m.id !== 0)) setTxReceiverId(members[members.length > 2 ? 2 : 1].id);
            if (!members.find(m => m.id === parseInt(focusMemberId))) setFocusMemberId(members[1].id);
            if (!members.find(m => m.id === parseInt(removeMemberId) && m.id !== 0)) setRemoveMemberId(members[1].id);
            if (!members.find(m => m.id === parseInt(entryUser) && m.id !== 0)) setEntryUser(members[1].id);
            if (!members.find(m => m.id === parseInt(exitUser) && m.id !== 0)) setExitUser(members[1].id);
        }
    }, [members]);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [logs]);

    const addLog = (message) => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        setLogs(prev => [...prev, { time: timeStr, msg: message }]);
    };

    const formatValue = (val, fixedDecimals = 3) => {
        if (multiplier === 10000) {
            return Math.round(val * 10000).toLocaleString();
        }
        return val.toFixed(fixedDecimals);
    };

    // 【アクション】メンバー追加
    const addMember = () => {
        if (members.length >= 30) return;
        let name = newMemberName.trim() || `メンバー ${nextId}`;
        const newId = nextId;
        const newMember = { id: newId, name: name, P: 1.0, C: 1.0 };
        const newN = members.length + 1;

        setMembers(prev => [...prev, newMember]);

        setMatrix(prev => {
            let nextMatrix = prev.map((row, i) => {
                let newRow = [...row];
                newRow.push(i === 0 ? 0.01 : 0.0);
                return newRow;
            });
            let newRow = new Array(newN).fill(0);
            newRow[newN - 1] = 0.99; // 自身の自己評価
            nextMatrix.push(newRow);
            return nextMatrix;
        });

        setNextId(prev => prev + 1);
        setNewMemberName("");
        addLog(`参加：${name}さんがネットワークに参加しました。`);
    };

    // 【アクション】メンバー削除
    const removeMember = () => {
        const rmId = parseInt(removeMemberId);
        if (rmId === 0) {
            alert('Gatewayは削除できません。');
            return;
        }
        if (members.length <= 2) {
            alert('メンバーは少なくとも1人必要です。');
            return;
        }
        const memberToRemove = members.find(m => m.id === rmId);
        if (!memberToRemove) return;
        const rmIndex = members.findIndex(m => m.id === rmId);

        setMembers(prev => prev.filter(m => m.id !== rmId));

        setMatrix(prev => {
            const lostEval = prev[rmIndex][0];
            const nextMatrix = prev.filter((_, i) => i !== rmIndex).map(row => row.filter((_, j) => j !== rmIndex));

            // 削除されたユーザーへ向いていたGatewayからの評価を、残りのユーザーに比例配分
            let sumRemaining = 0;
            for (let i = 1; i < nextMatrix.length; i++) sumRemaining += nextMatrix[i][0];

            if (sumRemaining > 0) {
                for (let i = 1; i < nextMatrix.length; i++) {
                    nextMatrix[i][0] += lostEval * (nextMatrix[i][0] / sumRemaining);
                }
            } else {
                for (let i = 1; i < nextMatrix.length; i++) {
                    nextMatrix[i][0] += lostEval / (nextMatrix.length - 1);
                }
            }
            return nextMatrix;
        });
        addLog(`退出：${memberToRemove.name}さんがネットワークから退出しました。`);
    };

    // 【アクション】貢献度(C)の再計算
    const recalculateC = () => {
        const N = members.length;
        if (N === 0) return;
        let E = matrix;

        let W = Array.from({ length: N }, () => new Array(N).fill(0));
        for (let j = 0; j < N; j++) {
            let colSum = 0;
            for (let k = 0; k < N; k++) colSum += E[k][j];
            for (let i = 0; i < N; i++) {
                W[i][j] = colSum === 0 ? 0 : E[i][j] / colSum;
            }
        }

        const alpha = 0.15;
        let W_prime = Array.from({ length: N }, () => new Array(N).fill(0));
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                W_prime[i][j] = (1.0 - alpha) * W[i][j] + (alpha / N);
            }
        }

        let temp_C = new Array(N).fill(1.0 / N);
        for (let iter = 0; iter < 50; iter++) {
            let next_C = new Array(N).fill(0);
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    next_C[i] += W_prime[i][j] * temp_C[j];
                }
            }
            let sumNextC = next_C.reduce((a, b) => a + b, 0);
            for (let i = 0; i < N; i++) temp_C[i] = next_C[i] / sumNextC;
        }

        const newMembers = [...members];
        for (let i = 0; i < N; i++) {
            // Gatewayも含めて計算し更新する
            newMembers[i] = { ...newMembers[i], C: temp_C[i] * N };
        }
        setMembers(newMembers);

        addLog('計算：全員の貢献度(C)を最新の評価行列に基づいて再計算しました。');
    };

    // 【アクション】手動取引
    const executeTransaction = () => {
        const s = parseInt(txSenderId);
        const r = parseInt(txReceiverId);
        const amt = parseFloat(txAmount);

        if (s === 0 || r === 0) {
            alert('Gatewayは手動取引の対象にできません。為替機能をご利用ください。');
            return;
        }

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

        const newMembers = [...members];
        newMembers[sIndex] = { ...newMembers[sIndex], P: newMembers[sIndex].P - amt };
        newMembers[rIndex] = { ...newMembers[rIndex], P: newMembers[rIndex].P + amt };

        const newMatrix = matrix.map(row => [...row]);
        newMatrix[rIndex][sIndex] += amt;

        setMembers(newMembers);
        setMatrix(newMatrix);

        const displayAmt = formatValue(amt, 2);
        const unit = multiplier === 10000 ? "" : " PICSY";
        addLog(`取引：${members[sIndex].name}さんから${members[rIndex].name}さんへ ${displayAmt}${unit} 転送されました。`);
    };

    // 【アクション】自然回収
    const executeRecovery = () => {
        const gamma = parseFloat(recoveryRate);
        let V = 0;
        let newMembers = [...members];

        // i=1 から開始し、Gateway (i=0) は回収・分配の対象外とする
        for (let i = 1; i < newMembers.length; i++) {
            let collected = newMembers[i].P * gamma;
            V += collected;
            newMembers[i] = { ...newMembers[i], P: newMembers[i].P - collected };
        }

        let sum_C = 0;
        for (let i = 1; i < newMembers.length; i++) sum_C += newMembers[i].C;

        for (let i = 1; i < newMembers.length; i++) {
            let ratio = sum_C > 0 ? newMembers[i].C / sum_C : 0;
            newMembers[i].P += V * ratio;
        }

        setMembers(newMembers);
        addLog(`更新：減価率 ${gamma.toFixed(2)} で自然回収を実行し、Gatewayを除く全ユーザー間で再分配しました。`);
    };

    // 【アクション：SGM】為替 Entry (円 → PICSY)
    const executeEntry = () => {
        const amtJPY = parseFloat(entryJPY);
        if (amtJPY <= 0 || isNaN(amtJPY)) return;
        const uIndex = members.findIndex(m => m.id === parseInt(entryUser));
        if (uIndex <= 0) return;

        const M = gateway.M;
        const K = gateway.K;
        const E00 = matrix[0][0];

        const M_new = M + amtJPY;
        const E00_new = K / M_new;
        const alpha = E00 - E00_new;

        setGateway({ M: M_new, K: K });

        setMatrix(prev => {
            const nextMatrix = prev.map(row => [...row]);
            nextMatrix[uIndex][0] += alpha;
            nextMatrix[0][0] = E00_new;
            return nextMatrix;
        });

        setMembers(prev => {
            const nextMembers = [...prev];
            nextMembers[uIndex] = { ...nextMembers[uIndex], P: nextMembers[uIndex].P + alpha };
            return nextMembers;
        });

        addLog(`為替(入金)：${members[uIndex].name}さんが ¥${Math.floor(amtJPY).toLocaleString()} を投入し、${formatValue(alpha)} PICSYを取得しました。`);
        setEntryJPY(1000);
    };

    // 【アクション：SGM】為替 Exit (PICSY → 円)
    const executeExit = () => {
        const alpha_out = parseFloat(exitAlpha);
        if (alpha_out <= 0 || isNaN(alpha_out)) return;
        const uIndex = members.findIndex(m => m.id === parseInt(exitUser));
        if (uIndex <= 0) return;

        const user = members[uIndex];
        if (user.P < alpha_out) {
            alert('ユーザーの購買力(P)が不足しています。');
            return;
        }

        const M = gateway.M;
        const K = gateway.K;
        const E00 = matrix[0][0];
        const E00_new = E00 + alpha_out;

        let nextMatrix = matrix.map(row => [...row]);

        let sumEj0 = 0;
        for (let i = 1; i < members.length; i++) sumEj0 += nextMatrix[i][0];

        if (sumEj0 <= 0 || sumEj0 < alpha_out) {
            alert('Gatewayから社会に配られた評価量（流動性）を上回る引出はできません。');
            return;
        }

        // ゲートウェイ評価の比例徴収
        for (let i = 1; i < members.length; i++) {
            const clawback = alpha_out * (nextMatrix[i][0] / sumEj0);
            nextMatrix[i][0] -= clawback;
        }
        nextMatrix[0][0] = E00_new;

        const M_base = K / E00_new;
        const delta_M_out = M - M_base;

        const C_target = 1.0;
        const tau = Math.max(0, 1.0 - Math.pow(user.C / C_target, 2));
        const delta_M_final = delta_M_out * (1.0 - tau);

        const M_new = M - delta_M_final;
        const K_new = M_new * E00_new; // 税金分で不変量Kが成長する

        setGateway({ M: M_new, K: K_new });
        setMatrix(nextMatrix);
        setMembers(prev => {
            const nextMembers = [...prev];
            nextMembers[uIndex] = { ...nextMembers[uIndex], P: nextMembers[uIndex].P - alpha_out };
            return nextMembers;
        });

        addLog(`為替(出金)：${user.name}さんが ${formatValue(alpha_out)} PICSYを消費し、¥${Math.floor(delta_M_final).toLocaleString()} を引き出しました。(出口税率: ${(tau * 100).toFixed(1)}%)`);
    };

    const focusMember = members.find(m => m.id === parseInt(focusMemberId)) || members[1];
    const focusMemberIndex = members.findIndex(m => m.id === (focusMember ? focusMember.id : -1));

    // Gatewayが集めた合計評価を算出（Exitスライダーの最大値制御用）
    const totalGatewayEval = (() => {
        let s = 0;
        for (let i = 1; i < members.length; i++) s += matrix[i][0];
        return s;
    })();

    return (
        <div className="container mx-auto px-4 py-8 max-w-[95%] xl:max-w-[1400px]">
            {/* ================= ヘッダーセクション ================= */}
            <header className="mb-10 text-center relative flex flex-col md:flex-row justify-between items-center border-b border-slate-200/60 pb-6 gap-4">
                <div className="flex flex-col items-start">
                    <h1 className="text-4xl font-extrabold text-teal-800 tracking-tight drop-shadow-sm mb-1">
                        PICSY Simulator
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">伝播的投資貨幣PICSY</p>
                </div>

                <div className="flex flex-col flex-wrap sm:flex-row items-center gap-3">
                    <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wide">法定通貨プール (JPY)</span>
                        <span className="text-amber-600 font-mono font-bold text-lg bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 shadow-inner">¥ {Math.floor(gateway.M).toLocaleString()}</span>
                    </div>

                    <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 relative group">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wide">システム体力 (Vitality)</span>
                        <span className="text-indigo-600 font-mono font-bold text-lg bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200 shadow-inner">{gateway.K.toFixed(2)}</span>
                        {/* Tooltip (下に表示) */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-xs text-white rounded shadow-lg z-50 text-center">
                            この数値が高いほど、大きな金額が動いても為替レートが安定します（法定通貨プール × ゲートウェイ予算）。
                            <svg className="absolute text-slate-800 h-2 w-full left-0 bottom-full rotate-180" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0" /></svg>
                        </div>
                    </div>

                    <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wide">総人口</span>
                        <span className="text-blue-600 font-mono font-bold text-lg bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 shadow-inner">{members.length - 1} <span className="text-sm font-sans">人</span></span>
                    </div>

                    <button
                        onClick={() => setMultiplier(prev => prev === 1 ? 10000 : 1)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-all ${multiplier === 10000
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:opacity-90'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        {multiplier === 10000 ? '通常表示(1x)に戻す' : '生活感モード(1万倍)'}
                    </button>
                </div>
            </header>

            {/* ================= メインレイアウトグリッド ================= */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* ---------------- 左カラム：行列とログ ---------------- */}
                <div className="xl:col-span-2 space-y-8 flex flex-col h-full">

                    {/* ====== 評価行列 ====== */}
                    <div className="glass-panel p-6 sm:p-8 flex-none shadow-lg border border-slate-200/60 bg-white/70">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-slate-800">
                                <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full shadow-sm"></div>
                                評価行列 (Evaluation Matrix)
                            </h2>
                            <button onClick={recalculateC} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 w-full md:w-auto px-6 py-2.5 rounded-xl font-bold text-sm shadow-md flex justify-center items-center gap-2 text-white transition-all transform active:scale-[0.98]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                貢献度(C)を再計算する
                            </button>
                        </div>

                        {/* メンバー追加/削除コントロール */}
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-slate-200/80">
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
                                        {members.filter(m => m.id !== 0).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <button
                                        onClick={removeMember}
                                        disabled={members.length <= 2}
                                        className="w-full sm:w-auto bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm flex justify-center items-center gap-1.5"
                                    >
                                        削除
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* マトリックス（評価行列）テーブル */}
                        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm max-h-[460px] custom-scrollbar">
                            <table className="w-full text-sm text-left relative">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-100/95 sticky top-0 z-20 border-b border-slate-200/80 backdrop-blur-md">
                                    <tr>
                                        <th className="px-3 md:px-5 py-3 font-bold text-slate-700 sticky left-0 bg-slate-100/95 z-30">&nbsp;</th>
                                        <th className="px-3 md:px-5 py-3 font-bold text-emerald-600 whitespace-nowrap"><div className="flex flex-col"><span>購買力</span><span className="text-[10px] text-emerald-400">Power (P)</span></div></th>
                                        <th className="px-3 md:px-5 py-3 font-bold text-indigo-600 whitespace-nowrap"><div className="flex flex-col"><span>貢献度</span><span className="text-[10px] text-indigo-400">Contrib (C)</span></div></th>

                                        {members.map((m, idx) => (
                                            <th key={m.id} className={`px-3 py-3 text-center font-[500] text-[11px] whitespace-nowrap ${idx === 0 ? 'bg-slate-50 text-slate-400 border-l border-slate-200' : 'text-slate-500 font-bold'}`} title={`送信者: ${m.name}`}>{m.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {members.map((receiver, i) => (
                                        <tr key={receiver.id} className={`transition-colors ${i === 0 ? 'bg-slate-50 text-slate-500 hover:bg-slate-100' : 'hover:bg-blue-50/40'}`}>
                                            <td className={`px-3 md:px-5 py-2.5 whitespace-nowrap sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${i === 0 ? 'bg-slate-50 text-slate-400 font-[500]' : 'bg-white/95 text-slate-700 font-bold'}`}>{receiver.name}</td>
                                            <td className={`px-3 md:px-5 py-2.5 font-mono tracking-tight whitespace-nowrap text-right pr-4 ${i === 0 ? 'text-slate-400 font-[500]' : 'text-emerald-700 bg-emerald-50/40 font-bold'}`}>{i === 0 ? '-' : formatValue(receiver.P)}</td>
                                            <td className={`px-3 md:px-5 py-2.5 font-mono tracking-tight whitespace-nowrap text-right pr-4 ${i === 0 ? 'text-slate-400 bg-slate-100/40 font-[500]' : 'text-indigo-700 bg-indigo-50/40 font-bold'}`}>{formatValue(receiver.C)}</td>

                                            {members.map((sender, j) => {
                                                const isGatewayCell = i === 0 || j === 0;
                                                const isMatrixZeroZero = i === 0 && j === 0;
                                                const isSelf = i === j && !isGatewayCell;

                                                let cellClasses = 'px-3 py-2.5 text-center matrix-cell font-mono text-xs tracking-tight ';
                                                if (isMatrixZeroZero) cellClasses += 'bg-slate-100 text-slate-400 font-[500] border-l border-slate-200';
                                                else if (j === 0) cellClasses += 'bg-slate-50 text-slate-400 font-[500] border-l border-slate-200';
                                                else if (i === 0) cellClasses += 'bg-slate-50 text-slate-400 font-[500] border-b border-slate-200';
                                                else if (isSelf) cellClasses += 'bg-indigo-100/40 text-indigo-900 font-semibold';
                                                else cellClasses += 'text-slate-600';

                                                return (
                                                    <td key={`${i}-${j}`} className={cellClasses}>
                                                        {formatValue(matrix[i][j])}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ====== システムログ ====== */}
                    <div className="glass-panel p-6 sm:p-8 flex-1 flex flex-col min-h-[250px] shadow-lg border border-slate-200/60 bg-white/70">
                        <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800 mb-4 border-b border-slate-200/60 pb-3">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full"></div>
                            システムログ (System Logs)
                        </h2>
                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto custom-scrollbar shadow-inner text-slate-300 text-sm font-mono h-[200px]">
                            <div className="space-y-1">
                                {logs.length === 0 ? (
                                    <p className="text-slate-500 text-center mt-4">ログはありません。</p>
                                ) : (
                                    logs.map((log, idx) => (
                                        <div key={idx} className="flex gap-3 px-2 py-1.5 hover:bg-slate-800/80 rounded transition-colors break-words items-start">
                                            <span className="text-slate-500 whitespace-nowrap shrink-0">[{log.time}]</span>
                                            <span className={`${log.msg.startsWith('為替') ? 'text-amber-400 font-bold' :
                                                log.msg.startsWith('取引') ? 'text-emerald-400 font-bold' :
                                                    log.msg.startsWith('計算') ? 'text-blue-300' :
                                                        log.msg.startsWith('更新') ? 'text-orange-300' :
                                                            log.msg.startsWith('退出') ? 'text-rose-400' :
                                                                log.msg.startsWith('参加') ? 'text-fuchsia-300' : 'text-slate-300'
                                                }`}>{log.msg}</span>
                                        </div>
                                    ))
                                )}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </div>

                </div>

                {/* ---------------- 右カラム：操作・詳細パネル ---------------- */}
                <div className="space-y-6">

                    {/* ====== 取引パネル ====== */}
                    <div className="glass-panel p-7 shadow-lg border border-slate-200/60 bg-white/70">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full shadow-sm"></div>
                            手動取引 (Manual Transaction)
                        </h2>

                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative z-10">
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">送信者 (Sender)</label>
                                <select
                                    value={txSenderId}
                                    onChange={e => setTxSenderId(e.target.value)}
                                    className="w-full bg-purple-50/50 border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:outline-none appearance-none font-bold text-slate-700"
                                >
                                    {members.filter(m => m.id !== 0).map(m => <option key={m.id} value={m.id}>{m.name} (残高: {formatValue(m.P)})</option>)}
                                </select>
                            </div>

                            <div className="flex justify-center my-2 relative z-20">
                                <div className="bg-white p-1.5 rounded-full shadow-sm border border-slate-200 text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative z-10">
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">受信者 (Receiver)</label>
                                <select
                                    value={txReceiverId}
                                    onChange={e => setTxReceiverId(e.target.value)}
                                    className="w-full bg-pink-50/50 border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 focus:outline-none appearance-none font-bold text-slate-700"
                                >
                                    {members.filter(m => m.id !== 0).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>

                            <div className="px-2 pt-4 pb-2">
                                <div className="flex justify-between text-sm font-bold mb-3">
                                    <label className="text-slate-600">金額 (Amount)</label>
                                    <span className="text-purple-700 font-mono bg-purple-100 px-3 py-1 rounded shadow-sm border border-purple-200">{formatValue(parseFloat(txAmount), 2)}</span>
                                </div>
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
                                className="w-full bg-blue-600 hover:bg-blue-500 py-3.5 rounded-xl font-bold text-white transition-all shadow-md mt-2 active:scale-[0.98] border border-blue-700/50"
                            >
                                評価を転送して取引を確定する
                            </button>
                        </div>
                    </div>

                    {/* ====== 自然回収パネル ====== */}
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
                            <button
                                onClick={executeRecovery}
                                className="w-full bg-white hover:bg-emerald-50 py-3.5 rounded-xl font-bold text-emerald-600 transition-all shadow-sm active:scale-[0.98] border-2 border-emerald-500/80 flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                時間を進める（自然回収を実行）
                            </button>
                        </div>
                    </div>

                    {/* ====== 為替 (Exchange) パネル ====== */}
                    <div className="glass-panel p-7 shadow-lg border border-slate-200/60 bg-white/70">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full shadow-sm"></div>
                            為替 (Exchange)
                        </h2>

                        <div className="flex border-b border-slate-200 mb-5">
                            <button
                                onClick={() => setActiveTab('entry')}
                                className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'entry' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Entry (円 → P)
                            </button>
                            <button
                                onClick={() => setActiveTab('exit')}
                                className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'exit' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Exit (P → 円)
                            </button>
                        </div>

                        {activeTab === 'entry' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative z-10">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">対象ユーザー</label>
                                    <select
                                        value={entryUser}
                                        onChange={e => setEntryUser(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none appearance-none font-bold text-slate-700"
                                    >
                                        {members.filter(m => m.id !== 0).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative z-10">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">投入する日本円 (JPY)</label>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-500">¥</span>
                                        <input
                                            type="number" min="1" step="1" value={entryJPY}
                                            onChange={e => setEntryJPY(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none font-bold text-slate-700"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={executeEntry}
                                    className="w-full bg-amber-500 hover:bg-amber-400 py-3.5 rounded-xl font-bold text-white transition-all shadow-md mt-2 active:scale-[0.98] border border-amber-600/50 flex justify-center items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                    PICSYを取得する
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative z-10">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">対象ユーザー</label>
                                    <select
                                        value={exitUser}
                                        onChange={e => setExitUser(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none appearance-none font-bold text-slate-700"
                                    >
                                        {members.filter(m => m.id !== 0).map(m => <option key={m.id} value={m.id}>{m.name} (残高: {formatValue(m.P)})</option>)}
                                    </select>
                                </div>
                                <div className="px-2 pt-2 pb-2">
                                    <div className="flex justify-between text-sm font-bold mb-3">
                                        <label className="text-slate-600">消費額 (α out)</label>
                                        <span className="text-amber-700 font-mono bg-amber-100 px-3 py-1 rounded shadow-sm border border-amber-200">{formatValue(parseFloat(exitAlpha), 3)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={Math.min(members.find(m => m.id === parseInt(exitUser))?.P || 0, totalGatewayEval)}
                                        step="0.001"
                                        value={exitAlpha}
                                        onChange={e => setExitAlpha(e.target.value)}
                                        className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                                        <span>{formatValue(0)}</span>
                                        <span>Max</span>
                                    </div>
                                </div>

                                {/* プレビュー表示 */}
                                {(() => {
                                    const activeExitMember = members.find(m => m.id === parseInt(exitUser));
                                    if (!activeExitMember) return null;
                                    const previewAlphaOut = parseFloat(exitAlpha) || 0;
                                    const E00_new = matrix[0][0] + previewAlphaOut;
                                    const M_base = gateway.K / E00_new;
                                    const delta_M_out = gateway.M - M_base;
                                    const tau = Math.max(0, 1.0 - Math.pow(activeExitMember.C / 1.0, 2));
                                    const previewMFinal = delta_M_out > 0 ? delta_M_out * (1.0 - tau) : 0;

                                    return (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm shadow-inner">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-slate-500 font-bold">現在の貢献度 (C)</span>
                                                <span className="text-indigo-600 font-mono font-bold text-base">{formatValue(activeExitMember.C)}</span>
                                            </div>
                                            <div className="flex justify-between mb-3 border-b border-slate-200 pb-3">
                                                <span className="text-slate-500 font-bold flex items-center gap-1">
                                                    推定出口税率 <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                </span>
                                                <span className={`${tau > 0 ? 'text-rose-500' : 'text-emerald-500'} font-mono font-bold text-base`}>{(tau * 100).toFixed(1)} %</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-700 font-bold">最終受取円</span>
                                                <span className="text-amber-600 font-mono font-extrabold text-xl">¥ {Math.floor(previewMFinal).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <button
                                    onClick={executeExit}
                                    className="w-full bg-slate-800 hover:bg-slate-700 py-3.5 rounded-xl font-bold text-amber-400 transition-all shadow-md mt-2 active:scale-[0.98] border border-slate-600 flex justify-center items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                    PICSYを消費して日本円を出金
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ====== 個人ログ パネル ====== */}
                    <div className="glass-panel p-7 shadow-lg border border-slate-200/60 bg-white/70">
                        <h2 className="text-xl font-bold mb-5 flex items-center gap-3 text-slate-800">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-teal-400 to-emerald-500 rounded-full shadow-sm"></div>
                            個人ログ (Log)
                        </h2>

                        <div className="bg-white p-2 rounded-xl border border-slate-200 mb-5 shadow-sm">
                            <select
                                value={focusMemberId}
                                onChange={e => setFocusMemberId(e.target.value)}
                                className="w-full bg-transparent border-0 px-3 py-2 font-bold text-slate-700 appearance-none focus:outline-none"
                            >
                                {members.filter(m => m.id !== 0).map(m => <option key={m.id} value={m.id}>対象: {m.name}</option>)}
                            </select>
                        </div>

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

                                <ul className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                    {members.map((sender, sIndex) => {
                                        if (sender.id === focusMember.id) return null;
                                        if (sender.id === 0) return null; // Gatewayからの評価は除く

                                        const rawVal = matrix[focusMemberIndex][sIndex];
                                        if (rawVal <= 1.0) return null;

                                        return (
                                            <li key={sender.id} className="flex justify-between text-sm items-center bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm transition-all hover:border-cyan-300">
                                                <span className="text-slate-700 font-bold">{sender.name}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-cyan-700 font-mono font-bold">{formatValue(rawVal)}</span>
                                                </div>
                                            </li>
                                        );
                                    })}

                                    {members.filter((s, i) => s.id !== focusMember.id && s.id !== 0 && matrix[focusMemberIndex][i] > 1.0).length === 0 && (
                                        <div className="text-center text-slate-400 text-xs py-4">まだ誰からも手動取引を受けていません</div>
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
