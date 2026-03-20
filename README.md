# shop

HydroOJ 硬幣與兌換商店外掛（繁體中文文件）。
以 https://github.com/cqzym1985/my-hydro-plugins 為基礎並新增供其他套件接入的功能
## 功能

- 硬幣發放與批次匯入。
- 商品管理與兌換。
- 支援商品 `objectId`（可重複綁定同一物件）。
- 支援無限供應（`num < 0`）。
- 商品 `description` 支援 Markdown，商城與兌換頁以原生 `|markdown|safe` 渲染。
- 可插拔購買邏輯（供其他套件接入）。
- 可註冊管理頁擴充入口（獨立頁面：`/shop/manage/entries`）。
- 已提供 runtime `shopBridge`，避免外掛間使用脆弱的相對路徑靜態匯入。

## 路由（目前啟用）

- `coin_show` `/coin/show`
- `coin_inc` `/coin/inc`
- `coin_import` `/coin/import`
- `coin_bill` `/coin/bill`
- `coin_mall` `/coin/mall`
- `coin_myrecord` `/coin/myrecord`
- `coin_exchange` `/coin/exchange/:id`
- `coin_record` `/coin/record`
- `goods_add` `/goods/add`
- `goods_manage` `/goods/manage`
- `shop_manage_entries` `/shop/manage/entries`
- `goods_edit` `/goods/:id/edit`
- `uname_change` `/uname/change`
- `domain_coin_setting` `/domain/coin`

註：`coin_gift` 路由在目前版本預設未啟用（程式內已註解）。

## 對外 API

`shop/index.ts` 對外提供：

- `registerGoodsPurchaseModel(modelId, model)`
- `registerShopManageEntry(entry)`
- `getShopManageEntries()`
- `CoinModel`
- `GoodsModel`

## 如何調用原生 method 發放硬幣

### 推薦方式：使用 `CoinModel.inc`（會寫入發放紀錄）

`CoinModel.inc` 會同時：

- 新增一筆硬幣帳單紀錄（`coin` collection）
- 調整使用者 `coin_now`
- 當 `asset = 1` 時，同步增加 `coin_all`

```ts
import { CoinModel } from '../shop';

// 例：管理員給使用者 +20 硬幣
// 參數：userId, rootId, amount, text, asset, status?
await CoinModel.inc(targetUid, operatorUid, 20, '活動獎勵', 1);
```

參數說明：

- `userId`: 收款人 uid
- `rootId`: 操作者 uid（誰發放）
- `amount`: 正數加幣，負數扣幣
- `text`: 帳單說明
- `asset`: `1` 代表會計入 `coin_all`，`0` 只變動 `coin_now`
- `status`（選填）: 可用於綁定商品 ID 或其他狀態碼

### 進階方式：直接調用 Hydro 原生 `UserModel.inc`

若你只想調整餘額、不要寫入硬幣帳單，可直接使用 Hydro 原生方法：

```ts
import { UserModel } from 'hydrooj';

await UserModel.inc(targetUid, 'coin_now', 20);
```

注意：這種做法不會留下 `coin_bill` 可查的發放紀錄，通常不建議拿來做正式發幣流程。

另外，執行時也會提供：

- `global.Hydro.shopBridge`
- `ctx.provide('shop_bridge', shopBridge)`

`shopBridge` 內容：

- `goodsModel`
- `registerGoodsPurchaseModel`
- `registerShopManageEntry`

## 建議接入方式（runtime bridge）

```ts
interface ShopBridge {
  goodsModel: {
    add: (
      name: string,
      price: number,
      num: number,
      objectId?: string,
      goodsId?: number,
      purchaseModelId?: string,
      data?: Record<string, unknown>,
      description?: string,
    ) => Promise<number | string>;
  };
  registerGoodsPurchaseModel: (
    modelId: string,
    model: {
      purchase: (
        uid: number,
        goods: any,
        amount: number,
      ) => Promise<boolean | { success: boolean; message?: string }> | (boolean | { success: boolean; message?: string });
    }
  ) => void;
  registerShopManageEntry: (entry: { key: string; title: string; href: string }) => void;
}

function getShopBridge(): ShopBridge | null {
  return (global.Hydro as any)?.shopBridge || null;
}

const shopBridge = getShopBridge();
if (shopBridge) {
  shopBridge.registerGoodsPurchaseModel('example_model', {
    async purchase(uid, goods, amount) {
      // 成功
      return true;
      // 或失敗（帶訊息）
      // return { success: false, message: '你已擁有此商品' };
    },
  });

  shopBridge.registerShopManageEntry({
    key: 'example_manage',
    title: '外掛管理入口',
    href: '/example/manage',
  });
}
```

