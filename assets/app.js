(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function setupMobileMenu() {
    const button = $('[data-mobile-menu]');
    const panel = $('#mobile-panel');
    if (!button || !panel) return;

    const close = () => {
      button.setAttribute('aria-expanded', 'false');
      panel.classList.remove('open');
      document.body.classList.remove('menu-open');
    };

    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      panel.classList.toggle('open', !expanded);
      document.body.classList.toggle('menu-open', !expanded);
    });

    $$('a', panel).forEach(link => link.addEventListener('click', close));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
  }

  function setupTabset(selector) {
    $$(selector).forEach(tablist => {
      const tabs = $$('[role="tab"]', tablist);
      if (!tabs.length) return;
      const root = tablist.closest('[data-tabs-root]') || document;

      const activate = tab => {
        const targetId = tab.getAttribute('aria-controls');
        tabs.forEach(item => {
          const selected = item === tab;
          item.setAttribute('aria-selected', String(selected));
          item.tabIndex = selected ? 0 : -1;
        });
        $$('[role="tabpanel"]', root).forEach(panel => {
          const active = panel.id === targetId;
          panel.classList.toggle('active', active);
          panel.hidden = !active;
        });
      };

      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activate(tab));
        tab.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = tabs.length - 1;
          tabs[next].focus();
          activate(tabs[next]);
        });
      });
    });
  }

  function setupFaq() {
    $$('.faq-button').forEach(button => {
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
      });
    });
  }

  function setupPricing() {
    const buttons = $$('[data-billing]');
    const amounts = $$('[data-price-monthly]');
    if (!buttons.length || !amounts.length) return;

    const labels = {
      monthly: 'щомісяця',
      semiannual: 'за умови оплати за 6 місяців',
      annual: 'за умови річної оплати'
    };

    const setBilling = type => {
      buttons.forEach(button => button.classList.toggle('active', button.dataset.billing === type));
      amounts.forEach(node => {
        const key = `price${type.charAt(0).toUpperCase()}${type.slice(1)}`;
        node.textContent = node.dataset[key];
        const card = node.closest('.price-card');
        const detail = card && $('.price-old', card);
        const period = card && $('.price-period', card);
        if (period) period.textContent = '/міс';
        if (detail) {
          const monthly = node.dataset.priceMonthly;
          detail.innerHTML = type === 'monthly'
            ? 'Без довгострокових зобов’язань'
            : `<del>$${monthly}/міс</del> ${labels[type]}`;
        }
      });
      try { localStorage.setItem('nextcrm-billing', type); } catch (_) {}
    };

    buttons.forEach(button => button.addEventListener('click', () => setBilling(button.dataset.billing)));
    let initial = 'annual';
    try { initial = localStorage.getItem('nextcrm-billing') || initial; } catch (_) {}
    if (!buttons.some(button => button.dataset.billing === initial)) initial = 'annual';
    setBilling(initial);
  }

  function setupRoiCalculator() {
    const form = $('[data-roi-form]');
    if (!form) return;
    const orders = $('[name="orders"]', form);
    const minutes = $('[name="minutes"]', form);
    const hourly = $('[name="hourly"]', form);
    const hoursOut = $('[data-roi-hours]');
    const moneyOut = $('[data-roi-money]');
    const daysOut = $('[data-roi-days]');

    const format = value => new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(value);
    const calculate = () => {
      const orderCount = Math.max(0, Number(orders.value) || 0);
      const minutesPerOrder = Math.max(0, Number(minutes.value) || 0);
      const hourlyCost = Math.max(0, Number(hourly.value) || 0);
      const shareReduced = .3;
      const hoursSaved = orderCount * minutesPerOrder / 60 * shareReduced;
      const moneySaved = hoursSaved * hourlyCost;
      const daysSaved = hoursSaved / 8;
      if (hoursOut) hoursOut.textContent = `${format(hoursSaved)} год`;
      if (moneyOut) moneyOut.textContent = `${format(moneySaved)} грн`;
      if (daysOut) daysOut.textContent = `${format(daysSaved)} роб. днів`;
    };

    ['input', 'change'].forEach(type => form.addEventListener(type, calculate));
    calculate();
  }

  function setupIntegrationFilters() {
    const filterRoot = $('[data-integration-filters]');
    if (!filterRoot) return;
    const chips = $$('[data-filter]', filterRoot);
    const cards = $$('[data-category]');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const value = chip.dataset.filter;
        chips.forEach(item => item.classList.toggle('active', item === chip));
        cards.forEach(card => {
          const categories = card.dataset.category.split(' ');
          card.classList.toggle('hide', value !== 'all' && !categories.includes(value));
        });
      });
    });
  }

  function sanitize(value, max = 500) {
    return String(value || '').trim().replace(/[<>]/g, '').slice(0, max);
  }

  function setupLeadForms() {
    $$('[data-lead-form]').forEach(form => {
      const message = $('.form-message', form);
      const button = $('[type="submit"]', form);
      const params = new URLSearchParams(location.search);
      const plan = params.get('plan');
      const planInput = $('[name="plan"]', form);
      if (plan && planInput) planInput.value = sanitize(plan, 50);

      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Надсилаємо…';
        if (message) message.className = 'form-message';

        const data = Object.fromEntries(new FormData(form).entries());
        const payload = {
          name: sanitize(data.name, 120),
          phone: sanitize(data.phone, 60),
          email: sanitize(data.email, 160),
          company: sanitize(data.company, 160),
          orders: sanitize(data.orders, 60),
          channels: sanitize(data.channels, 160),
          currentTool: sanitize(data.currentTool, 160),
          need: sanitize(data.need, 1200),
          plan: sanitize(data.plan, 60),
          source: sanitize(data.source || document.body.dataset.page || 'website', 80),
          page: location.href,
          submittedAt: new Date().toISOString()
        };

        try {
          const response = await fetch('/api/marketing/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error('Request failed');
          if (message) {
            message.textContent = 'Дякуємо! Заявку отримано. Команда NextCRM зв’яжеться з вами найближчим робочим часом.';
            message.classList.add('success');
          }
          form.reset();
        } catch (_) {
          if (message) {
            message.innerHTML = 'Не вдалося надіслати форму. Зателефонуйте нам: <a href="tel:+380661122353">+38 066 112 23 53</a>.';
            message.classList.add('error');
          }
        } finally {
          button.disabled = false;
          button.textContent = originalText;
        }
      });
    });
  }

  function setupCookieNotice() {
    const notice = $('[data-cookie-notice]');
    if (!notice) return;
    let consent = null;
    try { consent = localStorage.getItem('nextcrm-cookie-consent'); } catch (_) {}
    if (!consent) window.setTimeout(() => notice.classList.add('show'), 900);
    $$('[data-cookie-choice]', notice).forEach(button => {
      button.addEventListener('click', () => {
        try { localStorage.setItem('nextcrm-cookie-consent', button.dataset.cookieChoice); } catch (_) {}
        notice.classList.remove('show');
      });
    });
  }

  function setupYear() {
    $$('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });
  }

  setupMobileMenu();
  setupTabset('[role="tablist"]');
  setupFaq();
  setupPricing();
  setupRoiCalculator();
  setupIntegrationFilters();
  setupLeadForms();
  setupCookieNotice();
  setupYear();
})();
