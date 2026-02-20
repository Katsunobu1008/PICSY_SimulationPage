const { useState, useEffect, useRef } = React;

const App = () => {
    // ID counter to generate unique IDs
    const [nextId, setNextId] = useState(4);

    // Initial State (田中, 徳永, 藤井, 山本)
    const [members, setMembers] = useState([
        { id: 0, name: "田中", P: 1.0, C: 1.0 },
        { id: 1, name: "徳永", P: 1.0, C: 1.0 },
        { id: 2, name: "藤井", P: 1.0, C: 1.0 },
        { id: 3, name: "山本", P: 1.0, C: 1.0 },
    ]);

    const [matrix, setMatrix] = useState([
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
    ]);

    const [newMemberName, setNewMemberName] = useState("");
    const [focusMemberId, setFocusMemberId] = useState(0);
    const [removeMemberId, setRemoveMemberId] = useState(0);

    const [txSenderId, setTxSenderId] = useState(0);
    const [txReceiverId, setTxReceiverId] = useState(1);
    const [txAmount, setTxAmount] = useState(0.1);

    const [recoveryRate, setRecoveryRate] = useState(0.05);

    // Logs state
    const [logs, setLogs] = useState([]);

    // Mode state: 1x or 10000x
    const [multiplier, setMultiplier] = useState(1);

    const logsEndRef = useRef(null);

    // Initial state setup for select boxes when members change
    useEffect(() => {
        if (members.length > 0) {
            if (!members.find(m => m.id === parseInt(txSenderId))) setTxSenderId(members[0].id);
            if (!members.find(m => m.id === parseInt(txReceiverId))) setTxReceiverId(members[members.length > 1 ? 1 : 0].id);
            if (!members.find(m => m.id === parseInt(focusMemberId))) setFocusMemberId(members[0].id);
            if (!members.find(m => m.id === parseInt(removeMemberId))) setRemoveMemberId(members[0].id);
        }
    }, [members]);

    // Auto scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (message) => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        setLogs(prev => [...prev, { time: timeStr, msg: message }]);
    };

    // Display value formatter (handles 1x vs 10000x multiplier)
    const formatValue = (val, fixedDecimals = 3) => {
        if (multiplier === 10000) {
            return Math.round(val * 10000).toLocaleString(); // 整数でカンマ区切り
        }
        return val.toFixed(fixedDecimals);
    };

    const addMember = () => {
        if (members.length >= 30) return;

        let name = newMemberName.trim();
        if (!name) {
            name = `メンバー ${nextId + 1}`;
        }

        const newMember = { id: nextId, name: name, P: 1.0, C: 1.0 };

        setMembers(prev => [...prev, newMember]);
        setMatrix(prev => {
            const nextMatrix = prev.map(row => [...row, 1.0]);
            nextMatrix.push(new Array(members.length + 1).fill(1.0));
            return nextMatrix;
        });
        setNextId(prev => prev + 1);
        setNewMemberName("");

        addLog(`参加：${name}さんがネットワークに参加しました。`);
    };

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
        setMatrix(prev => {
            const nextMatrix = prev.filter((_, i) => i !== rmIndex); // remove row
            return nextMatrix.map(row => row.filter((_, j) => j !== rmIndex)); // remove column
        });

        addLog(`退出：${memberToRemove.name}さんがネットワークから退出しました。`);
    };

    const recalculateC = () => {
        const N = members.length;
        if (N === 0) return;
        let E = matrix;

        // Step 2.1
        let W = Array.from({ length: N }, () => new Array(N).fill(0));
        for (let j = 0; j < N; j++) {
            let colSum = 0;
            for (let k = 0; k < N; k++) colSum += E[k][j];
            for (let i = 0; i < N; i++) {
                W[i][j] = colSum === 0 ? 0 : E[i][j] / colSum;
            }
        }

        // Step 2.2
        const alpha = 0.15;
        let W_prime = Array.from({ length: N }, () => new Array(N).fill(0));
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                W_prime[i][j] = (1.0 - alpha) * W[i][j] + (alpha / N);
            }
        }

        // Step 2.3
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

        // Step 2.4
        const newMembers = [...members];
        for (let i = 0; i < N; i++) {
            newMembers[i] = { ...newMembers[i], C: temp_C[i] * N };
        }
        setMembers(newMembers);

        addLog('計算：貢献度(C)を再計算しました。');
    };

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

        const newMembers = [...members];
        newMembers[sIndex] = { ...newMembers[sIndex], P: newMembers[sIndex].P - amt };
        newMembers[rIndex] = { ...newMembers[rIndex], P: newMembers[rIndex].P + amt };

        const newMatrix = matrix.map(row => [...row]);
        newMatrix[rIndex][sIndex] += amt;

        setMembers(newMembers);
        setMatrix(newMatrix);

        const displayAmt = formatValue(amt, 2);
        addLog(`取引：${members[sIndex].name}さんから${members[rIndex].name}さんへ ${displayAmt} PICSY 転送されました。`);
    };

    const executeRecovery = () => {
        const gamma = parseFloat(recoveryRate);
        let V = 0;
        let newMembers = [...members];

        // Step 4.1
        for (let i = 0; i < newMembers.length; i++) {
            let collected = newMembers[i].P * gamma;
            V += collected;
            newMembers[i] = { ...newMembers[i], P: newMembers[i].P - collected };
        }

        // Step 4.2
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
            {/* Header Section */}
            <header className="mb-10 text-center relative flex flex-col md:flex-row justify-between items-center border-b border-slate-200/60 pb-6 gap-4">
                <div className="flex flex-col items-start">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 tracking-tight drop-shadow-sm mb-1">
                        PICSY Simulator
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">伝播的投資通貨システム</p>
                </div>

                {/* Global Info & Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <span className="text-slate-500 text-sm font-bold">総人口</span>
                        <span className="text-blue-600 font-mono font-bold text-lg bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{members.length} 人</span>
                    </div>

                    <button
                        onClick={() => setMultiplier(prev => prev === 1 ? 10000 : 1)}
                        className={`px-5 py-3 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all ${multiplier === 10000
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        {multiplier === 10000 ? '通常表示 (1x) に戻す' : '生活感モード (10,000倍) に切り替え'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Data & Actions */}
                <div className="xl:col-span-2 space-y-8 flex flex-col h-full">

                    {/* Matrix Panel */}
                    <div className="glass-panel p-6 sm:p-8 flex-none">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200/60 pb-5">
                            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-slate-800">
                                <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                                評価行列 (Evaluation Matrix)
                            </h2>
                            <button onClick={recalculateC} className="btn-primary w-full md:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md flex justify-center items-center gap-2 text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                貢献度(C)を再計算する
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/60 shadow-sm max-h-[400px]">
                            <table className="w-full text-sm text-left relative">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-100/95 sticky top-0 z-20 border-b border-slate-200/80 backdrop-blur-md">
                                    <tr>
                                        <th className="px-3 md:px-5 py-4 font-bold text-slate-700 sticky left-0 bg-slate-100/95 z-30">&nbsp;</th>
                                        <th className="px-3 md:px-5 py-4 font-bold text-emerald-600 whitespace-nowrap">購買力 (P)</th>
                                        <th className="px-3 md:px-5 py-4 font-bold text-indigo-600 whitespace-nowrap">貢献度 (C)</th>
                                        {members.map(m => (
                                            <th key={m.id} className="px-3 py-4 text-center font-bold text-slate-500 whitespace-nowrap" title={`送信者: ${m.name}`}>→ {m.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {members.map((receiver, i) => (
                                        <tr key={receiver.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-3 md:px-5 py-3 font-medium text-slate-800 whitespace-nowrap sticky left-0 bg-white/95 z-10 border-r border-slate-100">{receiver.name}</td>
                                            <td className="px-3 md:px-5 py-3 text-emerald-600 font-mono font-medium tracking-tight bg-emerald-50/30 whitespace-nowrap text-right pr-4">{formatValue(receiver.P)}</td>
                                            <td className="px-3 md:px-5 py-3 text-indigo-600 font-mono font-medium tracking-tight bg-indigo-50/30 whitespace-nowrap text-right pr-4">{formatValue(receiver.C)}</td>
                                            {members.map((sender, j) => (
                                                <td key={`${i}-${j}`} className={`px-3 py-3 text-center matrix-cell font-mono text-sm tracking-tight ${i === j ? 'bg-indigo-100/50 text-indigo-800 font-medium' : 'text-slate-600'}`}>
                                                    {formatValue(matrix[i][j])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Member Management Section */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200/60">
                            {/* Add Member */}
                            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    メンバー追加
                                </h3>
                                <div className="flex flex-col xl:flex-row gap-3 items-center">
                                    <input
                                        type="text"
                                        placeholder="名前 (省略可)"
                                        value={newMemberName}
                                        onChange={e => setNewMemberName(e.target.value)}
                                        className="w-full xl:flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition-all placeholder-slate-400 text-slate-700"
                                    />
                                    <button
                                        onClick={addMember}
                                        disabled={members.length >= 30}
                                        className="w-full xl:w-auto bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-xl font-semibold text-white transition-all shadow-md flex justify-center items-center gap-2"
                                    >
                                        追加
                                    </button>
                                </div>
                            </div>

                            {/* Remove Member */}
                            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                                    メンバー削除
                                </h3>
                                <div className="flex flex-col xl:flex-row gap-3 items-center">
                                    <select
                                        value={removeMemberId}
                                        onChange={e => setRemoveMemberId(e.target.value)}
                                        className="w-full xl:flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 focus:outline-none appearance-none font-medium text-slate-700"
                                    >
                                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <button
                                        onClick={removeMember}
                                        disabled={members.length <= 1}
                                        className="w-full xl:w-auto bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm flex justify-center items-center gap-2"
                                    >
                                        削除
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Logs Panel */}
                    <div className="glass-panel p-6 sm:p-8 flex-1 flex flex-col min-h-[300px]">
                        <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800 mb-4 border-b border-slate-200/60 pb-4">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full"></div>
                            システムログ (Transaction History)
                        </h2>
                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto custom-scrollbar shadow-inner relative text-slate-300 text-sm font-mono">
                            <div className="space-y-2">
                                {logs.length === 0 ? (
                                    <p className="text-slate-600 text-center mt-4">ログはありません。</p>
                                ) : (
                                    logs.map((log, idx) => (
                                        <div key={idx} className="flex gap-4 p-2 hover:bg-slate-800/80 rounded transition-colors break-words">
                                            <span className="text-slate-500 whitespace-nowrap shrink-0">[{log.time}]</span>
                                            <span className={`${log.msg.startsWith('取引') ? 'text-green-400' :
                                                    log.msg.startsWith('計算') ? 'text-blue-400' :
                                                        log.msg.startsWith('更新') ? 'text-amber-400' :
                                                            log.msg.startsWith('退出') ? 'text-red-400' :
                                                                log.msg.startsWith('参加') ? 'text-purple-400' : 'text-slate-300'
                                                }`}>{log.msg}</span>
                                        </div>
                                    ))
                                )}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: Control Panels */}
                <div className="space-y-6">

                    {/* Transaction Panel */}
                    <div className="glass-panel p-7">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                            取引実行 (Transaction)
                        </h2>

                        <div className="space-y-5">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-xs font-bold text-slate-500 mb-2">送信者 (Sender)</label>
                                <select
                                    value={txSenderId}
                                    onChange={e => setTxSenderId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:outline-none appearance-none font-medium text-slate-700"
                                >
                                    {members.map(m => <option key={m.id} value={m.id}>{m.name} (P: {formatValue(m.P)})</option>)}
                                </select>
                            </div>
                            <div className="flex justify-center -my-2 relative z-10">
                                <div className="bg-white p-2 rounded-full shadow-md border border-slate-200">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-xs font-bold text-slate-500 mb-2">受信者 (Receiver)</label>
                                <select
                                    value={txReceiverId}
                                    onChange={e => setTxReceiverId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 focus:outline-none appearance-none font-medium text-slate-700"
                                >
                                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="px-2 pt-2">
                                <div className="flex justify-between text-sm font-bold mb-3">
                                    <label className="text-slate-600">金額 (Amount)</label>
                                    <span className="text-purple-600 font-mono bg-purple-100 px-2 py-0.5 rounded shadow-sm border border-purple-200">{formatValue(parseFloat(txAmount), 2)} PICSY</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.01" value={txAmount}
                                    onChange={e => setTxAmount(e.target.value)}
                                    className="w-full accent-purple-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
                                    <span>{formatValue(0)}</span>
                                    <span>{formatValue(1)}</span>
                                </div>
                            </div>
                            <button
                                onClick={executeTransaction}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 py-3.5 rounded-xl font-bold text-white transition-all shadow-md mt-4 active:scale-[0.98]"
                            >
                                評価を転送して取引する
                            </button>
                        </div>
                    </div>

                    {/* Recovery Panel */}
                    <div className="glass-panel p-7">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
                            自然回収 (Recovery)
                        </h2>

                        <div className="space-y-6">
                            <div className="px-2">
                                <div className="flex justify-between text-sm font-bold mb-3">
                                    <label className="text-slate-600">減価率 (γ)</label>
                                    <span className="text-amber-600 font-mono bg-amber-100 px-2 py-0.5 rounded shadow-sm border border-amber-200">{parseFloat(recoveryRate).toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0" max="0.2" step="0.01" value={recoveryRate}
                                    onChange={e => setRecoveryRate(e.target.value)}
                                    className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <button
                                onClick={executeRecovery}
                                className="w-full bg-amber-500 hover:bg-amber-400 border border-amber-600 py-3.5 rounded-xl font-bold text-white transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                時間を進める（自然回収）
                            </button>
                        </div>
                    </div>

                    {/* Focus Panel */}
                    <div className="glass-panel p-7">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                            個別データ (Detail)
                        </h2>

                        <div className="bg-white p-2 rounded-xl border border-slate-200 mb-5 shadow-sm">
                            <select
                                value={focusMember ? focusMember.id : ""}
                                onChange={e => setFocusMemberId(e.target.value)}
                                className="w-full bg-transparent border-0 px-3 py-2 font-bold text-slate-700 appearance-none focus:outline-none"
                            >
                                {members.map(m => <option key={m.id} value={m.id}>確認: {m.name}</option>)}
                            </select>
                        </div>

                        {focusMember && focusMemberIndex !== -1 && (
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-slate-500 text-sm font-bold">購買力 (P)</span>
                                    <span className="text-emerald-600 font-mono font-bold text-lg bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200">{formatValue(focusMember.P)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-5 pb-5 border-b border-slate-200">
                                    <span className="text-slate-500 text-sm font-bold">貢献度 (C)</span>
                                    <span className="text-indigo-600 font-mono font-bold text-lg bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200">{formatValue(focusMember.C)}</span>
                                </div>

                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">他者からの評価 (Incoming)</h3>
                                <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {members.map((sender, sIndex) => {
                                        if (sender.id === focusMember.id) return null;
                                        const val = matrix[focusMemberIndex][sIndex];
                                        return (
                                            <li key={sender.id} className="flex justify-between text-sm items-center bg-white rounded-lg px-4 py-2.5 border border-slate-200 shadow-sm">
                                                <span className="text-slate-600 font-medium">{sender.name} から</span>
                                                <span className="text-cyan-600 font-mono font-bold bg-cyan-100 px-2 py-0.5 rounded border border-cyan-200">{formatValue(val)}</span>
                                            </li>
                                        );
                                    })}
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
