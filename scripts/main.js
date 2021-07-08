window.addEventListener('DOMContentLoaded', function addHandlers() {
  let diagram = document.querySelector('.diagram');

  let draggedElement = null;
  let draggedOffsetInDiagramCoordinates = null;
  let nextId = 0;
  let draggedConnection = null;
  let draggedTargetPort = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  draggedTargetPort.setAttribute('data-dx', '0');
  draggedTargetPort.id = 'dragged_port';
  diagram.appendChild(draggedTargetPort);

  function convertToDiagramCoordinates(coordX, coordY, ctm) {
    return {x: (coordX - ctm.e)/ctm.a, y: (coordY - ctm.f)/ctm.d};
  }

  function startDrag(evt) {
    draggedElement = evt.target.closest('.drag_handle').closest('.draggable');  // A drag_handle must be nested in a draggable
    draggedOffsetInDiagramCoordinates = convertToDiagramCoordinates(evt.clientX, evt.clientY, draggedElement.getScreenCTM());
  }

  function addNameToSetAttribute(target, attributeName, addedName) {  // like DOMTokenList.add
    let oldAttributeValue = target.getAttribute(attributeName);
    let tempSet = oldAttributeValue ? new Set(oldAttributeValue.split(',')) : new Set;
    tempSet.add(addedName);
    target.setAttribute(attributeName, [...tempSet].join());
  }

  function makeNewConnection(connectionId, sourcePortSelector, targetPortSelector, baseDiagram) {  // Make a new connection; update port data if it's between nodes
    let newConnection = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    newConnection.setAttribute('id', connectionId);
    newConnection.dataset.source = sourcePortSelector;
    newConnection.dataset.target = targetPortSelector;
    newConnection.classList.add('connection');
    let newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    newConnection.appendChild(newPath);
    baseDiagram.insertBefore(newConnection, baseDiagram.firstChild);
    if (targetPortSelector !== '#dragged_port') {  // This is a connection between nodes
      let sourcePort = baseDiagram.querySelector(sourcePortSelector);
      addNameToSetAttribute(sourcePort, 'data-connections', connectionId);
      let targetPort = baseDiagram.querySelector(targetPortSelector);
      addNameToSetAttribute(targetPort, 'data-connections', connectionId);
      newConnection.appendChild(newPath.cloneNode(false));
      newPath.setAttribute('style', 'stroke-opacity:0;stroke-width:10');  // See-through element to make hovering easier
      let newCloseButton = newConnection.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'text'));
      newCloseButton.appendChild(document.createTextNode('❌'));
      newCloseButton.classList.add('close_button');
      newConnection.classList.add('live_connection');
      newConnection.classList.add('closeable');
    }
    return newConnection;
  }

  function getPortSelector(port) {  // Only works for ports that are part of a node
    return `#${port.closest('.draggable').id} .${port.dataset.port}`;
  }

  function startConnectionDrag(evt) {
    draggedConnection = makeNewConnection('dragged_connection', getPortSelector(evt.target), '#dragged_port', diagram);
  }

  function onMouseDownOnDiagram(evt) {  // Check if the user wants to drag something around and, if yes, set it up
    if (evt.button === 0) {
      if (evt.target.closest('.drag_handle') && !evt.target.closest('.disable_dragging')) {
        startDrag(evt);
      } else if (evt.target.closest('.input_port, .output_port')) {
        startConnectionDrag(evt);
      }
    }
  }

  function updateConnectionPath(connection) {
    let sourcePort = document.querySelector(connection.dataset.source);
    let sourcePosition = convertToDiagramCoordinates(Number(sourcePort.getAttribute('cx')), Number(sourcePort.getAttribute('cy')), sourcePort.getCTM().inverse());
    let sourceDx = Number(sourcePort.dataset.dx);
    let targetPort = document.querySelector(connection.dataset.target);
    let targetPosition = convertToDiagramCoordinates(Number(targetPort.getAttribute('cx')), Number(targetPort.getAttribute('cy')), targetPort.getCTM().inverse());
    let targetDx = Number(targetPort.dataset.dx);
    for (const pathElement of connection.querySelectorAll('path')) {
      pathElement.setAttribute('d', 'M '+ sourcePosition.x + ',' + sourcePosition.y + ' C '
        + (sourcePosition.x + sourceDx) + ',' + sourcePosition.y + ' '
        + (targetPosition.x + targetDx) + ',' + targetPosition.y + ' '
        + targetPosition.x + ',' + targetPosition.y);
    }
    for (const closeButton of connection.querySelectorAll('.close_button')) {
      closeButton.setAttribute('x', 0.5*sourcePosition.x + 0.5*targetPosition.x + 0.375*sourceDx + 0.375*targetDx);
      closeButton.setAttribute('y', 0.5*sourcePosition.y + 0.5*targetPosition.y + 5);
    }
  }

  function setNodePosition(node, newPositionX, newPositionY) {  // Sets the transform of a node's SVG group
    node.setAttributeNS(null, "transform", `translate(${newPositionX},${newPositionY})`);
    for (const port of node.querySelectorAll(".input_port, .output_port")) {
      let portConnectionIds = port.dataset.connections ? port.dataset.connections.split(',') : [];
      for (const connectionId of portConnectionIds) {
        updateConnectionPath(document.getElementById(connectionId));
      }
    }
  }

  function portsAreCompatible(sourcePort, targetPort) {  // Check if two ports can be connected
    return (sourcePort.classList.contains('input_port') && targetPort.classList.contains('output_port'))
      || (sourcePort.classList.contains('output_port') && targetPort.classList.contains('input_port'));
  }

  function onMouseMoveOnDiagram(evt) {  // Perform dragging code if we're currently dragging something
    let mousePosition = convertToDiagramCoordinates(evt.clientX, evt.clientY, diagram.getScreenCTM());
    if (draggedElement) {
      evt.preventDefault();
      setNodePosition(draggedElement, mousePosition.x - draggedOffsetInDiagramCoordinates.x, mousePosition.y - draggedOffsetInDiagramCoordinates.y);
    } else if (draggedConnection) {
      evt.preventDefault();
      if (portsAreCompatible(document.querySelector(draggedConnection.dataset.source), evt.target)) {
        draggedConnection.dataset.target = getPortSelector(evt.target);
      } else {
        draggedConnection.dataset.target = '#dragged_port';
        draggedTargetPort.setAttribute('cx', mousePosition.x);
        draggedTargetPort.setAttribute('cy', mousePosition.y);
      }
      updateConnectionPath(draggedConnection);
    }
  }

  function removeNameFromSetAttribute(target, attributeName, deletedName) {  // like DOMTokenList.remove
    let oldAttributeValue = target.getAttribute(attributeName);
    let tempSet = oldAttributeValue ? new Set(oldAttributeValue.split(',')) : new Set;
    tempSet.delete(deletedName);
    target.setAttribute(attributeName, [...tempSet].join());
  }

  function deleteConnection(connectionId) {  // Remove connection from diagram and adjust port data accordingly
    let removedConnection = document.getElementById(connectionId);
    if (removedConnection) {
      let sourcePort = diagram.querySelector(removedConnection.dataset.source);
      if (sourcePort) {
        removeNameFromSetAttribute(sourcePort, 'data-connections', connectionId);
      }
      let targetPort = diagram.querySelector(removedConnection.dataset.target);
      if (targetPort) {
        removeNameFromSetAttribute(targetPort, 'data-connections', connectionId);
      }
      diagram.removeChild(removedConnection);
    }
  }

  function onMouseUpOnDiagram(evt) {  // Cancel or finalize any currently active dragging action
    if (draggedElement) {
      draggedElement = null;
    }
    if (draggedConnection) {
      let sourcePort = document.querySelector(draggedConnection.dataset.source);
      if (portsAreCompatible(sourcePort, evt.target)) {
        updateConnectionPath(makeNewConnection(`connection${nextId++}`, draggedConnection.dataset.source, getPortSelector(evt.target), diagram));
      }
      diagram.removeChild(draggedConnection);
      draggedConnection = null;
    }
  }

  function onClickOnDiagram(evt) {  // Check if the user clicked a close button and if so, destroy the associated element
    if (evt.button === 0 && evt.target.closest('.close_button')) {
      let closedElement = evt.target.closest('.closeable');
      if (closedElement && closedElement.classList.contains('connection')) {
        deleteConnection(closedElement.id);
      } else if (closedElement) {
        diagram.removeChild(closedElement);
        for (const port of closedElement.querySelectorAll(".input_port, .output_port")) {
          let portConnectionIds = port.dataset.connections ? port.dataset.connections.split(',') : [];
          for (const connectionId of portConnectionIds) {
            deleteConnection(connectionId);
          }
        }
      }
    }
  }

  function onHtml5DragStartFromNodeTemplate(evt) {
    evt.dataTransfer.setData("text/dragged-template", evt.target.id);
    evt.dataTransfer.dropEffect = "copy";
    draggedOffsetInDiagramCoordinates = convertToDiagramCoordinates(evt.clientX, evt.clientY, evt.target.querySelector('.draggable').getScreenCTM());
  }

  function onHtml5DragoverOnDiagram(evt) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  }

  function createNode(templateId, newNodeX, newNodeY, baseDiagram) {
    let draggedNodeCopy = document.getElementById(templateId).querySelector('.draggable').cloneNode(true);
    draggedNodeCopy.setAttributeNS(null, "transform", `translate(${newNodeX},${newNodeY})`);
    draggedNodeCopy.id = `node${nextId++}`;
    baseDiagram.appendChild(draggedNodeCopy);
    return draggedNodeCopy;
  }

  function onHtml5DropOnDiagram(evt) {
    evt.preventDefault();
    if (evt.dataTransfer.getData("text/dragged-template")) {
      let newNodePosition = convertToDiagramCoordinates(evt.clientX, evt.clientY, diagram.getScreenCTM());
      createNode(evt.dataTransfer.getData("text/dragged-template"), newNodePosition.x + 0.5 - draggedOffsetInDiagramCoordinates.x, newNodePosition.y + 0.5 - draggedOffsetInDiagramCoordinates.y, diagram);
    }
  }

  function updateAndToggleJsonExport() {
    for (const exportElement of document.querySelectorAll('.json_export')) {exportElement.classList.toggle('visible');}
    let exportObject = {};
    for (const node of diagram.querySelectorAll('.node')) {
      exportObject[node.id] = {diagram_position: {x: node.getCTM().e, y: node.getCTM().f}, type: node.dataset.type};
      for (const configField of node.querySelectorAll('input')) {
        exportObject[node.id][configField.dataset.field] = configField.value;
      }
      for (const inputPort of node.querySelectorAll('.input_port')) {
        exportObject[node.id][inputPort.dataset.port] = []
        for (const connectionId of inputPort.dataset.connections ? inputPort.dataset.connections.split(',') : []) {
          let connection = document.getElementById(connectionId);
          let portSelector = getPortSelector(inputPort);
          let outputPort = document.querySelector(connection.dataset.source === portSelector ? connection.dataset.target : connection.dataset.source);
          exportObject[node.id][inputPort.dataset.port].push({node: outputPort.closest('.draggable').id, port: outputPort.dataset.port});
        }
      }
    }
    document.querySelector('.json_export textarea').value = JSON.stringify(exportObject);
  }

  function importFromJson() {
    let data = JSON.parse(document.querySelector('.json_export textarea').value);
    let idMap = {};  // Maps ID in the JSON to the newly created node
    let shadowDiagram = document.querySelector('.synth.diagram').cloneNode(false);
    for (const [savedId, savedData] of Object.entries(data)) {
      idMap[savedId] = createNode(savedData.type, savedData.diagram_position.x, savedData.diagram_position.y, shadowDiagram);
      for (const configField of idMap[savedId].querySelectorAll('input')) {
        configField.value = savedData[configField.dataset.field];
      }
    }
    for (const [savedId, savedData] of Object.entries(data)) {
      for (const inputPort of idMap[savedId].querySelectorAll('.input_port')) {
        for (const outputPortData of savedData[inputPort.dataset.port]) {
          makeNewConnection(`connection${nextId++}`, `#${idMap[outputPortData.node].id} .${outputPortData.port}`, getPortSelector(inputPort), shadowDiagram);
        }
      }
    }
    diagram.parentNode.insertBefore(shadowDiagram, diagram);
    diagram.parentNode.removeChild(diagram);
    diagram = shadowDiagram;
    for (const connection of diagram.querySelectorAll('.connection')) {
      updateConnectionPath(connection);
    }
  }

  diagram.parentNode.addEventListener('mousedown', onMouseDownOnDiagram);
  diagram.parentNode.addEventListener('mousemove', onMouseMoveOnDiagram);
  diagram.parentNode.addEventListener('mouseup', onMouseUpOnDiagram);
  diagram.parentNode.addEventListener('mouseleave', onMouseUpOnDiagram);  // We can't check for mouseup events when the mouse is not on the diagram, so leaving is considered letting go of the button
  diagram.parentNode.addEventListener('click', onClickOnDiagram);

  for (const nodeTemplate of document.querySelectorAll(".node_overview li")) {
    nodeTemplate.addEventListener("dragstart", onHtml5DragStartFromNodeTemplate);
  }
  diagram.parentNode.addEventListener("dragover", onHtml5DragoverOnDiagram);
  diagram.parentNode.addEventListener("drop", onHtml5DropOnDiagram);

  document.querySelector('#show_json').addEventListener('click', updateAndToggleJsonExport);
  document.querySelector('#import_json').addEventListener('click', importFromJson);
});