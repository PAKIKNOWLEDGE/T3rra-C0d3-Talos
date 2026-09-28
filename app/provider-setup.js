const form = document.querySelector('#providerForm');
const button = document.querySelector('#submitButton');
const result = document.querySelector('#result');

function show(title, message, trace = '') {
  result.className = `result ${title === '连接成功' ? 'success' : 'failure'}`;
  result.innerHTML = `<strong>${title}</strong><p>${message}</p>${trace ? `<details><summary>查看诊断</summary><pre></pre></details>` : ''}`;
  if (trace) result.querySelector('pre').textContent = trace;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = '测试中…';
  show('正在测试', '正在使用临时目录连接模型，请稍候。');
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch('/provider-probe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json();
    show(payload.ok ? '连接成功' : '连接失败', payload.message ?? '没有返回明确结果。', payload.trace ?? '');
  } catch (error) {
    show('连接失败', error instanceof Error ? error.message : String(error));
  } finally {
    button.disabled = false;
    button.innerHTML = '再次测试 <span>↗</span>';
  }
});
