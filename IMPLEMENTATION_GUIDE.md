# ChatGPT統合 - 実装ガイド

**作成日**: 2026年10月8日  
**対象**: 姿勢分析ツール v13.16.0 → v14.0.0 (ChatGPT統合版)

---

## 📋 目次

1. [開発環境のセットアップ](#開発環境のセットアップ)
2. [フェーズ1: AI解釈機能](#フェーズ1-ai解釈機能)
3. [フェーズ2: レポート生成](#フェーズ2-レポート生成)
4. [フェーズ3: Custom GPTアシスタント](#フェーズ3-custom-gptアシスタント)
5. [テストとデバッグ](#テストとデバッグ)
6. [デプロイ手順](#デプロイ手順)

---

## 開発環境のセットアップ

### 1. OpenAI APIキーの取得

```bash
# 1. https://platform.openai.com/ にアクセス
# 2. アカウント作成/ログイン
# 3. API Keys > Create new secret key
# 4. キーをコピー（一度しか表示されない！）
```

### 2. 環境変数の設定

```bash
# .env.local ファイルを作成（Gitにはコミットしない）
cd /home/user/webapp
cat > .env.local << 'EOF'
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
OPENAI_ORG_ID=org-xxxxxxxxxxxxx
OPENAI_PROJECT_ID=proj_xxxxxxxxxxxxx
EOF

# .gitignore に追加
echo ".env.local" >> .gitignore
```

### 3. 使用量制限の設定

```bash
# OpenAI Dashboard > Settings > Limits
# - Monthly budget: $50
# - Alert threshold: $40
# - Hard limit: $50
```

---

## フェーズ1: AI解釈機能

### ファイル構成

```
webapp/
├── js/
│   ├── main.js                 # 既存
│   ├── ai-interpretation.js    # 🆕 新規作成
│   └── openai-client.js        # 🆕 新規作成
├── css/
│   └── ai-features.css         # 🆕 新規作成
└── index.html                  # 🔧 修正
```

### ステップ1: OpenAIクライアントの作成

**ファイル**: `js/openai-client.js`

```javascript
/**
 * OpenAI APIクライアント
 * 姿勢分析ツール用
 */
class OpenAIClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = 'gpt-4o-mini'; // コスト効率重視
        this.maxTokens = 2000;
    }

    /**
     * チャット補完API呼び出し
     */
    async createChatCompletion(messages, options = {}) {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'OpenAI-Organization': options.orgId || '',
                'OpenAI-Project': options.projectId || ''
            },
            body: JSON.stringify({
                model: options.model || this.model,
                messages: messages,
                max_tokens: options.maxTokens || this.maxTokens,
                temperature: options.temperature || 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API Error: ${error.error?.message || 'Unknown error'}`);
        }

        return await response.json();
    }

    /**
     * トークン数の推定
     */
    estimateTokens(text) {
        // 簡易推定: 日本語は約1文字=2トークン、英語は約4文字=1トークン
        const japaneseChars = (text.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/g) || []).length;
        const otherChars = text.length - japaneseChars;
        return Math.ceil(japaneseChars * 2 + otherChars / 4);
    }

    /**
     * コスト推定（GPT-4o mini基準）
     */
    estimateCost(inputTokens, outputTokens) {
        const INPUT_COST_PER_1M = 0.75; // $0.75/1M tokens
        const OUTPUT_COST_PER_1M = 3.00; // $3.00/1M tokens
        
        const inputCost = (inputTokens / 1000000) * INPUT_COST_PER_1M;
        const outputCost = (outputTokens / 1000000) * OUTPUT_COST_PER_1M;
        
        return inputCost + outputCost;
    }
}

// グローバルに公開
window.OpenAIClient = OpenAIClient;
```

### ステップ2: AI解釈機能の実装

**ファイル**: `js/ai-interpretation.js`

```javascript
/**
 * AI解釈機能
 * 姿勢分析結果をGPTに解釈させる
 */
class AIInterpretation {
    constructor(openaiClient) {
        this.client = openaiClient;
        this.systemPrompt = this._buildSystemPrompt();
    }

    /**
     * システムプロンプトの構築
     */
    _buildSystemPrompt() {
        return `あなたは経験豊富な理学療法士です。姿勢分析の結果を解釈し、患者さんに分かりやすく説明してください。

【あなたの役割】
- 姿勢分析の数値データから臨床的な意味を解釈する
- 専門用語を使わず、患者さんが理解できる言葉で説明する
- 改善点を具体的に指摘する
- ポジティブかつ建設的なトーンを保つ

【禁止事項】
- 医療診断を行わない（あくまで姿勢分析結果の解釈のみ）
- 具体的な治療法を提案しない（施術者の判断を尊重）
- 過度に専門的な用語を使わない

【出力形式】
1. 全体的な姿勢の特徴（2-3文）
2. 主な改善点（3-5個の箇条書き）
3. 日常生活でのアドバイス（2-3文）

常に日本語で回答してください。`;
    }

    /**
     * 姿勢データの要約
     */
    _summarizePostureData(beforeData, afterData, plane) {
        const summary = {
            plane: plane,
            before: this._extractMetrics(beforeData),
            after: this._extractMetrics(afterData),
            improvements: this._calculateImprovements(beforeData, afterData)
        };

        return JSON.stringify(summary, null, 2);
    }

    /**
     * メトリクスの抽出
     */
    _extractMetrics(data) {
        if (!data || !data.metrics) return null;
        
        const metrics = {};
        
        // 前額面のメトリクス
        if (data.metrics.shoulderHeightDiff !== undefined) {
            metrics['肩の高さ差'] = `${data.metrics.shoulderHeightDiff.toFixed(1)}mm`;
        }
        if (data.metrics.pelvisAngle !== undefined) {
            metrics['骨盤の傾き'] = `${data.metrics.pelvisAngle.toFixed(1)}度`;
        }
        if (data.metrics.trunkAngle !== undefined) {
            metrics['体幹の傾き'] = `${data.metrics.trunkAngle.toFixed(1)}度`;
        }
        
        // 矢状面のメトリクス
        if (data.metrics.headForwardDistance !== undefined) {
            metrics['頭部前方偏位'] = `${data.metrics.headForwardDistance.toFixed(1)}mm`;
        }
        if (data.metrics.cervicalExtensionAngle !== undefined) {
            metrics['頸部伸展角度'] = `${data.metrics.cervicalExtensionAngle.toFixed(1)}度`;
        }
        
        return metrics;
    }

    /**
     * 改善度の計算
     */
    _calculateImprovements(beforeData, afterData) {
        const improvements = [];
        
        if (beforeData.metrics && afterData.metrics) {
            const before = beforeData.metrics;
            const after = afterData.metrics;
            
            // 肩の高さ差の改善
            if (before.shoulderHeightDiff !== undefined && after.shoulderHeightDiff !== undefined) {
                const improvement = Math.abs(before.shoulderHeightDiff) - Math.abs(after.shoulderHeightDiff);
                improvements.push({
                    item: '肩の高さのバランス',
                    improvement: improvement > 0 ? '改善' : '変化',
                    value: `${Math.abs(improvement).toFixed(1)}mm`
                });
            }
            
            // 骨盤の傾きの改善
            if (before.pelvisAngle !== undefined && after.pelvisAngle !== undefined) {
                const improvement = Math.abs(before.pelvisAngle) - Math.abs(after.pelvisAngle);
                improvements.push({
                    item: '骨盤の水平バランス',
                    improvement: improvement > 0 ? '改善' : '変化',
                    value: `${Math.abs(improvement).toFixed(1)}度`
                });
            }
            
            // 頭部前方偏位の改善
            if (before.headForwardDistance !== undefined && after.headForwardDistance !== undefined) {
                const improvement = before.headForwardDistance - after.headForwardDistance;
                improvements.push({
                    item: '頭部の位置',
                    improvement: improvement > 0 ? '改善' : '変化',
                    value: `${Math.abs(improvement).toFixed(1)}mm`
                });
            }
        }
        
        return improvements;
    }

    /**
     * AI解釈の取得
     */
    async getInterpretation(beforeData, afterData, plane) {
        try {
            // データの要約
            const dataSummary = this._summarizePostureData(beforeData, afterData, plane);
            
            // ユーザープロンプト
            const userPrompt = `以下の姿勢分析結果を解釈してください。

【分析データ】
${dataSummary}

【撮影面】
${plane === 'frontal' ? '前額面（正面）' : '矢状面（側面）'}

患者さんに分かりやすく、ポジティブに説明してください。`;

            // トークン数の推定
            const estimatedTokens = this.client.estimateTokens(this.systemPrompt + userPrompt);
            console.log(`推定入力トークン数: ${estimatedTokens}`);

            // API呼び出し
            const response = await this.client.createChatCompletion([
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: userPrompt }
            ], {
                temperature: 0.7,
                maxTokens: 1000
            });

            // コスト計算
            const usage = response.usage;
            const cost = this.client.estimateCost(usage.prompt_tokens, usage.completion_tokens);
            console.log(`使用トークン: 入力=${usage.prompt_tokens}, 出力=${usage.completion_tokens}`);
            console.log(`推定コスト: $${cost.toFixed(4)}`);

            return {
                interpretation: response.choices[0].message.content,
                usage: usage,
                cost: cost
            };

        } catch (error) {
            console.error('AI解釈エラー:', error);
            throw error;
        }
    }

    /**
     * 簡易版解釈（コスト削減版）
     */
    async getQuickInterpretation(improvementSummary) {
        try {
            const userPrompt = `以下の改善点を患者さんに分かりやすく1-2文で説明してください：

${improvementSummary.map(item => `- ${item.item}: ${item.improvement} (${item.value})`).join('\n')}

明るくポジティブなトーンでお願いします。`;

            const response = await this.client.createChatCompletion([
                { role: 'system', content: 'あなたは親切な理学療法士です。改善点を分かりやすく説明してください。' },
                { role: 'user', content: userPrompt }
            ], {
                temperature: 0.8,
                maxTokens: 300,
                model: 'gpt-4o-mini' // 最も安価なモデル
            });

            return {
                interpretation: response.choices[0].message.content,
                usage: response.usage,
                cost: this.client.estimateCost(response.usage.prompt_tokens, response.usage.completion_tokens)
            };

        } catch (error) {
            console.error('簡易AI解釈エラー:', error);
            throw error;
        }
    }
}

