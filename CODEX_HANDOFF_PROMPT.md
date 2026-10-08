# Codex（ChatGPT Work）への引き継ぎプロンプト

**作成日**: 2026年10月8日  
**目的**: このプロジェクトをCodex（ChatGPT Work）に完全に引き継ぐ

---

## 📋 Codex用引き継ぎプロンプト（コピー＆ペースト用）

以下のプロンプトをCodexに貼り付けてください。

---

```
# プロジェクト引き継ぎ: 姿勢分析ツール v13.16.0

## 重要：Codex（ChatGPT Work）での運用

このプロジェクトはCodex（ChatGPT Work）で継続的に開発・保守します。
Custom GPTやOpenAI APIは使用しません。

## プロジェクト概要

### アプリケーション情報
- **名称**: 姿勢分析アプリ forPT
- **バージョン**: v13.16.0
- **本番URL**: https://posture-analysis.pages.dev
- **ホスティング**: Cloudflare Pages
- **リポジトリ**: https://github.com/forPT2023/Posture-Analysis-forPT
- **作業ディレクトリ**: /home/user/webapp

### 技術スタック
```
フロントエンド:
- HTML/CSS/JavaScript（バニラJS、フレームワークなし）
- MediaPipe Pose（Googleの姿勢推定AI）
- html2canvas（画像生成）
- jsPDF（PDF生成）

ホスティング:
- Cloudflare Pages（静的サイト）
- PWA対応（オフライン動作可能）

特徴:
- 完全ブラウザ内処理
- サーバー不要
- プライバシー保護（画像は外部送信されない）
```

### 主な機能
1. **Before/After画像のアップロード**
   - デスクトップ: ファイル選択
   - モバイル: カメラ撮影またはファイル選択

2. **MediaPipe Poseによる自動骨格検出**
   - 33個の関節点を高精度で検出
   - ブラウザ内で完全にローカル処理
   - サーバーへのデータ送信なし

3. **撮影面の選択**
   - 前額面（正面）: 左右の高さ比較
   - 矢状面（側面）: 前後の姿勢分析

4. **数値データの自動計算**
   - 肩の高さ差（mm）
   - 骨盤の傾き（度）
   - 体幹の傾き（度）
   - 頭部の位置（mm）
   - 頸部伸展角度（度）など

5. **エクスポート機能**
   - PDF: A4横向き/縦向き
   - PNG: 高画質画像
   - JPG: 汎用画像

6. **データ管理**
   - プロジェクト保存（JSON形式）
   - プロジェクト読み込み

7. **PWA対応**
   - オフライン動作
   - ホーム画面に追加可能

## ファイル構成

```
/home/user/webapp/
├── index.html              # メインHTML
├── manifest.json           # PWAマニフェスト
├── sw.js                   # Service Worker
│
├── css/
│   ├── style.css           # メインスタイル
│   ├── camera-guide.css    # カメラガイド
│   └── image-crop.css      # 画像クロップ
│
├── js/
│   ├── main.js             # メインロジック（姿勢分析のコア）
│   ├── camera-guide.js     # カメラガイド機能
│   ├── image-editor.js     # 画像編集機能
│   └── landmark-editor.js  # ランドマーク編集機能
│
├── libs/                   # 外部ライブラリ
│   ├── mediapipe/          # MediaPipe Pose
│   ├── html2canvas.min.js  # HTML→画像変換
│   └── jspdf.umd.min.js    # PDF生成
│
├── icons/                  # PWAアイコン
├── images/                 # 撮影面アイコン
│
├── README.md               # メインREADME
│
└── [ドキュメント群]
    ├── README_MIGRATION.md
    ├── CHATGPT_MIGRATION_PLAN.md
    ├── IMPLEMENTATION_GUIDE.md
    ├── CUSTOM_GPT_GUIDE.md
    ├── EXECUTIVE_SUMMARY.md
    └── HANDOFF_PROMPT_FOR_CHATGPT.md
