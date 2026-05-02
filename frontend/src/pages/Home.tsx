import '../styles/command-center.css';

function Home() {
  const sendPrompt = (msg: string) => {
    console.log('Sending prompt:', msg);
  };

  return (
    <div className="flex justify-center p-6 w-full">
      <div className="w-full">
        <div className="cc-root">
          <div className="cc-pr-header">
            <div className="cc-status-dot"></div>
            <div>
              <div className="cc-pr-title">Pull Request</div>
              <div className="cc-pr-name">feat: add concurrent withdrawal endpoint — /api/v2/transfer</div>
            </div>
            <div className="cc-pr-meta" style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div>adnan-dev → main</div>
              <div>iWealthX · 3 files changed</div>
            </div>
          </div>

          <div className="cc-timeline" style={{ marginBottom: '14px' }}>
            <div className="cc-tl-step">
              <div className="cc-tl-dot done">✓</div>
              <div className="cc-tl-label">PR ingested</div>
            </div>
            <div className="cc-tl-step">
              <div className="cc-tl-dot done">✓</div>
              <div className="cc-tl-label">Red team</div>
            </div>
            <div className="cc-tl-step">
              <div className="cc-tl-dot active">→</div>
              <div className="cc-tl-label active">Blue team</div>
            </div>
            <div className="cc-tl-step">
              <div className="cc-tl-dot idle">□</div>
              <div className="cc-tl-label">Sandbox</div>
            </div>
            <div className="cc-tl-step">
              <div className="cc-tl-dot idle">□</div>
              <div className="cc-tl-label">Verdict</div>
            </div>
          </div>

          <div className="cc-metrics">
            <div className="cc-metric">
              <div className="cc-metric-label">Vulns found</div>
              <div className="cc-metric-val red">2</div>
            </div>
            <div className="cc-metric">
              <div className="cc-metric-label">Patches gen.</div>
              <div className="cc-metric-val amber">1</div>
            </div>
            <div className="cc-metric">
              <div className="cc-metric-label">Sandbox runs</div>
              <div className="cc-metric-val">0</div>
            </div>
            <div className="cc-metric">
              <div className="cc-metric-label">Time elapsed</div>
              <div className="cc-metric-val">1m 42s</div>
            </div>
          </div>

          <div className="cc-arena">
            <div className="cc-team" style={{ background: '#080400' }}>
              <div className="cc-team-header">
                <div className="cc-team-icon red">⚔</div>
                <span className="cc-team-name red">Red Team</span>
                <span className="cc-team-status">COMPLETE</span>
              </div>
              <div className="cc-log-entry">
                <div className="cc-log-time">00:00:12</div>
                <div className="cc-log-msg">Scanning diff for async state mutations...</div>
              </div>
              <div className="cc-log-entry">
                <div className="cc-log-time">00:00:31</div>
                <div className="cc-log-msg danger">CRITICAL: Race condition detected in balance debit path. No atomic lock on getBalance → debit sequence.</div>
              </div>
              <div className="cc-log-entry">
                <div className="cc-log-time">00:00:48</div>
                <div className="cc-log-msg">Generating exploit — firing 50 concurrent requests before balance commit...</div>
              </div>
              <div className="cc-code-block">
                <span className="cmt">// exploit.js — double-spend via race</span><br />
                <span className="kw">const</span> reqs = Array(50).fill(<span className="kw">null</span>).map({'() =>'}<br />
                &nbsp;&nbsp;fetch(<span className="str">'/api/v2/transfer'</span>, &#123;<br />
                &nbsp;&nbsp;&nbsp;&nbsp;method: <span className="str">'POST'</span>,<br />
                &nbsp;&nbsp;&nbsp;&nbsp;body: JSON.stringify(&#123; amount: 9999, to: <span className="str">'atk'</span> &#125;)<br />
                &nbsp;&nbsp;&#125;)<br />
                );<br />
                <span className="kw">await</span> Promise.all(reqs);<br />
                <span className="cmt">// Expected: balance < 0 → funds drained</span>
              </div>
              <div className="cc-log-entry">
                <div className="cc-log-time">01:02:00</div>
                <div className="cc-log-msg danger">SECONDARY: Missing idempotency key validation. Same tx can replay across sessions.</div>
              </div>
            </div>
            <div className="cc-divider"></div>
            <div className="cc-team" style={{ background: '#040408' }}>
              <div className="cc-team-header">
                <div className="cc-team-icon blue">🛡</div>
                <span className="cc-team-name blue">Blue Team</span>
                <span className="cc-team-status" style={{ animation: 'cc-pulse 1.5s infinite', color: '#c9a84c' }}>PATCHING...</span>
              </div>
              <div className="cc-log-entry">
                <div className="cc-log-time">01:02:08</div>
                <div className="cc-log-msg">Received Red Team exploit. Analyzing attack vector...</div>
              </div>
              <div className="cc-log-entry">
                <div className="cc-log-time">01:02:24</div>
                <div className="cc-log-msg highlight">Strategy: wrap debit in DB-level row lock + Redis mutex per account ID.</div>
              </div>
              <div className="cc-code-block">
                <span className="cmt">// patch: atomic lock on transfer</span><br />
                <span className="kw">const</span> lock = <span className="kw">await</span> redis.set(<br />
                &nbsp;&nbsp;<span className="str">`lock:$&#123;accountId&#125;`</span>, <span className="str">'1'</span>,<br />
                &nbsp;&nbsp;<span className="str">'NX'</span>, <span className="str">'PX'</span>, 3000<br />
                );<br />
                <span className="kw">if</span> (!lock) <span className="kw">throw</span> <span className="kw">new</span> Error(<span className="str">'Concurrent tx'</span>);<br />
                <span className="kw">await</span> db.transaction(<span className="kw">async</span> (trx) {'=>'} &#123;<br />
                &nbsp;&nbsp;<span className="kw">await</span> trx.raw(<span className="str">'SELECT ... FOR UPDATE'</span>);<br />
                &nbsp;&nbsp;<span className="cmt">// debit only after lock acquired</span><br />
                &#125;);
              </div>
              <div className="cc-log-entry">
                <div className="cc-log-time">01:02:41</div>
                <div className="cc-log-msg">Patch generated. Awaiting sandbox verification...</div>
              </div>
            </div>
          </div>

          <div className="cc-judge-panel">
            <div className="cc-judge-header">
              <span style={{ fontSize: '13px', color: '#6a5820' }}>⚖</span>
              <span className="cc-judge-title">Sandbox Judge</span>
              <div className="cc-verdict">
                <span className="cc-verdict-label">VERDICT</span>
                <span className="cc-verdict-val pending">PENDING</span>
              </div>
            </div>
            <div className="cc-sandbox-grid">
              <div className="cc-sandbox-step">
                <div className="cc-sandbox-step-label">Docker env</div>
                <div className="cc-sandbox-step-val ok">✓ Spawned</div>
              </div>
              <div className="cc-sandbox-step">
                <div className="cc-sandbox-step-label">Patch applied</div>
                <div className="cc-sandbox-step-val ok">✓ Compiled</div>
              </div>
              <div className="cc-sandbox-step">
                <div className="cc-sandbox-step-label">Exploit run</div>
                <div className="cc-sandbox-step-val run">● Running</div>
              </div>
              <div className="cc-sandbox-step">
                <div className="cc-sandbox-step-label">Balance integrity</div>
                <div className="cc-sandbox-step-val run">● Checking</div>
              </div>
              <div className="cc-sandbox-step">
                <div className="cc-sandbox-step-label">Replay attack</div>
                <div className="cc-sandbox-step-val idle" style={{ color: '#3a2c10' }}>— Queued</div>
              </div>
              <div className="cc-sandbox-step">
                <div className="cc-sandbox-step-label">Final score</div>
                <div className="cc-sandbox-step-val idle" style={{ color: '#3a2c10' }}>— Queued</div>
              </div>
            </div>
          </div>

          <div className="cc-action-row">
            <button className="cc-btn cc-btn-gold" onClick={() => sendPrompt('Show me the full Red Team exploit report for PR #247')}>View full report ↗</button>
            <button className="cc-btn cc-btn-ghost" onClick={() => sendPrompt('Explain the race condition vulnerability found in the transfer endpoint')}>Explain vuln ↗</button>
            <button className="cc-btn cc-btn-ghost" onClick={() => sendPrompt('What would happen if the sandbox verdict fails?')}>What if it fails? ↗</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;