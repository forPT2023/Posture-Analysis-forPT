# Cloudflare Pages 本番環境管理ガイド

**作成日**: 2026年10月8日  
**重要**: 実際の設定状況を確認してください

---

## ⚠️ 重要な注意事項

このドキュメントでは、Cloudflare Pagesの設定が**推測**されています。
実際の設定を確認して、このドキュメントを更新してください。

---

## 🔍 確認が必要な項目

### 1. Cloudflare Pages 自動デプロイ設定

#### 確認方法

1. **Cloudflare Dashboardにログイン**
   ```
   https://dash.cloudflare.com/
   ```

2. **Workers & Pagesセクション**
   - 左サイドバー > Workers & Pages

3. **プロジェクトを選択**
   - "posture-analysis" または類似の名前のプロジェクトを探す

4. **設定を確認**
   - Settings > Builds & deployments

#### 確認項目

- [ ] プロジェクト名: _______________
- [ ] 自動デプロイ: 有効 / 無効
- [ ] デプロイブランチ: _______________（main? master?）
- [ ] ビルドコマンド: _______________（静的サイトの場合は空欄の可能性）
- [ ] 出力ディレクトリ: _______________（"/" または空欄の可能性）
- [ ] 環境変数: 有 / 無

---

### 2. GitHub連携設定

#### 確認方法

1. **Cloudflare Pages > Settings > Builds & deployments**

2. **Git provider**
   - GitHub との連携状況を確認

#### 確認項目

- [ ] Git provider: GitHub / GitLab / その他
- [ ] リポジトリ: _______________
- [ ] アカウント: _______________（forPT2023?）
- [ ] 連携状態: 接続済み / 未接続

#### GitHub側の確認

1. **GitHub > Settings > Applications**
   ```
   https://github.com/settings/installations
   ```

2. **Cloudflare Pages**
   - インストール済みか確認
   - リポジトリアクセス権限を確認

---

### 3. 管理権限

#### 確認方法

1. **Cloudflare Account > Members**
   ```
   https://dash.cloudflare.com/[account-id]/members
   ```

2. **自分のロールを確認**

#### 確認項目

- [ ] アカウントタイプ: 個人 / 組織
- [ ] 自分のロール: _______________
  - Administrator（全権限）
  - Developer（開発権限）
  - その他

- [ ] 他のメンバー: 有 / 無
  - メンバー数: _______________

---

### 4. デプロイ履歴とロールバック機能

#### 確認方法

1. **Cloudflare Pages > プロジェクト選択**

2. **Deployments タブ**
   - 過去のデプロイ履歴を確認

#### 確認項目

- [ ] デプロイ履歴: 確認可能 / 不可
- [ ] 最新デプロイ日時: _______________
- [ ] デプロイステータス: Success / Failed / その他
- [ ] ロールバック機能: 有効 / 無効

#### ロールバックのテスト（オプション）

1. デプロイ履歴から過去のデプロイを選択
2. "Rollback to this deployment" ボタンがあるか確認
3. **注意**: 実際にロールバックしないでください（確認のみ）

---

### 5. カスタムドメイン設定

#### 確認方法

1. **Cloudflare Pages > プロジェクト > Custom domains**

#### 確認項目

- [ ] カスタムドメイン: 有 / 無
- [ ] デフォルトドメイン: posture-analysis.pages.dev
- [ ] カスタムドメイン: _______________（設定している場合）
- [ ] SSL/TLS: 有効 / 無効

---

### 6. ビルド設定

#### 確認方法

1. **Cloudflare Pages > プロジェクト > Settings > Builds & deployments**

#### 確認項目

```
Production branch: _______________
Build command: _______________
Build output directory: _______________
Root directory: _______________
Environment variables: _______________
```

---

### 7. プレビューデプロイ

#### 確認方法

1. **Settings > Builds & deployments > Preview deployments**

#### 確認項目

- [ ] プレビューデプロイ: 有効 / 無効
- [ ] 対象ブランチ: すべてのブランチ / 特定のブランチ
- [ ] プレビューURL形式: _______________

---

## 📝 設定情報の記録テンプレート

以下をコピーして、実際の設定を記録してください：

```markdown
# Cloudflare Pages 実際の設定（記録日: __/__/__）

## プロジェクト情報
- プロジェクト名: _______________
- プロジェクトID: _______________
- 作成日: _______________

## 自動デプロイ設定
- 自動デプロイ: ☐ 有効 / ☐ 無効
- Production branch: _______________
- Build command: _______________
- Build output directory: _______________
- Root directory: _______________

## GitHub連携
- Git provider: ☐ GitHub / ☐ GitLab / ☐ その他
- リポジトリ: _______________
- アカウント: _______________
- 連携状態: ☐ 接続済み / ☐ 未接続

## 管理権限
- アカウントタイプ: ☐ 個人 / ☐ 組織
- 自分のロール: _______________
- 他のメンバー: ☐ 有（___人） / ☐ 無

## デプロイ履歴
- 最新デプロイ日時: _______________
- デプロイステータス: _______________
- ロールバック機能: ☐ 有効 / ☐ 無効

## ドメイン設定
- デフォルトドメイン: posture-analysis.pages.dev
- カスタムドメイン: _______________
- SSL/TLS: ☐ 有効 / ☐ 無効

## プレビューデプロイ
- プレビューデプロイ: ☐ 有効 / ☐ 無効
- 対象ブランチ: _______________

## 環境変数
- 設定済み環境変数: _______________
```