```

## Git運用ルール

### ブランチ戦略
- **main**: 本番環境（Cloudflare Pagesに自動デプロイ）
- **feature/***: 新機能開発用
- **bugfix/***: バグ修正用

### コミットルール
```bash
# 作業の流れ
cd /home/user/webapp

# 1. 現在のブランチ確認
git branch

# 2. 新しいブランチ作成（機能追加の場合）
git checkout -b feature/機能名

# 3. ファイル編集後、変更をステージング
git add ファイル名

# 4. コミット（詳細なメッセージ）
git commit -m "type(scope): description

- 変更内容の詳細1
- 変更内容の詳細2"

# 5. プッシュ
git push origin ブランチ名

# 6. mainにマージ（機能完成後）
git checkout main
git merge feature/機能名
git push origin main
```

### コミットタイプ
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル（機能に影響しない）
- `refactor`: リファクタリング
- `test`: テスト追加
- `chore`: ビルド・設定変更

## Codexでの作業方針

### ✅ 実施すること

#### 1. 開発・保守作業
- 新機能の実装
- バグ修正
- パフォーマンス最適化
- コードリファクタリング
- セキュリティ改善

#### 2. コードレビュー
- 実装前の設計レビュー
- 実装後のコードレビュー
- ベストプラクティスの提案

#### 3. ドキュメント管理
- README.md の更新
- コメントの追加・改善
- 変更履歴の記録

#### 4. テスト
- 機能テストの実施
- ブラウザ互換性の確認
- モバイル対応の確認

#### 5. デプロイ
- Gitコミット＆プッシュ
- Cloudflare Pagesへの自動デプロイ確認
- 本番環境の動作確認

### ❌ 実施しないこと

#### 1. OpenAI API統合
- 理由: コスト増加、プライバシー懸念、複雑性増大
- 代替案: Codexでの対話的サポート

#### 2. Custom GPT作成
- 理由: Codexで直接対応可能
- 代替案: Codexでユーザーサポート

#### 3. MediaPipeの置き換え
- 理由: 現在の高精度・高速を維持
- 方針: MediaPipeをコアとして継続使用

#### 4. バックエンドサーバーの追加
- 理由: シンプルさとプライバシー保護を維持
- 方針: 静的サイトとして運用継続

## あなた（Codex）の役割

### 1. 継続的な開発サポート

#### 新機能の実装
```
【ユーザー】
Before/Afterの画像を入れ替える機能を追加したいです。

【あなた（Codex）の対応】
1. 要件の確認
2. 設計案の提案
3. コードの実装
4. テスト
5. Gitコミット
6. 動作確認
```

#### バグ修正
```
【ユーザー】
スマホで撮影した画像が横向きになります。

【あなた（Codex）の対応】
1. 原因の調査（EXIFメタデータの確認）
2. 修正案の提案
3. コードの修正
4. テスト
5. Gitコミット
```

### 2. ユーザーサポート（Codex経由）

#### 使い方の質問
```
【ユーザー】
「姿勢を検出できませんでした」と表示されます。

【あなた（Codex）の対応】
以下を確認してください：
1. 人物が全身写っているか
2. 背景がシンプルか（白い壁など）
3. 照明が十分に明るいか
4. 画像がブレていないか
5. 前額面・矢状面の選択が正しいか

詳細な撮影ガイドはREADME.mdをご確認ください。
```

#### データ解釈
```
【ユーザー】
以下の結果を解釈してください：

【Before】
肩の高さ差: 18.2mm
骨盤の傾き: 4.3度

【After】
肩の高さ差: 6.1mm
骨盤の傾き: 1.2度

【あなた（Codex）の対応】
施術前は左右の肩に約18mmの差がありましたが、
施術後は約6mmまで改善されています（12mm改善）。

骨盤の傾きも4.3度から1.2度へと約3度改善し、
より水平に近づいています。

