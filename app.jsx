const { useState, useEffect } = React;

const App = () => {
    const [members, setMembers] = useState([
        { id: 0, name: "Alice", P: 1.0, C: 1.0 },
        { id: 1, name: "Bob", P: 1.0, C: 1.0 },
        { id: 2, name: "Charlie", P: 1.0, C: 1.0 },
    ]);

    const [matrix, setMatrix] = useState([
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0],
    ]);

    const [newMemberName, setNewMemberName] = useState("");
    const [focusMemberId, setFocusMemberId] = useState(0);

    const [txSenderId, setTxSenderId] = useState(0);
    const [txReceiverId, setTxReceiverId] = useState(1);
    const [txAmount, setTxAmount] = useState(0.5);

    const [recoveryRate, setRecoveryRate] = useState(0.05);

    const addMember = () => {
        if (members.length >= 30 || !newMemberName.trim()) return;
        const newId = members.length;
        const newMember = { id: newId, name: newMemberName.trim(), P: 1.0, C: 1.0 };

        setMembers(prev => [...prev, newMember]);
        setMatrix(prev => {
            const nextMatrix = prev.map(row => [...row, 1.0]);
            nextMatrix.push(new Array(newId + 1).fill(1.0));
            return nextMatrix;
        });
        setNewMemberName("");
    };

    const recalculateC = () => {
        const N = members.length;
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
    };

    const executeTransaction = () => {
        const s = parseInt(txSenderId);
        const r = parseInt(txReceiverId);
        const amt = parseFloat(txAmount);
        if (s === r) {
            alert('SENDER and RECEIVER must be different.');
            return;
        }
        if (members[s].P < amt) {
            alert('Insufficient purchasing power (P) for SENDER.');
            return;
        }

        const newMembers = [...members];
        newMembers[s] = { ...newMembers[s], P: newMembers[s].P - amt };
        newMembers[r] = { ...newMembers[r], P: newMembers[r].P + amt };

        const newMatrix = matrix.map(row => [...row]);
        newMatrix[r][s] += amt;

        setMembers(newMembers);
        setMatrix(newMatrix);
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
    };

    const focusMember = members.find(m => m.id === parseInt(focusMemberId)) || members[0];

    return (
        <div className="container mx-auto px-4 py-10 max-w-7xl">
            <header className="mb-12 text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
                <h1 className="relative text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 mb-4 tracking-tight">
                    PICSY Simulator
                </h1>
                <p className="block text-slate-400 text-xl font-light">Propagational Investment Currency System</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Data & Actions */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Matrix Panel */}
                    <div className="glass-panel p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <div className="w-1.5 h-8 bg-gradient-to-b from-blue-400 to-cyan-500 rounded-full"></div>
                                Evaluation Matrix
                            </h2>
                            <button onClick={recalculateC} className="btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                貢献度(C)を再計算する
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/60 shadow-inner">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 border-b border-slate-700/80">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold">Node</th>
                                        <th className="px-5 py-4 font-semibold text-green-400">P (Power)</th>
                                        <th className="px-5 py-4 font-semibold text-indigo-400">C (Contrib)</th>
                                        {members.map(m => (
                                            <th key={m.id} className="px-5 py-4 text-center font-medium opacity-70" title={`Sender: ${m.name}`}>→ {m.name[0]}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {members.map((receiver, i) => (
                                        <tr key={receiver.id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="px-5 py-4 font-medium whitespace-nowrap">{receiver.name}</td>
                                            <td className="px-5 py-4 text-green-400 font-mono tracking-tight">{receiver.P.toFixed(3)}</td>
                                            <td className="px-5 py-4 text-indigo-400 font-mono tracking-tight">{receiver.C.toFixed(3)}</td>
                                            {members.map((sender, j) => (
                                                <td key={`${i}-${j}`} className={`px-5 py-4 text-center matrix-cell font-mono text-sm tracking-tight ${i === j ? 'bg-indigo-900/40 text-indigo-300' : 'text-slate-400'}`}>
                                                    {matrix[i][j].toFixed(3)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50">
                            <input
                                type="text"
                                placeholder="Add new member..."
                                value={newMemberName}
                                onChange={e => setNewMemberName(e.target.value)}
                                className="w-full sm:flex-1 bg-slate-900/80 border border-slate-600 rounded-xl px-5 py-3 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:outline-none transition-all placeholder-slate-500"
                            />
                            <button
                                onClick={addMember}
                                disabled={members.length >= 30 || !newMemberName.trim()}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-semibold transition-all shadow-lg flex justify-center items-center gap-2"
                            >
                                ＋ メンバー追加
                            </button>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: Control Panels */}
                <div className="space-y-6">

                    {/* Transaction Panel */}
                    <div className="glass-panel p-7">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-purple-400 to-pink-500 rounded-full"></div>
                            Execute Transaction
                        </h2>

                        <div className="space-y-5">
                            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sender</label>
                                <select
                                    value={txSenderId}
                                    onChange={e => setTxSenderId(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 focus:outline-none appearance-none font-medium"
                                >
                                    {members.map(m => <option key={m.id} value={m.id}>{m.name} (P: {m.P.toFixed(2)})</option>)}
                                </select>
                            </div>
                            <div className="flex justify-center -my-2 relative z-10">
                                <div className="bg-slate-700 p-2 rounded-full shadow-lg border border-slate-600">
                                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                                </div>
                            </div>
                            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Receiver</label>
                                <select
                                    value={txReceiverId}
                                    onChange={e => setTxReceiverId(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 focus:outline-none appearance-none font-medium"
                                >
                                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="px-2">
                                <div className="flex justify-between text-sm font-medium mb-3">
                                    <label className="text-slate-400">Amount (P)</label>
                                    <span className="text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded">{parseFloat(txAmount).toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0" max="2" step="0.01" value={txAmount}
                                    onChange={e => setTxAmount(e.target.value)}
                                    className="w-full accent-purple-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <button
                                onClick={executeTransaction}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20 mt-4 active:scale-[0.98]"
                            >
                                評価を転送して取引する
                            </button>
                        </div>
                    </div>

                    {/* Recovery Panel */}
                    <div className="glass-panel p-7">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                            Recovery System
                        </h2>

                        <div className="space-y-6">
                            <div className="px-2">
                                <div className="flex justify-between text-sm font-medium mb-3">
                                    <label className="text-slate-400">Rate (γ)</label>
                                    <span className="text-yellow-400 font-mono bg-yellow-500/10 px-2 py-0.5 rounded">{parseFloat(recoveryRate).toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0" max="0.2" step="0.01" value={recoveryRate}
                                    onChange={e => setRecoveryRate(e.target.value)}
                                    className="w-full accent-yellow-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <button
                                onClick={executeRecovery}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-yellow-500/50 py-3.5 rounded-xl font-bold text-yellow-500 hover:text-yellow-400 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                時間を進める（自然回収を実行）
                            </button>
                        </div>
                    </div>

                    {/* Focus Panel */}
                    <div className="glass-panel p-7">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full"></div>
                            Member Detail View
                        </h2>

                        <div className="bg-slate-800/40 p-2 rounded-xl border border-slate-700/50 mb-5">
                            <select
                                value={focusMemberId}
                                onChange={e => setFocusMemberId(e.target.value)}
                                className="w-full bg-transparent border-0 px-3 py-2 focus:ring-0 text-slate-200 font-medium appearance-none"
                                style={{ outline: 'none' }}
                            >
                                {members.map(m => <option className="bg-slate-900" key={m.id} value={m.id}>Inspect: {m.name}</option>)}
                            </select>
                        </div>

                        {focusMember && (
                            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 shadow-inner">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Power (P)</span>
                                    <span className="text-green-400 font-mono font-bold text-lg">{focusMember.P.toFixed(3)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-5 pb-5 border-b border-slate-700/50">
                                    <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Contribution (C)</span>
                                    <span className="text-indigo-400 font-mono font-bold text-lg">{focusMember.C.toFixed(3)}</span>
                                </div>

                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Incoming Evaluations</h3>
                                <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {members.map(sender => {
                                        if (sender.id === focusMember.id) return null;
                                        const val = matrix[focusMember.id][sender.id];
                                        return (
                                            <li key={sender.id} className="flex justify-between text-sm items-center bg-slate-800/80 rounded-lg px-4 py-2.5 border border-slate-700/30">
                                                <span className="text-slate-300 font-medium">from {sender.name}</span>
                                                <span className="text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded">{val.toFixed(3)}</span>
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