## registerShopManageEntry 的 href 建議寫法

下面提供一套可重複使用的最小模板，適合用在你自己的外掛管理頁。

### 1) 先註冊管理入口（key, title, href）

    shopBridge.registerShopManageEntry({
      key: 'example_manage',
      title: 'Example 管理',
      href: '/example/manage',
    });

重點：

- key 要全域唯一，建議用與`ctx.Route`的相同（例如 example_manage）。
- href 請使用固定路徑，不要帶動態參數，方便管理頁入口穩定顯示。
- title 建議用清楚動詞，例如 新增、發佈、同步、設定。

### 2) 對應 href 的 Handler 範本

    import { Context, Handler, PERM, Types, param } from 'hydrooj';

    class ExampleManageHandler extends Handler {
      async get() {
        this.checkPerm(PERM.PERM_SET_PERM);
        this.response.template = 'example_manage.html';
        this.response.body = {
          page_name: 'example_manage',
          message: '',
        };
      }

      @param('name', Types.String)
      async post(domainId: string, name: string) {
        this.checkPerm(PERM.PERM_SET_PERM);

        // TODO: 在這裡放你的業務邏輯

        this.response.template = 'example_manage.html';
        this.response.body = {
          page_name: 'example_manage',
          message: `已完成：${name}`,
        };
      }
    }

    export function applyExample(ctx: Context) {
      ctx.Route('example_manage', '/example/manage', ExampleManageHandler, PERM.PERM_SET_PERM);
    }

### 3) 可重複使用的 HTML 模板範本

    {% extends "coin_base.html" %}
    {% block coin_content %}
    <div class="section">
      <div class="section__header">
        <h1 class="section__title">{{ _('Example 管理') }}</h1>
      </div>
      <div class="section__body">
        {% if message %}
        <blockquote class="note typo">
          <p>{{ message }}</p>
        </blockquote>
        {% endif %}

        <form method="post">
          {{ form.form_text({
            label: '名稱',
            name: 'name',
            required: true
          }) }}

          <button type="submit" class="rounded primary button">{{ _('提交') }}</button>
        </form>
      </div>
    </div>
    {% endblock %}

### 4) 命名與落地建議

- Route name、page_name、manage entry key 建議統一同一前綴，便於維護。
- 模板建議放在外掛自己的 templates 目錄，避免和其他外掛重名。
- 若頁面是資料建立型流程，成功後可保留在原頁並顯示 message；
  若是清單型流程，建議 redirect 到清單頁。

### 5) 常見錯誤

- href 打錯（例如寫成 herf）導致入口可見但無法進頁。
- Route 權限比入口預期高，造成點得進去但被拒絕。
- page_name 未設定，導致側欄 active 樣式不正確。

## 商品資料欄位

`GoodsModel` 主要欄位：

- `_id: number` 商品 ID
- `objectId?: string` 物件 ID（可重複）
- `name: string` 商品名稱
- `description?: string` 商品描述（Markdown）
- `price: number` 商品價格
- `num: number` 庫存（`-1` 或任何 `< 0` 代表無限）
- `purchaseModelId?: string` 購買處理器 ID
- `data?: Record<string, unknown>` 擴充資料

## 外掛整合範例（徽章）

徽章外掛可在發佈商品時：

- `name` 使用 `badge.title`
- `description` 使用 `badge.content`
- `purchaseModelId` 使用 `badge_purchase`

如此可讓商城直接以 Markdown 顯示徽章說明內容。

## 注意事項

- 兌換有限庫存商品時會先扣庫存；若外掛處理器失敗，系統會自動回補庫存。
- 無限供應商品（`num < 0`）不會扣庫存。
- 購買處理器可回傳 `false` 或 `{ success: false, message }` 拒絕兌換；若有 `message` 會直接顯示給使用者。
- 取消訂單流程在目前版本已停用（`coin_myrecord` 的 `POST` 會回覆功能已停用）。