// グローバルに公開
window.AIInterpretation = AIInterpretation;
```

### ステップ3: UIの追加

**ファイル**: `css/ai-features.css`

```css
/* AI機能のスタイル */

/* AI解釈セクション */
.ai-interpretation-section {
    margin-top: 20px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.ai-interpretation-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
}

.ai-interpretation-header i {
    font-size: 1.5rem;
    margin-right: 10px;
}

.ai-interpretation-header h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
}

.ai-interpretation-content {
    background: rgba(255, 255, 255, 0.1);
    padding: 15px;
    border-radius: 8px;
    backdrop-filter: blur(10px);
    line-height: 1.7;
    white-space: pre-wrap;
}

.ai-interpretation-footer {
    margin-top: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    opacity: 0.9;
}

.ai-cost-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* オプトイン設定 */
.ai-settings-card {
    background: #f8f9fa;
    border: 2px solid #667eea;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
}

.ai-settings-card h4 {
    margin: 0 0 10px 0;
    color: #667eea;
    font-size: 1rem;
}

.ai-consent-checkbox {
    display: flex;
    align-items: flex-start;
    margin-bottom: 10px;
}

.ai-consent-checkbox input[type="checkbox"] {
    margin-right: 10px;
    margin-top: 3px;
}

.ai-consent-checkbox label {
    font-size: 0.9rem;
    line-height: 1.5;
    cursor: pointer;
}