---

## 🔧 よくある設定パターン

### パターン1: 静的サイト（HTMLのみ）

```
Production branch: main
Build command: （空欄）
Build output directory: /
Root directory: （空欄）
Environment variables: （なし）
```

### パターン2: ビルドが必要な場合

```
Production branch: main
Build command: npm run build
Build output directory: /dist
Root directory: （空欄）
Environment variables: （あれば）
```

### パターン3: サブディレクトリでの運用

```
Production branch: main
Build command: （空欄）
Build output directory: /
Root directory: /webapp
Environment variables: （なし）
```

---

## 🚨 トラブルシューティング

### 問題1: 自動デプロイが動作しない

#### 確認事項

1. **GitHub連携が切れている**
   - Cloudflare Pages > Settings > Builds & deployments
   - "Reconnect to GitHub" ボタンがあれば、クリック

2. **デプロイブランチが間違っている**
   - Production branch が "main" になっているか確認
   - リポジトリのデフォルトブランチと一致しているか

3. **ビルドが失敗している**
   - Deployments タブでビルドログを確認
   - エラーメッセージを確認

---

### 問題2: ロールバックができない

#### 原因と対策

1. **権限不足**
   - 自分のロールを確認（Administrator または Developer が必要）

2. **デプロイ履歴が短い**
   - 最初のデプロイしかない場合、ロールバック先がない

3. **機能が無効**
   - プランによってはロールバック機能が制限されている可能性

---

### 問題3: 管理権限がない

#### 対策

1. **アカウントオーナーに連絡**
   - 権限の付与を依頼

2. **自分がオーナーの場合**
   - ログインアカウントが正しいか確認
   - 複数アカウントがある場合、切り替える

---

## 📊 推奨される設定（このプロジェクト用）

### 基本設定

```yaml
Project name: posture-analysis
Production branch: main
Build command: （空欄）
Build output directory: /
Root directory: （空欄）

Automatic deployments: 有効
Preview deployments: 有効（すべてのブランチ）
```

### GitHub連携

```yaml
Git provider: GitHub
Repository: forPT2023/Posture-Analysis-forPT
Account: forPT2023
連携状態: 接続済み
```

### ドメイン

```yaml
Default domain: posture-analysis.pages.dev
SSL/TLS: 有効（自動）
```

---

## ✅ 確認チェックリスト

### 初回確認（必須）

- [ ] Cloudflare Dashboardにログインできる
- [ ] プロジェクトが表示される
- [ ] 自動デプロイの設定を確認
- [ ] GitHub連携の状態を確認
- [ ] 自分の管理権限を確認
- [ ] デプロイ履歴を確認
- [ ] ロールバック機能の有無を確認
- [ ] 上記の「設定情報の記録テンプレート」に記入

### 定期確認（月1回推奨）

- [ ] デプロイが正常に動作しているか
- [ ] GitHub連携が切れていないか
- [ ] 本番サイトが正常に表示されるか
- [ ] SSL証明書が有効か

---

## 📞 次のアクション

### 1. 今すぐ確認すること

1. Cloudflare Dashboardにログイン
2. 上記の確認項目をチェック
3. 設定情報を記録

### 2. このドキュメントを更新

確認後、以下のファイルを作成してください：

**ファイル名**: `CLOUDFLARE_SETTINGS_ACTUAL.md`

```markdown
# Cloudflare Pages 実際の設定

## 確認日
2026年10月8日

## プロジェクト情報
（ここに実際の設定を記載）

## 自動デプロイ設定
（ここに実際の設定を記載）

## 管理権限
（ここに実際の設定を記載）

## 備考
（気づいた点など）
```

### 3. Codexに情報を共有

確認後、Codexに以下を伝えてください：

```
Cloudflare Pagesの実際の設定を確認しました。
CLOUDFLARE_SETTINGS_ACTUAL.md に記録したので、
それを読んで、実際の設定を把握してください。
```

---

## 🎯 まとめ

### 現状

- ✅ コードはGitHubにプッシュ済み
- ✅ 本番サイトは稼働中（https://posture-analysis.pages.dev）
- ⚠️ Cloudflareの詳細設定は**未確認**

### 必要なアクション

1. ✅ Cloudflare Dashboardで設定確認
2. ✅ 設定情報を記録
3. ✅ このドキュメントを更新
4. ✅ Codexに情報を共有

---

**まずはCloudflare Dashboardにログインして、実際の設定を確認してください！** 🔍