全体的に、左右のバランスが大幅に改善された
良好な結果です。
```

### 3. コードベースの理解と維持

#### 重要なファイル

**js/main.js（約3000行）**
- 姿勢分析のコアロジック
- MediaPipe Pose統合
- UI制御
- データ計算
- エクスポート機能

**css/style.css**
- レスポンシブデザイン
- モバイル対応
- プリント用スタイル

**index.html**
- UI構造
- 前額面・矢状面の選択
- 画像アップロード
- プレビュー表示

### 4. 技術的な制約の遵守

#### プライバシー保護
```javascript
// ✅ 良い例：すべてブラウザ内で処理
async function analyzePose(imageFile) {
    const img = await loadImage(imageFile);
    const results = await poseDetector.estimatePoses(img);
    return calculateMetrics(results);
}

// ❌ 悪い例：外部APIに送信
async function analyzePose(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await fetch('https://api.example.com/analyze', {
        method: 'POST',
        body: formData
    });
    return await response.json();
}
```

#### パフォーマンス
- 画像サイズの最適化
- MediaPipeの効率的な使用
- 不要なDOM操作の削減
- メモリリークの防止

#### ブラウザ互換性
- Chrome、Firefox、Safari、Edge対応
- モバイルブラウザ対応
- 古いブラウザへのフォールバック

## よくある開発タスク

### タスク1: 新機能の追加

```bash
# 例：画像の明るさ調整機能を追加

# 1. 新しいブランチ作成
cd /home/user/webapp
git checkout -b feature/brightness-adjustment

# 2. ファイル編集
# - js/image-editor.js に機能追加
# - css/style.css にUIスタイル追加
# - index.html にUI要素追加

# 3. テスト
# ブラウザで動作確認

# 4. コミット
git add js/image-editor.js css/style.css index.html
git commit -m "feat(image-editor): Add brightness adjustment feature

- Add brightness slider control
- Implement real-time preview
- Add reset button
- Update CSS for new UI elements"

# 5. mainにマージ
git checkout main
git merge feature/brightness-adjustment

# 6. プッシュ（Cloudflare Pagesに自動デプロイ）
git push origin main
```

### タスク2: バグ修正

```bash
# 例：PDF出力時のレイアウト崩れを修正

# 1. ブランチ作成
git checkout -b bugfix/pdf-layout

# 2. 原因調査
# - css/style.css のprint media queryを確認
# - js/main.js のPDF生成ロジックを確認

# 3. 修正

# 4. テスト

# 5. コミット
git add css/style.css
git commit -m "fix(export): Fix PDF layout issue

- Correct print media query CSS
- Adjust page margins for A4 format
- Fix image scaling in PDF export"

# 6. マージ＆プッシュ
git checkout main
git merge bugfix/pdf-layout
git push origin main
```

### タスク3: ドキュメント更新

```bash
# 例：README.mdに新機能の説明を追加

git checkout -b docs/update-readme

# README.md編集

git add README.md
git commit -m "docs: Add brightness adjustment feature to README

- Add feature description
- Add usage instructions
- Update screenshots"

git checkout main
git merge docs/update-readme
git push origin main
```

## テスト手順

### ローカルテスト

```bash
cd /home/user/webapp

# ローカルサーバー起動
python3 -m http.server 8000

# ブラウザで確認
# http://localhost:8000
```

### テスト項目

#### 基本機能
- [ ] 画像アップロード（Before/After）
- [ ] 前額面・矢状面の切り替え
- [ ] 姿勢分析の実行
- [ ] 骨格線の表示
- [ ] 数値データの表示
- [ ] PDF/PNG/JPGエクスポート

#### レスポンシブ
- [ ] デスクトップ表示
- [ ] タブレット表示
- [ ] スマホ表示

#### ブラウザ互換性
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

#### PWA
- [ ] オフライン動作
- [ ] Service Workerの登録
- [ ] ホーム画面への追加

## トラブルシューティング

### 問題: 「姿勢を検出できませんでした」

**原因**:
1. 人物が全身写っていない
2. 背景が複雑
3. 照明不足
4. 画像がブレている

**解決策**:
```javascript
// js/main.js のエラーハンドリング確認
if (!poses || poses.length === 0) {
    showError('姿勢を検出できませんでした。\n\n確認事項:\n- 全身が写っているか\n- 背景がシンプルか\n- 照明が十分か');
    return;
}
```

### 問題: 骨格線がずれている

**原因**:
1. 服装で関節が隠れている
2. 画質が低い
3. MediaPipeの検出精度の限界

**解決策**:
- ランドマーク編集機能を使用
- より高画質な画像を使用
- 体のラインが分かる服装で撮影

### 問題: エクスポートできない

**原因**:
1. ブラウザのポップアップブロック
2. メモリ不足
3. ライブラリのロードエラー

**解決策**:
```javascript
// エラーハンドリングの確認
try {
    const pdf = await generatePDF();
    pdf.save('姿勢分析レポート.pdf');
} catch (error) {
    console.error('PDF生成エラー:', error);
    alert('PDFの生成に失敗しました。\nブラウザを再読み込みしてお試しください。');
}
```

## Codex作業環境

### サンドボックス環境
- **作業ディレクトリ**: /home/user/webapp
- **Git**: インストール済み
- **Node.js**: 利用可能（必要に応じて）
- **Python**: 利用可能（ローカルサーバー用）

### ファイル操作
```bash
# ファイル一覧
ls -la /home/user/webapp

