import { $, addPage, NamedPage, UserSelectAutoComplete, Notification, delay, i18n, url, request, ConfirmDialog, tpl } from '@hydrooj/ui-default'

addPage(new NamedPage(['coin_inc', 'coin_gift'], () => {
    UserSelectAutoComplete.getOrConstruct($('[name="uidOrName"]'), {
        clearDefaultValue: false,
    });
}));

addPage (new NamedPage('coin_inc', () => {
  $(document).on('click', '[type="submit"]', async (ev) => {
    ev.preventDefault();

    const $form = $(ev.currentTarget).closest('form');
    try {
      const res = await request.post('', {
        uidOrName: $form.find('[name="uidOrName"]').val(),
        amount: $form.find('[name="amount"]').val(),
        text: $form.find('[name="text"]').val(),
      });
      if (res.url) {
        Notification.success(i18n('硬幣發放成功'));
        await delay(1000);
        window.location.href = res.url;
      }
    } catch (e) {
      Notification.error(e.message);
    }
  });
}));

addPage (new NamedPage('coin_import', () => {
  async function post(draft) {
    try {
      const res = await request.post('', {
        coins: $('[name="coins"]').val(),
        draft,
      });
      if (!draft) {
        if (res.url) window.location.href = res.url;
        else if (res.error) throw new Error(res.error?.message || res.error);
        else {
          Notification.success(i18n('Updated {0} coin records.', res.coins.length));
          await delay(2000);
          window.location.reload();
        }
      } else {
        $('[name="messages"]').text(res.messages.join('\n'));
      }
    } catch (e) {
      Notification.error(e.message);
    }
  }

  $('[name="preview"]').on('click', () => post(true));
  $('[name="submit"]').on('click', () => post(false));
}));

addPage (new NamedPage('goods_add', () => {
  $(document).on('click', '[type="submit"]', async (ev) => {
    ev.preventDefault();

    const $form = $(ev.currentTarget).closest('form');
    try {
      const res = await request.post('', {
        objectId: $form.find('[name="objectId"]').val(),
        redirectUrl: $form.find('[name="redirectUrl"]').val(),
        name: $form.find('[name="name"]').val(),
        description: $form.find('[name="description"]').val(),
        price: $form.find('[name="price"]').val(),
        num: $form.find('[name="num"]').val(),
      });
      if (res.success) {
        Notification.success(i18n('新增商品成功'));
        await delay(1000);
        window.location.reload();
      }
    } catch (e) {
      Notification.error(e.message);
    }
  });
}));

addPage(new NamedPage('goods_edit', () => {
  $(document).on('click', '[name="operation"][value="update"]', async (ev) => {
    ev.preventDefault();

    const $form = $(ev.currentTarget).closest('form');
    try {
      const res = await request.post('', {
        operation: 'update',
        id: $form.find('[name="id"]').val(),
        objectId: $form.find('[name="objectId"]').val(),
        redirectUrl: $form.find('[name="redirectUrl"]').val(),
        name: $form.find('[name="name"]').val(),
        description: $form.find('[name="description"]').val(),
        price: $form.find('[name="price"]').val(),
        num: $form.find('[name="num"]').val(),
      });
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (e) {
      Notification.error(e.message);
    }
  });

  $(document).on('click', '[name="operation"][value="delete"]', async (ev) => {
    ev.preventDefault();
    const message = '確認刪除此商品嗎？刪除後將無法恢復。';
    const action = await new ConfirmDialog({
        $body: tpl`
            <div class="typo">
                <p>${i18n(message)}</p>
            </div>`,
    }).open();
    if (action !== 'yes') return;

    const $form = $(ev.currentTarget).closest('form'); 
    try {
      const res = await request.post('', {
        operation: 'delete',
        id: $form.find('[name="id"]').val(),
      });
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (e) {
        Notification.error(e.message);
    }
    });
}));

addPage (new NamedPage('coin_exchange', () => {
  $(document).on('click', '[type="submit"]', async (ev) => {
    ev.preventDefault();

    const $form = $(ev.currentTarget).closest('form');
    try {
      const res = await request.post('', {
        id: $form.find('[name="id"]').val(),
        num: $form.find('[name="num"]').val(),
      });
      const target = res.success ? (res.redirectUrl || res.url) : '';
      if (res.success && target) {
        Notification.success(i18n('兌換商品成功'));
        await delay(1000);
        window.location.href = target;
      }
    } catch (e) {
      Notification.error(e.message);
    }
  });
}));

addPage(new NamedPage('coin_record', () => {
  $(document).on('click', '[type="submit"]', async (ev) => {
    ev.preventDefault();
    const message = '確定要兌換該訂單嗎？';
    const action = await new ConfirmDialog({
        $body: tpl`
            <div class="typo">
                <p>${i18n(message)}</p>
            </div>`,
    }).open();
    if (action !== 'yes') return;

    const $form = $(ev.currentTarget).closest('form'); 
    try {
        const res = await request.post('', {
          id: $form.find('[name="id"]').val(),
        });
      if (res.success) {
        Notification.success(i18n('兌換成功'));
        await delay(1000);
        window.location.reload();
      }
    } catch (e) {
        Notification.error(e.message);
    }
  });
}));

addPage (new NamedPage('coin_gift', () => {
  $(document).on('click', '[type="submit"]', async (ev) => {
    ev.preventDefault();

    const $form = $(ev.currentTarget).closest('form');
    try {
      const res = await request.post('', {
        password: $form.find('[name="password"]').val(),
        uidOrName: $form.find('[name="uidOrName"]').val(),
        amount: $form.find('[name="amount"]').val(),
      });
      if (res.success) {
        Notification.success(i18n('贈送硬幣成功'));
        await delay(1000);
        window.location.reload(); 
      }
    } catch (e) {
      Notification.error(e.message);
    }
  });
}));

addPage (new NamedPage('uname_change', () => {
  $(document).on('click', '[type="submit"]', async (ev) => {
    ev.preventDefault();

    const $form = $(ev.currentTarget).closest('form');
    const operation = $(ev.currentTarget).attr('value');
    try {
      const res = await request.post('', {
        operation: operation,
        password: $form.find('[name="password"]').val(),
        uidOrName: $form.find('[name="uidOrName"]').val(),
        newUname: $form.find('[name="newUname"]').val(),
      });
      if (res.url) {
        Notification.success(i18n('修改使用者名稱成功'));
        await delay(1000);
        window.location.href = res.url;
      }
    } catch (e) {
      Notification.error(e.message);
    }
  });
}));

// 添加修改使用者名稱的按鈕
addPage(new NamedPage('home_account', () => {
  $('.section__title#setting_info').closest('.section__header')
    .append('<div class="section__tools"><a class="button rounded" href="../../uname/change">修改使用者名稱</a></div>');
}));