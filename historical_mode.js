export function bindHistoricalMode({form, input, onExactDate}) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!input.value) return;
    onExactDate(input.value);
  });
}