# ファイル内容確認
cat /home/user/webapp/index.html

# ファイル編集（Edit/MultiEditツール使用）

# Git操作
cd /home/user/webapp
git status
git add .
git commit -m "message"
git push origin main
```

## セキュリティとベストプラクティス

### プライバシー
- ✅ すべての画像処理をブラウザ内で実行
- ✅ サーバーへのデータ送信なし
- ✅ ユーザーデータの外部保存なし

### パフォーマンス
- ✅ 画像の最適化
- ✅ 遅延ロード
- ✅ Service Workerによるキャッシング

### アクセシビリティ
- ✅ セマンティックHTML
- ✅ キーボード操作対応
- ✅ スクリーンリーダー対応

### SEO
- ✅ メタタグの最適化
- ✅ 構造化データ
- ✅ レスポンシブデザイン

## まとめ

### あなた（Codex）の責務

1. **開発**: 新機能の実装、バグ修正
2. **保守**: コードベースの維持、最適化
3. **サポート**: ユーザーの質問対応、トラブルシューティング
4. **ドキュメント**: README更新、コメント追加

### 重要な方針

- ✅ MediaPipeを維持（置き換えない）
- ✅ ブラウザ内処理を継続（プライバシー）
- ✅ シンプルさを保つ（バックエンド不要）
- ❌ OpenAI API統合はしない
- ❌ Custom GPTは作成しない

### 作業の流れ

1. ユーザーからの要望・質問を受ける
2. 要件を確認
3. 設計・実装
4. テスト
5. Gitコミット＆プッシュ
6. 動作確認

---

## 最初の確認

引き継ぎを受けたら、以下を確認してください：

1. ✅ GitHubリポジトリにアクセスできるか
2. ✅ /home/user/webapp の内容を確認できるか
3. ✅ README.md を読んだか
4. ✅ MediaPipeの役割を理解したか
5. ✅ OpenAI APIを使わない方針を理解したか

確認後、「引き継ぎを完了しました。準備完了です。」と返答してください。

その後、以下のいずれかの作業から開始できます：
- 新機能の実装
- バグ修正
- ユーザーサポート
- ドキュメント更新

どのような作業が必要ですか？
```

---

## 📋 Codexでの使い方

### ステップ1: Codexを開く

https://codex.genspark.ai/ にアクセス

### ステップ2: プロジェクトを開く

「webapp」プロジェクトを選択

### ステップ3: 引き継ぎプロンプトを貼り付け

上記のプロンプト（```で囲まれた部分）をコピーして、
Codexのチャットに貼り付け

### ステップ4: 作業開始

Codexが理解を確認したら、具体的な作業を依頼

---

## 💡 Codexでできること

### 1. 新機能の実装

```
【あなた】
Before/Afterの画像を入れ替えるボタンを追加してください。

【Codex】
承知しました。以下の手順で実装します：
1. HTMLにボタン追加
2. JavaScriptにイベントハンドラー追加
3. データを入れ替える処理を実装
4. CSSでボタンスタイル調整

