export function createManualSimulationModel() {
  let current = Object.freeze({scenario_name: '', note: ''});
  return {
    update(values) {
      current = Object.freeze({
        scenario_name: String(values.scenario_name || '').slice(0, 40),
        note: String(values.note || '').slice(0, 180),
      });
      return current;
    },
    snapshot() {
      return current;
    },
  };
}

export function bindManualSimulation({form, output}) {
  const model = createManualSimulationModel();
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const scenario = model.update({
      scenario_name: data.get('scenario_name'),
      note: data.get('note'),
    });
    output.textContent = scenario.scenario_name
      ? `${scenario.scenario_name}：${scenario.note || '无备注'}`
      : '请填写情景名称。';
  });
  return model;
}