.ai-privacy-note {
    margin-top: 10px;
    padding: 10px;
    background: #fff3cd;
    border-left: 4px solid #ffc107;
    font-size: 0.85rem;
    color: #856404;
    border-radius: 4px;
}

/* ローディングアニメーション */
.ai-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.ai-loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.ai-loading-text {
    margin-left: 15px;
    font-size: 0.95rem;
}

/* エラー表示 */
.ai-error {
    background: #f8d7da;
    color: #721c24;
    padding: 15px;
    border-radius: 8px;
    border-left: 4px solid #dc3545;
}

.ai-error i {
    margin-right: 10px;
}

/* AI機能ボタン */
.btn-ai {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.btn-ai:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-ai:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.btn-ai i {
    font-size: 1.1rem;
}

/* トグルスイッチ */
.ai-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.ai-toggle input[type="checkbox"] {
    width: 50px;
    height: 26px;
    appearance: none;
    background: #ccc;
    border-radius: 13px;
    position: relative;
    cursor: pointer;
    transition: background 0.3s;
}

.ai-toggle input[type="checkbox"]:checked {
    background: #667eea;
}

.ai-toggle input[type="checkbox"]::before {
    content: '';
    position: absolute;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: 2px;
    transition: left 0.3s;
}

.ai-toggle input[type="checkbox"]:checked::before {
    left: 26px;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
    .ai-interpretation-footer {
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
    }
}
```

### ステップ4: HTMLの修正

**ファイル**: `index.html` （表示設定カードの後に追加）

```html
<!-- AI機能設定（表示設定カードの後） -->
<div class="card" id="aiSettings" style="display: none;">
    <h2 class="card-title"><i class="fas fa-robot"></i> AI機能</h2>
    
    <div class="ai-settings-card">
        <h4>🤖 AI解釈機能</h4>
        
        <div class="ai-toggle">
            <input type="checkbox" id="enableAI">
            <label for="enableAI">AI解釈を有効にする</label>
        </div>
        
        <div class="ai-consent-checkbox">
            <input type="checkbox" id="aiConsent">
            <label for="aiConsent">
                数値データをOpenAI APIに送信してAI解釈を受けることに同意します。
                （個人情報や画像は送信されません）
            </label>
        </div>
        
        <div class="ai-privacy-note">
            <strong>📋 プライバシーについて</strong><br>
            • 送信されるデータ: 姿勢の数値データのみ<br>
            • 送信されないデータ: 画像、氏名、日付<br>
            • OpenAIのデータ保持: Zero Retention（30日以内に削除）<br>
            • コスト: 1回あたり約$0.01（月間$1-2程度）
        </div>
    </div>
    
    <button class="btn btn-ai" id="getAIInterpretation" disabled>
        <i class="fas fa-magic"></i> AI解釈を取得
    </button>
    
    <div id="aiInterpretationResult" style="display: none;"></div>
</div>

<!-- 必要なスクリプトの追加（</body>の直前） -->
<script src="js/openai-client.js?v=14.0.0"></script>
<script src="js/ai-interpretation.js?v=14.0.0"></script>
```

### ステップ5: main.jsの修正

**ファイル**: `js/main.js` （既存ファイルに追加）

```javascript
// AI機能の初期化（グローバル変数セクションに追加）
let openaiClient = null;
let aiInterpretation = null;
let aiEnabled = false;
let aiConsented = false;

// AI機能の初期化関数（init関数内で呼び出し）
function initAIFeatures() {
    // OpenAI APIキーの取得（実際の運用ではバックエンドから取得）
    // ⚠️ クライアント側に直接APIキーを埋め込まないでください！
    // これは開発用のプレースホルダーです。
    const apiKey = localStorage.getItem('openai_api_key') || '';
    
    if (apiKey) {
        openaiClient = new OpenAIClient(apiKey);
        aiInterpretation = new AIInterpretation(openaiClient);
    }
    
    // UI要素の取得
    const enableAICheckbox = document.getElementById('enableAI');
    const aiConsentCheckbox = document.getElementById('aiConsent');
    const getAIButton = document.getElementById('getAIInterpretation');
    
    // イベントリスナー
    enableAICheckbox.addEventListener('change', (e) => {
        aiEnabled = e.target.checked;
        updateAIButtonState();
        
        if (aiEnabled && !apiKey) {
            alert('OpenAI APIキーが設定されていません。\n\n設定方法:\n1. https://platform.openai.com/ でAPIキーを取得\n2. ブラウザのコンソールで以下を実行:\nlocalStorage.setItem("openai_api_key", "YOUR_API_KEY")');
            enableAICheckbox.checked = false;
            aiEnabled = false;
        }
    });
    
    aiConsentCheckbox.addEventListener('change', (e) => {
        aiConsented = e.target.checked;
        updateAIButtonState();
    });
    
    getAIButton.addEventListener('click', handleGetAIInterpretation);
    
    // ローカルストレージから設定を復元
    const savedConsent = localStorage.getItem('ai_consent') === 'true';
    if (savedConsent) {
        aiConsentCheckbox.checked = true;
        aiConsented = true;
    }
}

// AI解釈ボタンの状態更新
function updateAIButtonState() {
    const getAIButton = document.getElementById('getAIInterpretation');
    const canUseAI = aiEnabled && aiConsented && openaiClient && beforeLandmarks && afterLandmarks;
    getAIButton.disabled = !canUseAI;
    
    // 設定を保存
    if (aiConsented) {
        localStorage.setItem('ai_consent', 'true');
    }
}

// AI解釈の取得処理
async function handleGetAIInterpretation() {
    const resultDiv = document.getElementById('aiInterpretationResult');
    const button = document.getElementById('getAIInterpretation');
    
    try {
        // ローディング表示
        button.disabled = true;
        resultDiv.innerHTML = `
            <div class="ai-loading">
                <div class="ai-loading-spinner"></div>
                <div class="ai-loading-text">AI が分析中...</div>
            </div>
        `;
        resultDiv.style.display = 'block';
        
        // AI解釈を取得
        const result = await aiInterpretation.getInterpretation(
            { metrics: beforeMetrics, landmarks: beforeLandmarks },
            { metrics: afterMetrics, landmarks: afterLandmarks },
            currentPlane
        );
        
        // 結果を表示
        resultDiv.innerHTML = `
            <div class="ai-interpretation-section">
                <div class="ai-interpretation-header">
                    <i class="fas fa-robot"></i>
                    <h3>AI解釈</h3>
                </div>
                <div class="ai-interpretation-content">
${result.interpretation}
                </div>
                <div class="ai-interpretation-footer">
                    <div class="ai-cost-info">
                        <span>💰 コスト: $${result.cost.toFixed(4)}</span>
                        <span>🔢 トークン: ${result.usage.total_tokens}</span>
                    </div>
                    <span>✨ Powered by GPT-4o mini</span>
                </div>
            </div>
        `;
        
    } catch (error) {
        // エラー表示
        resultDiv.innerHTML = `
            <div class="ai-error">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>AI解釈の取得に失敗しました</strong><br>
                ${error.message}
            </div>
        `;
    } finally {
        button.disabled = false;
    }
}

// 分析完了時にAI設定カードを表示（updateDisplay関数内に追加）
function showAISettings() {
    document.getElementById('aiSettings').style.display = 'block';
    updateAIButtonState();
}
```

---

## テストとデバッグ

### 1. ローカルテスト

```bash
cd /home/user/webapp

# ローカルサーバーを起動
python3 -m http.server 8000

# ブラウザで開く
# http://localhost:8000
```

### 2. APIキーの設定（開発時のみ）

```javascript
// ブラウザのコンソールで実行
localStorage.setItem('openai_api_key', 'sk-proj-your-api-key-here');
```

### 3. テストケース

```javascript
// テスト用データ
const testBeforeData = {
    metrics: {
        shoulderHeightDiff: 15.3,
        pelvisAngle: 3.2,
        trunkAngle: 2.1
    }
};

const testAfterData = {
    metrics: {
        shoulderHeightDiff: 5.1,
        pelvisAngle: 1.0,
        trunkAngle: 0.8
    }
};

// AI解釈をテスト
aiInterpretation.getInterpretation(testBeforeData, testAfterData, 'frontal')
    .then(result => console.log(result));
```

---

## デプロイ手順

### 1. 本番用の設定

```javascript
// 本番環境では、APIキーをサーバーサイドで管理
// オプション1: Cloudflare Workers経由
// オプション2: 専用バックエンドAPI経由
// オプション3: Cloudflare Workers KVに暗号化して保存

// ⚠️ クライアント側に直接APIキーを埋め込まないこと！
```

### 2. Cloudflare Workersの設定（推奨）

```javascript
// workers/openai-proxy.js
export default {
    async fetch(request, env) {
        // CORS対応
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }
        
        // OpenAI APIへのプロキシ
        const body = await request.json();
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
};
```

### 3. デプロイコマンド

```bash
# Gitにコミット
git add .
git commit -m "feat: Add AI interpretation feature (Phase 1)"

# プッシュ（Cloudflare Pagesに自動デプロイ）
git push origin main
```

---

## 次のステップ

- [ ] フェーズ1のテスト完了
- [ ] ユーザーフィードバック収集
- [ ] フェーズ2（レポート生成）の実装開始
- [ ] Custom GPT作成（フェーズ3）

---

**質問やサポートが必要な場合は、いつでもお知らせください！**
