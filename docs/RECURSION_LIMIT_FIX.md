# Recursion Limit Fix

## Problem

The backend test was failing with the error:
```
Recursion limit of 25 reached without hitting a stop condition.
```

## Root Cause

The **actual root cause** was that the AI model invocation was crashing due to incorrect message format:

### Primary Issue: Incorrect LangChain Message Format

The nodes were using plain JavaScript objects `{ role: 'user', content: prompt }` instead of proper LangChain message instances. Vertex AI's LangChain adapter requires `HumanMessage` and `SystemMessage` instances, not plain objects.

```javascript
// BROKEN - Plain objects don't work with Vertex AI adapter
const response = await model.invoke([
  { role: 'user', content: prompt }
]);
```

This caused the `coerceMessageLikeToMessage` function to crash when iterating over the plain object, which cascaded into:

1. Every file analysis failed
2. `moveToNextFile` incremented the index on error
3. `shouldContinueScanning` checked `state.currentFile?.path` for vulnerabilities (always empty since analysis never succeeded)
4. Always returned `'continue'` → infinite loop → hit recursion limit at 25

### Secondary Issue: Recursion Limit Configuration

The recursion limit was being set on `workflow.compile()` instead of on the `stream()` call where it actually needs to be configured.

## Solution

The fix involved two key changes:

### 1. Fix AI Model Invocation (Primary Fix)

Updated all nodes to use proper LangChain message instances:

```javascript
// FIXED - Use proper LangChain message instances
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const response = await model.invoke([
  new SystemMessage('You are a Red Team security expert. Respond only with valid JSON arrays as instructed.'),
  new HumanMessage(prompt)
]);
```

This was applied to:
- [`redteam.node.js`](../backend/src/agents/nodes/redteam.node.js)
- [`blueteam.node.js`](../backend/src/agents/nodes/blueteam.node.js)

### 2. Fix Recursion Limit Configuration

Moved the recursion limit from `compile()` to `stream()`:

```javascript
// WRONG - doesn't work on compile
const app = workflow.compile({
  recursionLimit: 100
});

// CORRECT - set on stream call
const stream = await app.stream(initialState, {
  recursionLimit: 100
});
```

## Additional Workflow Improvements

While fixing the primary issue, we also improved the workflow structure:

### Added a Dedicated `move_to_next_file` Node

Created a new node in the workflow that explicitly handles moving to the next file:

```javascript
const moveToNextFileNode = async (state) => {
  logger.info(`Moving to next file. Current index: ${state.currentFileIndex}`);
  return moveToNextFile(state);
};
```

### Updated Workflow Routing

Changed the conditional edges to route through the new node:

```javascript
// NEW CODE - FIXED
workflow.addConditionalEdges(
  'redteam_analysis',
  shouldContinueScanning,
  {
    continue: 'move_to_next_file', // ← Routes to dedicated node
    patch: 'blueteam_patch',
    finalize: 'finalize_audit',
  }
);

// After moving to next file, analyze it
workflow.addEdge('move_to_next_file', 'redteam_analysis');
```

### Fixed Conditional Logic

Updated `shouldContinueScanning` to check the **next** index:

```javascript
const shouldContinueScanning = (state) => {
  // Check if current file has vulnerabilities
  const currentFileVulns = state.vulnerabilities.filter(
    v => v.filePath === state.currentFile?.path
  );

  if (currentFileVulns.length > 0) {
    return 'patch';
  }

  // Calculate NEXT index before deciding
  const nextIndex = state.currentFileIndex + 1;
  
  if (nextIndex >= state.files.length) {
    return 'finalize';
  }

  return 'continue'; // Now routes to move_to_next_file node
};
```

### Removed Premature `moveToNextFile` Calls

Removed `moveToNextFile()` calls from individual nodes since the workflow now handles this:

- **redteam.node.js**: Removed `moveToNextFile` when no vulnerabilities found
- **blueteam.node.js**: Removed `moveToNextFile` calls
- **sandbox.node.js**: Removed `moveToNextFile` calls

## Workflow Flow (Fixed)

```
scan_files
    ↓
redteam_analysis (file 0)
    ↓
shouldContinueScanning?
    ├─ vulnerabilities found → blueteam_patch → sandbox_test → move_to_next_file
    └─ no vulnerabilities → move_to_next_file
                                ↓
                          redteam_analysis (file 1)
                                ↓
                          shouldContinueScanning?
                                ↓
                          ... (repeat for all files)
                                ↓
                          finalize_audit
```

## Key Principles

1. **Single Responsibility**: Each node does ONE thing, doesn't manage workflow routing
2. **Explicit State Transitions**: File index increments happen in a dedicated node
3. **Clear Conditional Logic**: Routing decisions check the NEXT state, not current
4. **No Hidden Side Effects**: Nodes don't modify workflow control flow

## Testing

Run the test to verify the fix:

```bash
cd backend
node test-workflow-simple.js
```

Expected behavior:
- Workflow should complete successfully
- All 50 files should be scanned
- No recursion limit errors

## Additional Quality Improvements

### 1. Skip Vendor/Minified Files

Added file filtering in [`scan.node.js`](../backend/src/agents/nodes/scan.node.js) to skip:
- `node_modules/` and `vendor/` directories
- Minified files (`.min.js`, `.min.css`)
- Common vendor libraries (bootstrap, jquery, etc.)
- Build artifacts (`dist/`, `build/`)

This prevents the AI from analyzing irrelevant third-party code.

### 2. Cap Vulnerabilities Per File

Limited to 20 vulnerabilities per file in [`redteam.node.js`](../backend/src/agents/nodes/redteam.node.js) to prevent model hallucinations from exploding the count when analyzing large or complex files.

### 3. File Size Guard

Skip files larger than 50KB to avoid:
- Analyzing minified/bundled code that slipped through filters
- Overwhelming the AI model with massive files
- Wasting tokens on generated/compiled code

## Files Modified

1. [`backend/src/agents/nodes/redteam.node.js`](../backend/src/agents/nodes/redteam.node.js) - **PRIMARY FIX**: Use proper LangChain message instances + file size guard + vulnerability cap
2. [`backend/src/agents/nodes/blueteam.node.js`](../backend/src/agents/nodes/blueteam.node.js) - **PRIMARY FIX**: Use proper LangChain message instances
3. [`backend/src/agents/nodes/scan.node.js`](../backend/src/agents/nodes/scan.node.js) - Filter vendor/minified files
4. [`backend/src/agents/graph/workflow.js`](../backend/src/agents/graph/workflow.js) - Fixed recursion limit configuration (200 iterations) and improved routing logic
5. [`backend/src/agents/nodes/sandbox.node.js`](../backend/src/agents/nodes/sandbox.node.js) - Removed premature moveToNextFile calls

## Key Takeaways

1. **LangChain Message Format**: When using LangChain with Vertex AI (or other providers), always use proper message instances (`HumanMessage`, `SystemMessage`, etc.) instead of plain JavaScript objects. The plain object format `{ role, content }` is not universally supported across all LangChain adapters.

2. **Filter Input Data**: Skip vendor libraries, minified files, and large files to ensure meaningful analysis and prevent model hallucinations.

3. **Cap Output**: Limit vulnerabilities per file to prevent one bad AI response from making results unusable.

4. **Recursion Limits**: Set recursion limits on the `stream()` call, not `compile()`, and make it high enough for your use case (files × nodes per file).