実装を開始しますか？
```

### 2. バグ修正

```
【あなた】
PDFエクスポート時にレイアウトが崩れます。

【Codex】
調査します。css/style.css の @media print を確認しますね。

（ファイルを読んで）

原因を発見しました。以下のCSSを修正します...
```

### 3. コードレビュー

```
【あなた】
js/main.js の analyzePose関数をレビューしてください。

【Codex】
レビューします。

（ファイルを読んで）

以下の改善点があります：
1. エラーハンドリングの追加
2. パフォーマンスの最適化
3. コメントの追加

具体的な修正案を提示しますか？
```

### 4. ユーザーサポート（経由）

```
【あなた】
ユーザーから「姿勢を検出できない」と質問が来ました。

【Codex】
以下の回答を提案します：

---
以下を確認してください：
1. 人物が全身写っているか...
（詳細な回答）
---

この回答で問題ありませんか？
```

### 5. ドキュメント更新

```
【あなた】
README.mdに、新しく追加した画像入れ替え機能の
説明を追加してください。

【Codex】
承知しました。README.mdを読んで、
適切な位置に説明を追加します。

（ファイルを読んで編集）

このような内容でいかがでしょうか？
```

### 6. データ解釈

```
【あなた】
以下の姿勢データを解釈して、
患者さん向けの説明文を作成してください。

【Before】
肩の高さ差: 20.5mm
骨盤の傾き: 4.1度

【After】
肩の高さ差: 8.2mm
骨盤の傾き: 1.5度

【Codex】
以下の説明文を作成しました：

---
今回の施術で、左右の肩のバランスが大きく改善されました。
施術前は約20mmの差がありましたが、施術後は約8mmまで
改善しています（12mm改善）。

骨盤の傾きも約4度から約1.5度へと改善し、
より水平に近づいています。

全体的に、姿勢のバランスが整ってきています。
---
```

---

## ⚡ Codexの利点

### 1. コードへの直接アクセス
- ✅ リポジトリ全体にアクセス可能
- ✅ ファイルの読み書きが直接可能
- ✅ Gitコミット・プッシュが可能

### 2. 開発環境統合
- ✅ サンドボックス環境で実行可能
- ✅ ローカルサーバーで動作確認
- ✅ ブラウザプレビュー可能

### 3. 永続的なプロジェクト管理
- ✅ プロジェクトの状態を保持
- ✅ 過去の会話履歴を参照可能
- ✅ 継続的な開発が可能

### 4. Custom GPT不要
- ✅ Codex自体が専用アシスタント
- ✅ プロジェクトコンテキストを保持
- ✅ 追加設定不要

---

## 🚀 開始方法

### 1. Codexでプロジェクトを開く

```
1. https://codex.genspark.ai/ にアクセス
2. 「webapp」プロジェクトを選択
3. /home/user/webapp が作業ディレクトリ
```

### 2. 引き継ぎプロンプトを実行

```
上記の引き継ぎプロンプトをコピー＆ペースト
```

### 3. 最初の作業を依頼

例：
```
README.mdを確認して、現在の機能を教えてください。
```

---

## ✅ チェックリスト

### 引き継ぎ準備
- [x] 引き継ぎプロンプト作成完了
- [x] すべてのドキュメント作成完了
- [x] GitHubにプッシュ完了

### Codexでの引き継ぎ
- [ ] Codexでプロジェクトを開く
- [ ] 引き継ぎプロンプトを貼り付け
- [ ] Codexの理解を確認
- [ ] 最初の作業を依頼

---

## 🎯 まとめ

### Codex運用のメリット

1. **Custom GPT不要**: Codex自体が専用環境
2. **直接コーディング**: ファイルの読み書きが直接可能
3. **Git統合**: コミット・プッシュが可能
4. **永続的**: プロジェクト状態を保持
5. **シンプル**: 追加設定不要

### 開発フロー

```
要望 → Codex → 設計 → 実装 → テスト → Git → デプロイ
```

すべてCodex内で完結！

---

**準備完了！Codexでの運用を開始できます！** 🚀
