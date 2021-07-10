(function() {
  // The output of every node can be interpreted as a mathematical function f
  // Following nodes can query this function to get a value y = f(t)

  let nodeTypes = [
    [['sinwave', 'Sinewave'], [['single', 'phase', 'phase']], ['output'], [['frequency', 'Frequency', 440]]],
    [['linear', 'Linear'], [['single', 'phase', 'phase']], ['output'], [['angle', 'Angle', 10]]],
    [['sawtooth', 'Sawtooth'], [['single', 'phase', 'phase']], ['output'], [['frequency', 'Frequency', 440], ['alpha', 'Alpha', 0.1]]],
    [['fft', 'FFT'], [['single', 'ampl', 'ampl.'], ['single', 'phase', 'phase']], ['output'], [['length', 'Length', 1.0]]],
  ];

  function setAttributes(e, attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      e.setAttribute(key, value);
    }
    return e;
  }

  function newNodeTemplate(type, inputs, outputs, configFields) {
    let width = 96;
    let height = 32 + Math.max(32*configFields.length, 16*inputs.length, 16*outputs.length);
    let listItem = setAttributes(document.createElementNS('http://www.w3.org/1999/xhtml', 'li'), {draggable: 'true', id: type[0]});
    let svg = listItem.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), {class: 'synth', viewBox: `-6.5 -6.5 116 ${12 + height}`, width: 116, height: height + 12}));
    let mainGroup = svg.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'g'), {class: 'draggable closeable node', 'data-type': type[0]}));
    let shadowGroup = mainGroup.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'g'), {style: 'opacity:0.3'}));
    shadowGroup.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'rect'), {x: 4, y: 4, width: 96, height: height, style:'fill:#000000'}));
    mainGroup.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'rect'), {x: 0, y: 0, width: 96, height: height, style: 'fill:#ffffff;stroke:#000000;stroke-width:1'}));
    let dragHandle = mainGroup.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'g'), {class: 'drag_handle'}));
    dragHandle.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'rect'), {x: 0, y: 0, height: 16, width: 96, style: 'fill:#ffffff;stroke:#000000;stroke-width:1'}));
    dragHandle.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'text'), {x: 4, y: 12})).textContent = type[1];
    dragHandle.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'text'), {x: 90, y: 12, class: 'close_button disable_dragging'})).textContent = 'x';
    for (const [i, [inputType, inputId, inputDisplayName]] of inputs.entries()) {
      mainGroup.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'circle'), {cx: 0, cy: 32 + 16*i, r: 4, class: `input_port ${inputId}`, 'data-port': inputId, 'data-connections': '', 'data-dx': -50, style: 'fill:#ffffff;stroke:#000000;stroke-width:1'}));
      mainGroup.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'text'), {x: 8, y: 36 + 16*i})).textContent = inputDisplayName;
    }
    for (const [i, outputId] of outputs.entries()) {
      shadowGroup.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'circle'), {cx: 100, cy: 36 + 16*i, r: 4, style: 'fill:#000000;stroke:#000000;stroke-width:1'}));
      mainGroup.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'circle'), {cx: 96, cy: 32 + 16*i, r: 4, class: `output_port ${outputId}`, 'data-port': outputId, 'data-connections': '', 'data-dx': 50, style: 'fill:#ffffff;stroke:#000000;stroke-width:1'}));
    }
    for (const [i, [configId, configDisplayName, configDefault]] of configFields.entries()) {
      mainGroup.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'text'), {x: 40, y: 28 + 32*i})).textContent = configDisplayName;
      let foreignObjectWrapper = mainGroup.appendChild(setAttributes(document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject'), {x: 40, y: 32 + 32*i, width: 44, height: 16}));
      foreignObjectWrapper.appendChild(setAttributes(document.createElementNS('http://www.w3.org/1999/xhtml', 'input'), {type: 'text', value: configDefault, 'data-field': configId}));
    }
    return listItem;
  }
  
  let nodeList = document.querySelector('.node_overview ul');
  for (const [type, inputs, outputs, configFields] of nodeTypes) {
    nodeList.appendChild(newNodeTemplate(type, inputs, outputs, configFields));
  }
})();