window.addEventListener('DOMContentLoaded', function addHandlers() {
  let svg = document.querySelector('.canvas');

  let draggedElement = null;
  let draggedOffsetInSvgCoordinates = null;
  let nextId = 0;
  let draggedConnection = null;
  let draggedTargetPort = null;

  function convertToSvgCoordinates(coordX, coordY, ctm) {
    return {x: (coordX - ctm.e)/ctm.a, y: (coordY - ctm.f)/ctm.d};
  }

  function getPortSelector(port) {
    return '#' + port.closest('.draggable').id + ' .' + port.getAttribute('data-port');
  }

  function startDrag(evt) {
    draggedElement = evt.target.closest('.drag_handle').closest('.draggable');  // A drag_handle must be nested in a draggable
    let mousePosition = convertToSvgCoordinates(evt.clientX, evt.clientY, svg.getScreenCTM());
    let draggablePosition = {x: draggedElement.getCTM().e, y: draggedElement.getCTM().f};
    draggedOffsetInSvgCoordinates = {
      x: draggablePosition.x - mousePosition.x,
      y: draggablePosition.y - mousePosition.y,
    };
  }

  function addNameToSetAttribute(target, attributeName, addedName) {
    let oldAttributeValue = target.getAttribute(attributeName);
    let tempSet = oldAttributeValue ? new Set(oldAttributeValue.split(',')) : new Set;
    tempSet.add(addedName);
    target.setAttribute(attributeName, [...tempSet].join());
  }

  function removeNameFromSetAttribute(target, attributeName, deletedName) {
    let oldAttributeValue = target.getAttribute(attributeName);
    let tempSet = oldAttributeValue ? new Set(oldAttributeValue.split(',')) : new Set;
    tempSet.delete(deletedName);
    target.setAttribute(attributeName, [...tempSet].join());
  }

  function makeNewConnection(connectionId, sourcePortSelector, targetPortSelector) {
    let newConnection = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    newConnection.setAttribute('id', connectionId);
    newConnection.dataset.source = sourcePortSelector;
    newConnection.dataset.target = targetPortSelector;
    newConnection.classList.add('connection');
    let newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    newConnection.appendChild(newPath);
    svg.insertBefore(newConnection, svg.firstChild);
    if (targetPortSelector !== '#dragged_port') {  // This is a real connection
      let sourcePort = document.querySelector(sourcePortSelector);
      addNameToSetAttribute(sourcePort, 'data-connections', connectionId);
      let targetPort = document.querySelector(targetPortSelector);
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

  function deleteConnection(connectionId) {
    let removedConnection = document.getElementById(connectionId);
    if (removedConnection) {
      let sourcePort = svg.querySelector(removedConnection.getAttribute('data-source'));
      if (sourcePort) {
        removeNameFromSetAttribute(sourcePort, 'data-connections', connectionId);
      }
      let targetPort = svg.querySelector(removedConnection.getAttribute('data-target'));
      if (targetPort) {
        removeNameFromSetAttribute(targetPort, 'data-connections', connectionId);
      }
      svg.removeChild(removedConnection);
    }
  }

  function updateConnectionPath(connection) {
    let sourcePort = document.querySelector(connection.getAttribute('data-source'));
    let sourcePosition = convertToSvgCoordinates(Number(sourcePort.getAttribute('cx')), Number(sourcePort.getAttribute('cy')), sourcePort.getCTM().inverse());
    let sourceDx = Number(sourcePort.getAttribute('data-dx'));
    let targetPort = document.querySelector(connection.getAttribute('data-target'));
    let targetPosition = convertToSvgCoordinates(Number(targetPort.getAttribute('cx')), Number(targetPort.getAttribute('cy')), targetPort.getCTM().inverse());
    let targetDx = Number(targetPort.getAttribute('data-dx'));
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

  function startConnectionDrag(evt) {
    draggedConnection = makeNewConnection('dragged_connection', getPortSelector(evt.target), '#dragged_port');
  }

  function onMouseDown(evt) {
    if (evt.button === 0) {
      if (evt.target.closest('.drag_handle') && !evt.target.closest('.disable_dragging')) {
        startDrag(evt);
      } else if (evt.target.closest('.input_port, .output_port')) {
        startConnectionDrag(evt);
      }
    }
  }

  function onClick(evt) {
    if (evt.button === 0 && evt.target.closest('.close_button')) {
      let closedElement = evt.target.closest('.closeable');
      if (closedElement && closedElement.classList.contains('connection')) {
        deleteConnection(closedElement.id);
      } else if (closedElement) {
        svg.removeChild(closedElement);
        for (const port of closedElement.querySelectorAll(".input_port, .output_port")) {
          let portConnectionIds = port.dataset.connections ? port.dataset.connections.split(',') : [];
          for (const connectionId of portConnectionIds) {
            deleteConnection(connectionId);
          }
        }
      }
    }
  }

  function portsAreCompatible(sourcePort, targetPort) {
    return (sourcePort.classList.contains('input_port') && targetPort.classList.contains('output_port'))
      || (sourcePort.classList.contains('output_port') && targetPort.classList.contains('input_port'));
  }

  function setNodePosition(node, newPositionX, newPositionY) {
    node.setAttributeNS(null, "transform", "translate(" + newPositionX + "," + newPositionY + ")");
    for (const port of node.querySelectorAll(".input_port, .output_port")) {
      let portConnectionIds = port.dataset.connections ? port.dataset.connections.split(',') : [];
      for (const connectionId of portConnectionIds) {
        updateConnectionPath(document.getElementById(connectionId));
      }
    }
  }

  function onMouseMove(evt) {
    let mousePosition = convertToSvgCoordinates(evt.clientX, evt.clientY, svg.getScreenCTM());
    if (draggedElement) {
      evt.preventDefault();
      setNodePosition(draggedElement, mousePosition.x + draggedOffsetInSvgCoordinates.x, mousePosition.y + draggedOffsetInSvgCoordinates.y);
    } else if (draggedConnection) {
      evt.preventDefault();
      if (portsAreCompatible(document.querySelector(draggedConnection.getAttribute('data-source')), evt.target)) {
        draggedConnection.dataset.target = getPortSelector(evt.target);
      } else {
        draggedConnection.dataset.target = '#dragged_port';
        draggedTargetPort.setAttribute('cx', mousePosition.x);
        draggedTargetPort.setAttribute('cy', mousePosition.y);
      }
      updateConnectionPath(draggedConnection);
    }
  }

  function endDrag(evt) {
    if (draggedElement) {
      draggedElement = null;
    }
    if (draggedConnection) {
      let sourcePort = document.querySelector(draggedConnection.getAttribute('data-source'));
      if (portsAreCompatible(sourcePort, evt.target)) {
        updateConnectionPath(makeNewConnection("connection" + (nextId++), draggedConnection.getAttribute('data-source'), getPortSelector(evt.target)));
      }
      svg.removeChild(draggedConnection);
      draggedConnection = null;
    }
  }

  function toggleJsonExport() {
    document.querySelector('.json_export').classList.toggle('visible');
    let exportObject = {};
    for (const node of svg.querySelectorAll('.node')) {
      exportObject[node.id] = {canvas_position: {x: node.getCTM().e, y: node.getCTM().f}, type: node.dataset.type};
      for (const configField of node.querySelectorAll('input')) {
        exportObject[node.id][configField.dataset.field] = configField.value;
      }
      for (const inputPort of node.querySelectorAll('.input_port')) {
        exportObject[node.id][inputPort.dataset.port] = []
        for (const connectionId of inputPort.dataset.connections ? inputPort.dataset.connections.split(',') : []) {
          let connection = document.getElementById(connectionId);
          let portSelector = getPortSelector(inputPort);
          exportObject[node.id][inputPort.dataset.port].push(connection.dataset.source === portSelector ? connection.dataset.target : connection.dataset.source);
        }
      }
    }
    document.querySelector('.json_export textarea').value = JSON.stringify(exportObject);
  }

  function onHtml5Dragover(evt) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  }

  function onHtml5Drop(evt) {
    evt.preventDefault();
    let templateId = evt.dataTransfer.getData("text/dragged-template");
    if (templateId) {
      let draggedNodeCopy = document.getElementById(templateId).querySelector('.draggable').cloneNode(true);
      let mousePosition = convertToSvgCoordinates(evt.clientX, evt.clientY, svg.getScreenCTM());
      draggedNodeCopy.setAttributeNS(null, "transform", "translate(" + (mousePosition.x + 0.5) + "," + (mousePosition.y + 0.5) + ")");
      draggedNodeCopy.id = "node" + (nextId++);
      svg.appendChild(draggedNodeCopy);
    }
  }

  function onHtml5DragStartNodeTemplate(evt) {
    evt.dataTransfer.setData("text/dragged-template", evt.target.id);
    evt.dataTransfer.dropEffect = "copy";
  }

  svg.addEventListener('mousedown', onMouseDown);
  svg.addEventListener('click', onClick);
  svg.addEventListener('mousemove', onMouseMove);
  svg.addEventListener('mouseup', endDrag);
  svg.addEventListener('mouseleave', endDrag);
  svg.addEventListener("dragover", onHtml5Dragover);
  svg.addEventListener("drop", onHtml5Drop);

  draggedTargetPort = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  draggedTargetPort.setAttribute('data-dx', '0');
  draggedTargetPort.id = 'dragged_port';
  svg.appendChild(draggedTargetPort);

  for (const nodeTemplate of document.querySelectorAll(".node_overview li")) {
    nodeTemplate.addEventListener("dragstart", onHtml5DragStartNodeTemplate);
  }

  document.querySelector('button').addEventListener('click', toggleJsonExport);
});