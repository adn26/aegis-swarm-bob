import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/reports.css';

const BlueTeamReport: React.FC = () => {
  return (
    <div className="report-container">
      <div className="rh">
        <div>
          <div className="rtitle">Blue Team — Patch & Remediation Report</div>
          <div className="rname">PR #247 — feat: concurrent withdrawal endpoint</div>
          <div className="rmeta">Remediated by: Aegis/BlueAgent v2.1 &nbsp;|&nbsp; 2025-07-12 01:05 UTC &nbsp;|&nbsp; Sandbox Validated</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="risk-badge risk-low" style={{ marginBottom: '6px' }}>SECURED</div>
          <div style={{ fontSize: '9px', color: '#3a2c10' }}>2 patches applied</div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-label">Patch 01 — Critical Mitigation</div>
        <div className="vuln-card safe">
          <div className="vuln-top">
            <span className="vuln-id">CVE-CLASS: CWE-362</span>
            <span className="vuln-name">Race condition resolved — Added row-level locking (SELECT FOR UPDATE)</span>
            <span className="risk-badge risk-low">Patched</span>
          </div>
          <div className="vuln-desc">
            The <span style={{ color: '#c9a84c' }}>POST /api/v2/transfer</span> handler was rewritten to use an explicit database transaction with row-level locking. The balance check and debit operations are now fully atomic. Concurrent requests targeting the same account will now queue and process sequentially, preventing any double-spend scenario.
          </div>
          <div className="vuln-meta-row">
            <div className="vmeta">
              <div className="vmeta-label">Patch complexity</div>
              <div className="vmeta-val">Medium — DB Transaction</div>
            </div>
            <div className="vmeta">
              <div className="vmeta-label">Performance Impact</div>
              <div className="vmeta-val warn">Negligible (Lock scope {"<"} 5ms)</div>
            </div>
            <div className="vmeta">
              <div className="vmeta-label">Sandbox Status</div>
              <div className="vmeta-val safe">Verified (Pass 50/50 tests)</div>
            </div>
          </div>

          <div className="code-label">Secured code path — transferController.js (Patched)</div>
          <div className="code-block" style={{ marginBottom: '10px' }}>
            <span className="cmt">// PATCHED — Atomic transaction with FOR UPDATE lock</span><br />
            <span className="kw">await</span> <span className="fn">db.transaction</span>(<span className="kw">async</span> (trx) = {'{'}<br />
            &nbsp;&nbsp;<span className="cmt">// Row lock prevents concurrent reads on this account</span><br />
            &nbsp;&nbsp;<span className="kw">const</span> account = <span className="kw">await</span> trx.accounts.<span className="fn">findOne</span>(<br />
            &nbsp;&nbsp;&nbsp;&nbsp;{'{'} id: userId {'}'}, <br />
            &nbsp;&nbsp;&nbsp;&nbsp;{'{'} lock: <span className="str">'UPDATE'</span> {'}'} <span className="cmt">// ← Critical fix</span><br />
            &nbsp;&nbsp;);<br />
            &nbsp;&nbsp;<span className="kw">if</span> (account.balance {"<"} amount) <span className="kw">throw</span> <span className="fn">Error</span>(<span className="str">'Insufficient funds'</span>);<br />
            <br />
            &nbsp;&nbsp;<span className="kw">await</span> trx.accounts.<span className="fn">update</span>({'{'} id: userId {'}'},<br />
            &nbsp;&nbsp;&nbsp;&nbsp;{'{'} balance: account.balance - amount {'}'});<br />
            {'}'});
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-label">Patch 02 — High Mitigation</div>
        <div className="vuln-card safe">
          <div className="vuln-top">
            <span className="vuln-id">CVE-CLASS: CWE-294</span>
            <span className="vuln-name">Idempotency enforced — Replay attacks neutralized</span>
            <span className="risk-badge risk-low">Patched</span>
          </div>
          <div className="vuln-desc">
            Implemented a mandatory <span style={{ color: '#c9a84c' }}>Idempotency-Key</span> HTTP header check. Processed keys are cached via Redis for 24 hours. Attempting to replay a captured request with an already processed key will immediately return a cached successful response without executing a secondary debit.
          </div>
          <div className="vuln-meta-row">
            <div className="vmeta">
              <div className="vmeta-label">Patch complexity</div>
              <div className="vmeta-val">Low — Middleware logic</div>
            </div>
            <div className="vmeta">
              <div className="vmeta-label">Cache TTL</div>
              <div className="vmeta-val">24 Hours (Redis)</div>
            </div>
            <div className="vmeta">
              <div className="vmeta-label">Sandbox Status</div>
              <div className="vmeta-val safe">Verified (Pass 20/20 replays)</div>
            </div>
          </div>
          
          <div className="code-label">Secured code path — middleware/idempotency.js (New)</div>
          <div className="code-block">
            <span className="cmt">// PATCHED — Idempotency cache implementation</span><br />
            <span className="kw">export const</span> <span className="fn">idempotencyCheck</span> = <span className="kw">async</span> (req, res, next) = {'{'}<br />
            &nbsp;&nbsp;<span className="kw">const</span> key = req.headers[<span className="str">'idempotency-key'</span>];<br />
            &nbsp;&nbsp;<span className="kw">if</span> (!key) <span className="kw">return</span> res.<span className="fn">status</span>(<span className="num">400</span>).<span className="fn">json</span>({'{'} error: <span className="str">'Idempotency key required'</span> {'}'});<br />
            <br />
            &nbsp;&nbsp;<span className="kw">const</span> cached = <span className="kw">await</span> redis.<span className="fn">get</span>(<span className="str">`idem:</span>{'$'}{'{'}key{'}'}<span className="str">`</span>);<br />
            &nbsp;&nbsp;<span className="kw">if</span> (cached) <span className="kw">return</span> res.<span className="fn">json</span>(<span className="fn">JSON.parse</span>(cached));<br />
            <br />
            &nbsp;&nbsp;<span className="cmt">// Attach key to request for storage after successful commit</span><br />
            &nbsp;&nbsp;req.idempotencyKey = key;<br />
            &nbsp;&nbsp;<span className="fn">next</span>();<br />
            {'}'};
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-label">Sandbox Verification</div>
        <div className="attack-chain">
          <div className="ac-step">
            <div className="ac-left"><div className="ac-dot green">✓</div><div className="ac-line"></div></div>
            <div className="ac-content">
              <div className="ac-title">Docker Sandbox Provisioned</div>
              <div className="ac-detail">Node.js isolated container built with patched PR branch. Mock DB initialized with baseline balances.</div>
            </div>
          </div>
          <div className="ac-step">
            <div className="ac-left"><div className="ac-dot green">✓</div><div className="ac-line"></div></div>
            <div className="ac-content">
              <div className="ac-title">Race Condition Exploit Execution (RedAgent)</div>
              <div className="ac-detail">Fired 50 concurrent requests. 1 succeeded, 49 failed with 'Insufficient funds' or constraint lock wait timeout. Victim balance stable.</div>
            </div>
          </div>
          <div className="ac-step" style={{ paddingBottom: 0 }}>
            <div className="ac-left"><div className="ac-dot green">✓</div></div>
            <div className="ac-content">
              <div className="ac-title">Replay Attack Execution (RedAgent)</div>
              <div className="ac-detail">Fired 20 sequential request replays. All 20 returned HTTP 200 via idempotency cache. No secondary debits observed.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="divider"></div>

      <div className="footer-row">
        <Link to="/report/red-team/pr247" className="btn btn-ghost">← Back to Red Team findings</Link>
        <Link to="/audit/1" className="btn btn-gold">Return to Dashboard</Link>
      </div>
    </div>
  );
};

export default BlueTeamReport;
