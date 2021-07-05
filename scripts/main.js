function addDragHandlersToSvg(evt) {
  let svg = evt.target;

  let draggedElement = null;
  let draggedOffsetInSvgCoordinates = null;
  let nextId = 0;
  let draggedConnection = null;
  let draggedTargetPort = null;

  function getMousePositionInSvgCoordinates(evt) {
    var svgCtm = svg.getScreenCTM();
    return {
      x: (evt.clientX - svgCtm.e)/svgCtm.a,
      y: (evt.clientY - svgCtm.f)/svgCtm.d,
    };
  }

  function getDraggableGroupPositionInSvgCoordinates(draggable) {  // This could also just use draggable.getCTM().e and draggable.getCTM().f directly without transformations
    let svgCtm = svg.getScreenCTM();
    let draggableCtm = draggable.getScreenCTM();
    return {
      x: (draggableCtm.e - svgCtm.e)/svgCtm.a,
      y: (draggableCtm.f - svgCtm.f)/svgCtm.d,
    }
  }
  
  function getPortPositionInSvgCoordinates(port) {
    let ctm = port.getCTM();
    return {
      x: ctm.a*Number(port.getAttribute('cx')) + ctm.e,
      y: ctm.d*Number(port.getAttribute('cy')) + ctm.f,
    }
  }
  
  function getPortSelector(port) {
    return '#' + port.closest('.draggable').id + ' .' + port.getAttribute('data-port');
  }

  function startDrag(evt) {
    draggedElement = evt.target.closest('.drag_handle').closest('.draggable');  // A drag_handle must be nested in a draggable
    let mousePosition = getMousePositionInSvgCoordinates(evt);
    let draggablePosition = getDraggableGroupPositionInSvgCoordinates(draggedElement);
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
    let newConnection = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    newConnection.setAttribute('id', connectionId);
    newConnection.setAttribute('data-source', sourcePortSelector);
    newConnection.setAttribute('data-target', targetPortSelector);
    newConnection.setAttribute('style', 'fill:none;stroke:black;stroke-width:1');
    svg.insertBefore(newConnection, svg.firstChild);
    if (targetPortSelector !== '#dragged_port') {  // This is a real connection
      let sourcePort = document.querySelector(newConnection.getAttribute('data-source'));
      addNameToSetAttribute(sourcePort, 'data-connections', connectionId);
      let targetPort = document.querySelector(newConnection.getAttribute('data-target'));
      addNameToSetAttribute(targetPort, 'data-connections', connectionId);
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
    let sourcePosition = getPortPositionInSvgCoordinates(sourcePort);
    let sourceDx = Number(sourcePort.getAttribute('data-dx'));
    let targetPort = document.querySelector(connection.getAttribute('data-target'));
    let targetPosition = getPortPositionInSvgCoordinates(targetPort);
    let targetDx = Number(targetPort.getAttribute('data-dx'));
    connection.setAttribute('d', 'M '+ sourcePosition.x + ',' + sourcePosition.y + ' C '
      + (sourcePosition.x + sourceDx) + ',' + sourcePosition.y + ' '
      + (targetPosition.x + targetDx) + ',' + targetPosition.y + ' '
      + targetPosition.x + ',' + targetPosition.y);
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
      let closedNode = svg.removeChild(evt.target.closest('.closeable'));
      for (const port of closedNode.querySelectorAll(".input_port, .output_port")) {
        let portConnectionIds = port.getAttribute('data-connections') ? port.getAttribute('data-connections').split(',') : [];
        for (const connectionId of portConnectionIds) {
          deleteConnection(connectionId);
        }
      }
    }
  }

  function portsAreCompatible(sourcePort, targetPort) {
    return (sourcePort.classList.contains('input_port') && targetPort.classList.contains('output_port'))
      || (sourcePort.classList.contains('output_port') && targetPort.classList.contains('input_port'));
  }

  function onMouseMove(evt) {
    let mousePosition = getMousePositionInSvgCoordinates(evt);
    if (draggedElement) {
      evt.preventDefault();
      let newPosition = {
        x: mousePosition.x + draggedOffsetInSvgCoordinates.x,
        y: mousePosition.y + draggedOffsetInSvgCoordinates.y,
      };
      // Note: draggable elements must ONLY have a translate transform
      draggedElement.setAttributeNS(null, "transform", "translate(" + newPosition.x + "," + newPosition.y + ")");
      for (const port of draggedElement.querySelectorAll(".input_port, .output_port")) {
        let portConnectionIds = port.getAttribute('data-connections') ? port.getAttribute('data-connections').split(',') : [];
        for (const connectionId of portConnectionIds) {
          updateConnectionPath(document.getElementById(connectionId));
        }
      }
    } else if (draggedConnection) {
      evt.preventDefault();
      if (portsAreCompatible(document.querySelector(draggedConnection.getAttribute('data-source')), evt.target)) {
        draggedConnection.setAttribute('data-target', getPortSelector(evt.target));
      } else {
        draggedConnection.setAttribute('data-target', '#dragged_port');
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

  function onHtml5Dragover(evt) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  }

  function onHtml5Drop(evt) {
    evt.preventDefault();
    let templateId = evt.dataTransfer.getData("text/dragged-template");
    if (templateId) {
      let draggedNodeCopy = document.getElementById(templateId).querySelector('.draggable').cloneNode(true);
      let mousePosition = getMousePositionInSvgCoordinates(evt);
      draggedNodeCopy.setAttributeNS(null, "transform", "translate(" + (mousePosition.x + 0.5) + "," + (mousePosition.y + 0.5) + ")");
      draggedNodeCopy.id = "node" + (nextId++);
      svg.appendChild(draggedNodeCopy);
    }
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
}

window.addEventListener('DOMContentLoaded', () => {
  function onDragStartNodeTemplate(evt) {
    evt.dataTransfer.setData("text/dragged-template", evt.target.id);
    evt.dataTransfer.dropEffect = "copy";
  }

  let currentId = 0;
  for (const nodeTemplate of document.querySelectorAll(".node_overview li")) {
    nodeTemplate.id = "nodeTemplate" + currentId;
    currentId = currentId + 1;
    nodeTemplate.addEventListener("dragstart", onDragStartNodeTemplate);
  }
});