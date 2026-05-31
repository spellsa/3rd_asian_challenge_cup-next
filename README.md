# AIDY
こちらのリポジトリは第3回 Asian Challenge Cupで作成したプロジェクト AIDY です。
第3回 Asian Challenge Cupで作成したコア機能はそのままに、いくつか機能を付け足したものです。

## 機能
- LLMを利用した問題の作成
    - PDF、画像、任意のプロンプトから問題を作成することができます。
    - 穴埋め形式、数値形式、自由入力形式などさまざまな問題形式に対応しています。
    - ※ログインが必須な機能です。
 - 手動での問題作成（新規追加）
    - ※ログインが必須な機能です。
 - 問題の共有機能
     - 作成した問題はURLを使用して共有することができます。
     - 共有された問題はログインをしている状態でなくても解くことができます。
 - LLMを利用した採点
     - 一部の問題形式（自由回答形式）ではLLMを利用した採点を行うことができます。これにより、従来では完全一致で判定するしかなかった問題についても
       より柔軟に対応することができるようになります。LLMの採点ではあらかじめ設定した採点基準に基づいて採点を行います。
     - ※ログインが必須な機能です。ログインしていない状態では完全一致に基づいた採点が行われます。
- レベリング機能
    - 解いた問題数に合わせてユーザーレベルが上昇するようになっています。

## 実際の機能
### トップ画面
<img width="800" alt="Image" src="https://github.com/user-attachments/assets/5129a709-1936-4c40-b95a-acc305e53bf6" />

### ログイン画面
こちらのログイン画面ではGoogleアカウントを利用したログインが使用可能になっています。
<img width="800" alt="Image" src="https://github.com/user-attachments/assets/e20f6934-b314-410c-9ff0-5417c50b962e" />

### ホーム画面
こちらのホーム画面からは以下にアクセスすることができます。
- 最近解いた問題
- 自分で作成した問題
- 問題作成画面
- プロフィール画面
<img width="800" alt="Image" src="https://github.com/user-attachments/assets/a920856c-d71f-41f6-8c70-6f58c9962646" />

### プロフィール画面
プロフィール画面からはユーザー名の変更とアイコン画像の変更、レベルの確認ができます。
<img width="800" alt="Image" src="https://github.com/user-attachments/assets/d398a455-d87f-4421-a5b6-eebee07670b5" />

### 問題作成方法選択画面
この画面からは、手動で問題を作成するかLLMを使用して問題を作成するか選択することができます。
<img width="800" alt="Image" src="https://github.com/user-attachments/assets/d3a2993e-4909-4e78-8f2e-dd6f403c5fdf" />

### 手動作成
手動作成画面では自ら問題タイプを指定して問題を作成することができます。また、LLM採点を有効にした場合には採点基準を設定することもできます。
<img width="800" alt="Image" src="https://github.com/user-attachments/assets/82aef57a-ff9d-4e39-b98a-96281160249d" />

AIDYではLaTeX形式の数式入力が可能になっています。

<img width="185" height="116" alt="Image" src="https://github.com/user-attachments/assets/84a8986b-d480-4ec8-aa67-bee09749284e" />
<img width="140" height="62" alt="Image" src="https://github.com/user-attachments/assets/d7aee5cb-e9a6-4639-a1a2-708029720d7c" />

### LLMを利用した問題作成
この画面ではLLMを利用した問題作成を行うことができます。任意のPDFと画像のアップロードに対応しています。また、プロンプトを入力することによってユーザーが
問題生成をカスタマイズできるようになっています。問題タイプの指定も可能になっており、特定の問題タイプのみから出題するように設定することも可能です。
<img width="800" alt="Image" src="https://github.com/user-attachments/assets/7f969f49-1ccb-4a04-93bb-bc4ef7c9ae42" />

### 実際に問題を解く画面
問題を解く機能を利用する際にはログインは不要です。しかし、LLM採点を利用する場合にはログインが必要となります。ログインしていない状態では答えとの完全一致によって採点が行われます。
<img width="800" alt="Image" src="https://github.com/user-attachments/assets/486bf2f8-c12c-4c60-86c0-20731d3ffeca" />
